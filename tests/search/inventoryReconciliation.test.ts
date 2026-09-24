import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolveStorefrontSellableOffer } from '../../lib/storefrontSellableOffer.ts';
import { applyOwnerReviewedStorefrontCorrections } from '../../lib/storefrontOwnerReviewedCorrections.ts';
import { applyReconciledOfferCorrections, RECONCILED_OFFER_CORRECTIONS } from '../../lib/storefrontReconciledOfferCorrections.ts';
import { sortedOptions } from '../../lib/storefront.ts';
import { storefrontIncludedOptions } from '../../lib/storefrontIncludedOptions.ts';
import { selectInventoryProduct } from '../../lib/searchInventorySelection.ts';
import { buildDesignReviewPairs } from '../../lib/searchDesignReview.ts';

const source = JSON.parse(readFileSync('docs/search/inventory-capture-20260924.json', 'utf8'));
const evidence = JSON.parse(readFileSync('docs/search/inventory-reconciliation-capture-20260924.json', 'utf8'));
const product = (id: string) => structuredClone(source.products.find((p: { canonical_product_id: string }) => p.canonical_product_id === id));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

test('all seven reconciliations have exact source-price lineage, preserve money/IDs and do not mutate capture', () => {
  for (const id of Object.keys(RECONCILED_OFFER_CORRECTIONS)) {
    const p = product(id), before = JSON.stringify(p), corrected = applyOwnerReviewedStorefrontCorrections(p);
    assert.equal(corrected.configurations.length, p.configurations.length);
    for (const row of corrected.configurations) {
      const original = p.configurations.find((o: { configuration_id: string }) => o.configuration_id === row.configuration_id);
      const lineage = evidence.configuration_price_lineage.find((o: { configuration_id: string }) => o.configuration_id === row.configuration_id);
      assert.equal(lineage.canonical_product_id, id);
      assert.equal(Number(lineage.public_price_amount), original.display_price_amount);
      for (const key of Object.keys(original).filter(k => /price|amount|currency|discount|configuration_id/.test(k))) assert.deepEqual(row[key], original[key], `${id}:${row.configuration_id}:${key}`);
    }
    assert.equal(JSON.stringify(p), before); assert.equal(resolveStorefrontSellableOffer(p).status, 'ready');
    assert.deepEqual(applyOwnerReviewedStorefrontCorrections(corrected), corrected, 'Idempotent');
  }
});
test('236 unrelated product signatures and states remain byte-identical to the previous committed resolver', () => {
  let unchanged = 0;
  for (const old of evidence.baseline_offer_signatures.rows) {
    if (RECONCILED_OFFER_CORRECTIONS[old.canonical_product_id]) continue;
    const current = resolveStorefrontSellableOffer(product(old.canonical_product_id));
    assert.equal(current.status, old.status); assert.equal(sha(current.signature || ''), old.signature_sha256); unchanged++;
  }
  assert.equal(unchanged, 236);
});
test('missing, extra or duplicated configuration IDs cannot apply the reconciliation manifest', () => {
  const p = product('437a20cd-27a3-4aaf-b154-3353899e0ebd');
  for (const configs of [p.configurations.slice(1), [...p.configurations, p.configurations[0]],
    p.configurations.map((r: object, i: number) => i === 0 ? p.configurations[1] : r)]) {
    const altered = { ...p, configurations: configs }; assert.equal(applyReconciledOfferCorrections(altered), altered);
  }
});
test('gold variants retain exact owner quantities, four DNA axes and grouped purchase scope', () => {
  const p = product('437a20cd-27a3-4aaf-b154-3353899e0ebd'), o = resolveStorefrontSellableOffer(p);
  const draft = evidence.seo_drafts.find((d: { id: string }) => d.id === 'ecf6d94b-4d66-4472-98a5-da577a22a45a');
  assert.equal(draft.review_status, 'not_reviewed'); // Facts do not approve copy.
  assert.equal(o.atomic_options.length, 0); assert.equal(o.aggregate_options.length, 4);
  assert.deepEqual(o.component_codes, ['arms', 'harness', 'legs', 'shoulders']);
  for (const guide of draft.product_truth_snapshot.variant_guide) {
    const option = o.aggregate_options.find(x => x.label === guide.variant)!;
    assert.deepEqual(option.member_labels, guide.contents);
    assert.deepEqual(storefrontIncludedOptions(p, { configuration_id: option.configuration_id } as never), [`${guide.variant} — ${guide.contents.join(' + ')}`]);
  }
  const input = { canonical_product_id: p.canonical_product_id, storefront: p, snapshot_ref: 'fixture', attestations: [] };
  assert.equal(selectInventoryProduct(input, { kind: 'sellable_component', codes: ['shoulders'], scope: 'standalone' }).state, 'no_match');
  assert.equal(selectInventoryProduct(input, { kind: 'sellable_component', codes: ['shoulders'], scope: 'any_configuration' }).state, 'match');
});
test('quantity-specific leg full sets resolve by ID without losing Single/Pair wording', () => {
  const p = product('e39f9164-4001-4f63-9407-a1ddd3d962dd');
  assert.deepEqual(storefrontIncludedOptions(p, { configuration_id: 'd33b481a-d6a9-4b95-8f89-97a1b290503a' } as never), ['Single Leg Cover', 'Bodysuit']);
  assert.deepEqual(storefrontIncludedOptions(p, { configuration_id: 'e7741b64-c7a1-46aa-ba91-d5376d45baba' } as never), ['Pair of Leg Covers', 'Bodysuit']);
});
test('green identity keeps source color prices separately; size-only rows and obsolete helmet choices remain held', () => {
  const green = product('ce0a2c0a-5a95-4876-a198-70be635ca053');
  assert.equal(applyOwnerReviewedStorefrontCorrections(green).canonical_color_label, 'Green');
  assert.equal(sortedOptions(green).length, 3);
  assert.deepEqual(resolveStorefrontSellableOffer(green).component_codes, ['harness']);
  for (const id of ['0cd7c558-7344-4076-91a5-86f7f5fe0ad0', '320fede3-0406-428f-8091-c7a7986e07aa']) {
    assert.equal(applyReconciledOfferCorrections(product(id)).canonical_product_id, id);
    assert.equal(resolveStorefrontSellableOffer(product(id)).status, 'hold');
  }
});
test('axis labels require confirmed bundle evidence; changing quantities changes only opted-in signatures', () => {
  const p = applyOwnerReviewedStorefrontCorrections(product('437a20cd-27a3-4aaf-b154-3353899e0ebd'));
  p.canonical_product_id = 'synthetic-unmapped';
  const before = resolveStorefrontSellableOffer(p).signature;
  p.configurations[0].bundle_component_labels = ['3 Shoulders', 'Harness', 'Garters', '2 Bracelets'];
  assert.notEqual(resolveStorefrontSellableOffer(p).signature, before);
  p.configurations[0].source_confirmed_bundle_members = false;
  assert.equal(resolveStorefrontSellableOffer(p).status, 'hold');
});

const identity = (id: string, media: string[]) => ({ canonical_product_id: id, primary_source_listing_id: null, matched_etsy_listing_id: null, raw_image_urls: media });
test('common images and empty source IDs never create design families', () => {
  const catalog = ['a','b','c','d'].map(id => identity(id, ['size-chart', 'shipping-chart']));
  const r = buildDesignReviewPairs(catalog, ['a','b']);
  assert.equal(r.proposals.length, 0); assert.equal(r.excluded_common_asset_count, 2); assert.equal(r.confirmed_distinct_design_count, null);
});
test('visual pair evidence is stable, scoped and never transitively merged or approved', () => {
  const catalog = [identity('a', ['ab1','ab2']), identity('b', ['ab1','ab2','bc1','bc2']), identity('c', ['bc1','bc2'])];
  const r = buildDesignReviewPairs(catalog, ['c','a','b','a']);
  assert.deepEqual(r.proposals.map(p => p.product_ids), [['a','b'], ['b','c']]);
  assert.equal(r.transitive_merging_performed, false);
  assert.ok(r.proposals.every(p => !p.can_assign_family && p.design_family_key === null));
  assert.deepEqual(r.proposals.map(p => p.proposal_key), buildDesignReviewPairs([...catalog].reverse(), ['a','b','c']).proposals.map(p => p.proposal_key));
  assert.throws(() => buildDesignReviewPairs([catalog[0],catalog[0]], ['a']), /Duplicate/);
  assert.throws(() => buildDesignReviewPairs(catalog, ['missing']), /coverage/);
});

test('captured reconciliation report reproduces offline with exact lineage and untouched signatures', () => {
  execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/audit-inventory-reconciliation.ts', '--check'], { stdio: 'pipe' });
});
