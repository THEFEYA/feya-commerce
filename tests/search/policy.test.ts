import test from 'node:test';
import assert from 'node:assert/strict';
import { assessSearchPage, auditOwnership, findParentCycles, isCanonicalPagePath } from '../../lib/searchPortfolioPolicy.ts';
import type { BasePage, PageSpec, MembershipEvidence, QueryOwnership } from '../../lib/searchPortfolioPolicy.ts';
import { validateDemandEvidence } from '../../lib/searchDemandEvidence.ts';
import type { DemandEvidence } from '../../lib/searchDemandEvidence.ts';
import { inspectSearchEnvironment } from '../../lib/searchEnvironmentGate.ts';
import { portfolioSitemapUrls, readCompletePortfolio } from '../../lib/searchSitemapPolicy.ts';

const now = new Date('2026-09-23T12:00:00Z');
const page: BasePage = { seo_page_id: 'hub', page_type: 'landing', market_code: 'US', locale: 'en', url_path: '/shop/armor', portfolio_status: 'active' };
const spec: PageSpec = { family: 'type_hub', primary_parent_page_id: 'shop', accountable_owner: 'SCO', review_state: 'approved', user_intent: 'Choose shoulder armor', primary_intent: 'Compare eligible shoulder designs', unique_value_brief: 'Verified comparison of coverage and included components', intent_evidence_status: 'confirmed', truth_status: 'confirmed', utility_rationale: null, inventory_policy: { status: 'approved', minimum_distinct_designs: 2 } };
const member = (id: string, design = id): MembershipEvidence => ({ canonical_product_id: id, design_family_key: design, status: 'eligible', orderability: 'confirmed', truth_version: 'truth-1', current_truth_version: 'truth-1' });
const ownership: QueryOwnership = { seo_page_id: 'hub', query_cluster_id: 'armor', market_code: 'US', locale: 'en', ownership_role: 'primary', ownership_status: 'active', effective_from: '2026-09-01T00:00:00Z', effective_to: null };
const assess = (patch: Partial<Parameters<typeof assessSearchPage>[0]> = {}) => assessSearchPage({ page, spec, memberships: [member('a'), member('b')], ownership: [ownership], now, ...patch });

test('complete evidence permits technical review only, never publication or indexing', () => {
  assert.deepEqual(assess().reason_codes, []);
  assert.equal(assess().decision, 'eligible_for_technical_review');
  assert.equal(assess().can_index, false);
  assert.equal(assess().can_publish, false);
});
test('color/configuration duplicates do not satisfy collection depth', () => {
  const result = assess({ memberships: [member('a', 'same-design'), member('b', 'same-design')] });
  assert.equal(result.distinct_design_count, 1);
  assert.ok(result.reason_codes.includes('insufficient_distinct_designs'));
});
test('duplicate products and stale truth prevent technical approval', () => {
  const result = assess({ memberships: [member('a'), { ...member('a'), current_truth_version: 'truth-2' }] });
  assert.ok(result.reason_codes.includes('duplicate_product_membership'));
  assert.ok(result.reason_codes.includes('membership_truth_stale_or_missing'));
});
test('unknown orderability never contributes eligible inventory', () => {
  const result = assess({ memberships: [{ ...member('a'), orderability: 'unknown' }, member('b')] });
  assert.equal(result.eligible_product_count, 1);
  assert.equal(result.unknown_product_count, 1);
  assert.equal(result.decision, 'hold');
});
test('DNA matching alone cannot approve a hub or assign query ownership', () => {
  const result = assess({ spec: { ...spec, inventory_policy: null, intent_evidence_status: 'unknown' }, ownership: [] });
  for (const reason of ['inventory_policy_not_approved', 'intent_not_confirmed', 'primary_owner_missing']) assert.ok(result.reason_codes.includes(reason));
});
test('ownership conflicts include intended/protected rows but separate markets/locales', () => {
  const other = { ...ownership, seo_page_id: 'another', ownership_status: 'protected' };
  assert.equal(auditOwnership([ownership, other], now).conflicts.length, 1);
  assert.equal(auditOwnership([ownership, { ...other, market_code: 'GB' }], now).conflicts.length, 0);
  assert.ok(assess({ ownership: [ownership, other] }).reason_codes.includes('primary_ownership_conflict'));
});
test('ownership periods are half-open and invalid/future periods do not grant ownership', () => {
  const end = now.toISOString();
  assert.equal(auditOwnership([{ ...ownership, effective_to: end }, { ...ownership, seo_page_id: 'next', effective_from: end }], now).current.length, 1);
  assert.equal(auditOwnership([{ ...ownership, effective_from: 'invalid' }], now).invalid.length, 1);
  assert.ok(assess({ ownership: [{ ...ownership, effective_from: '2027-01-01' }] }).reason_codes.includes('primary_owner_missing'));
});
test('only justified utility pages can omit primary ownership', () => {
  const result = assess({ page: { ...page, page_type: 'editorial' }, spec: { ...spec, family: 'guide', utility_rationale: 'Sizing instructions required for existing buyers' }, ownership: [], memberships: [] });
  assert.equal(result.decision, 'eligible_for_technical_review');
  assert.ok(assess({ spec: { ...spec, utility_rationale: 'Useful' }, ownership: [] }).reason_codes.includes('primary_owner_missing'));
});
test('canonical type mismatch and cyclic taxonomy are detectable', () => {
  assert.ok(assess({ page: { ...page, page_type: 'product' } }).reason_codes.includes('family_page_type_mismatch'));
  assert.deepEqual(findParentCycles([{ seo_page_id: 'a', primary_parent_page_id: 'b' }, { seo_page_id: 'b', primary_parent_page_id: 'a' }, { seo_page_id: 'c', primary_parent_page_id: 'a' }]), [['a', 'b']]);
});
test('public canonical paths exclude admin, facets, fragments and traversal', () => {
  for (const path of ['/admin', '/api/x', '//other.com', '/shop?color=gold', '/a/../b', '/x%2Fy', '/shop#x', '/shop/']) assert.equal(isCanonicalPagePath(path), false, path);
  for (const path of ['/', '/shop', '/products/gold-armor']) assert.equal(isCanonicalPagePath(path), true, path);
});

const context = { market: 'US', language: 'en', network: 'GOOGLE_SEARCH', now, max_age_days: 90 };
const metric: DemandEvidence = { keyword: 'Shoulder Armor', source: 'google_ads_csv', source_ref: 'sha256:fixture-only', market: 'US', language: 'en', network: 'GOOGLE_SEARCH', fetched_at: '2026-09-22', period_start: '2025-09-01', period_end: '2026-08-31', avg_monthly_searches: 0, search_volume_range: null, competition: 'HIGH', competition_index: 80, low_bid: 1, high_bid: 2, bid_currency_code: 'USD' };
test('zero remains zero and Ads competition is never organic difficulty', () => {
  const result = validateDemandEvidence(metric, context);
  assert.equal(result.usable_for_current_demand_decision, true);
  assert.equal(result.avg_monthly_searches, 0);
  assert.equal(result.competition_meaning, 'advertiser_competition');
});
test('unavailable volume remains null; ranges are not converted into estimates', () => {
  const missing = validateDemandEvidence({ ...metric, avg_monthly_searches: null }, context);
  assert.equal(missing.avg_monthly_searches, null);
  assert.equal(missing.usable_for_current_demand_decision, false);
  const range = validateDemandEvidence({ ...metric, avg_monthly_searches: null, search_volume_range: { low: 10, high: 100 } }, context);
  assert.deepEqual(range.search_volume_range, { low: 10, high: 100 });
  assert.equal(range.avg_monthly_searches, null);
});
test('freshness uses capture timestamp and preserves stale observations', () => {
  const result = validateDemandEvidence({ ...metric, fetched_at: '2026-04-01', period_start: '2025-03-01', period_end: '2026-03-31' }, context);
  assert.ok(result.warnings.includes('snapshot_stale'));
  assert.equal(result.validation_status, 'valid');
  assert.equal(result.usable_for_current_demand_decision, false);
});
test('wrong market/source, internal tokens and missing provenance cannot support demand', () => {
  const result = validateDemandEvidence({ ...metric, keyword: 'mirror_acrylic', market: 'GB', source: 'google_trends', source_ref: null }, context);
  for (const error of ['targeting_context_mismatch', 'not_google_demand_source', 'keyword_missing_or_internal_token', 'provenance_missing']) assert.ok(result.errors.includes(error));
});
test('invalid volume, currency, future capture and metric period are rejected', () => {
  const result = validateDemandEvidence({ ...metric, avg_monthly_searches: -1, bid_currency_code: null, fetched_at: '2027-01-01', period_end: '2028-01-01' }, context);
  for (const error of ['invalid_search_volume', 'bid_currency_missing_or_invalid', 'capture_date_invalid', 'metric_period_invalid']) assert.ok(result.errors.includes(error));
});

const releaseEnv = { FEYA_SEARCH_INDEXING_ENABLED: 'true', VERCEL_ENV: 'production', FEYA_CANONICAL_ORIGIN_CONFIRMED: 'true', NEXT_PUBLIC_SITE_URL: 'https://shop.example.com' };
test('preview remains noindex even if an indexing variable was inherited', () => {
  assert.equal(inspectSearchEnvironment({ ...releaseEnv, VERCEL_ENV: 'preview' }).enabled, false);
  assert.equal(inspectSearchEnvironment({ ...releaseEnv, VERCEL_ENV: undefined }).enabled, false);
});
test('explicit production origin confirmation is required; local/preview origins are rejected', () => {
  assert.equal(inspectSearchEnvironment(releaseEnv).enabled, true);
  assert.equal(inspectSearchEnvironment({ ...releaseEnv, FEYA_CANONICAL_ORIGIN_CONFIRMED: undefined }).enabled, false);
  for (const origin of ['https://foo.vercel.app', 'http://shop.example.com', 'https://127.0.0.1', 'https://shop.example.com/path', 'https://user:password@shop.example.com']) assert.equal(inspectSearchEnvironment({ ...releaseEnv, NEXT_PUBLIC_SITE_URL: origin }).enabled, false);
});
test('sitemap has no implicit home and includes only explicit eligible portfolio rows', () => {
  assert.deepEqual(portfolioSitemapUrls([], 'https://shop.example.com'), []);
  assert.deepEqual(portfolioSitemapUrls([{ seo_page_id: 'a', url_path: '/', portfolio_status: 'active', indexation_intent: 'candidate' }, { seo_page_id: 'b', url_path: '/shop', portfolio_status: 'active', indexation_intent: 'indexable' }], 'https://shop.example.com'), [{ url: 'https://shop.example.com/shop' }]);
});
test('sitemap rejects ambiguous IDs/paths and never fabricates lastmod', () => {
  const row = { seo_page_id: 'a', url_path: '/', portfolio_status: 'active', indexation_intent: 'indexable', updated_at: now.toISOString() };
  assert.throws(() => portfolioSitemapUrls([row, { ...row, seo_page_id: 'b' }], 'https://shop.example.com'));
  assert.equal('lastModified' in portfolioSitemapUrls([row], 'https://shop.example.com')[0], false);
});
test('portfolio pagination traverses API caps, not just the first short page', async () => {
  const calls: number[] = [];
  const data = Array.from({ length: 1201 }, (_, i) => i);
  const rows = await readCompletePortfolio(async (from) => { calls.push(from); return { data: data.slice(from, from + 300), error: null }; });
  assert.equal(rows.length, 1201);
  assert.deepEqual(calls, [0, 300, 600, 900, 1200, 1201]);
});
test('portfolio API failure or row budget never returns a partial sitemap', async () => {
  await assert.rejects(readCompletePortfolio(async () => ({ data: null, error: { message: 'failure' } })), /unavailable/);
  await assert.rejects(readCompletePortfolio(async () => ({ data: [1, 2], error: null }), 2, 4), /budget/);
});
