import 'server-only';
import {randomBytes, randomUUID} from 'node:crypto';
import {verifyPayPalStandardIpnPostback} from '@/lib/sellerOnlinePayPalStandardIpn';
import {createProviderSession} from './checkoutService.ts';
import {buildTestSnapshot, canonicalJson, sha256Hex, TEST_PAYMENT_MINOR} from './orderSnapshot.ts';
import {PayPalApiError, PayPalNetworkError} from './paypalRest.ts';
import {loadProviderRuntime, paypalClientFor, platformCredentials, PAYPAL_IPN_URL, PAYPAL_WEBHOOK_URL, sha256} from './runtime.ts';
import {paymentsStore, PaymentsStoreError, type ProviderStatus} from './store.ts';
import {isPaidCommerceReleaseApproved} from './commerceRelease.ts';

export type InstallActor = {role: 'technician' | 'owner'; name: string};

export type CheckResult = {check: string; ok: boolean; detail: string; paypal_error?: string | null; debug_id?: string | null};

const FIELD_ERRORS: Record<string, string> = {
  feya_pay_client_id_invalid: 'Client ID выглядит неверно (ожидается строка из PayPal Developer → Apps & Credentials).',
  feya_pay_client_secret_invalid: 'Secret выглядит неверно.',
  feya_pay_credentials_incomplete: 'Нужны оба значения: Client ID и Secret.',
  feya_pay_payee_email_invalid: 'Проверьте email PayPal-аккаунта получателя.',
  feya_pay_store_key_invalid: 'Ключ магазина: 8–80 символов, латинские буквы, цифры, «-» или «_».',
  feya_pay_engine_invalid: 'Неизвестный способ подключения.',
  feya_pay_environment_invalid: 'Неизвестная среда PayPal.',
  feya_pay_payload_invalid: 'Запрос не распознан. Обновите страницу.',
  feya_pay_field_invalid: 'Одно из полей содержит недопустимые символы.',
};
export function installErrorMessage(code: string) {
  return FIELD_ERRORS[code] || 'Не удалось сохранить настройки. Повторите попытку.';
}

export function platformAvailable() {
  return platformCredentials() !== null;
}

export async function providerStatusForPanel() {
  const status = await paymentsStore.providerStatus();
  const platform = platformCredentials();
  return {
    ...status,
    platform_app_available: Boolean(platform),
    platform_app_environment: platform?.environment ?? null,
    urls: {webhook: PAYPAL_WEBHOOK_URL, ipn: PAYPAL_IPN_URL},
    ready_to_activate: readyToActivate(status) && isPaidCommerceReleaseApproved(),
    commerce_release_approved: isPaidCommerceReleaseApproved(),
  };
}

export function readyToActivate(status: ProviderStatus) {
  const c = status.checks;
  const engineOk = status.engine === 'paypal_standard' || (c.credentials && c.payee && c.webhook);
  return status.environment === 'live' && status.store_key_set && Boolean(status.payee_email)
    && engineOk && c.test_payment && c.test_environment === 'live';
}

export async function saveProviderSettings(raw: unknown, actor: InstallActor) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PaymentsStoreError('feya_pay_payload_invalid');
  const input = raw as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of ['engine', 'environment', 'client_id', 'client_secret', 'payee_email', 'store_key'] as const) {
    const value = input[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') throw new PaymentsStoreError('feya_pay_field_invalid');
    payload[key] = value.trim();
  }
  if (input.use_platform_credentials === true) {
    if (!platformAvailable()) throw new PaymentsStoreError('feya_pay_payload_invalid');
    payload.use_platform_credentials = true;
  }
  if (input.clear_credentials === true) payload.clear_credentials = true;
  return paymentsStore.saveProvider(payload, actor.name, actor.role);
}

function paypalProblem(error: unknown): {paypal_error: string | null; debug_id: string | null; detail: string} {
  if (error instanceof PayPalNetworkError) return {paypal_error: null, debug_id: null, detail: 'PayPal не ответил. Повторите проверку через минуту.'};
  if (error instanceof PayPalApiError) {
    const name = [error.info.name, ...error.info.issues].filter(Boolean).join(' / ');
    return {paypal_error: name || `HTTP ${error.info.status}`, debug_id: error.info.debugId, detail: error.info.message || 'PayPal отклонил запрос.'};
  }
  return {paypal_error: null, debug_id: null, detail: 'Неожиданная ошибка проверки.'};
}

/**
 * Automatic "installation": proves the PayPal REST credentials, proves the payee
 * account can receive payments (an unpaid verification order — no money moves),
 * and registers TheFEYA's webhook in that PayPal app.
 */
export async function runInstallationChecks(actor: InstallActor): Promise<{results: CheckResult[]; status: Awaited<ReturnType<typeof providerStatusForPanel>>}> {
  const runtime = await loadProviderRuntime();
  const results: CheckResult[] = [];
  const version = runtime.config_version;

  if (!runtime.store_key) results.push({check: 'store_key', ok: false, detail: 'Не указан ключ магазина Seller Online.'});
  else results.push({check: 'store_key', ok: true, detail: 'Ключ магазина сохранён и будет передаваться в каждом платеже (custom: «номер заказа;opencart:ключ»).'});
  if (!runtime.payee_email) results.push({check: 'payee_email', ok: false, detail: 'Не указан PayPal-аккаунт получателя платежей.'});

  if (runtime.engine === 'paypal_standard') {
    // Legacy: there is no API to verify the receiver without a payment. We verify our
    // own IPN channel to PayPal; the live test payment proves the rest.
    const probe = await verifyPayPalStandardIpnPostback('txn_id=FEYAPROBE000001&payment_status=Completed', runtime.environment);
    results.push(probe.ok || probe.code === 'invalid'
      ? {check: 'ipn_channel', ok: true, detail: 'Канал подтверждения PayPal (IPN) работает: сервер получает ответ PayPal.'}
      : {check: 'ipn_channel', ok: false, detail: 'Сервер не смог связаться с PayPal для проверки IPN.'});
    return {results, status: await providerStatusForPanel()};
  }

  const client = paypalClientFor(runtime);
  if (!client) {
    results.push({check: 'credentials', ok: false, detail: runtime.credential_source === 'platform'
      ? 'Приложение PayPal TheFEYA не настроено для выбранной среды.'
      : 'Введите Client ID и Secret PayPal REST-приложения.'});
    return {results, status: await providerStatusForPanel()};
  }

  // 1. Credentials
  try {
    const token = await client.accessToken(true);
    await paymentsStore.recordCheck(version, 'credentials', true, {app_id: token.appId}, actor.name, actor.role);
    results.push({check: 'credentials', ok: true, detail: `PayPal ${runtime.environment === 'live' ? 'Live' : 'Sandbox'}: авторизация приложения подтверждена${token.appId ? ` (${token.appId})` : ''}.`});
  } catch (error) {
    const p = paypalProblem(error);
    await paymentsStore.recordCheck(version, 'credentials', false, {error: `${p.paypal_error || ''} ${p.detail}`.trim()}, actor.name, actor.role);
    results.push({check: 'credentials', ok: false, ...p});
    return {results, status: await providerStatusForPanel()};
  }

  // 2. Payee can receive EUR payments (verification order, never approved or charged)
  if (runtime.payee_email) {
    try {
      const order = await client.createOrder({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: 'feya-payee-check',
          description: 'TheFEYA payee verification (not charged)',
          amount: {currency_code: 'EUR', value: '1.00'},
          payee: {email_address: runtime.payee_email},
        }],
      }, 'feya-payee-check-' + version + '-' + randomUUID());
      const units = Array.isArray(order.purchase_units) ? order.purchase_units as Record<string, unknown>[] : [];
      const payee = (units[0]?.payee || {}) as Record<string, unknown>;
      const merchantId = typeof payee.merchant_id === 'string' && /^[A-Za-z0-9]{1,32}$/.test(payee.merchant_id) ? payee.merchant_id : null;
      await paymentsStore.recordCheck(version, 'payee', true, {payee_merchant_id: merchantId}, actor.name, actor.role);
      results.push({check: 'payee', ok: true, detail: `Аккаунт ${runtime.payee_email} принимает платежи в EUR${merchantId ? ` (merchant ID ${merchantId})` : ''}. Проверочный заказ не оплачивается и истекает сам.`});
    } catch (error) {
      const p = paypalProblem(error);
      await paymentsStore.recordCheck(version, 'payee', false, {error: `${p.paypal_error || ''} ${p.detail}`.trim()}, actor.name, actor.role);
      results.push({check: 'payee', ok: false, ...p});
    }
  }

  // 3. Webhook subscription in this PayPal app
  try {
    const webhook = await client.ensureWebhook(PAYPAL_WEBHOOK_URL);
    await paymentsStore.recordCheck(version, 'webhook', true, {webhook_id: webhook.id}, actor.name, actor.role);
    results.push({check: 'webhook', ok: true, detail: webhook.created
      ? `Уведомления PayPal подключены (${webhook.id}).`
      : `Уведомления PayPal уже подключены (${webhook.id})${webhook.updated ? ', список событий обновлён' : ''}.`});
  } catch (error) {
    const p = paypalProblem(error);
    await paymentsStore.recordCheck(version, 'webhook', false, {error: `${p.paypal_error || ''} ${p.detail}`.trim()}, actor.name, actor.role);
    results.push({check: 'webhook', ok: false, ...p});
  }
  return {results, status: await providerStatusForPanel()};
}

/** Starts a real €1.00 test payment for the current configuration. */
export async function startTestPayment(origin: string) {
  const runtime = await loadProviderRuntime();
  const snapshot = buildTestSnapshot();
  const created = await paymentsStore.createOrder({
    idempotency_key: randomUUID(),
    request_sha256: sha256('feya-test-payment:' + randomUUID()),
    kind: 'test',
    engine: runtime.engine,
    environment: runtime.environment,
    config_version: runtime.config_version,
    amounts: {merchandise_minor: TEST_PAYMENT_MINOR, extras_minor: 0, shipping_minor: 0, remote_minor: 0, handling_minor: 0, total_minor: TEST_PAYMENT_MINOR},
    snapshot,
    snapshot_sha256: sha256Hex(canonicalJson(snapshot)),
    access_token_sha256: sha256(randomBytes(24).toString('base64url')),
  });
  if (!created.ok) throw new PaymentsStoreError(created.code || 'test_order_failed');
  const session = await createProviderSession({
    order: {
      order_id: created.order_id!, order_number: created.order_number!, invoice_id: created.invoice_id!,
      custom_id: created.custom_id!, total_minor: TEST_PAYMENT_MINOR, merchandise_minor: TEST_PAYMENT_MINOR,
      extras_minor: 0, shipping_minor: 0, remote_minor: 0, handling_minor: 0, provider_order_id: null,
    },
    snapshot,
    returnUrl: `${origin}/partner/seller-online?test=return`,
    cancelUrl: `${origin}/partner/seller-online?test=cancelled`,
  });
  return {order_number: created.order_number!, environment: runtime.environment, session};
}
