import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_KEYS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
  'GOOGLE_ADS_CUSTOMER_ID',
  'FEYA_INTERNAL_API_TOKEN',
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

type OAuthCheckResult = {
  ok: boolean;
  accessTokenReceived: boolean;
  accessToken?: string;
  safeErrorMessage: string | null;
};

type GoogleAdsApiCheckResult = {
  ok: boolean;
  status: string | null;
  errorType: string | null;
  safeErrorMessage: string | null;
};

function getPresentEnv() {
  return REQUIRED_ENV_KEYS.reduce<Record<RequiredEnvKey, boolean>>((present, key) => {
    present[key] = Boolean(process.env[key]);
    return present;
  }, {} as Record<RequiredEnvKey, boolean>);
}

function getMissingEnv(presentEnv: Record<RequiredEnvKey, boolean>) {
  return REQUIRED_ENV_KEYS.filter((key) => !presentEnv[key]);
}

function sanitizeCustomerId(customerId: string | undefined) {
  return customerId?.replace(/-/g, '').trim();
}

function getSafeErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  return fallback;
}

function getGoogleApiSafeError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return { message: fallback, type: null };

  const error = 'error' in payload ? payload.error : null;
  if (!error || typeof error !== 'object') return { message: fallback, type: null };

  const message = 'message' in error ? getSafeErrorMessage(error.message, fallback) : fallback;
  const status = 'status' in error && typeof error.status === 'string' ? error.status : null;
  const code = 'code' in error && typeof error.code === 'number' ? String(error.code) : null;
  const type = status || code;

  return { message, type };
}

async function runOAuthCheck(): Promise<OAuthCheckResult> {
  if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return {
      ok: false,
      accessTokenReceived: false,
      safeErrorMessage: 'Google Ads OAuth environment variables are not fully configured.',
    };
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => ({}))) as { access_token?: unknown; error?: unknown; error_description?: unknown };
    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : undefined;

    if (response.ok && accessToken) {
      return { ok: true, accessTokenReceived: true, accessToken, safeErrorMessage: null };
    }

    return {
      ok: false,
      accessTokenReceived: Boolean(accessToken),
      safeErrorMessage: getSafeErrorMessage(payload.error_description || payload.error, `OAuth token request failed with status ${response.status}.`),
    };
  } catch {
    return {
      ok: false,
      accessTokenReceived: false,
      safeErrorMessage: 'OAuth token request failed.',
    };
  }
}

async function runGoogleAdsApiCheck(accessToken?: string): Promise<GoogleAdsApiCheckResult> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = sanitizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);

  if (!accessToken) {
    return { ok: false, status: null, errorType: null, safeErrorMessage: 'No OAuth access token was available for Google Ads API check.' };
  }

  if (!developerToken) {
    return { ok: false, status: null, errorType: null, safeErrorMessage: 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.' };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    };

    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId;
    }

    const response = await fetch('https://googleads.googleapis.com/v24/customers:listAccessibleCustomers', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true, status: String(response.status), errorType: null, safeErrorMessage: null };
    }

    const payload = await response.json().catch(() => null);
    const safeError = getGoogleApiSafeError(payload, `Google Ads API request failed with status ${response.status}.`);

    return {
      ok: false,
      status: String(response.status),
      errorType: safeError.type,
      safeErrorMessage: safeError.message,
    };
  } catch {
    return { ok: false, status: null, errorType: null, safeErrorMessage: 'Google Ads API request failed.' };
  }
}

export async function GET(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const presentEnv = getPresentEnv();
  const missingEnv = getMissingEnv(presentEnv);
  const envOk = missingEnv.length === 0;
  const oauthCheck = await runOAuthCheck();
  const googleAdsApiCheck = await runGoogleAdsApiCheck(oauthCheck.accessToken);
  const safeErrorMessage = oauthCheck.safeErrorMessage || googleAdsApiCheck.safeErrorMessage;

  return NextResponse.json({
    ok: envOk && oauthCheck.ok && googleAdsApiCheck.ok,
    env_ok: envOk,
    oauth_ok: oauthCheck.ok,
    google_ads_api_ok: googleAdsApiCheck.ok,
    missing_env: missingEnv,
    present_env: presentEnv,
    access_token_received: oauthCheck.accessTokenReceived,
    google_ads_api_status: googleAdsApiCheck.status,
    google_ads_api_error_type: googleAdsApiCheck.errorType,
    safe_error_message: safeErrorMessage,
    timestamp: new Date().toISOString(),
  });
}
