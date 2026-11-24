import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEMAND_PROBE_BRANCH,
  DEMAND_PROBE_PERIOD_24,
  PERIOD_24_MONTHS,
  alignMonthly,
  compactMetricRows,
  demandProbeIdeasPayload,
  demandProbeJob,
  demandProbeMetricsPayload,
  normalizeProbeKeyword,
  runDemandProbeJob,
  DEMAND_PROBE_PROJECT_ID,
  demandProbeAccount,
  demandProbeDeploymentAllowed,
  demandProbeKeywords,
  demandProbeObservations,
  demandProbeOAuthToken,
  demandProbePayload,
  runDemandProbe,
} from '../../lib/googleAdsDemandProbe.ts';
import { EXTRA_KEYWORD_PAGES, IDEA_SEEDS } from '../../lib/googleAdsDemandProbeSets.ts';

const route = readFileSync('app/api/preview/google-ads-demand-probe/route.ts', 'utf8');
const preview = { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: DEMAND_PROBE_PROJECT_ID, VERCEL_GIT_COMMIT_REF: DEMAND_PROBE_BRANCH };
const account = { GOOGLE_ADS_CUSTOMER_ID: '233-369-7098', GOOGLE_ADS_LOGIN_CUSTOMER_ID: '333-242-7758', GOOGLE_ADS_CLIENT_ID: 'fixture', GOOGLE_ADS_CLIENT_SECRET: 'fixture', GOOGLE_ADS_REFRESH_TOKEN: 'fixture' };

test('probe runs only on the single approved Preview deployment', () => {
  assert.equal(demandProbeDeploymentAllowed(preview), true);
  for (const env of [
    {}, { ...preview, VERCEL_ENV: 'production' }, { ...preview, VERCEL_ENV: 'development' },
    { ...preview, VERCEL_GIT_COMMIT_REF: 'main' }, { ...preview, VERCEL_PROJECT_ID: 'prj_other' }, { ...preview, VERCEL: undefined },
  ]) assert.equal(demandProbeDeploymentAllowed(env), false);
});

test('only predefined normalized sets are accepted; wave 1 fits one bounded request', () => {
  const wave = demandProbeKeywords('wave1');
  assert.ok(wave);
  assert.equal(wave.length, 165);
  assert.equal(new Set(wave).size, 165);
  assert.ok(wave.includes('couples rave outfits') && wave.includes('warrior armor costume') && wave.includes('festival two piece sets'));
  for (const set of ['wave2', '__proto__', 'constructor', '', null, 1, ['wave1'], { set: 'wave1' }]) assert.equal(demandProbeKeywords(set), null);
  assert.throws(() => (wave as string[]).push('x'));
});

test('request profile is fixed to US/en/Google Search and twelve complete months', () => {
  const payload = demandProbePayload(['couples rave outfits', 'gold shoulder armor']);
  assert.deepEqual(payload.geoTargetConstants, ['geoTargetConstants/2840']);
  assert.equal(payload.language, 'languageConstants/1000');
  assert.equal(payload.keywordPlanNetwork, 'GOOGLE_SEARCH');
  assert.equal(payload.includeAdultKeywords, false);
  assert.deepEqual(payload.historicalMetricsOptions.yearMonthRange, { start: { year: 2025, month: 'NOVEMBER' }, end: { year: 2026, month: 'OCTOBER' } });
  for (const bad of [[], ['a', 'a'], ['Upper Case'], [' padded'], ['x'.repeat(81)], ['one two three four five six seven eight nine ten eleven'], Array.from({ length: 201 }, (_, i) => `k${i}`)]) {
    assert.throws(() => demandProbePayload(bad));
  }
});

test('advertiser customer only; manager as customer, foreign login or missing OAuth refuse', () => {
  assert.deepEqual(demandProbeAccount(account), { ok: true, customerId: '2333697098', apiVersion: 'v25', loginCustomerClass: 'manager' });
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '233-369-7098' }).ok, true);
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '' }).ok, true);
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_CUSTOMER_ID: '3332427758' }).ok, false);
  assert.deepEqual(demandProbeAccount({ ...account, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '1111111111' }), { ok: false, code: 'GOOGLE_ADS_LOGIN_CUSTOMER_NOT_ALLOWED', login_customer_class: 'other_customer', login_customer_last4: '1111' });
  assert.equal((demandProbeAccount({ ...account, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '1687683400' }) as { login_customer_class?: string }).login_customer_class, 'other_allowlisted_customer');
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_API_VERSION: 'latest' }).ok, false);
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_REFRESH_TOKEN: '' }).ok, false);
});

test('observations keep raw values, null months and close-variant grouping; missing is not zero', () => {
  const out = demandProbeObservations(['couples rave outfits', 'couple rave outfits', 'no data phrase'], {
    results: [{ text: 'couples rave outfits', closeVariants: ['couple rave outfits'], keywordMetrics: { avgMonthlySearches: '1300', competition: 'HIGH', competitionIndex: '100', lowTopOfPageBidMicros: '16630749', monthlySearchVolumes: [{ year: '2025', month: 'NOVEMBER', monthlySearches: null }, { year: '2025', month: 'DECEMBER', monthlySearches: '880' }] } }],
  });
  assert.equal(out.returned_count, 1);
  assert.deepEqual(out.missing_requested_keywords, ['no data phrase']);
  assert.equal(out.observations[0].avg_monthly_searches, '1300');
  assert.equal(out.observations[0].high_top_of_page_bid_micros, null);
  assert.equal(out.observations[0].monthly_search_volumes[0].monthly_searches, null);
  assert.throws(() => demandProbeObservations(['x'], { nope: true }));
});

test('one provider request, context required, no writes; provider failure returns only safe fields', async () => {
  let runs = 0;
  const deps = {
    getToken: async () => 'fixture-access',
    getContext: async () => ({ currencyCode: 'UAH', timeZone: 'Europe/Kyiv' }),
    run: async () => { runs++; return { payload: { results: [] }, requestId: 'fixture-request' }; },
    now: () => new Date('2026-11-24T10:00:00Z'),
  };
  const ok = await runDemandProbe(['couples rave outfits'], account, deps as never);
  assert.equal(ok.ok, true);
  assert.equal(runs, 1);
  assert.equal(ok.production_db_writes, 0);
  assert.equal(JSON.stringify(ok).includes('fixture-access'), false);
  const noContext = await runDemandProbe(['couples rave outfits'], account, { ...deps, getContext: async () => ({ currencyCode: null, timeZone: null }) } as never);
  assert.equal(noContext.code, 'ACCOUNT_CONTEXT_UNAVAILABLE');
  assert.equal(runs, 1);
  const oauth = await runDemandProbe(['couples rave outfits'], account, { ...deps, getToken: async () => { throw new Error('invalid_grant refresh_token=abc'); } } as never);
  assert.equal(oauth.ok, false);
  assert.equal(JSON.stringify(oauth).includes('abc'), false);
  const refused = await runDemandProbe(['couples rave outfits'], { ...account, GOOGLE_ADS_CUSTOMER_ID: '3332427758' }, deps as never);
  assert.equal(refused.code, 'GOOGLE_ADS_CUSTOMER_NOT_ALLOWED');
  assert.equal(runs, 1);
});

test('route is POST-only, deployment-gated first, same-origin, predefined set, and never persists', () => {
  assert.match(route, /export async function POST\(/);
  assert.doesNotMatch(route, /export async function (GET|PUT|PATCH|DELETE)\(/);
  const gate = route.indexOf('demandProbeDeploymentAllowed(process.env)');
  assert.ok(gate > 0 && gate < route.indexOf("request.headers.get('origin')"));
  assert.ok(gate < route.indexOf('request.json('));
  assert.ok(route.indexOf("request.headers.get('origin')") < route.indexOf('runDemandProbe('));
  assert.ok(route.indexOf("request.headers.get('origin')") < route.indexOf('runDemandProbeJob('));
  assert.match(route, /status: 404/);
  assert.match(route, /demandProbeKeywords\(/);
  assert.match(route, /private, no-store/);
  assert.match(route, /noindex, nofollow/);
  // v2 reads bank/master pages with a SELECT only; any write verb is forbidden.
  assert.match(route, /\.select\(/);
  for (const forbidden of ['.insert(', '.upsert(', '.update(', '.delete(', '.rpc(', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'FEYA_INTERNAL_API_TOKEN', 'OPENAI_API_KEY', 'cron']) {
    assert.equal(route.includes(forbidden), false, forbidden);
  }
});

test('OAuth exchange maps only Google\'s stable error field and never echoes bodies', async () => {
  const reply = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;
  const cases: [number, string, string][] = [
    [400, '{"error":"invalid_grant","error_description":"Bad Request"}', 'GOOGLE_ADS_OAUTH_REFRESH_REJECTED'],
    [401, '{"error":"invalid_client","error_description":"Unauthorized"}', 'GOOGLE_ADS_OAUTH_CLIENT_REJECTED'],
    [400, '{"error":"unauthorized_client"}', 'GOOGLE_ADS_OAUTH_CLIENT_NOT_ALLOWED'],
    [400, 'not json', 'GOOGLE_ADS_OAUTH_REJECTED'],
    [503, '{}', 'GOOGLE_OAUTH_UNAVAILABLE'],
  ];
  for (const [status, body, code] of cases) {
    await assert.rejects(demandProbeOAuthToken(account, reply(status, body)), (e: Error & { safeCode?: string }) => e.safeCode === code && !e.message.includes('Bad Request'));
  }
  assert.equal(await demandProbeOAuthToken(account, reply(200, '{"access_token":"fixture-token"}')), 'fixture-token');
  await assert.rejects(demandProbeOAuthToken({ ...account, GOOGLE_ADS_REFRESH_TOKEN: '' }, reply(200, '{}')), (e: Error & { safeCode?: string }) => e.safeCode === 'GOOGLE_ADS_OAUTH_ENV_MISSING');
});

test('v2 jobs: only {set, market, page}; known sets, markets and page ranges', () => {
  assert.deepEqual(demandProbeJob({ set: 'wave1' }), { kind: 'wave1' });
  assert.equal(demandProbeJob({ set: 'wave1', market: 'us' }), null);
  assert.deepEqual(demandProbeJob({ set: 'bank', page: 3 }), { kind: 'metrics', source: 'bank', market: 'us', page: 3 });
  assert.deepEqual(demandProbeJob({ set: 'master', market: 'gb' }), { kind: 'metrics', source: 'master', market: 'gb', page: 0 });
  assert.equal(demandProbeJob({ set: 'extra', page: EXTRA_KEYWORD_PAGES.length - 1 })?.kind, 'metrics');
  assert.equal(demandProbeJob({ set: 'extra', page: EXTRA_KEYWORD_PAGES.length }), null);
  const idea = demandProbeJob({ set: 'ideas', page: 0 });
  assert.equal(idea?.kind, 'ideas');
  assert.equal(demandProbeJob({ set: 'ideas', page: IDEA_SEEDS.length }), null);
  for (const bad of [null, [], 'bank', { set: 'bank', keywords: ['x'] }, { set: 'bank', market: 'ua' }, { set: 'bank', market: '__proto__' }, { set: 'bank', market: 'toString' },
    { set: 'bank', page: -1 }, { set: 'bank', page: 1.5 }, { set: 'bank', page: '2' }, { set: 'bank', page: 1000 }, { set: 'other' }, { set: 'constructor' }]) {
    assert.equal(demandProbeJob(bad), null, JSON.stringify(bad));
  }
});

test('v2 manifests are bounded, normalized and every idea seed builds a valid request', () => {
  const all = EXTRA_KEYWORD_PAGES.flat();
  assert.ok(EXTRA_KEYWORD_PAGES.every((page) => page.length >= 1 && page.length <= 200));
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.every((k) => normalizeProbeKeyword(k) === k));
  assert.ok(IDEA_SEEDS.length >= 40);
  assert.equal(new Set(IDEA_SEEDS.map((s) => s.id)).size, IDEA_SEEDS.length);
  for (const seed of IDEA_SEEDS) {
    const payload = demandProbeIdeasPayload(seed, 'us') as Record<string, unknown>;
    assert.equal(payload.includeAdultKeywords, false);
    assert.deepEqual(payload.keywordAnnotation, ['KEYWORD_CONCEPT']);
    assert.ok((payload.pageSize as number) <= 5000);
    assert.equal(['keywordSeed', 'siteSeed', 'urlSeed'].filter((k) => k in payload).length, 1);
  }
  assert.throws(() => demandProbeIdeasPayload({ id: 'x', kind: 'url', url: 'https://example.com/a', pageSize: 10 }, 'us'));
  assert.throws(() => demandProbeIdeasPayload({ id: 'x', kind: 'site', site: 'not a site', pageSize: 10 }, 'us'));
  assert.throws(() => demandProbeIdeasPayload(IDEA_SEEDS[0], 'ua'));
});

test('v2 metrics payload: market geo, English, 24 complete months, Google keyword limits', () => {
  assert.equal(PERIOD_24_MONTHS.length, 24);
  assert.equal(PERIOD_24_MONTHS[0], '2024-11');
  assert.equal(PERIOD_24_MONTHS[23], '2026-10');
  const gb = demandProbeMetricsPayload(['rave outfits'], 'gb');
  assert.deepEqual(gb.geoTargetConstants, ['geoTargetConstants/2826']);
  assert.equal(gb.language, 'languageConstants/1000');
  assert.deepEqual(gb.historicalMetricsOptions.yearMonthRange, DEMAND_PROBE_PERIOD_24);
  assert.equal(normalizeProbeKeyword('  Rave   Outfits '), 'rave outfits');
  for (const bad of ['', 'x'.repeat(81), 'a b c d e f g h i j k', 'emoji \u2728', 'semi;colon']) assert.equal(normalizeProbeKeyword(bad), null);
  assert.throws(() => demandProbeMetricsPayload(['Rave Outfits'], 'us'));
  assert.throws(() => demandProbeMetricsPayload(['a', 'a'], 'us'));
});

test('monthly values align to the 24-month window; null stays null; unexpected months are reported', () => {
  const aligned = alignMonthly([{ year: 2024, month: 'NOVEMBER', monthlySearches: '10' }, { year: '2026', month: 'OCTOBER', monthlySearches: null }, { year: 2023, month: 'JANUARY', monthlySearches: '5' }]);
  assert.equal(aligned.values?.[0], 10);
  assert.equal(aligned.values?.[23], null);
  assert.deepEqual(aligned.unaligned, ['2023-JANUARY']);
  assert.equal(alignMonthly(undefined).values, null);
  const compact = compactMetricRows([{ text: 'gold harness', keywordIdeaMetrics: { avgMonthlySearches: '590', competition: 'HIGH', competitionIndex: '87', averageCpcMicros: '1200000' }, keywordAnnotations: { concepts: [{ name: 'gold', conceptGroup: { name: 'Color', type: 'NON_BRAND' } }] } }], 'keywordIdeaMetrics');
  assert.deepEqual(compact.rows[0].slice(0, 7), ['gold harness', [], 590, 'HIGH', 87, null, null]);
  assert.deepEqual((compact.rows[0][8] as { concepts: unknown[] }).concepts, [['gold', 'Color', 'NON_BRAND']]);
});

test('v2 job: one read-only page, normalized unique keywords, one provider call, meta kept, nothing persisted', async () => {
  let posts = 0;
  let lastPayload: Record<string, unknown> | null = null;
  const deps = {
    getToken: async () => 'fixture-access',
    getContext: async () => ({ currencyCode: 'UAH', timeZone: 'Europe/Kyiv' }),
    post: async (_endpoint: string, payload: unknown) => { posts++; lastPayload = payload as Record<string, unknown>; return { payload: { results: [{ text: 'rave outfits', keywordMetrics: { avgMonthlySearches: '9900', monthlySearchVolumes: [{ year: '2026', month: 'OCTOBER', monthlySearches: '12100' }] } }] }, requestId: 'fixture-request' }; },
    readPage: async () => ({ total: 3, rows: [{ keyword: 'Rave Outfits', meta: ['id1', 'Rave Outfits', 'approved_draft'] }, { keyword: 'rave outfits', meta: ['id2'] }, { keyword: 'bad;keyword', meta: ['id3'] }, { keyword: 'gold harness', meta: ['id4', 'gold harness', 'hold'] }] }),
    now: () => new Date('2026-11-24T12:00:00Z'),
  };
  const job = demandProbeJob({ set: 'bank', page: 0 });
  assert.ok(job && job.kind === 'metrics');
  const out = await runDemandProbeJob(job, account, deps) as Record<string, unknown>;
  assert.equal(out.ok, true);
  assert.equal(posts, 1);
  assert.deepEqual(out.requested, ['rave outfits', 'gold harness']);
  assert.deepEqual(out.skipped, ['bad;keyword']);
  assert.deepEqual(out.missing_requested_keywords, ['gold harness']);
  assert.equal((out.requested_meta as unknown[][]).length, 2);
  assert.deepEqual(((out.rows as unknown[][])[0][7] as unknown[]).slice(22), [null, 12100]);
  assert.equal(out.production_db_writes, 0);
  assert.deepEqual((lastPayload as unknown as Record<string, unknown>).keywords, ['rave outfits', 'gold harness']);
  assert.equal(JSON.stringify(out).includes('fixture-access'), false);
  const empty = await runDemandProbeJob(job, account, { ...deps, readPage: async () => ({ total: 3, rows: [] }) });
  assert.equal(empty.code, 'GOOGLE_ADS_PROBE_PAGE_EMPTY');
  assert.equal(posts, 1);
  const failing = await runDemandProbeJob(job, account, { ...deps, post: async () => { throw new Error('Bearer abc.def refresh_token=zzz'); } });
  assert.equal(failing.ok, false);
  assert.equal(JSON.stringify(failing).includes('zzz'), false);
  assert.equal(JSON.stringify(failing).includes('abc.def'), false);
  const refused = await runDemandProbeJob(job, { ...account, GOOGLE_ADS_CUSTOMER_ID: '3332427758' }, deps);
  assert.equal(refused.code, 'GOOGLE_ADS_CUSTOMER_NOT_ALLOWED');
});
