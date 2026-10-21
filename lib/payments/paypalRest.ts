/**
 * Minimal, dependency-free PayPal REST client for PayPal Checkout (Orders API v2)
 * and Webhooks. Server-side only by usage (credentials are passed in, never read
 * from the browser). `fetch` is injectable for tests.
 *
 * Official references:
 *  - Orders v2:                    https://developer.paypal.com/docs/api/orders/v2/
 *  - Pay another account (payee):  https://developer.paypal.com/docs/checkout/standard/customize/pay-another-account/
 *  - Webhooks + signature verify:  https://developer.paypal.com/api/rest/webhooks/
 */
export type PayPalEnvironment = 'sandbox' | 'live';
export type PayPalCredentials = {clientId: string; clientSecret: string; environment: PayPalEnvironment};
export type PayPalFetch = typeof fetch;

export const PAYPAL_API_BASE: Record<PayPalEnvironment, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

export const PAYPAL_WEBHOOK_EVENTS = [
  'CHECKOUT.ORDER.APPROVED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.PENDING',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.DECLINED',
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
] as const;

export type PayPalErrorInfo = {
  status: number;
  name: string;
  message: string;
  issues: string[];
  debugId: string | null;
};

export class PayPalApiError extends Error {
  readonly info: PayPalErrorInfo;
  constructor(info: PayPalErrorInfo) {
    super(`paypal_${info.status}_${info.name || 'error'}${info.issues.length ? ':' + info.issues.join(',') : ''}`);
    this.name = 'PayPalApiError';
    this.info = info;
  }
  hasIssue(...issues: string[]) {
    return issues.some(issue => this.info.issues.includes(issue) || this.info.name === issue);
  }
}

export class PayPalNetworkError extends Error {
  constructor(message = 'paypal_unreachable') { super(message); this.name = 'PayPalNetworkError'; }
}

type TokenCacheEntry = {token: string; expiresAt: number};
const tokenCache = new Map<string, TokenCacheEntry>();

function cacheKey(c: PayPalCredentials) {
  return c.environment + ':' + c.clientId;
}

function base64(value: string) {
  return typeof Buffer !== 'undefined' ? Buffer.from(value, 'utf8').toString('base64') : btoa(value);
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return {raw: raw.slice(0, 300)}; }
}

function errorInfo(status: number, body: unknown, debugHeader: string | null): PayPalErrorInfo {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const details = Array.isArray(b.details) ? b.details as Record<string, unknown>[] : [];
  return {
    status,
    name: typeof b.name === 'string' ? b.name : typeof b.error === 'string' ? b.error : '',
    message: (typeof b.message === 'string' ? b.message : typeof b.error_description === 'string' ? b.error_description : '').slice(0, 300),
    issues: details.map(d => typeof d.issue === 'string' ? d.issue : '').filter(Boolean).slice(0, 10),
    debugId: (typeof b.debug_id === 'string' ? b.debug_id : null) || debugHeader,
  };
}

export class PayPalClient {
  private readonly credentials: PayPalCredentials;
  private readonly transport: PayPalFetch;
  constructor(credentials: PayPalCredentials, transport: PayPalFetch = fetch) {
    this.credentials = credentials;
    this.transport = transport;
    if (!credentials.clientId || !credentials.clientSecret) throw new Error('paypal_credentials_missing');
    if (credentials.environment !== 'sandbox' && credentials.environment !== 'live') throw new Error('paypal_environment_invalid');
  }

  get environment() { return this.credentials.environment; }

  private async send(path: string, init: RequestInit & {timeoutMs?: number}): Promise<{status: number; body: unknown; debugId: string | null}> {
    let response: Response;
    try {
      response = await this.transport(PAYPAL_API_BASE[this.credentials.environment] + path, {
        ...init,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
      });
    } catch {
      throw new PayPalNetworkError();
    }
    const body = await readJson(response).catch(() => null);
    return {status: response.status, body, debugId: response.headers.get('paypal-debug-id')};
  }

  /** OAuth2 client-credentials token. Proves the REST credentials are genuine. */
  async accessToken(force = false): Promise<{token: string; appId: string | null; scopes: string[]}> {
    const key = cacheKey(this.credentials);
    const cached = tokenCache.get(key);
    if (!force && cached && cached.expiresAt > Date.now() + 60_000) return {token: cached.token, appId: null, scopes: []};
    const {status, body, debugId} = await this.send('/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + base64(`${this.credentials.clientId}:${this.credentials.clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    const b = (body || {}) as Record<string, unknown>;
    if (status !== 200 || typeof b.access_token !== 'string') {
      tokenCache.delete(key);
      throw new PayPalApiError(errorInfo(status, body, debugId));
    }
    const expiresIn = typeof b.expires_in === 'number' ? b.expires_in : 300;
    tokenCache.set(key, {token: b.access_token, expiresAt: Date.now() + expiresIn * 1000});
    return {
      token: b.access_token,
      appId: typeof b.app_id === 'string' ? b.app_id : null,
      scopes: typeof b.scope === 'string' ? b.scope.split(' ').filter(Boolean) : [],
    };
  }

  private async api(method: string, path: string, opts: {body?: unknown; requestId?: string; representation?: boolean} = {}) {
    const {token} = await this.accessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.requestId) headers['PayPal-Request-Id'] = opts.requestId.slice(0, 108);
    if (opts.representation) headers.Prefer = 'return=representation';
    const result = await this.send(path, {
      method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    if (result.status === 401) {
      tokenCache.delete(cacheKey(this.credentials));
    }
    if (result.status < 200 || result.status >= 300) throw new PayPalApiError(errorInfo(result.status, result.body, result.debugId));
    return result.body as Record<string, unknown>;
  }

  createOrder(payload: unknown, requestId: string) {
    return this.api('POST', '/v2/checkout/orders', {body: payload, requestId, representation: true});
  }

  getOrder(orderId: string) {
    if (!/^[A-Za-z0-9-]{6,64}$/.test(orderId)) throw new Error('paypal_order_id_invalid');
    return this.api('GET', `/v2/checkout/orders/${orderId}`);
  }

  captureOrder(orderId: string, requestId: string) {
    if (!/^[A-Za-z0-9-]{6,64}$/.test(orderId)) throw new Error('paypal_order_id_invalid');
    return this.api('POST', `/v2/checkout/orders/${orderId}/capture`, {body: {}, requestId, representation: true});
  }

  /** Official server-side webhook signature verification. */
  async verifyWebhookSignature(input: {
    webhookId: string;
    headers: {authAlgo: string; certUrl: string; transmissionId: string; transmissionSig: string; transmissionTime: string};
    event: unknown;
  }): Promise<boolean> {
    const body = await this.api('POST', '/v1/notifications/verify-webhook-signature', {body: {
      auth_algo: input.headers.authAlgo,
      cert_url: input.headers.certUrl,
      transmission_id: input.headers.transmissionId,
      transmission_sig: input.headers.transmissionSig,
      transmission_time: input.headers.transmissionTime,
      webhook_id: input.webhookId,
      webhook_event: input.event,
    }});
    return body?.verification_status === 'SUCCESS';
  }

  async listWebhooks(): Promise<{id: string; url: string; events: string[]}[]> {
    const body = await this.api('GET', '/v1/notifications/webhooks');
    const list = Array.isArray(body?.webhooks) ? body.webhooks as Record<string, unknown>[] : [];
    return list.map(w => ({
      id: String(w.id || ''),
      url: String(w.url || ''),
      events: Array.isArray(w.event_types) ? (w.event_types as Record<string, unknown>[]).map(e => String(e.name || '')) : [],
    })).filter(w => w.id);
  }

  /** Creates (or repairs) the webhook subscription for `url`. Returns its id. */
  async ensureWebhook(url: string, events: readonly string[] = PAYPAL_WEBHOOK_EVENTS): Promise<{id: string; created: boolean; updated: boolean}> {
    const existing = (await this.listWebhooks()).find(w => w.url === url);
    if (existing) {
      const missing = events.filter(e => !existing.events.includes(e) && !existing.events.includes('*'));
      if (missing.length) {
        await this.api('PATCH', `/v1/notifications/webhooks/${encodeURIComponent(existing.id)}`, {body: [{
          op: 'replace', path: '/event_types', value: [...new Set([...existing.events, ...events])].map(name => ({name})),
        }]});
        return {id: existing.id, created: false, updated: true};
      }
      return {id: existing.id, created: false, updated: false};
    }
    const created = await this.api('POST', '/v1/notifications/webhooks', {body: {
      url, event_types: events.map(name => ({name})),
    }});
    if (typeof created?.id !== 'string') throw new Error('paypal_webhook_create_failed');
    return {id: created.id, created: true, updated: false};
  }
}

/** Extracts the buyer redirect link from a create-order response. */
export function payerActionUrl(order: Record<string, unknown> | null | undefined): string | null {
  const links = Array.isArray(order?.links) ? order!.links as Record<string, unknown>[] : [];
  const link = links.find(l => l.rel === 'payer-action') || links.find(l => l.rel === 'approve');
  const href = typeof link?.href === 'string' ? link.href : null;
  if (!href) return null;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && (url.hostname === 'www.paypal.com' || url.hostname === 'www.sandbox.paypal.com') ? url.href : null;
  } catch { return null; }
}

export function resetPayPalTokenCacheForTests() { tokenCache.clear(); }
