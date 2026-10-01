import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareApprovedContentProjection, matchApprovedContentBinding } from '../../lib/seoApprovedContentProjection.ts';
import { auditExactCatalogCopy, findNearDescriptionPairs } from '../../lib/seoCatalogCopyAudit.ts';
import { applyReconciledOfferCorrections } from '../../lib/storefrontReconciledOfferCorrections.ts';
import { resolveStorefrontSellableOffer } from '../../lib/storefrontSellableOffer.ts';
import { storefrontIncludedOptions } from '../../lib/storefrontIncludedOptions.ts';

const drafts = JSON.parse(readFileSync('docs/search/approved-catalog-content-capture-20260924.json', 'utf8')).products;
const products = JSON.parse(readFileSync('docs/search/approved-catalog-storefront-capture-20260924.json', 'utf8')).products;
const fixture = () => { const draft = structuredClone(drafts[0]); const product = structuredClone(products.find((p: { canonical_product_id: string }) => p.canonical_product_id === draft.canonical_product_id)); return { draft, product, page: structuredClone(product) }; };
test('all 208 approved projections preserve customer strings without prices or internal review metadata', () => {
  for (const draft of drafts) {
    const product = products.find((p: { canonical_product_id: string }) => p.canonical_product_id === draft.canonical_product_id);
    const before = JSON.stringify({ product, draft });
    const result = prepareApprovedContentProjection({ product, page: product, draft });
    assert.equal(result.status, 'prepared'); assert.ok(result.payload);
    assert.equal(result.payload.metadata.title, draft.agent_output_snapshot.seo_title);
    assert.equal(result.payload.draft.h1, draft.agent_output_snapshot.h1);
    assert.deepEqual(result.payload.draft.pdp_blocks.map(b => b.body), draft.agent_output_snapshot.pdp_blocks.map((b: { body: string }) => b.body));
    assert.deepEqual(Object.keys(result.payload), ['metadata', 'draft']);
    assert.deepEqual(Object.keys(result.payload.draft.pdp_blocks[0]), ['block_key', 'placement', 'heading', 'body']);
    assert.equal(JSON.stringify({ product, draft }), before);
    assert.equal(result.can_publish, false); assert.equal(result.can_index, false); assert.equal(result.can_enable_checkout, false);
  }
});
test('approved top-level columns cannot mask a changed or malformed saved output', () => {
  for (const mutate of [(x: ReturnType<typeof fixture>) => { x.draft.agent_output_snapshot.h1 += ' changed'; },
    (x: ReturnType<typeof fixture>) => { x.draft.agent_output_snapshot.pdp_blocks.pop(); },
    (x: ReturnType<typeof fixture>) => { x.draft.agent_output_snapshot.pdp_blocks[1] = x.draft.agent_output_snapshot.pdp_blocks[0]; },
    (x: ReturnType<typeof fixture>) => { x.draft.review_status = 'not_reviewed'; },
    (x: ReturnType<typeof fixture>) => { x.draft.archived_at = '2026-09-24'; }]) {
    const input = fixture(); mutate(input);
    assert.equal(prepareApprovedContentProjection(input).payload, null);
  }
});
test('another product, page or noncanonical URL cannot inherit the saved content binding', () => {
  const input = fixture(); input.page.canonical_product_id = 'other';
  assert.equal(prepareApprovedContentProjection(input).status, 'blocked');
  for (const path of ['/admin/product', '/shop/other', '/shop/a?utm_source=x', '/shop/../admin']) {
    const changed = fixture(); changed.page.url_path = path;
    assert.equal(prepareApprovedContentProjection(changed).status, 'blocked');
  }
});
test('one exact payload hash binds metadata and PDP; changes to version, route or customer text fail', () => {
  const input = fixture(), result = prepareApprovedContentProjection(input);
  const expected = { canonical_product_id: input.product.canonical_product_id, seo_page_id: input.page.seo_page_id,
    draft_id: input.draft.id, url_path: input.page.url_path, content_sha256: result.identity.content_sha256! };
  assert.equal(matchApprovedContentBinding(result, expected), true);
  for (const field of ['canonical_product_id', 'seo_page_id', 'draft_id', 'content_sha256', 'url_path']) {
    assert.equal(matchApprovedContentBinding(result, { ...expected, [field]: 'other' }), false);
  }
  result.payload!.draft.pdp_blocks[0].body += ' tampered';
  assert.equal(matchApprovedContentBinding(result, expected), false);
});
test('keyword overlap and shared template headings do not create a full-copy duplicate', () => {
  const result = auditExactCatalogCopy(drafts);
  assert.equal(result.seo_title.duplicate_groups.length, 19); assert.equal(result.seo_title.affected_products, 43);
  assert.equal(result.h1.duplicate_groups.length, 24); assert.equal(result.h1.affected_products, 59);
  assert.equal(result.meta_description.affected_products, 0); assert.equal(result.intro.affected_products, 0);
  assert.equal(result.description.affected_products, 0);
  assert.equal(findNearDescriptionPairs(drafts).length, 0);
});
test('empty fields are missing, not duplicated; retries of one product cannot inflate the audit', () => {
  assert.throws(() => auditExactCatalogCopy([drafts[0], drafts[0]]));
  const input = [{ canonical_product_id: 'a', agent_output_snapshot: {} }, { canonical_product_id: 'b', agent_output_snapshot: {} }];
  const result = auditExactCatalogCopy(input);
  assert.equal(result.seo_title.duplicate_groups.length, 0); assert.equal(result.seo_title.missing_product_ids.length, 2);
});
test('owner-confirmed gold bra/skirt correction preserves all monetary and identity fields', () => {
  const p = structuredClone(products.find((p: { canonical_product_id: string }) => p.canonical_product_id === '40384eea-fd82-40f4-98e7-804383c42796'));
  const before = JSON.stringify(p); const corrected = applyReconciledOfferCorrections(p);
  assert.equal(resolveStorefrontSellableOffer(corrected).status, 'ready');
  assert.deepEqual(corrected.configurations.map((c: { public_label: string }) => c.public_label), ['Bra', 'Skirt', 'Full Set']);
  assert.deepEqual(storefrontIncludedOptions(corrected, corrected.configurations[2]), ['Bra', 'Skirt']);
  corrected.configurations.forEach((c: Record<string, unknown>, i: number) => {
    for (const key of Object.keys(p.configurations[i]).filter(k => /price|amount|currency|configuration_id/.test(k))) assert.deepEqual(c[key], p.configurations[i][key]);
  });
  assert.equal(JSON.stringify(p), before);
  for (const configurations of [p.configurations.slice(1), [...p.configurations, p.configurations[0]]]) {
    const altered = { ...p, configurations }; assert.equal(applyReconciledOfferCorrections(altered), altered);
  }
});
