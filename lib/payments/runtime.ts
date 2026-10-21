import 'server-only';
import {createHash} from 'node:crypto';
import {PayPalClient} from './paypalRest.ts';
import {paymentsStore, type ProviderRuntime} from './store.ts';

/** Production origin. PayPal webhooks / IPN are always registered on it. */
export const PAYMENTS_SITE_ORIGIN = 'https://thefeya.com';
export const PAYPAL_WEBHOOK_PATH = '/api/payments/paypal/webhook';
export const PAYPAL_IPN_PATH = '/api/commerce/paypal/ipn';
export const PAYPAL_WEBHOOK_URL = PAYMENTS_SITE_ORIGIN + PAYPAL_WEBHOOK_PATH;
export const PAYPAL_IPN_URL = PAYMENTS_SITE_ORIGIN + PAYPAL_IPN_PATH;

/** Optional: TheFEYA's own PayPal REST app ("pay another account" mode). */
export function platformCredentials(env: Record<string, string | undefined> = process.env) {
  const clientId = env.FEYA_PAYPAL_PLATFORM_CLIENT_ID?.trim();
  const clientSecret = env.FEYA_PAYPAL_PLATFORM_CLIENT_SECRET?.trim();
  const environment = env.FEYA_PAYPAL_PLATFORM_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live';
  return clientId && clientSecret ? {clientId, clientSecret, environment} as const : null;
}

/** Emergency switch: FEYA_PAYMENTS_KILL_SWITCH=true stops new payments immediately. */
export function paymentsKillSwitch(env: Record<string, string | undefined> = process.env) {
  return env.FEYA_PAYMENTS_KILL_SWITCH === 'true';
}

export async function loadProviderRuntime(): Promise<ProviderRuntime> {
  return paymentsStore.providerRuntime();
}

export function paypalClientFor(runtime: ProviderRuntime, transport?: typeof fetch): PayPalClient | null {
  if (runtime.credential_source === 'installer' && runtime.client_id && runtime.client_secret && runtime.client_id !== '-') {
    return new PayPalClient({clientId: runtime.client_id, clientSecret: runtime.client_secret, environment: runtime.environment}, transport);
  }
  if (runtime.credential_source === 'platform') {
    const platform = platformCredentials();
    if (platform && platform.environment === runtime.environment) {
      return new PayPalClient({clientId: platform.clientId, clientSecret: platform.clientSecret, environment: platform.environment}, transport);
    }
  }
  return null;
}

/**
 * Origin for buyer-facing return URLs. Production and this project's own Vercel
 * previews return to themselves; anything else falls back to production.
 */
export function checkoutOrigin(requestOrigin: string | null | undefined) {
  try {
    const url = new URL(String(requestOrigin || ''));
    const host = url.hostname.toLowerCase();
    if (url.protocol === 'https:' && (host === 'thefeya.com' || host === 'www.thefeya.com')) return 'https://thefeya.com';
    if (url.protocol === 'https:' && /^feya-commerce-[a-z0-9-]+-alexs-projects-5419f9ec\.vercel\.app$/.test(host)) return url.origin;
    if (url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1')) return url.origin;
  } catch { /* fall through */ }
  return PAYMENTS_SITE_ORIGIN;
}

export function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function clientIpHash(headers: Headers) {
  const ip = (headers.get('x-real-ip') || headers.get('x-forwarded-for')?.split(',')[0] || '').trim();
  return ip ? sha256('feya-pay-ip:' + ip) : null;
}
