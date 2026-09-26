import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildDesignReviewPairs } from '../lib/searchDesignReview.ts';
import { RECONCILED_OFFER_CORRECTIONS, applyReconciledOfferCorrections } from '../lib/storefrontReconciledOfferCorrections.ts';
import { resolveStorefrontSellableOffer, sellableOfferPurchaseUnitLabels } from '../lib/storefrontSellableOffer.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const sourcePaths = ['docs/search/inventory-capture-20260924.json', 'docs/search/inventory-reconciliation-capture-20260924.json', 'docs/search/inventory-pilot-report-20260924.json', 'docs/search/owner-launch-scope-20260924.json'];
const sourceTexts = sourcePaths.map(p => readFileSync(p, 'utf8'));
const [baseline, capture, pilot, ownerScope] = sourceTexts.map(s => JSON.parse(s));
type Product = Record<string, unknown> & { canonical_product_id: string; product_slug: string; title: string; configurations: Record<string, unknown>[] };
type Source = { canonical_product_id: string; raw_title: string; raw_variation_1_name: string; raw_variation_2_name: string | null };
type Draft = { id: string; canonical_product_id: string; review_status: string; updated_at: string; product_truth_snapshot: Record<string, unknown> };
type Lineage = { canonical_product_id: string; configuration_id: string; public_price_amount: string; source_price_row_id: string };
const products = new Map<string, Product>(baseline.products.map((p: Product) => [p.canonical_product_id, p]));
assert.equal(products.size, 243);
assert.equal(capture.products.length, 27);
assert.equal(new Set(capture.products.map((p: Source) => p.canonical_product_id)).size, 27);
const sourceIds = new Set(capture.products.map((p: Source) => p.canonical_product_id));
const preserved = capture.baseline_offer_signatures.rows.filter((r: { canonical_product_id: string; signature_sha256: string; status: string }) => {
  if (RECONCILED_OFFER_CORRECTIONS[r.canonical_product_id]) return false;
  const current = resolveStorefrontSellableOffer(products.get(r.canonical_product_id)!);
  assert.equal(current.status, r.status);
  assert.equal(sha(current.signature || ''), r.signature_sha256);
  return true;
});
assert.equal(preserved.length, 236);

const special: Record<string, { classification: string; action: string }> = {
  '179e407a-5fed-4b42-ae19-ff220f939867': { classification: 'jacket_purchase_scope_review', action: 'Verify jacket/leggings grouped and separate choices against exact source rows; do not flatten size and piece axes.' },
  '2dddffcc-dd07-4d94-a4df-0217aac4f815': { classification: 'jacket_purchase_scope_review', action: 'Resolve mixed size/piece mapping before composition; do not manufacture a Cartesian price matrix.' },
  '40384eea-fd82-40f4-98e7-804383c42796': { classification: 'copy_approval_with_truth_hold', action: 'Preserve approved copy scope; repair bra/skirt sellable composition separately. Copy approval explicitly did not resolve the offer.' },
  '320fede3-0406-428f-8091-c7a7986e07aa': { classification: 'obsolete_source_choices', action: 'Reconcile current headpiece-only owner truth and legacy price/configuration rows; do not restore obsolete bodysuit/corset/boots/set options.' },
};
const cases = capture.products.map((s: Source) => {
  const product = products.get(s.canonical_product_id);
  assert.ok(product, 'Source row missing current product');
  const offer = resolveStorefrontSellableOffer(product);
  const manifest = RECONCILED_OFFER_CORRECTIONS[s.canonical_product_id];
  const drafts = capture.seo_drafts.filter((d: Draft) => d.canonical_product_id === s.canonical_product_id);
  if (manifest) {
    assert.equal(offer.status, 'ready');
    if (s.canonical_product_id === '40384eea-fd82-40f4-98e7-804383c42796') {
      assert.equal(ownerScope.decision_id, 'owner-launch-scope-20260924-02');
      assert.deepEqual(ownerScope.owner_product_facts.find((f: { canonical_product_id: string }) => f.canonical_product_id === s.canonical_product_id)?.facts.components, ['bra', 'skirt']);
    }
    for (const ref of manifest.evidence_refs.filter(r => r.startsWith('seo_draft:'))) {
      const [, id, scope] = ref.split(':');
      const draft = drafts.find((d: Draft) => d.id === id);
      assert.ok(draft, 'Correction evidence must be product-scoped');
      if (scope === 'approved') assert.equal(draft.review_status, 'approved');
      if (scope === 'owner_variant_guide') assert.ok(Array.isArray(draft.product_truth_snapshot.variant_guide));
    }
    const corrected = applyReconciledOfferCorrections(product);
    assert.notEqual(corrected, product, 'Exact-ID manifest did not apply');
    for (const option of corrected.configurations) {
      const original: Record<string, unknown> = product.configurations.find(c => c.configuration_id === option.configuration_id)!;
      const lineage = capture.configuration_price_lineage.filter((l: Lineage) => l.canonical_product_id === s.canonical_product_id && l.configuration_id === option.configuration_id);
      assert.equal(lineage.length, 1, 'Missing or ambiguous configuration-price join');
      assert.equal(Number(lineage[0].public_price_amount), original.display_price_amount);
      for (const key of Object.keys(original).filter(k => /price|amount|currency|discount|configuration_id/.test(k))) assert.deepEqual(option[key], original[key]);
    }
  } else assert.equal(offer.status, 'hold');
  const classification = manifest
    ? s.canonical_product_id === 'ce0a2c0a-5a95-4876-a198-70be635ca053' ? 'restored_owner_identity'
      : s.canonical_product_id === '437a20cd-27a3-4aaf-b154-3353899e0ebd' ? 'restored_owner_variant_guide' : 'restored_approved_offer'
    : special[s.canonical_product_id]?.classification || 'size_color_axis_requires_offer_mapping';
  if (classification === 'size_color_axis_requires_offer_mapping') {
    assert.match([s.raw_variation_1_name, s.raw_variation_2_name].join(' '), /size/i);
    assert.match([s.raw_variation_1_name, s.raw_variation_2_name].join(' '), /colou?r/i);
  }
  return { canonical_product_id: s.canonical_product_id, url_path: '/shop/' + product.product_slug, source_title: s.raw_title,
    classification, offer_status: offer.status, blockers: offer.blockers,
    evidence_refs: manifest?.evidence_refs || [],
    historical_drafts: drafts.map((d: Draft) => ({ id: d.id, review_status: d.review_status, updated_at: d.updated_at })),
    approval_semantics: 'Captured historical state retained. Resolved composition does not approve a new SEO draft, publication or indexability.',
    options: [...offer.atomic_options, ...offer.aggregate_options].map(o => ({ configuration_id: o.configuration_id, label: o.label,
      grouped_purchase: o.is_aggregate, component_codes: o.member_codes, factual_contents: o.member_labels,
      purchase_unit_display: sellableOfferPurchaseUnitLabels(offer, { configuration_id: o.configuration_id }),
      display_price_amount: product.configurations.find(c => c.configuration_id === o.configuration_id)?.display_price_amount ?? null,
    })),
    owner: 'CPIM', next_action: manifest ? 'Review exact draft diff and preserve all existing approval gates; no live write performed.'
      : special[s.canonical_product_id]?.action || 'Reuse Product OS to bind size/color price rows to the confirmed physical piece. Verify variant availability and existing owner decisions; no automatic family count or component per size.',
    can_publish: false, can_index: false,
  };
});
for (const id of Object.keys(RECONCILED_OFFER_CORRECTIONS)) assert.ok(sourceIds.has(id));
const classifications = Object.fromEntries([...new Set(cases.map((c: { classification: string }) => c.classification))].sort().map(k => [String(k), cases.filter((c: { classification: string }) => c.classification === k).length]));
assert.equal(classifications.size_color_axis_requires_offer_mapping, 17);
assert.equal(cases.filter((c: { offer_status: string }) => c.offer_status === 'hold').length, 20);
const targetIds: string[] = pilot.proposals.filter((p: { candidate_code: string }) => ['TYPE-ARMOR', 'TYPE-HARNESS'].includes(p.candidate_code))
  .flatMap((p: { selection: { state: string; canonical_product_id: string }[] }) => p.selection.filter(s => s.state === 'match').map(s => s.canonical_product_id));
const designReview = buildDesignReviewPairs(capture.catalog_identity, targetIds);
const report = { contract_version: 'inventory_reconciliation_report_v1', captured_on: capture.captured_on,
  baseline_commit: capture.baseline, source_fingerprints: sourcePaths.map((path, i) => ({ path, sha256: sha(sourceTexts[i]) })),
  implementation: ['scripts/audit-inventory-reconciliation.ts', 'lib/searchDesignReview.ts', 'lib/storefrontReconciledOfferCorrections.ts', 'lib/storefrontSellableOffer.ts', 'lib/storefrontOwnerReviewedCorrections.ts']
    .map(path => ({ path, sha256: sha(readFileSync(path, 'utf8')) })),
  evidence_scope: 'Read-only production captures across separate queries, not an atomic live snapshot; source identifiers join exact configuration-price rows. No new keyword metrics or image interpretation.',
  summary: { original_review_cases: 27, corrected_product_count: 7, newly_resolved_offers: 6, typed_numbered_offer: 1,
    offer_ready: pilot.offer_counts.ready, offer_hold: pilot.offer_counts.hold, unchanged_other_product_signatures: preserved.length,
    classification_counts: classifications, design_review_pair_count: designReview.proposals.length,
    products_in_review_pairs: new Set(designReview.proposals.flatMap(p => p.product_ids)).size },
  cases, design_review: { ...designReview, proposals: designReview.proposals.map(p => ({ ...p,
    product_context: p.product_ids.map(id => {
      const product = products.get(id)!;
      const offer = resolveStorefrontSellableOffer(product);
      return { canonical_product_id: id, url_path: '/shop/' + product.product_slug,
        component_codes: offer.component_codes,
        standalone_options: offer.atomic_options.map(o => ({ id: o.configuration_id, label: o.label, code: o.code })),
        grouped_options: offer.aggregate_options.map(o => ({ id: o.configuration_id, label: o.label, contents: o.member_labels })) };
    }),
    decision_options: ['same_physical_design', 'different_pieces_same_photoshoot', 'insufficient_evidence'],
    warning: 'Media overlap identifies review candidates only. Different sellable pieces can share a photoshoot. No transitive family assignment or PDP merge.',
  })) },
  writes_performed: 0, approvals_changed: 0, prices_changed: 0, product_ids_changed: 0, can_publish: false, can_index: false,
};
const path = 'docs/search/inventory-reconciliation-report-20260924.json';
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8'), output, 'Reconciliation report must be regenerated and reviewed');
else writeFileSync(path, output);
console.log(JSON.stringify(report.summary));
