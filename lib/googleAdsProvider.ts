const DEFAULT_GOOGLE_ADS_API_VERSION = 'v25';
const SENSITIVE_FIELD_PATTERN = /(authorization|access[_-]?token|refresh[_-]?token|developer[_-]?token|client[_-]?secret|service[_-]?role|apikey|api[_-]?key|secret|password|credential|cookie)/i;
const SENSITIVE_STRING_PATTERN = /(Bearer\s+)[A-Za-z0-9._~+\/-]+=*|((?:developer|refresh|access)[_-]?token[=:]\s*)[^\s,}]+|((?:client[_-]?secret|service[_-]?role[_-]?key|authorization)[=:]\s*)[^\s,}]+/gi;

type UnknownRecord = Record<string, unknown>;

type GoogleAdsMetricRequest = {
  customerId: string | null;
  endpoint: string | null;
  payload: {
    keywords: string[];
    keywordPlanNetwork: string;
    language?: string;
    geoTargetConstants?: string[];
  };
};

type GoogleAdsDiagnostics = {
  used_customer_id: string | null;
  used_login_customer_id: string | null;
  has_login_customer_id: boolean;
  google_ads_http_status: number | null;
  google_ads_error_status: string | null;
  google_ads_error_message: string | null;
  google_ads_error_codes: string[];
  google_ads_request_id: string | null;
  sanitized_google_ads_error_details: unknown;
};

export class GoogleAdsApiError extends Error {
  diagnostics: GoogleAdsDiagnostics;

  constructor(message: string, diagnostics: GoogleAdsDiagnostics) {
    super(redactSensitiveString(message));
    this.name = 'GoogleAdsApiError';
    this.diagnostics = diagnostics;
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sanitizeCustomerId(customerId: string | undefined) {
  return customerId?.replace(/-/g, '').trim() || null;
}

function safeErrorMessage(value: unknown, fallback: string) {
  if (value instanceof Error && value.message.trim()) return value.message.trim().slice(0, 500);
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  return fallback;
}

function getGoogleApiSafeError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const error = 'error' in payload ? payload.error : null;
  if (!error || typeof error !== 'object') return fallback;
  const message = 'message' in error ? safeErrorMessage(error.message, fallback) : fallback;
  return message;
}

function redactSensitiveString(value: string) {
  return value.replace(SENSITIVE_STRING_PATTERN, (_match, bearerPrefix, tokenPrefix, secretPrefix) => `${bearerPrefix || tokenPrefix || secretPrefix || ''}[REDACTED]`);
}

function sanitizeErrorDetails(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[REDACTED_DEPTH_LIMIT]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactSensitiveString(value).slice(0, 2000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeErrorDetails(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as UnknownRecord)
        .slice(0, 50)
        .map(([key, item]) => [key, SENSITIVE_FIELD_PATTERN.test(key) ? '[REDACTED]' : sanitizeErrorDetails(item, depth + 1)]),
    );
  }
  return '[REDACTED_UNSUPPORTED_VALUE]';
}

function collectGoogleAdsErrorCodes(value: unknown): string[] {
  const codes = new Set<string>();

  function visit(item: unknown, depth = 0) {
    if (!item || depth > 8) return;
    if (Array.isArray(item)) {
      item.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (typeof item !== 'object') return;

    for (const [key, nested] of Object.entries(item as UnknownRecord)) {
      if (key === 'errorCode' && nested && typeof nested === 'object') {
        Object.entries(nested as UnknownRecord).forEach(([codeKey, codeValue]) => {
          const code = asString(codeValue);
          if (code) codes.add(`${codeKey}:${code}`);
        });
      }
      visit(nested, depth + 1);
    }
  }

  visit(value);
  return Array.from(codes).slice(0, 25);
}

function getGoogleAdsDiagnostics(requestPayload: GoogleAdsMetricRequest, loginCustomerId: string | null, responseStatus: number | null, requestId: string | null, payload: unknown): GoogleAdsDiagnostics {
  const error = payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error === 'object' ? (payload.error as UnknownRecord) : null;

  return {
    used_customer_id: requestPayload.customerId,
    used_login_customer_id: loginCustomerId,
    has_login_customer_id: Boolean(loginCustomerId),
    google_ads_http_status: responseStatus,
    google_ads_error_status: error ? asString(error.status) : null,
    google_ads_error_message: error ? redactSensitiveString(safeErrorMessage(error.message, 'Google Ads keyword metrics request failed.')) : null,
    google_ads_error_codes: collectGoogleAdsErrorCodes(payload),
    google_ads_request_id: requestId,
    sanitized_google_ads_error_details: sanitizeErrorDetails(payload),
  };
}

export async function getOAuthAccessToken() {
  if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    throw new Error('Google Ads OAuth environment variables are not fully configured.');
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: unknown; error?: unknown; error_description?: unknown };
  const accessToken = asString(payload.access_token);

  if (!response.ok || !accessToken) {
    throw new Error(safeErrorMessage(payload.error_description || payload.error, `OAuth token request failed with status ${response.status}.`));
  }

  return accessToken;
}

export async function getGoogleAdsCustomerContext(customerId: string | null, accessToken: string) {
  if (!customerId) return { currencyCode: null as string | null, timeZone: null as string | null };

  const loginCustomerId = sanitizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GOOGLE_ADS_API_VERSION;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  try {
    const response = await fetch(`https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: 'SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1',
      }),
      cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return { currencyCode: null, timeZone: null };
    const payload = (await response.json().catch(() => null)) as UnknownRecord | null;
    const results = payload && Array.isArray(payload.results) ? payload.results : [];
    const first = results[0] && typeof results[0] === 'object' ? (results[0] as UnknownRecord) : null;
    const customer = first?.customer && typeof first.customer === 'object' ? (first.customer as UnknownRecord) : null;

    return {
      currencyCode: asString(customer?.currencyCode),
      timeZone: asString(customer?.timeZone),
    };
  } catch {
    return { currencyCode: null, timeZone: null };
  }
}

export async function runGoogleAdsKeywordMetrics(requestPayload: GoogleAdsMetricRequest, accessToken: string) {
  const loginCustomerId = sanitizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);

  if (!requestPayload.endpoint) throw new Error('GOOGLE_ADS_CUSTOMER_ID is not configured.');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const response = await fetch(requestPayload.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestPayload.payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const requestId = response.headers.get('request-id') || response.headers.get('x-request-id') || response.headers.get('x-google-ads-request-id');
    const message = getGoogleApiSafeError(payload, `Google Ads keyword metrics request failed with status ${response.status}.`);
    throw new GoogleAdsApiError(message, getGoogleAdsDiagnostics(requestPayload, loginCustomerId, response.status, requestId, payload));
  }

  const requestId = response.headers.get('request-id') || response.headers.get('x-request-id') || response.headers.get('x-google-ads-request-id');
  return { payload, requestId };
}

