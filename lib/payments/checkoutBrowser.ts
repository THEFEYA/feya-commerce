/**
 * Browser-side helpers for the buyer checkout. Only same-origin TheFEYA endpoints are
 * called; card details are entered on PayPal's own page, never here.
 */
export const CHECKOUT_PENDING_KEY = 'feya_checkout_pending_v1';
export const CHECKOUT_RECEIPTS_KEY = 'feya_checkout_receipts_v1';

export type CheckoutStatus = {checkout_active: boolean; engine: string | null; remote_countries: string[]; remote_surcharge_minor: number};
export type QuoteResult = {
  ok: boolean; code?: string; message?: string;
  checkout_active?: boolean;
  amounts?: {merchandise_minor: number; extras_minor: number; shipping_minor: number; remote_minor: number;
    handling_minor: number; total_minor: number};
  lines?: {line_id: string; unit_minor: number; line_minor: number; price_changed: boolean}[];
};
export type StartResult = {
  ok: boolean; code?: string; message?: string; field?: string | null;
  order_number?: string; access_token?: string | null; total_minor?: number;
  session?: {kind: 'redirect'; url: string} | {kind: 'form'; form: {action: string; method: 'POST'; fields: Record<string, string>}};
};

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? {cache: 'no-store', credentials: 'same-origin'}
    : {method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json().catch(() => ({ok: false, code: 'checkout_unavailable'}));
  return data as T;
}

export const checkoutApi = {
  status: () => call<CheckoutStatus & {ok: boolean}>('/api/checkout/status'),
  quote: (body: unknown) => call<QuoteResult>('/api/checkout/quote', body),
  start: (body: unknown) => call<StartResult>('/api/checkout', body),
  complete: (providerOrderId: string) => call<{ok: boolean; status?: string; order_number?: string; retry_url?: string | null; code?: string; message?: string}>('/api/checkout/complete', {provider_order_id: providerOrderId}),
  cancel: (providerOrderId: string) => call<{ok: boolean; status?: string}>('/api/checkout/cancel', {provider_order_id: providerOrderId}),
  receipt: (accessToken: string) => call<{ok: boolean; order?: Record<string, unknown>}>('/api/checkout/order', {access_token: accessToken}),
};

export function newIdempotencyKey() {
  return crypto.randomUUID();
}

/** Remember the order being paid so the return page can show the right receipt. */
export function rememberPendingCheckout(entry: {order_number: string; access_token: string | null}) {
  try {
    const previous = readPendingCheckout();
    const token = entry.access_token || (previous?.order_number === entry.order_number ? previous.access_token : null);
    window.sessionStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify({order_number: entry.order_number, access_token: token, at: Date.now()}));
  } catch { /* private mode: the return page still works from PayPal's token */ }
}

export function readPendingCheckout(): {order_number: string; access_token: string | null} | null {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_PENDING_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.order_number === 'string' ? value : null;
  } catch { return null; }
}

/** Keeps receipt links for orders paid in this browser (order number + opaque token only). */
export function rememberReceipt(orderNumber: string, accessToken: string) {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_RECEIPTS_KEY);
    const list: {order_number: string; access_token: string}[] = raw ? JSON.parse(raw) : [];
    const next = [{order_number: orderNumber, access_token: accessToken}, ...list.filter(r => r.order_number !== orderNumber)].slice(0, 10);
    window.localStorage.setItem(CHECKOUT_RECEIPTS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/** PayPal Payments Standard (fallback engine) needs a real form POST to PayPal. */
export function submitProviderForm(form: {action: string; method: 'POST'; fields: Record<string, string>}) {
  const url = new URL(form.action);
  if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)) throw new Error('unexpected_provider');
  const element = document.createElement('form');
  element.method = 'POST';
  element.action = url.href;
  for (const [name, value] of Object.entries(form.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    element.appendChild(input);
  }
  document.body.appendChild(element);
  element.submit();
}

export function redirectToProvider(href: string) {
  const url = new URL(href);
  if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)) throw new Error('unexpected_provider');
  window.location.assign(url.href);
}
