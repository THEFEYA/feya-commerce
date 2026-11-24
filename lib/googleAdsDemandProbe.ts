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
  runGoogleAdsKeywordMetrics,
} from './googleAdsProvider.ts';
import { EXTRA_KEYWORD_PAGES, IDEA_SEEDS, type IdeaSeed } from './googleAdsDemandProbeSets.ts';

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

/**
 * Token exchange with the same bounded classification as lib/gscOfficialReadOnly.ts:
 * only Google's stable OAuth `error` field maps to a code; raw descriptions and bodies are discarded.
 */
export async function demandProbeOAuthToken(env: Env, fetcher: typeof fetch = fetch): Promise<string> {
  const fail = (safeCode: string) => Object.assign(new Error(safeCode), { safeCode });
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET || !env.GOOGLE_ADS_REFRESH_TOKEN) throw fail('GOOGLE_ADS_OAUTH_ENV_MISSING');
  let response: Response;
  try {
    response = await fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GOOGLE_ADS_CLIENT_ID, client_secret: env.GOOGLE_ADS_CLIENT_SECRET, refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN, grant_type: 'refresh_token' }),
    });
  } catch { throw fail('GOOGLE_OAUTH_UNAVAILABLE'); }
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw fail('GOOGLE_OAUTH_UNAVAILABLE');
    let oauthError: unknown = null;
    try { const raw = await response.text(); if (raw.length <= 4096) { const parsed: unknown = JSON.parse(raw); oauthError = parsed && typeof parsed === 'object' ? (parsed as UnknownRecord).error : null; } } catch { /* discarded */ }
    if (oauthError === 'invalid_grant') throw fail('GOOGLE_ADS_OAUTH_REFRESH_REJECTED');
    if (oauthError === 'invalid_client') throw fail('GOOGLE_ADS_OAUTH_CLIENT_REJECTED');
    if (oauthError === 'unauthorized_client') throw fail('GOOGLE_ADS_OAUTH_CLIENT_NOT_ALLOWED');
    if (oauthError === 'invalid_request') throw fail('GOOGLE_ADS_OAUTH_REQUEST_INVALID');
    throw fail('GOOGLE_ADS_OAUTH_REJECTED');
  }
  const payload: UnknownRecord | null = await response.json().catch(() => null);
  const accessToken = payload && typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
  if (!accessToken) throw fail('GOOGLE_OAUTH_INVALID_RESPONSE');
  return accessToken;
}

type ProbeDeps = {
  getToken: () => Promise<string>;
  getContext: typeof getGoogleAdsCustomerContext;
  run: typeof runGoogleAdsKeywordMetrics;
  now: () => Date;
};
const defaultDeps = (env: Env): ProbeDeps => ({ getToken: () => demandProbeOAuthToken(env), getContext: getGoogleAdsCustomerContext, run: runGoogleAdsKeywordMetrics, now: () => new Date() });
const safeMessage = (error: unknown) => (error instanceof Error ? error.message : '').replace(SENSITIVE, '[REDACTED]').slice(0, 200) || null;

/** One provider request per call. No retries, no persistence. */
export async function runDemandProbe(keywords: readonly string[], env: Env, deps: ProbeDeps = defaultDeps(env)) {
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

/* ------------------------------------------------------------------------------------------------
 * v2 (owner request 24.11, 12:28): full demand research for the SEO core.
 * - metrics: generateKeywordHistoricalMetrics for the keyword bank (approved_draft + hold, read
 *   server-side page by page), the keyword master, and a frozen `extra` manifest (GSC queries,
 *   207-PDP phrases, Keyword Planner UI phrases); markets US/GB/CA/AU, English, 24 months.
 * - ideas: generateKeywordIdeas from frozen Discover seeds (axes, audiences, funnel), site seeds
 *   (own + competitors) and own collection URLs.
 * Still read-only: no Supabase writes, no campaigns, no keyword-role changes, no retries.
 * ---------------------------------------------------------------------------------------------- */

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] as const;
/** Twenty-four complete months ending with the last complete month at capture time (October 2026). */
export const DEMAND_PROBE_PERIOD_24 = { start: { year: 2024, month: 'NOVEMBER' }, end: { year: 2026, month: 'OCTOBER' } } as const;
export const PERIOD_24_MONTHS: readonly string[] = Object.freeze(Array.from({ length: 24 }, (_, i) => {
  const index = 10 + i; // November 2024 = month index 10 of 2024
  const year = 2024 + Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}));
export const DEMAND_PROBE_MARKETS: Readonly<Record<string, string>> = Object.freeze({
  us: 'geoTargetConstants/2840', gb: 'geoTargetConstants/2826', ca: 'geoTargetConstants/2124', au: 'geoTargetConstants/2036',
});
const ENGLISH = 'languageConstants/1000';
export const DEMAND_PROBE_MAX_PAGE = 999;

export type ProbeJob =
  | { kind: 'wave1' }
  | { kind: 'metrics'; source: 'bank' | 'master' | 'extra'; market: string; page: number }
  | { kind: 'ideas'; market: string; page: number; seed: IdeaSeed };

/** Body is {set, market?, page?}; everything else is refused. Free-form keywords are never accepted. */
export function demandProbeJob(body: unknown): ProbeJob | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'set' && key !== 'market' && key !== 'page')) return null;
  const { set } = record;
  const market = record.market === undefined ? 'us' : record.market;
  const page = record.page === undefined ? 0 : record.page;
  if (typeof market !== 'string' || !Object.prototype.hasOwnProperty.call(DEMAND_PROBE_MARKETS, market)) return null;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 0 || page > DEMAND_PROBE_MAX_PAGE) return null;
  if (set === 'wave1') return record.market === undefined && record.page === undefined ? { kind: 'wave1' } : null;
  if (set === 'bank' || set === 'master') return { kind: 'metrics', source: set, market, page };
  if (set === 'extra') return page < EXTRA_KEYWORD_PAGES.length ? { kind: 'metrics', source: 'extra', market, page } : null;
  if (set === 'ideas') return page < IDEA_SEEDS.length ? { kind: 'ideas', market, page, seed: IDEA_SEEDS[page] } : null;
  return null;
}

const KEYWORD_SHAPE = /^[a-z0-9 '&.\-]+$/;
/** Google limits: <= 80 characters and <= 10 words. Returns the normalized keyword or null. */
export function normalizeProbeKeyword(value: unknown): string | null {
  const keyword = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!keyword || keyword.length > 80 || keyword.split(' ').length > 10 || !KEYWORD_SHAPE.test(keyword)) return null;
  return keyword;
}

export function demandProbeMetricsPayload(keywords: readonly string[], market: string) {
  if (keywords.length < 1 || keywords.length > DEMAND_PROBE_MAX_KEYWORDS) throw new Error('Select 1-200 keywords.');
  if (new Set(keywords).size !== keywords.length || keywords.some((k) => normalizeProbeKeyword(k) !== k)) throw new Error('Keywords must be unique and normalized.');
  const geo = DEMAND_PROBE_MARKETS[market];
  if (!geo) throw new Error('Unknown market.');
  return {
    keywords: [...keywords],
    geoTargetConstants: [geo],
    language: ENGLISH,
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    includeAdultKeywords: false,
    historicalMetricsOptions: { yearMonthRange: DEMAND_PROBE_PERIOD_24 },
  };
}

export function demandProbeIdeasPayload(seed: IdeaSeed, market: string) {
  const geo = DEMAND_PROBE_MARKETS[market];
  if (!geo) throw new Error('Unknown market.');
  const pageSize = Math.min(Math.max(1, Math.floor(seed.pageSize)), 5000);
  const base = {
    geoTargetConstants: [geo],
    language: ENGLISH,
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    includeAdultKeywords: false,
    historicalMetricsOptions: { yearMonthRange: DEMAND_PROBE_PERIOD_24, includeAverageCpc: true },
    keywordAnnotation: ['KEYWORD_CONCEPT'],
    pageSize,
  };
  if (seed.kind === 'keywords') {
    if (seed.seeds.length < 1 || seed.seeds.length > 20 || seed.seeds.some((k) => normalizeProbeKeyword(k) !== k)) throw new Error('Invalid keyword seed.');
    return { ...base, keywordSeed: { keywords: [...seed.seeds] } };
  }
  if (seed.kind === 'site') {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(seed.site)) throw new Error('Invalid site seed.');
    return { ...base, siteSeed: { site: seed.site } };
  }
  if (!/^https:\/\/thefeya\.com\/[a-z0-9/-]+$/.test(seed.url)) throw new Error('Invalid URL seed.');
  return { ...base, urlSeed: { url: seed.url } };
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
};
const asRecord = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {});

/** Monthly values aligned to PERIOD_24_MONTHS; missing months stay null; anything outside the period is reported. */
export function alignMonthly(monthly: unknown) {
  const values: (number | null)[] = PERIOD_24_MONTHS.map(() => null);
  const unaligned: string[] = [];
  if (!Array.isArray(monthly)) return { values: null, unaligned };
  for (const item of monthly) {
    const m = asRecord(item);
    const monthIndex = MONTHS.indexOf(String(m.month) as (typeof MONTHS)[number]);
    const key = `${m.year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const at = monthIndex < 0 ? -1 : PERIOD_24_MONTHS.indexOf(key);
    if (at < 0) unaligned.push(`${m.year}-${m.month}`);
    else values[at] = toNumber(m.monthlySearches);
  }
  return { values: monthly.length ? values : null, unaligned };
}

/** Compact row: [text, close_variants, avg, competition, competition_index, low_bid_micros, high_bid_micros, monthly24, extra]. */
export function compactMetricRows(results: unknown[], metricsKey: 'keywordMetrics' | 'keywordIdeaMetrics') {
  const unaligned = new Set<string>();
  const rows = results.map((value) => {
    const row = asRecord(value);
    const metrics = asRecord(row[metricsKey]);
    const aligned = alignMonthly(metrics.monthlySearchVolumes);
    aligned.unaligned.forEach((u) => unaligned.add(u));
    const closeVariants = Array.isArray(row.closeVariants) ? row.closeVariants.filter((v): v is string => typeof v === 'string') : [];
    const concepts = Array.isArray(asRecord(row.keywordAnnotations).concepts)
      ? (asRecord(row.keywordAnnotations).concepts as unknown[]).map((c) => {
        const concept = asRecord(c);
        const group = asRecord(concept.conceptGroup);
        return [typeof concept.name === 'string' ? concept.name : null, typeof group.name === 'string' ? group.name : null, typeof group.type === 'string' ? group.type : null];
      })
      : [];
    return [
      typeof row.text === 'string' ? row.text : null,
      closeVariants,
      toNumber(metrics.avgMonthlySearches),
      typeof metrics.competition === 'string' ? metrics.competition : null,
      toNumber(metrics.competitionIndex),
      toNumber(metrics.lowTopOfPageBidMicros),
      toNumber(metrics.highTopOfPageBidMicros),
      aligned.values,
      metricsKey === 'keywordIdeaMetrics' ? { average_cpc_micros: toNumber(metrics.averageCpcMicros), concepts } : null,
    ];
  });
  return { rows, unaligned_months: [...unaligned] };
}

const COLUMNS = Object.freeze(['text', 'close_variants', 'avg_monthly_searches', 'competition', 'competition_index', 'low_top_of_page_bid_micros', 'high_top_of_page_bid_micros', 'monthly_2024_11_to_2026_10', 'idea_extra']);

export type KeywordPage = { total: number; rows: { keyword: unknown; meta: unknown[] }[] };
export type ProbeV2Deps = {
  getToken: () => Promise<string>;
  getContext: typeof getGoogleAdsCustomerContext;
  post: (endpoint: string, payload: unknown, token: string) => Promise<{ payload: unknown; requestId: string | null }>;
  readPage: (source: 'bank' | 'master', page: number, pageSize: number) => Promise<KeywordPage>;
  now: () => Date;
};

class ProbeProviderError extends Error {
  readonly status: number;
  readonly providerStatus: string | null;
  readonly codes: string[];
  readonly requestId: string | null;
  constructor(status: number, providerStatus: string | null, codes: string[], requestId: string | null, message: string) {
    super(message.replace(SENSITIVE, '[REDACTED]').slice(0, 300));
    this.status = status;
    this.providerStatus = providerStatus;
    this.codes = codes;
    this.requestId = requestId;
  }
}

function errorCodes(value: unknown, depth = 0, out = new Set<string>()) {
  if (!value || depth > 8 || out.size >= 25) return out;
  if (Array.isArray(value)) { value.forEach((v) => errorCodes(v, depth + 1, out)); return out; }
  if (typeof value !== 'object') return out;
  for (const [key, nested] of Object.entries(value as UnknownRecord)) {
    if (key === 'errorCode' && nested && typeof nested === 'object') {
      for (const [codeKey, codeValue] of Object.entries(nested as UnknownRecord)) if (typeof codeValue === 'string') out.add(`${codeKey}:${codeValue}`);
    }
    errorCodes(nested, depth + 1, out);
  }
  return out;
}

/** Same headers as the provider transport (login-customer-id from env), with a longer timeout for idea generation. */
export function demandProbePost(env: Env, fetcher: typeof fetch = fetch) {
  return async (endpoint: string, payload: unknown, token: string) => {
    const login = String(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replaceAll('-', '').trim();
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (login) headers['login-customer-id'] = login;
    const response = await fetcher(endpoint, { method: 'POST', headers, body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(50_000) });
    const requestId = response.headers.get('request-id') || response.headers.get('x-request-id');
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = asRecord(asRecord(body).error);
      throw new ProbeProviderError(response.status, typeof error.status === 'string' ? error.status : null, [...errorCodes(body)], requestId,
        typeof error.message === 'string' ? error.message : `Google Ads request failed with status ${response.status}.`);
    }
    return { payload: body, requestId };
  };
}

/** One provider request per call. No retries, no persistence. */
export async function runDemandProbeJob(job: Exclude<ProbeJob, { kind: 'wave1' }>, env: Env, deps: ProbeV2Deps) {
  const base = { production_db_writes: 0, data_written: false, ai_calls: 0, campaigns_changed: 0 } as const;
  const account = demandProbeAccount(env);
  if (!account.ok) return { ...account, ok: false as const, ...base };
  const header = { set: job.kind === 'ideas' ? 'ideas' : job.source, market: job.market, page: job.page, geo: DEMAND_PROBE_MARKETS[job.market], language: ENGLISH, network: 'GOOGLE_SEARCH', period: PERIOD_24_MONTHS };
  try {
    let requested: string[] = [];
    let requestedMeta: unknown[][] | null = null;
    let skipped: string[] = [];
    let total: number | null = null;
    let payload: unknown;
    let method: 'generateKeywordHistoricalMetrics' | 'generateKeywordIdeas';
    if (job.kind === 'metrics') {
      method = 'generateKeywordHistoricalMetrics';
      let candidates: { keyword: unknown; meta: unknown[] | null }[];
      if (job.source === 'extra') {
        candidates = EXTRA_KEYWORD_PAGES[job.page].map((keyword) => ({ keyword, meta: null }));
      } else {
        const page = await deps.readPage(job.source, job.page, DEMAND_PROBE_MAX_KEYWORDS);
        total = page.total;
        candidates = page.rows;
        if (!candidates.length) return { ok: false as const, code: 'GOOGLE_ADS_PROBE_PAGE_EMPTY', ...header, total_rows: total, ...base };
      }
      const seen = new Set<string>();
      const metas: unknown[][] = [];
      for (const candidate of candidates) {
        const keyword = normalizeProbeKeyword(candidate.keyword);
        if (!keyword) { skipped.push(String(candidate.keyword ?? '').slice(0, 120)); continue; }
        if (seen.has(keyword)) continue;
        seen.add(keyword);
        requested.push(keyword);
        if (candidate.meta) metas.push(candidate.meta);
      }
      if (job.source !== 'extra') requestedMeta = metas;
      if (!requested.length) return { ok: false as const, code: 'GOOGLE_ADS_PROBE_NOTHING_VALID', ...header, skipped, ...base };
      payload = demandProbeMetricsPayload(requested, job.market);
    } else {
      method = 'generateKeywordIdeas';
      payload = demandProbeIdeasPayload(job.seed, job.market);
    }
    const token = await deps.getToken();
    const context = await deps.getContext(account.customerId, token);
    if (!context.currencyCode || !context.timeZone) return { ok: false as const, code: 'ACCOUNT_CONTEXT_UNAVAILABLE', ...header, ...base };
    const endpoint = `https://googleads.googleapis.com/${account.apiVersion}/customers/${account.customerId}:${method}`;
    const result = await deps.post(endpoint, payload, token);
    const results = Array.isArray(asRecord(result.payload).results) ? asRecord(result.payload).results as unknown[] : null;
    if (!results) {
      // An empty idea list is a valid Google answer; anything else with no `results` array is unknown.
      if (job.kind === 'ideas' && result.payload && typeof result.payload === 'object') {
        return { ok: true as const, code: 'GOOGLE_ADS_DEMAND_PROBE_OK', mode: 'OFFICIAL_GOOGLE_ADS_READ_ONLY', method, ...header, seed: job.seed, captured_at: deps.now().toISOString(), request_id: result.requestId, api_version: account.apiVersion, customer_last4: account.customerId.slice(-4), login_customer_class: account.loginCustomerClass, account_currency: context.currencyCode, columns: COLUMNS, rows: [], unaligned_months: [], ...base };
      }
      return { ok: false as const, code: 'PROVIDER_RESULT_SHAPE_UNKNOWN', ...header, request_id: result.requestId, ...base };
    }
    const compact = compactMetricRows(results, job.kind === 'ideas' ? 'keywordIdeaMetrics' : 'keywordMetrics');
    const returned = new Set(compact.rows.flatMap((row) => [row[0], ...(row[1] as string[])]).map(norm));
    return {
      ok: true as const,
      code: 'GOOGLE_ADS_DEMAND_PROBE_OK',
      mode: 'OFFICIAL_GOOGLE_ADS_READ_ONLY',
      method,
      ...header,
      ...(job.kind === 'ideas' ? { seed: job.seed } : { requested, requested_meta: requestedMeta, skipped, total_rows: total, missing_requested_keywords: requested.filter((k) => !returned.has(k)) }),
      captured_at: deps.now().toISOString(),
      request_id: result.requestId,
      api_version: account.apiVersion,
      customer_last4: account.customerId.slice(-4),
      login_customer_class: account.loginCustomerClass,
      account_currency: context.currencyCode,
      columns: COLUMNS,
      rows: compact.rows,
      unaligned_months: compact.unaligned_months,
      null_policy: 'null = Google returned no value (not zero); rows sharing one metric set are close variants and are never summed',
      ...base,
    };
  } catch (error) {
    if (error instanceof ProbeProviderError) {
      return { ok: false as const, code: 'GOOGLE_ADS_PROVIDER_ERROR', ...header, http_status: error.status, provider_error_status: error.providerStatus, provider_error_codes: error.codes, request_id: error.requestId, safe_error_message: error.message, ...base };
    }
    const code = (error as { safeCode?: string } | null)?.safeCode ?? 'OAUTH_OR_RUNTIME_ERROR';
    return { ok: false as const, code, ...header, safe_error_message: safeMessage(error), ...base };
  }
}


export function demandProbeV2Deps(env: Env, readPage: ProbeV2Deps['readPage']): ProbeV2Deps {
  return { getToken: () => demandProbeOAuthToken(env), getContext: getGoogleAdsCustomerContext, post: demandProbePost(env), readPage, now: () => new Date() };
}
