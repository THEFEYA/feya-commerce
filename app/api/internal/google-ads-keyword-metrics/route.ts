import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const DEFAULT_LANGUAGE_CONSTANT = 'languageConstants/1000';
const DEFAULT_KEYWORD_PLAN_NETWORK = 'GOOGLE_SEARCH';
const ALLOWED_BATCH_STATUSES = new Set(['pending', 'queued', 'ready', 'ready_for_fetch']);
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

class GoogleAdsApiError extends Error {
  diagnostics: GoogleAdsDiagnostics;

  constructor(message: string, diagnostics: GoogleAdsDiagnostics) {
    super(message);
    this.name = 'GoogleAdsApiError';
    this.diagnostics = diagnostics;
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return false;
}

function clampLimit(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(parsed)));
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
    google_ads_error_message: error ? safeErrorMessage(error.message, 'Google Ads keyword metrics request failed.') : null,
    google_ads_error_codes: collectGoogleAdsErrorCodes(payload),
    google_ads_request_id: requestId,
    sanitized_google_ads_error_details: sanitizeErrorDetails(payload),
  };
}

function isAllowedBatchStatus(row: UnknownRecord) {
  const status = asString(row.batch_status)?.toLowerCase();
  return Boolean(status && ALLOWED_BATCH_STATUSES.has(status));
}

function getBatchId(row: UnknownRecord) {
  return asString(row.metric_batch_id) || asString(row.batch_id) || asString(row.batchId) || asString(row.id) || asString(row.request_batch_id);
}

function getKeyword(row: UnknownRecord) {
  return asString(row.keyword) || asString(row.cleaned_keyword) || asString(row.suggested_keyword) || asString(row.keyword_text);
}

function getEnvList(key: string) {
  return (process.env[key] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getOAuthAccessToken() {
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
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: unknown; error?: unknown; error_description?: unknown };
  const accessToken = asString(payload.access_token);

  if (!response.ok || !accessToken) {
    throw new Error(safeErrorMessage(payload.error_description || payload.error, `OAuth token request failed with status ${response.status}.`));
  }

  return accessToken;
}

function buildGoogleAdsRequest(keywords: string[]): GoogleAdsMetricRequest {
  const customerId = sanitizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const geoTargetConstants = getEnvList('GOOGLE_ADS_GEO_TARGET_CONSTANTS');
  const language = process.env.GOOGLE_ADS_LANGUAGE_CONSTANT || DEFAULT_LANGUAGE_CONSTANT;

  return {
    customerId,
    endpoint: customerId ? `https://googleads.googleapis.com/v24/customers/${customerId}:generateKeywordHistoricalMetrics` : null,
    payload: {
      keywords,
      keywordPlanNetwork: process.env.GOOGLE_ADS_KEYWORD_PLAN_NETWORK || DEFAULT_KEYWORD_PLAN_NETWORK,
      language,
      ...(geoTargetConstants.length ? { geoTargetConstants } : {}),
    },
  };
}

async function runGoogleAdsKeywordMetrics(requestPayload: GoogleAdsMetricRequest, accessToken: string) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = sanitizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);

  if (!developerToken) throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not configured.');
  if (!requestPayload.endpoint) throw new Error('GOOGLE_ADS_CUSTOMER_ID is not configured.');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const response = await fetch(requestPayload.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestPayload.payload),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const requestId = response.headers.get('request-id') || response.headers.get('x-request-id') || response.headers.get('x-google-ads-request-id');
    const message = getGoogleApiSafeError(payload, `Google Ads keyword metrics request failed with status ${response.status}.`);
    throw new GoogleAdsApiError(message, getGoogleAdsDiagnostics(requestPayload, loginCustomerId, response.status, requestId, payload));
  }

  return payload;
}

function getRequestedBatchId(body: UnknownRecord, searchParams: URLSearchParams) {
  return asString(body.batch_id) || asString(body.batchId) || asString(searchParams.get('batch_id')) || asString(searchParams.get('batchId'));
}

async function getKeywordRows(supabase: ReturnType<typeof getSupabaseServiceRoleClient>, batchId: string, limit: number) {
  if (!supabase) return { data: null, error: new Error(getMissingSupabaseServiceRoleEnvMessage()) };

  const metricBatchLookup = await supabase
    .from('feya_metric_request_batch_keywords_v1')
    .select('*')
    .eq('metric_batch_id', batchId)
    .limit(limit);

  if (!metricBatchLookup.error && metricBatchLookup.data?.length) return metricBatchLookup;

  const legacyBatchLookup = await supabase
    .from('feya_metric_request_batch_keywords_v1')
    .select('*')
    .eq('batch_id', batchId)
    .limit(limit);

  if (!legacyBatchLookup.error) return legacyBatchLookup;
  return metricBatchLookup.error ? metricBatchLookup : legacyBatchLookup;
}

async function handler(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as UnknownRecord) : {};
  const searchParams = request.nextUrl.searchParams;
  const dryRun = body.dry_run === undefined && body.dryRun === undefined && !searchParams.has('dry_run') && !searchParams.has('dryRun')
    ? true
    : asBoolean(body.dry_run ?? body.dryRun ?? searchParams.get('dry_run') ?? searchParams.get('dryRun'));
  const limit = clampLimit(body.limit ?? searchParams.get('limit'));

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, batch_id: null, keywords_count: 0, dry_run: dryRun, google_ads_request_ok: false, saved_rows: 0, safe_error_message: getMissingSupabaseServiceRoleEnvMessage() }, { status: 500 });
  }

  try {
    const requestedBatchId = getRequestedBatchId(body, searchParams);
    const { data: batches, error: batchError } = requestedBatchId
      ? await supabase.from('feya_metric_request_batch_v1').select('*').or(`metric_batch_id.eq.${requestedBatchId},batch_id.eq.${requestedBatchId},batchId.eq.${requestedBatchId}`).limit(1)
      : await supabase.from('feya_metric_request_batch_v1').select('*').in('batch_status', Array.from(ALLOWED_BATCH_STATUSES)).limit(25);
    if (batchError) throw new Error(batchError.message);

    const batch = requestedBatchId ? ((batches || []) as UnknownRecord[])[0] || null : ((batches || []) as UnknownRecord[]).find(isAllowedBatchStatus) || null;
    const batchId = requestedBatchId || (batch ? getBatchId(batch) : null);

    if (!batchId) {
      return NextResponse.json({ ok: true, batch_id: null, keywords_count: 0, dry_run: dryRun, google_ads_request_ok: false, saved_rows: 0, safe_error_message: 'No pending metric request batch found.' });
    }

    const { data: keywordRows, error: keywordError } = await getKeywordRows(supabase, batchId, limit);
    if (keywordError) throw new Error(keywordError.message);

    const keywords = Array.from(new Set(((keywordRows || []) as UnknownRecord[]).map(getKeyword).filter((keyword): keyword is string => Boolean(keyword)))).slice(0, limit);
    const googleAdsRequest = buildGoogleAdsRequest(keywords);

    let googleAdsRequestOk = false;
    let savedRows = 0;
    const safeError: string | null = null;

    if (!dryRun && keywords.length) {
      const accessToken = await getOAuthAccessToken();
      await runGoogleAdsKeywordMetrics(googleAdsRequest, accessToken);
      googleAdsRequestOk = true;
      // Intentionally not writing yet: target staging/snapshot table mapping is not explicit in this repo.
      savedRows = 0;
    }

    return NextResponse.json({
      ok: dryRun ? true : googleAdsRequestOk,
      batch_id: batchId,
      keywords_count: keywords.length,
      dry_run: dryRun,
      google_ads_request_ok: googleAdsRequestOk,
      saved_rows: savedRows,
      safe_error_message: safeError,
      google_ads_request: googleAdsRequest,
      keyword_limit: limit,
      write_mode: 'disabled_until_target_metric_table_confirmed',
    });
  } catch (error) {
    const googleAdsDiagnostics = error instanceof GoogleAdsApiError ? error.diagnostics : {};
    return NextResponse.json({ ok: false, batch_id: null, keywords_count: 0, dry_run: dryRun, google_ads_request_ok: false, saved_rows: 0, safe_error_message: safeErrorMessage(error, 'Google Ads keyword metrics endpoint failed.'), ...googleAdsDiagnostics }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
