/**
 * Read-only Google Ads demand probe for one owner-approved Preview branch (2026-11-24).
 *
 * Reuses the existing provider transport (lib/googleAdsProvider.ts). It never writes to Supabase,
 * never creates campaigns, never assigns keyword roles and is not an import path: the atomic
 * evidence import (`/api/internal/google-ads-keyword-metrics`) remains the only route that may
 * store observations, behind its own flags and contracts.
 *
 * Access boundary: Vercel Deployment Protection of this single Preview branch, as for the
 * owner-approved preview branches in lib/ownerPreviewPolicy.ts. Production, other branches,
 * other projects and local runs are refused before the request body is read.
 */
import {
  GoogleAdsApiError,
  getGoogleAdsCustomerContext,
  getOAuthAccessToken,
  runGoogleAdsKeywordMetrics,
} from './googleAdsProvider.ts';

export const DEMAND_PROBE_BRANCH = 'work/google-ads-demand-probe-20261124';
export const DEMAND_PROBE_PROJECT_ID = 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID';
export const DEMAND_PROBE_MAX_KEYWORDS = 200;
/** Last twelve complete months known to be available at capture time; same window as the 24.11 Keyword Planner UI receipt. */
export const DEMAND_PROBE_PERIOD = { start: { year: 2025, month: 'NOVEMBER' }, end: { year: 2026, month: 'OCTOBER' } } as const;

const ALLOWED_CUSTOMERS = new Set(['2333697098', '1687683400']);
const ALLOWED_LOGIN_CUSTOMER = '3332427758';
const SENSITIVE = /(Bearer\s+\S+|refresh[_-]?token\S*|client[_-]?secret\S*|access[_-]?token\S*)/gi;

type Env = Record<string, string | undefined>;
type UnknownRecord = Record<string, unknown>;

/** Server-provided deployment metadata only; never request headers. */
export function demandProbeDeploymentAllowed(env: Env) {
  return env.VERCEL === '1'
    && env.VERCEL_ENV === 'preview'
    && env.VERCEL_PROJECT_ID === DEMAND_PROBE_PROJECT_ID
    && env.VERCEL_GIT_COMMIT_REF === DEMAND_PROBE_BRANCH;
}

/** Wave 1: 112 current PDP primaries + 53 cluster seeds (couples, armor colour/part, performer, drag, two-piece sets, men). */
const WAVE_1: readonly string[] = Object.freeze([
  "black and gold corset skirt set", "black and gold festival outfits", "black bodysuit halloween costume",
  "black goth costume", "black harness outfit", "black leather rave outfit", "black rave costume",
  "black stage outfit", "bodysuit halloween costume", "burning man costumes for women", "chest harness",
  "costumes for drag queens", "cyberpunk rave outfit", "dance costume for ladies", "dance costume red",
  "dark witch costume", "female stage outfits", "festival bodysuit", "festival couple costume",
  "festival fringe outfit", "futuristic armor costume", "futuristic bodysuit", "futuristic couple costume",
  "futuristic robot costume", "gold and white festival outfit", "gold body harness",
  "gold bodysuit costume with horns", "gold bodysuit for women", "gold bunny costume",
  "gold burning man outfit", "gold cat costume", "gold corset costume", "gold dance costume",
  "gold desert goddess costume", "gold dragon cosplay costume", "gold festival headpiece",
  "gold festival outfit", "gold festival skirt and top set", "gold futuristic stage outfit",
  "gold goddess armor costume", "gold goddess festival outfit", "gold goddess festival skirt and top set",
  "gold horn costume", "gold maleficent-inspired costume", "gold performance costume", "gold shoulder armor",
  "gold showgirl costume", "gold spine and tail costume", "gold stage costume set",
  "gold stage outfit with headpiece", "gold top and skirt set", "gold witch costume",
  "halloween costume with black bodysuit", "halloween costumes with red bodysuit", "harness festival outfit",
  "harness top outfit", "holographic alien costume", "holographic festival outfit", "holographic outfit",
  "holographic rave outfit", "holographic stage outfit", "holographic top and skirt set",
  "holographic wings costume", "leather body harness fashion", "leather harness outfit",
  "maleficent horns headpiece", "matching couple festival outfits", "men's gold burning man outfit",
  "mens burning man costume", "metallic silver skirt outfit", "metallic top and skirt set",
  "mirror bunny costume", "mirror dance costume", "performance bodysuit", "plague doctor costume",
  "rave bodysuit", "rave harness", "rave outfit with skirt", "rave skirt and top set",
  "red dragon cosplay costume", "red futuristic costume", "red stage outfit", "robot arm armor",
  "robot armor costume", "sci fi armor costume", "silver belt and necklace set", "silver body harness",
  "silver festival outfit", "silver festival skirt and top set", "silver fringe outfit",
  "silver futuristic costume", "silver futuristic couple costume", "silver futuristic lingerie set",
  "silver futuristic top and belt set", "silver gogo dancer outfit", "silver metallic bodysuit",
  "silver metallic dress costume", "silver metallic outfit", "silver outfit", "silver rave outfit",
  "silver sci-fi costume", "silver spine costume", "silver stage costume", "silver top and skirt set",
  "skirt and top set festival", "stage outfit", "stage performance outfit", "warrior armor costume",
  "white festival outfit", "white rave costume", "witch bodysuit costume", "women's body harness",
  "couples rave outfits", "rave outfits couples", "couple rave costume", "matching rave outfits for couples",
  "matching rave outfits", "matching rave costumes", "couple rave outfit ideas", "edc outfits for couples",
  "edc couple outfits", "burning man couple outfits", "coachella couple outfits", "alien couple costume",
  "astronaut couple costume", "couples disco costumes", "futuristic armor suit", "gold armor costume",
  "golden armor costume", "futuristic shoulder armor", "cyberpunk shoulder armor", "female warrior armor",
  "goddess armor", "gogo dancer outfits", "go go dancer costume", "gogo dancer dress", "performance outfits",
  "stage costumes", "stage costumes for singers", "singer stage outfits", "stage outfits for female singers",
  "stage clothes for female musicians", "drag outfits", "drag queen outfits", "drag queen dresses",
  "drag costumes", "drag show outfits", "festival two piece sets", "festival two piece outfits",
  "festival 2 piece outfits", "rave matching sets", "metallic rave outfit", "gold rave outfit",
  "white rave outfit", "futuristic rave outfit", "coachella outfits men", "coachella outfit male",
  "burning man outfits male", "mens rave costume", "male rave gear", "leather chest harness",
  "mens chest harness", "fashion harness", "body harness", "festival harness",
]);

const DEMAND_PROBE_SETS: ReadonlyMap<string, readonly string[]> = new Map([['wave1', WAVE_1]]);

/** Only predefined sets; free-form keyword input is not accepted by this probe. */
export function demandProbeKeywords(set: unknown): readonly string[] | null {
  return typeof set === 'string' ? DEMAND_PROBE_SETS.get(set) ?? null : null;
}

export function demandProbeAccount(env: Env):
  | { ok: true; customerId: string; apiVersion: string; loginCustomerClass: 'manager' | 'self' | 'none' }
  | { ok: false; code: string; login_customer_class?: string; login_customer_last4?: string } {
  const customerId = String(env.GOOGLE_ADS_CUSTOMER_ID || '').replaceAll('-', '').trim();
  const login = String(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replaceAll('-', '').trim();
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v25';
  if (!ALLOWED_CUSTOMERS.has(customerId)) return { ok: false, code: 'GOOGLE_ADS_CUSTOMER_NOT_ALLOWED' };
  // Login header may be the FEYA manager or the advertiser itself (direct access); anything else is refused.
  if (login && login !== ALLOWED_LOGIN_CUSTOMER && login !== customerId) {
    return {
      ok: false,
      code: 'GOOGLE_ADS_LOGIN_CUSTOMER_NOT_ALLOWED',
      login_customer_class: ALLOWED_CUSTOMERS.has(login) ? 'other_allowlisted_customer' : /^\d{10}$/.test(login) ? 'other_customer' : 'malformed',
      login_customer_last4: /^\d{10}$/.test(login) ? login.slice(-4) : undefined,
    };
  }
  if (!/^v\d+$/.test(apiVersion)) return { ok: false, code: 'GOOGLE_ADS_API_VERSION_INVALID' };
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET || !env.GOOGLE_ADS_REFRESH_TOKEN) {
    return { ok: false, code: 'GOOGLE_ADS_OAUTH_ENV_MISSING' };
  }
  return { ok: true, customerId, apiVersion, loginCustomerClass: !login ? 'none' : login === customerId ? 'self' : 'manager' };
}

/** Fixed reviewed profile: US (2840), English (1000), Google Search, twelve complete months. */
export function demandProbePayload(keywords: readonly string[]) {
  if (keywords.length < 1 || keywords.length > DEMAND_PROBE_MAX_KEYWORDS) throw new Error('Select 1-200 keywords.');
  if (new Set(keywords).size !== keywords.length) throw new Error('Duplicate keyword.');
  for (const keyword of keywords) {
    if (!keyword || keyword !== keyword.trim().toLowerCase().replace(/\s+/g, ' ') || keyword.length > 80 || keyword.split(' ').length > 10) {
      throw new Error('Keyword is not normalized or exceeds Google limits.');
    }
  }
  return {
    keywords: [...keywords],
    geoTargetConstants: ['geoTargetConstants/2840'],
    language: 'languageConstants/1000',
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    includeAdultKeywords: false,
    historicalMetricsOptions: { yearMonthRange: DEMAND_PROBE_PERIOD },
  };
}

const keep = (value: unknown) => (value === undefined ? null : value);
const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Raw provider values are preserved (integers may arrive as strings); null is never turned into zero. */
export function demandProbeObservations(keywords: readonly string[], providerPayload: unknown) {
  const results = providerPayload && typeof providerPayload === 'object' && Array.isArray((providerPayload as UnknownRecord).results)
    ? (providerPayload as { results: unknown[] }).results : null;
  if (!results) throw Object.assign(new Error('Provider result shape is unknown.'), { safeCode: 'PROVIDER_RESULT_SHAPE_UNKNOWN' });
  const observations = results.map((value) => {
    const row = (value && typeof value === 'object' ? value : {}) as UnknownRecord;
    const metrics = (row.keywordMetrics && typeof row.keywordMetrics === 'object' ? row.keywordMetrics : {}) as UnknownRecord;
    const monthly = Array.isArray(metrics.monthlySearchVolumes) ? metrics.monthlySearchVolumes : [];
    return {
      returned_keyword: keep(row.text),
      close_variants: Array.isArray(row.closeVariants) ? row.closeVariants.filter((v) => typeof v === 'string') : [],
      avg_monthly_searches: keep(metrics.avgMonthlySearches),
      competition: keep(metrics.competition),
      competition_index: keep(metrics.competitionIndex),
      low_top_of_page_bid_micros: keep(metrics.lowTopOfPageBidMicros),
      high_top_of_page_bid_micros: keep(metrics.highTopOfPageBidMicros),
      monthly_search_volumes: monthly.map((item) => {
        const m = (item && typeof item === 'object' ? item : {}) as UnknownRecord;
        return { year: keep(m.year), month: keep(m.month), monthly_searches: keep(m.monthlySearches) };
      }),
    };
  });
  const returned = new Set(observations.flatMap((o) => [o.returned_keyword, ...o.close_variants]).map(norm));
  return {
    returned_count: observations.length,
    missing_requested_keywords: keywords.filter((k) => !returned.has(norm(k))),
    observations,
  };
}

type ProbeDeps = {
  getToken: typeof getOAuthAccessToken;
  getContext: typeof getGoogleAdsCustomerContext;
  run: typeof runGoogleAdsKeywordMetrics;
  now: () => Date;
};
const DEFAULT_DEPS: ProbeDeps = { getToken: getOAuthAccessToken, getContext: getGoogleAdsCustomerContext, run: runGoogleAdsKeywordMetrics, now: () => new Date() };
const safeMessage = (error: unknown) => (error instanceof Error ? error.message : '').replace(SENSITIVE, '[REDACTED]').slice(0, 200) || null;

/** One provider request per call. No retries, no persistence. */
export async function runDemandProbe(keywords: readonly string[], env: Env, deps: ProbeDeps = DEFAULT_DEPS) {
  const base = { production_db_writes: 0, data_written: false, ai_calls: 0, campaigns_changed: 0 } as const;
  const account = demandProbeAccount(env);
  if (!account.ok) return { ...account, ok: false as const, ...base };
  const payload = demandProbePayload(keywords);
  try {
    const token = await deps.getToken();
    const context = await deps.getContext(account.customerId, token);
    if (!context.currencyCode || !context.timeZone) return { ok: false as const, code: 'ACCOUNT_CONTEXT_UNAVAILABLE', ...base };
    const endpoint = `https://googleads.googleapis.com/${account.apiVersion}/customers/${account.customerId}:generateKeywordHistoricalMetrics`;
    const result = await deps.run({ customerId: account.customerId, endpoint, payload }, token);
    return {
      ok: true as const,
      code: 'GOOGLE_ADS_DEMAND_PROBE_OK',
      mode: 'OFFICIAL_GOOGLE_ADS_READ_ONLY',
      captured_at: deps.now().toISOString(),
      request_id: keep(result.requestId),
      api_version: account.apiVersion,
      customer_id: account.customerId,
      login_customer_class: account.loginCustomerClass,
      account_currency: context.currencyCode,
      account_time_zone: context.timeZone,
      request: payload,
      ...demandProbeObservations(keywords, result.payload),
      null_policy: 'missing keyword = no Google row, not zero; close variants share one metric set and are never summed',
      ...base,
    };
  } catch (error) {
    if (error instanceof GoogleAdsApiError) {
      const d = error.diagnostics;
      return { ok: false as const, code: 'GOOGLE_ADS_PROVIDER_ERROR', http_status: d.google_ads_http_status, provider_error_status: d.google_ads_error_status, provider_error_codes: d.google_ads_error_codes, request_id: d.google_ads_request_id, safe_error_message: d.google_ads_error_message, ...base };
    }
    const code = (error as { safeCode?: string } | null)?.safeCode ?? 'OAUTH_OR_RUNTIME_ERROR';
    return { ok: false as const, code, safe_error_message: safeMessage(error), ...base };
  }
}
