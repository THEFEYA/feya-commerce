import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { assessLaunchCandidate, findSavedPrimaryOverlaps } from '../lib/searchLaunchCohort.ts';

type Row = Record<string, unknown>;
const paths = ['docs/search/inventory-capture-20260924.json', 'docs/search/launch-scope-capture-20260924.json', 'docs/search/owner-launch-scope-20260924.json',
  'docs/search/launch-pilot-content-capture-20260924.json', 'docs/search/launch-pilot-output-capture-20260924.json'];
const texts = paths.map(p => readFileSync(p, 'utf8'));
const [inventory, capture, directive, contentCapture, outputCapture] = texts.map(t => JSON.parse(t));
const drafts: Row[] = capture.drafts;
const byProduct = new Map(drafts.map(d => [String(d.canonical_product_id), d]));
assert.equal(byProduct.size, drafts.length, 'Latest draft source must be unique per product');
const ids: string[] = directive.deferred_groups.flatMap((g: { product_ids: string[] }) => g.product_ids);
assert.equal(new Set(ids).size, ids.length);
const pages = new Map<string, Row>(inventory.pages.map((p: Row) => [String(p.canonical_product_id), p]));
const assessments = inventory.products.map((product: Row) => ({
  ...assessLaunchCandidate({ product, draft: byProduct.get(String(product.canonical_product_id)), bank: capture.bank, deferredIds: new Set(ids) }),
  seo_page_id: pages.get(String(product.canonical_product_id))?.seo_page_id ?? null,
  url_path: pages.get(String(product.canonical_product_id))?.url_path ?? null,
}));
assert.equal(new Set(assessments.map((r: Row) => r.canonical_product_id)).size, inventory.products.length);
for (const id of ids) assert.ok(assessments.some((r: Row) => r.canonical_product_id === id), 'Deferred ID absent from current inventory');
const pilot = directive.pilot_product_ids.map((id: string) => {
  const row = assessments.find((r: Row) => r.canonical_product_id === id);
  assert.equal(row?.state, 'candidate_preflight', 'Proposed pilot no longer has its evidence prerequisites');
  for (const source of [contentCapture, outputCapture]) {
    const matches = source.products.filter((p: Row) => p.canonical_product_id === id);
    assert.equal(matches.length, 1, 'Pilot content source missing or ambiguous');
    assert.equal(matches[0].id, row.draft_id, 'Pilot draft ID changed');
    assert.equal(matches[0].full_record_md5, row.draft_record_md5, 'Pilot draft version changed between captures');
  }
  return row;
});
assert.equal(new Set(pilot.map((r: Row) => r.canonical_product_id)).size, pilot.length);
const overlaps = findSavedPrimaryOverlaps(drafts);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const report = {
  contract_version: 'launch_cohort_preflight_v1', captured_on: capture.captured_on,
  source_fingerprints: paths.map((path, i) => ({ path, sha256: sha(texts[i]) })),
  implementation_fingerprints: ['lib/searchLaunchCohort.ts', 'lib/storefrontSellableOffer.ts', 'lib/storefrontOwnerReviewedCorrections.ts', 'lib/storefrontReconciledOfferCorrections.ts']
    .map(path => ({ path, sha256: sha(readFileSync(path, 'utf8')) })),
  scope: 'Offline work priority from non-atomic read-only captures. Revalidate live versions before release. Existing approval records are not invalidated by a backlog assessment.',
  summary: { catalog_products: assessments.length, latest_drafts: drafts.length,
    approved_drafts: drafts.filter(d => d.review_status === 'approved').length,
    deferred_products: ids.length, preflight_candidates: assessments.filter((r: Row) => r.state === 'candidate_preflight').length,
    review_backlog: assessments.filter((r: Row) => r.state === 'review_backlog').length,
    proposed_pilot: pilot.length, saved_primary_overlap_groups: overlaps.length },
  proposed_pilot: pilot, assessments, saved_primary_overlaps: overlaps,
  remaining_release_checks: ['Live truth/draft/decision version binding', 'CQA of existing text and physical scope',
    'Accountable query ownership and overlapping page decisions', 'Exact purchasable tuple/server quote and order flow',
    'Confirmed company identity/domain/policies', 'Approved-draft storefront rendering, canonical, links, sitemap and robots',
    'Protected admin and independent company/commerce/search release gates'],
  legacy_readiness_view_note: 'Captured DB gates are observations, not the new scoped release policy. Reassess per selected release; GSC bulk export and deferred assortment are not unconditional pre-index prerequisites.',
  writes_performed: 0, approvals_changed: 0, can_publish: false, can_index: false, can_enable_checkout: false,
};
const output = JSON.stringify(report, null, 2) + '\n';
const out = 'docs/search/launch-cohort-report-20260924.json';
if (process.argv.includes('--check')) assert.equal(readFileSync(out, 'utf8'), output, 'Regenerate and review launch-cohort report');
else writeFileSync(out, output);
console.log(JSON.stringify(report.summary));
