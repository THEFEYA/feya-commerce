import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { selectInventory, type InventoryInput } from '../lib/searchInventorySelection.ts';
import { resolveStorefrontSellableOffer } from '../lib/storefrontSellableOffer.ts';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const capturePath = 'docs/search/inventory-capture-20260924.json';
const captureText = readFileSync(capturePath, 'utf8');
const capture = JSON.parse(captureText);
const planText = readFileSync('docs/search/page-pilot-plan-20260924.json', 'utf8');
const plan = JSON.parse(planText);
const implementation = ['lib/storefrontSellableOffer.ts', 'lib/storefrontOwnerReviewedCorrections.ts', 'lib/storefrontReconciledOfferCorrections.ts', 'lib/searchInventorySelection.ts']
  .map(path => ({ path, sha256: sha(readFileSync(path, 'utf8')) }));
const implementationHash = sha(JSON.stringify(implementation));
type Product = Record<string, unknown> & { canonical_product_id: string; product_slug: string; world_label: string; legacy_truth_diagnostic: { blocker_codes: string[] } };
const products: Product[] = capture.products;
const baselineText = JSON.stringify(products);
const observed = products.map(p => ({ product: p, offer: resolveStorefrontSellableOffer(p) }));
const inputs: InventoryInput[] = products.map(p => ({
  canonical_product_id: p.canonical_product_id,
  snapshot_ref: 'observed_sha256:' + sha(JSON.stringify({ product: p, implementationHash })),
  storefront: p, attestations: [],
}));
if (baselineText !== JSON.stringify(products)) throw new Error('Resolver mutated captured product truth');
const expected = capture.counts.find((c: { entity: string }) => c.entity === 'storefront_v4').total;
if (products.length !== expected || new Set(products.map(p => p.canonical_product_id)).size !== expected) throw new Error('Capture incomplete or duplicate product identities');
const pageByProduct = new Map<string, Record<string, unknown>>();
for (const p of capture.pages) {
  if (p.page_type !== 'product' || pageByProduct.has(p.canonical_product_id)) throw new Error('Portfolio identity collision');
  pageByProduct.set(p.canonical_product_id, p);
}
if (products.some(p => pageByProduct.get(p.canonical_product_id)?.url_path !== '/shop/' + p.product_slug)) throw new Error('PDP identity/path mismatch');

const proposals = plan.pages.map((page: { candidate_code: string; url_path: string; primary_cluster: string | null; market_code: string; locale: string; rule: unknown }) => {
  const selection = page.rule ? selectInventory(inputs, page.rule) : [];
  const counts = { match: 0, no_match: 0, unknown: 0 };
  selection.forEach(r => counts[r.state]++);
  return {
    ...page, source_sha256: sha(captureText), selection_counts: counts,
    matched_product_count: counts.match,
    confirmed_orderable_product_count: null, confirmed_distinct_design_count: null,
    eligibility: 'hold', can_publish: false, can_index: false,
    blockers: ['page_spec_not_approved', ...(page.rule ? ['design_family_mapping_unavailable', 'inventory_policy_not_approved', 'orderability_unverified'] : []),
      ...(page.primary_cluster ? ['query_ownership_not_registered', 'search_intent_review_pending'] : ['utility_content_review_pending']),
      ...(page.candidate_code === 'EVENT-BM' ? ['event_suitability_evidence_missing'] : []), 'production_release_gate_not_passed'],
    existing_portfolio_path_matches: capture.pages.filter((p: { url_path: string }) => p.url_path === page.url_path).map((p: { seo_page_id: string }) => p.seo_page_id),
    // Every stable product identity remains in the output, including rejected
    // and unknown rows; no filtering-away of uncertainty or configured variants.
    selection: selection.map(r => ({ ...r, seo_page_id: pageByProduct.get(r.canonical_product_id)?.seo_page_id ?? null })),
  };
});
type Proposal = typeof proposals[number];
const ownership = proposals.filter((p: Proposal) => p.primary_cluster);
const ownershipConflicts = ownership.filter((p: Proposal, i: number) => ownership.some((q: Proposal, j: number) => i !== j
  && p.primary_cluster === q.primary_cluster && p.market_code === q.market_code && p.locale === q.locale));
const overlaps = [];
for (let i = 0; i < proposals.length; i++) for (let j = i + 1; j < proposals.length; j++) {
  const a = proposals[i], b = proposals[j];
  if (!a.rule || !b.rule) continue;
  const ids = (p: Proposal): string[] => p.selection.filter((s: { state: string }) => s.state === 'match').map((s: { canonical_product_id: string }) => s.canonical_product_id);
  const ai = ids(a), bi = ids(b);
  const intersection = ai.filter(id => bi.includes(id)), union = new Set([...ai, ...bi]);
  overlaps.push({ a: a.candidate_code, b: b.candidate_code, overlapping_product_ids: intersection,
    matched_subset_jaccard: ai.length && bi.length ? intersection.length / union.size : null,
    selection_complete: a.selection_counts.unknown === 0 && b.selection_counts.unknown === 0,
    interpretation: 'Known matched subset only. Unknown membership is not disjointness. Not search-intent equivalence or evidence of Google cannibalization.' });
}
const report = {
  contract_version: 'search_inventory_pilot_report_v1', captured_on: capture.captured_on,
  source_sha256: sha(captureText), plan_sha256: sha(planText), implementation,
  capture_mode: capture.capture_mode, cross_query_atomic_snapshot: false,
  source_counts: capture.counts, catalog_integrity: { unique_products: expected, preserved_product_page_ids: pageByProduct.size, pdp_paths_consistent: true },
  offer_counts: { ready: observed.filter(p => p.offer.status === 'ready').length, hold: observed.filter(p => p.offer.status === 'hold').length },
  offer_ready_meaning: 'Current selector composition resolves; not owner-approved publication, price verification, orderability or distinct-design depth.',
  raw_truth_blocked_products: products.filter(p => p.legacy_truth_diagnostic.blocker_codes.length).length,
  raw_truth_resolution: 'Raw diagnostic disagreement does not revoke later exact product/configuration owner corrections. Keep both evidence layers.',
  title_derived_burning_man_labels: products.filter(p => p.world_label === 'Burning Man').length,
  design_family_mapping: 'unavailable_in_inspected_contracts', observed_snapshot_hash_is_owner_approval: false,
  demand: { latest_database_snapshot_summary: capture.metric_summary, prior_review_path: 'docs/search/demand-audit-report-20260923.json',
    current_volume_estimate: null, meaning: 'No newer fetched_at was observed; do not upgrade the prior held evidence using an import date or this capture date.' },
  proposals, proposed_ownership_conflicts: ownershipConflicts.map((p: Proposal) => p.candidate_code), overlaps,
  unresolved_offer_queue: observed.filter(p => p.offer.status === 'hold').map(p => ({ canonical_product_id: p.product.canonical_product_id,
    seo_page_id: pageByProduct.get(p.product.canonical_product_id)?.seo_page_id,
    product_slug: p.product.product_slug, blockers: p.offer.blockers, owner: 'CPIM', action: 'Inspect existing owner decisions and exact configurations; no blanket reset or source-price rewrite.' })),
  unresolved_type_queue: observed.filter(p => p.offer.status === 'ready' && p.offer.atomic_options.some(o => /^variant(?:_|\d)/.test(o.code)))
    .map(p => ({ canonical_product_id: p.product.canonical_product_id, seo_page_id: pageByProduct.get(p.product.canonical_product_id)?.seo_page_id,
      configuration_ids: p.offer.atomic_options.map(o => o.configuration_id), owner: 'CPIM', action: 'Preserve approved numbered choices; attach scoped type evidence before hub membership.' })),
  writes_performed: 0, approvals_changed: 0, can_publish: false, can_index: false,
};
const output = JSON.stringify(report, null, 2) + '\n';
const outputPath = 'docs/search/inventory-pilot-report-20260924.json';
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) throw new Error('Inventory report differs; regenerate and review before committing');
} else writeFileSync(outputPath, output);
console.log(JSON.stringify({ products: expected, offers: report.offer_counts, candidates: proposals.map((p: Proposal) => ({ code: p.candidate_code, counts: p.selection_counts })), proposal_conflicts: ownershipConflicts.length, can_index: false }));
