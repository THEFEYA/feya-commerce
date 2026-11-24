import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEMAND_PROBE_BRANCH,
  DEMAND_PROBE_PROJECT_ID,
  demandProbeAccount,
  demandProbeDeploymentAllowed,
  demandProbeKeywords,
  demandProbeObservations,
  demandProbePayload,
  runDemandProbe,
} from '../../lib/googleAdsDemandProbe.ts';

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
  assert.deepEqual(demandProbeAccount(account), { ok: true, customerId: '2333697098', apiVersion: 'v25' });
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_CUSTOMER_ID: '3332427758' }).ok, false);
  assert.equal(demandProbeAccount({ ...account, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '1111111111' }).ok, false);
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
  assert.match(route, /status: 404/);
  assert.match(route, /demandProbeKeywords\(/);
  assert.match(route, /private, no-store/);
  assert.match(route, /noindex, nofollow/);
  for (const forbidden of ['supabase', 'Supabase', '.insert(', '.upsert(', '.rpc(', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'FEYA_INTERNAL_API_TOKEN', 'OPENAI_API_KEY', 'cron']) {
    assert.equal(route.includes(forbidden), false, forbidden);
  }
});
