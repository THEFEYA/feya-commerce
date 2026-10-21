import 'server-only';
import {verifyPayPalStandardIpnPostback} from '@/lib/sellerOnlinePayPalStandardIpn';
import {completeProviderOrder} from './checkoutService.ts';
import {captureRelatedOrderId, normalizePayPalOrder, refundParentCaptureId} from './paypalOrder.ts';
import {PayPalApiError, PayPalNetworkError} from './paypalRest.ts';
import {parseIpn} from './paypalStandard.ts';
import {decimalToMinor} from './pricing.ts';
import {loadProviderRuntime, paypalClientFor, sha256} from './runtime.ts';
import {paymentsStore} from './store.ts';

export type EventResult = {status: number; body: Record<string, unknown>};
const done = (status: number, body: Record<string, unknown>): EventResult => ({status, body});

/**
 * PayPal webhook: verify the signature with PayPal, de-duplicate, then act only on
 * data re-read from PayPal (never on the unverified event body alone).
 */
export async function handlePayPalWebhook(rawBody: string, headers: Headers): Promise<EventResult> {
  if (!rawBody || rawBody.length > 200_000) return done(400, {ok: false, code: 'invalid_body'});
  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody); } catch { return done(400, {ok: false, code: 'invalid_json'}); }
  const eventId = typeof event.id === 'string' ? event.id : '';
  const eventType = typeof event.event_type === 'string' ? event.event_type : '';
  if (!/^[A-Za-z0-9-]{6,120}$/.test(eventId) || !eventType) return done(400, {ok: false, code: 'invalid_event'});

  const runtime = await loadProviderRuntime();
  const client = paypalClientFor(runtime);
  if (!client || !runtime.webhook_id) return done(503, {ok: false, code: 'provider_not_installed'});
  const h = {
    authAlgo: headers.get('paypal-auth-algo') || '',
    certUrl: headers.get('paypal-cert-url') || '',
    transmissionId: headers.get('paypal-transmission-id') || '',
    transmissionSig: headers.get('paypal-transmission-sig') || '',
    transmissionTime: headers.get('paypal-transmission-time') || '',
  };
  if (Object.values(h).some(v => !v || v.length > 2000)) return done(400, {ok: false, code: 'signature_headers_missing'});
  let verified = false;
  try {
    verified = await client.verifyWebhookSignature({webhookId: runtime.webhook_id, headers: h, event});
  } catch (error) {
    if (error instanceof PayPalNetworkError) return done(503, {ok: false, code: 'provider_unavailable'});
    return done(400, {ok: false, code: 'signature_unverifiable'});
  }
  if (!verified) return done(400, {ok: false, code: 'signature_invalid'});

  const key = 'paypal_webhook:' + eventId;
  const claim = await paymentsStore.claimEvent(key, 'paypal_webhook', eventType, true);
  await paymentsStore.recordCheck(runtime.config_version, 'webhook_event', true, {}, 'paypal', 'owner').catch(() => null);
  if (!claim.first) return done(200, {ok: true, duplicate: true});

  const resource = (event.resource && typeof event.resource === 'object' ? event.resource : {}) as Record<string, unknown>;
  try {
    let outcome = 'ignored';
    let orderId: string | null = null;
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      const providerOrderId = typeof resource.id === 'string' ? resource.id : '';
      const result = await completeProviderOrder(providerOrderId, 'webhook', client);
      outcome = String(result.outcome || result.status);
    } else if (eventType.startsWith('PAYMENT.CAPTURE.') && !['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(eventType)) {
      const providerOrderId = captureRelatedOrderId(resource);
      if (providerOrderId) {
        // Re-read the authoritative order from PayPal.
        const order = normalizePayPalOrder(await client.getOrder(providerOrderId));
        const stored = await paymentsStore.getOrder({providerOrderId});
        if (stored.ok && order.capture_id && order.capture_status) {
          orderId = (stored as {order_id: string}).order_id;
          const recorded = await paymentsStore.recordPayment({
            order_id: orderId, provider_order_id: providerOrderId, transaction_id: order.capture_id,
            status: order.capture_status, amount_minor: order.amount_minor ?? -1, currency: order.currency ?? '',
            payee_email: order.payee_email, payee_merchant_id: order.payee_merchant_id,
            invoice_id: order.invoice_id, custom_id: order.custom_id, source: 'webhook',
            environment: (stored as {environment: string}).environment,
          });
          outcome = String(recorded.outcome || recorded.code);
        } else outcome = stored.ok ? 'no_capture' : 'unknown_order';
      } else outcome = 'no_related_order';
    } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED' || eventType === 'PAYMENT.CAPTURE.REVERSED') {
      const captureId = refundParentCaptureId(resource);
      const amount = resource.amount && typeof resource.amount === 'object' ? resource.amount as Record<string, unknown> : {};
      const refundId = typeof resource.id === 'string' ? resource.id : '';
      if (captureId && refundId) {
        const recorded = await paymentsStore.recordRefund({
          kind: eventType === 'PAYMENT.CAPTURE.REVERSED' ? 'reversal' : 'refund',
          transaction_id: refundId, capture_id: captureId, environment: runtime.environment,
          amount_minor: decimalToMinor(amount.value) ?? 0, currency: typeof amount.currency_code === 'string' ? amount.currency_code : 'EUR',
          status: typeof resource.status === 'string' ? resource.status : 'COMPLETED', source: 'webhook',
        });
        outcome = recorded.ok ? 'refund_recorded' : String(recorded.code);
      } else outcome = 'refund_unlinked';
    }
    await paymentsStore.finishEvent(key, orderId, outcome);
    return done(200, {ok: true, outcome});
  } catch (error) {
    // Leave the event unfinished: PayPal retries, and the next delivery re-processes it.
    if (error instanceof PayPalApiError) console.error('paypal_webhook_processing_failed', {name: error.info.name, debug_id: error.info.debugId});
    return done(503, {ok: false, code: 'processing_failed'});
  }
}

/** PayPal Standard IPN (legacy fallback engine). */
export async function handlePayPalIpn(rawBody: string, transport?: typeof fetch): Promise<EventResult> {
  if (!rawBody || rawBody.length > 16000 || rawBody.includes('\u0000')) return done(400, {ok: false, code: 'invalid_body'});
  let parsed: ReturnType<typeof parseIpn>;
  try { parsed = parseIpn(rawBody); } catch { return done(400, {ok: false, code: 'invalid_callback'}); }
  const verification = await verifyPayPalStandardIpnPostback(rawBody, parsed.environment, transport);
  if (!verification.ok) return done(verification.code === 'provider_unavailable' ? 503 : 400, {ok: false, code: 'provider_verification_failed'});

  const key = 'paypal_ipn:' + sha256(`${parsed.environment}:${parsed.txn_id}:${parsed.payment_status}`).slice(0, 48);
  const claim = await paymentsStore.claimEvent(key, 'paypal_ipn', parsed.payment_status || 'unknown', true);
  if (!claim.first) return done(200, {ok: true, duplicate: true});

  let outcome = 'ignored';
  let orderId: string | null = null;
  const status = parsed.payment_status;
  if (['Completed', 'Pending', 'Denied', 'Failed'].includes(status)) {
    orderId = parsed.invoice ? await paymentsStore.orderIdByInvoice(parsed.invoice) : null;
    if (orderId) {
      const recorded = await paymentsStore.recordPayment({
        order_id: orderId, transaction_id: parsed.txn_id,
        status: status === 'Completed' ? 'COMPLETED' : status === 'Pending' ? 'PENDING' : status === 'Denied' ? 'DECLINED' : 'FAILED',
        amount_minor: parsed.amount_minor, currency: parsed.currency,
        payee_email: parsed.receiver_email, payee_merchant_id: parsed.receiver_id,
        invoice_id: parsed.invoice, custom_id: parsed.custom, source: 'ipn', environment: parsed.environment,
      });
      outcome = String(recorded.outcome || recorded.code);
    } else outcome = 'unknown_order';
  } else if ((status === 'Refunded' || status === 'Reversed') && parsed.parent_txn_id) {
    const recorded = await paymentsStore.recordRefund({
      kind: status === 'Reversed' ? 'reversal' : 'refund', transaction_id: parsed.txn_id, capture_id: parsed.parent_txn_id,
      environment: parsed.environment, amount_minor: parsed.amount_minor, currency: parsed.currency || 'EUR',
      status: 'COMPLETED', source: 'ipn',
    });
    outcome = recorded.ok ? 'refund_recorded' : String(recorded.code);
  }
  await paymentsStore.finishEvent(key, orderId, outcome);
  return done(200, {ok: true, outcome});
}
