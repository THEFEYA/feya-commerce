import 'server-only';
import {randomBytes} from 'node:crypto';
import {readCachedStorefrontProductPresentation} from '@/lib/storefrontProductPresentationServer';
import type {StorefrontProduct} from '@/lib/types';
import {priceCartLine, type CartLineInput} from './catalogLinePricing.ts';
import {
  CheckoutRequestError, parseCheckoutQuoteRequest, parseCheckoutRequest, type CheckoutRequestV1,
} from './checkoutRequest.ts';
import {buildCustomerSnapshot, checkoutRequestFingerprint, sha256Hex, canonicalJson, type OrderSnapshotV1} from './orderSnapshot.ts';
import {buildPayPalOrderRequest, normalizePayPalOrder, type ExpectedPayment} from './paypalOrder.ts';
import {PayPalApiError, PayPalNetworkError, payerActionUrl, type PayPalClient} from './paypalRest.ts';
import {buildPayPalStandardForm} from './paypalStandard.ts';
import {buildExtraLines, computeCheckoutAmounts, CheckoutPricingError, isRemoteDestination, type PricedLine} from './pricing.ts';
import {
  checkoutOrigin, clientIpHash, loadProviderRuntime, paymentsKillSwitch, paypalClientFor, PAYPAL_IPN_URL, sha256,
} from './runtime.ts';
import {paymentsStore, PaymentsStoreError, type StoredOrder} from './store.ts';
import {isPaidCommerceReleaseApproved} from './commerceRelease.ts';
import {requiresPennsylvaniaTaxReview} from './destinationTaxReview.ts';

export class CheckoutFlowError extends Error {
  readonly status: number;
  readonly field?: string;
  readonly debugId?: string | null;
  constructor(code: string, status = 422, extra: {field?: string; debugId?: string | null} = {}) {
    super(code); this.name = 'CheckoutFlowError'; this.status = status; this.field = extra.field; this.debugId = extra.debugId;
  }
}

/** Converts any internal error into a stable public error code + HTTP status. */
export function checkoutFailure(error: unknown): {code: string; status: number; field?: string} {
  if (error instanceof CheckoutFlowError) return {code: error.message, status: error.status, field: error.field};
  if (error instanceof CheckoutRequestError) return {code: error.message, status: 422, field: error.field};
  if (error instanceof CheckoutPricingError) return {code: error.message, status: 422};
  if (error instanceof PaymentsStoreError) return {code: error.message.startsWith('feya_pay_') ? 'checkout_request_invalid' : 'checkout_unavailable', status: error.message.startsWith('feya_pay_') ? 422 : 503};
  if (error instanceof PayPalNetworkError) return {code: 'provider_unavailable', status: 503};
  return {code: 'checkout_unavailable', status: 503};
}

async function productBySlug(slug: string, cache: Map<string, StorefrontProduct | null>) {
  if (!cache.has(slug)) {
    const presentation = await readCachedStorefrontProductPresentation(slug);
    cache.set(slug, presentation.product);
  }
  return cache.get(slug) ?? null;
}

/** Re-prices the bag from the published catalog (server authority). */
export async function priceLines(lines: CartLineInput[]) {
  const cache = new Map<string, StorefrontProduct | null>();
  const priced: (PricedLine & {price_changed: boolean})[] = [];
  for (const line of lines) {
    const product = await productBySlug(line.slug, cache);
    if (!product) throw new CheckoutFlowError('checkout_product_mismatch');
    priced.push(priceCartLine(product, line));
  }
  return priced;
}

export async function publicCheckoutState(): Promise<{active: boolean; engine: string | null; storage_ready: boolean}> {
  try {
    const state = await paymentsStore.publicState();
    const active = state.active === true && !paymentsKillSwitch() && isPaidCommerceReleaseApproved();
    return {active, engine: active ? state.engine : null, storage_ready: true};
  } catch {
    return {active: false, engine: null, storage_ready: false};
  }
}

/** Server-confirmed totals for the bag (no personal data). */
export async function quoteCheckout(raw: unknown) {
  const request = parseCheckoutQuoteRequest(raw);
  const lines = await priceLines(request.lines);
  const extras = buildExtraLines(lines, {giftCard: request.gift_card, giftBox: request.gift_box});
  const amounts = computeCheckoutAmounts({lines, extras, method: request.method, country: request.country});
  const state = await publicCheckoutState();
  return {
    checkout_active: state.active,
    lines: lines.map(l => ({line_id: l.line_id, title: l.title, option_label: l.option_label, quantity: l.quantity,
      unit_minor: l.unit_minor, line_minor: l.line_minor, price_changed: l.price_changed})),
    extras, amounts,
    remote_destination: request.country ? isRemoteDestination(request.country) : false,
    country_selected: Boolean(request.country),
  };
}

function expectedFrom(order: {order_number: string; invoice_id: string; custom_id: string; total_minor: number;
  merchandise_minor: number; extras_minor: number; shipping_minor: number; remote_minor: number; handling_minor: number},
  payeeEmail: string): ExpectedPayment {
  return {
    order_number: order.order_number, invoice_id: order.invoice_id, custom_id: order.custom_id,
    total_minor: order.total_minor, merchandise_minor: order.merchandise_minor, extras_minor: order.extras_minor,
    shipping_minor: order.shipping_minor, remote_minor: order.remote_minor, handling_minor: order.handling_minor,
    payee_email: payeeEmail,
  };
}

function mapCreateError(error: unknown): never {
  if (error instanceof PayPalNetworkError) throw new CheckoutFlowError('provider_unavailable', 503);
  if (error instanceof PayPalApiError) {
    const info = error.info;
    console.error('paypal_create_order_failed', {status: info.status, name: info.name, issues: info.issues, debug_id: info.debugId});
    const addressIssue = info.issues.some(i => /ADDRESS|POSTAL|CITY|STATE|COUNTRY|ZIP|ADMIN_AREA/.test(i));
    throw new CheckoutFlowError(addressIssue ? 'provider_rejected_address' : 'provider_rejected', 422, {debugId: info.debugId});
  }
  throw error;
}

/** Creates (or idempotently resumes) a PayPal session for a stored order. */
export async function createProviderSession(input: {
  order: {order_id: string; order_number: string; invoice_id: string; custom_id: string; total_minor: number;
    merchandise_minor: number; extras_minor: number; shipping_minor: number; remote_minor: number; handling_minor: number;
    provider_order_id: string | null};
  snapshot: OrderSnapshotV1;
  returnUrl: string;
  cancelUrl: string;
}) {
  const runtime = await loadProviderRuntime();
  if (!runtime.payee_email) throw new CheckoutFlowError('payments_not_active', 423);
  const expected = expectedFrom(input.order, runtime.payee_email);
  if (runtime.engine === 'paypal_standard') {
    return {kind: 'form' as const, form: buildPayPalStandardForm({
      expected, snapshot: input.snapshot, environment: runtime.environment,
      notifyUrl: PAYPAL_IPN_URL, returnUrl: input.returnUrl, cancelUrl: input.cancelUrl,
    })};
  }
  const client = paypalClientFor(runtime);
  if (!client) throw new CheckoutFlowError('payments_not_active', 423);
  if (input.order.provider_order_id) {
    // Replay (double click / network retry): reuse the same PayPal order.
    try {
      const existing = await client.getOrder(input.order.provider_order_id);
      const url = payerActionUrl(existing);
      if (url && existing.status !== 'COMPLETED') return {kind: 'redirect' as const, url};
    } catch (error) { mapCreateError(error); }
  }
  const payload = buildPayPalOrderRequest({expected, snapshot: input.snapshot, returnUrl: input.returnUrl, cancelUrl: input.cancelUrl});
  let created: Record<string, unknown>;
  try {
    created = await client.createOrder(payload, 'feya-order-' + input.order.order_id);
  } catch (error) { mapCreateError(error); }
  const providerOrderId = typeof created!.id === 'string' ? created!.id : '';
  const url = payerActionUrl(created!);
  if (!providerOrderId || !url) throw new CheckoutFlowError('provider_rejected', 502);
  const attached = await paymentsStore.attachProviderOrder(input.order.order_id, providerOrderId);
  if (!attached.ok) throw new CheckoutFlowError('checkout_unavailable', 409);
  return {kind: 'redirect' as const, url};
}

/** Buyer submits the bag + delivery details: create the order, then the PayPal session. */
export async function startCheckout(raw: unknown, ctx: {headers: Headers; origin: string | null}) {
  if (paymentsKillSwitch() || !isPaidCommerceReleaseApproved()) throw new CheckoutFlowError('payments_not_active', 423);
  const request: CheckoutRequestV1 = parseCheckoutRequest(raw);
  // Seller Online identified Pennsylvania sales tax for its own legal-seller account.
  // The authoritative total currently has no destination/product tax breakdown;
  // never silently collect an under-taxed live order or guess a 6/7/8% rate.
  if (requiresPennsylvaniaTaxReview(request.address.country, request.address.region))
    throw new CheckoutFlowError('checkout_pa_tax_quote_required', 422);
  const lines = await priceLines(request.lines);
  const extras = buildExtraLines(lines, {giftCard: request.gift_card, giftBox: request.gift_box});
  const amounts = computeCheckoutAmounts({lines, extras, method: request.method, country: request.address.country});
  const snapshot = buildCustomerSnapshot({request, lines, extras, amounts});
  const runtime = await loadProviderRuntime();
  if (!runtime.active) throw new CheckoutFlowError('payments_not_active', 423);

  // Opaque receipt token: the buyer can view ONLY this order with it.
  const accessToken = randomBytes(24).toString('base64url');
  const stored = await paymentsStore.createOrder({
    idempotency_key: request.idempotency_key,
    request_sha256: checkoutRequestFingerprint(request),
    kind: 'customer',
    engine: runtime.engine,
    environment: runtime.environment,
    config_version: runtime.config_version,
    amounts: {merchandise_minor: amounts.merchandise_minor, extras_minor: amounts.extras_minor,
      shipping_minor: amounts.shipping_minor, remote_minor: amounts.remote_minor,
      handling_minor: amounts.handling_minor, total_minor: amounts.total_minor},
    snapshot,
    snapshot_sha256: sha256Hex(canonicalJson(snapshot)),
    buyer_email: request.buyer.email,
    buyer_name: `${request.buyer.first_name} ${request.buyer.last_name}`.slice(0, 201),
    country_code: request.address.country,
    client_ip_sha256: clientIpHash(ctx.headers),
    access_token_sha256: sha256(accessToken),
  });
  if (!stored.ok) {
    const code = stored.code || 'checkout_unavailable';
    throw new CheckoutFlowError(code, code === 'rate_limited' ? 429 : code === 'payments_not_active' ? 423 : 409);
  }
  const origin = checkoutOrigin(ctx.origin);
  // A replay (double click / network retry) must use the amounts and snapshot stored with
  // the FIRST request, even if a catalog price changed in between.
  let order = {
    order_id: stored.order_id!, order_number: stored.order_number!, invoice_id: stored.invoice_id!,
    custom_id: stored.custom_id!, total_minor: amounts.total_minor, merchandise_minor: amounts.merchandise_minor,
    extras_minor: amounts.extras_minor, shipping_minor: amounts.shipping_minor, remote_minor: amounts.remote_minor,
    handling_minor: amounts.handling_minor, provider_order_id: stored.provider_order_id ?? null,
  };
  let orderSnapshot = snapshot;
  if (stored.replayed) {
    const existing = await paymentsStore.getOrder({orderId: stored.order_id!});
    if (!existing.ok) throw new CheckoutFlowError('checkout_unavailable', 409);
    const row = existing as StoredOrder;
    if (row.status === 'paid') throw new CheckoutFlowError('order_already_paid', 409);
    if (row.status !== 'pending_payment') throw new CheckoutFlowError('idempotency_conflict', 409);
    order = {...order, total_minor: row.total_minor, merchandise_minor: row.merchandise_minor, extras_minor: row.extras_minor,
      shipping_minor: row.shipping_minor, remote_minor: row.remote_minor, handling_minor: row.handling_minor,
      provider_order_id: row.provider_order_id};
    orderSnapshot = row.snapshot as unknown as OrderSnapshotV1;
  }
  const session = await createProviderSession({
    order,
    snapshot: orderSnapshot,
    returnUrl: `${origin}/checkout/return`,
    cancelUrl: `${origin}/checkout/return?cancelled=1`,
  });
  return {
    order_number: stored.order_number!,
    // A replayed request keeps the receipt token issued with the first response.
    access_token: stored.replayed ? null : accessToken,
    total_minor: order.total_minor,
    replayed: stored.replayed === true,
    session,
  };
}

const PROVIDER_ORDER_ID = /^[A-Za-z0-9-]{6,64}$/;

/**
 * Called when PayPal returns the buyer (or by the webhook): captures the approved
 * PayPal order server-to-server and records the verified result.
 */
export async function completeProviderOrder(providerOrderId: string, source: 'capture_api' | 'webhook' = 'capture_api', client?: PayPalClient | null) {
  if (!PROVIDER_ORDER_ID.test(providerOrderId)) throw new CheckoutFlowError('order_not_found', 404);
  const order = await paymentsStore.getOrder({providerOrderId});
  if (!order.ok) throw new CheckoutFlowError('order_not_found', 404);
  const stored = order as StoredOrder;
  if (stored.status === 'paid') return {status: 'paid', order_number: stored.order_number, kind: stored.kind, outcome: 'already_paid'};
  const runtime = await loadProviderRuntime();
  if (stored.engine !== 'paypal_checkout') throw new CheckoutFlowError('order_not_found', 404);
  if (runtime.environment !== stored.environment) throw new CheckoutFlowError('provider_configuration_changed', 409);
  const paypal = client ?? paypalClientFor(runtime);
  if (!paypal) throw new CheckoutFlowError('payments_not_active', 423);

  let body: Record<string, unknown>;
  try {
    body = await paypal.captureOrder(providerOrderId, 'feya-capture-' + stored.order_id);
  } catch (error) {
    if (error instanceof PayPalApiError && error.hasIssue('ORDER_ALREADY_CAPTURED')) {
      body = await paypal.getOrder(providerOrderId);
    } else if (error instanceof PayPalApiError && error.hasIssue('INSTRUMENT_DECLINED')) {
      const retry = payerActionUrl(await paypal.getOrder(providerOrderId).catch(() => null));
      return {status: 'instrument_declined', order_number: stored.order_number, kind: stored.kind, retry_url: retry, outcome: 'declined'};
    } else if (error instanceof PayPalApiError && error.hasIssue('ORDER_NOT_APPROVED', 'PAYER_ACTION_REQUIRED')) {
      return {status: 'not_approved', order_number: stored.order_number, kind: stored.kind, outcome: 'not_approved'};
    } else if (error instanceof PayPalNetworkError) {
      throw new CheckoutFlowError('provider_unavailable', 503);
    } else {
      if (error instanceof PayPalApiError) console.error('paypal_capture_failed', {status: error.info.status, name: error.info.name, issues: error.info.issues, debug_id: error.info.debugId});
      throw new CheckoutFlowError('provider_rejected', 502);
    }
  }
  const capture = normalizePayPalOrder(body!);
  if (capture.provider_order_id !== providerOrderId) throw new CheckoutFlowError('provider_rejected', 502);
  if (!capture.capture_id || !capture.capture_status) {
    return {status: stored.status, order_number: stored.order_number, kind: stored.kind, outcome: 'no_capture'};
  }
  const outcome = await paymentsStore.recordPayment({
    order_id: stored.order_id,
    provider_order_id: providerOrderId,
    transaction_id: capture.capture_id,
    status: capture.capture_status,
    amount_minor: capture.amount_minor ?? -1,
    currency: capture.currency ?? '',
    payee_email: capture.payee_email,
    payee_merchant_id: capture.payee_merchant_id,
    invoice_id: capture.invoice_id,
    custom_id: capture.custom_id,
    source,
    environment: stored.environment,
  });
  return {status: outcome.status || stored.status, order_number: stored.order_number, kind: stored.kind, outcome: outcome.outcome || outcome.code};
}

export async function cancelProviderOrder(providerOrderId: string) {
  if (!PROVIDER_ORDER_ID.test(providerOrderId)) throw new CheckoutFlowError('order_not_found', 404);
  const result = await paymentsStore.cancelOrder({providerOrderId});
  if (!result.ok) throw new CheckoutFlowError('order_not_found', 404);
  return {status: result.status, order_number: result.order_number, kind: result.kind};
}

/** Buyer receipt by opaque token (no PII beyond what the buyer already knows). */
export async function buyerReceipt(accessToken: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(accessToken)) return null;
  const result = await paymentsStore.orderForBuyer(sha256(accessToken));
  return result.ok === true ? result : null;
}
