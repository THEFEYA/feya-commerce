import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { prepareApprovedContentProjection } from '../lib/seoApprovedContentProjection.ts';
import { auditExactCatalogCopy, findNearDescriptionPairs } from '../lib/seoCatalogCopyAudit.ts';
import { resolveStorefrontSellableOffer } from '../lib/storefrontSellableOffer.ts';

type Row = Record<string, unknown>;
const paths = ['docs/search/approved-catalog-content-capture-20260924.json', 'docs/search/approved-catalog-storefront-capture-20260924.json',
  'docs/search/launch-scope-capture-20260924.json', 'docs/search/owner-launch-scope-20260924.json', 'docs/search/owner-full-approved-catalog-20260924.json'];
const inputs = paths.map(path => readFileSync(path, 'utf8'));
const [content, storefront, previous, scope, ownerTarget] = inputs.map(text => JSON.parse(text));
const drafts: Row[] = content.products;
const products = new Map<string, Row>(storefront.products.map((p: Row) => [String(p.canonical_product_id), p]));
assert.equal(drafts.length, 208, 'Owner target currently consists of 208 exact approved records; review changes explicitly');
assert.equal(ownerTarget.target_count, drafts.length);
assert.deepEqual([...ownerTarget.target_product_ids].sort(), drafts.map(d => String(d.canonical_product_id)).sort(), 'Target product identities changed');
assert.equal(products.size, drafts.length, 'Missing or repeated storefront identity');
const previousDrafts = new Map<string, Row>(previous.drafts.map((d: Row) => [String(d.canonical_product_id), d]));
const deferred = new Set(scope.deferred_groups.flatMap((g: { product_ids: string[] }) => g.product_ids));
const projections = drafts.map(draft => {
  const product = products.get(String(draft.canonical_product_id));
  assert.ok(product); assert.equal(draft.review_status, 'approved');
  assert.equal(draft.full_record_md5, previousDrafts.get(String(draft.canonical_product_id))?.full_record_md5, 'Approved draft changed between captured versions');
  assert.ok(!deferred.has(draft.canonical_product_id), 'Approved launch scope overlaps deferred family; resolve owner scope');
  return prepareApprovedContentProjection({ product, page: product, draft });
});
const comparisons = auditExactCatalogCopy(drafts);
const nearPairs = findNearDescriptionPairs(drafts);
const copyAffected = new Set(['seo_title', 'h1', 'meta_description'].flatMap(field => comparisons[field].duplicate_groups.flatMap(g => g.product_ids)));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const rows = drafts.map((draft, i) => {
  const product = products.get(String(draft.canonical_product_id))!;
  const offer = resolveStorefrontSellableOffer(product);
  const projection = projections[i];
  return {
    canonical_product_id: draft.canonical_product_id, seo_page_id: product.seo_page_id,
    url_path: product.url_path, draft_id: draft.id, draft_updated_at: draft.updated_at,
    source_record_md5: draft.full_record_md5, content_sha256: projection.identity.content_sha256,
    approved_title: draft.seo_title, approved_h1: draft.h1,
    projection_status: projection.status, projection_errors: projection.errors,
    metadata_duplicate_review: copyAffected.has(String(draft.canonical_product_id)),
    composition_status: offer.status, composition_blockers: offer.blockers,
    stored_approval_blockers: draft.approval_blockers, stored_truth_blockers: draft.product_truth_blockers,
    metrics_status: draft.metrics_status_snapshot, cqa_status: draft.cqa_status,
    storefront_differs_from_approved: Object.fromEntries(['seo_title', 'h1', 'meta_description'].map(k => [k, product[k] !== draft[k]])),
    can_publish: false, can_index: false, can_enable_checkout: false,
  };
});
const report = {
  contract_version: 'approved_catalog_audit_v1', captured_on: content.captured_on,
  target: 'All 208 approved products; the former five-item pilot is an integration fixture, never a storefront size cap.',
  summary: { target_products: drafts.length, source_versions_preserved: drafts.length,
    projections_prepared: projections.filter(p => p.status === 'prepared').length,
    composition_resolved: rows.filter(r => r.composition_status === 'ready').length,
    composition_held: rows.filter(r => r.composition_status !== 'ready').length,
    metadata_review_products: copyAffected.size, unaffected_by_exact_metadata_duplication: drafts.length - copyAffected.size,
    exact_full_description_duplicate_groups: comparisons.description.duplicate_groups.length,
    near_description_pairs_at_review_threshold: nearPairs.length },
  source_fingerprints: paths.map((path, i) => ({ path, sha256: sha(inputs[i]) })),
  implementation_fingerprints: ['lib/seoApprovedContentProjection.ts', 'lib/seoCatalogCopyAudit.ts', 'lib/storefrontSellableOffer.ts', 'lib/storefrontOwnerReviewedCorrections.ts', 'lib/storefrontReconciledOfferCorrections.ts']
    .map(path => ({ path, sha256: sha(readFileSync(path, 'utf8')) })),
  exact_copy_comparisons: comparisons, near_description_pairs: nearPairs,
  near_duplicate_method: 'Five-word shingle Jaccard >= 0.8 over customer description bodies only. Internal review heuristic, not a Google threshold or a claim of semantic uniqueness.',
  rows,
  required_before_release: ['Exact-content/identity binding rechecked against current source', 'Addressed field-level metadata duplicates and query ownership',
    'Current physical truth, variants and order quote', 'Public rendering/canonical/links/sitemap/schema checks', 'Company/domain/policies and independent release authority'],
  preservation: { rewritten_descriptions: 0, changed_source_drafts: 0, changed_keyword_decisions: 0, model_calls: 0, production_writes: 0 },
  can_publish: false, can_index: false, can_enable_checkout: false,
};
const bindings = {
  contract_version: 'approved_catalog_content_bindings_v1', status: 'prepared_not_released', target_product_count: drafts.length,
  activation: { visible_catalog: false, purchasable: false, indexable: false },
  scope: 'Exact customer-copy projections for existing ProductDetailClient draft prop and matching metadata. No private notes, raw truth, prices, approvals or generated policies in payload.',
  entries: projections,
};
for (const [path, object] of [['docs/search/approved-catalog-audit-20260924.json', report], ['docs/search/approved-catalog-content-bindings-20260924.json', bindings]] as const) {
  const output = JSON.stringify(object, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8'), output, 'Regenerate/review artifact: ' + path);
  else writeFileSync(path, output);
}
console.log(JSON.stringify(report.summary));
