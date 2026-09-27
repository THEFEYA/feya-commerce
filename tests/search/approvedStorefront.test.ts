import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approvedContentReviewMode, selectApprovedStorefrontCopy } from '../../lib/seoApprovedStorefrontPolicy.ts';
import { previewMetadataReview } from '../../lib/seoMetadataReview.ts';
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const manifest = json('config/approved-content-review-bindings.json');
const drafts = json('docs/search/approved-catalog-content-capture-20260924.json').products;
const products = json('docs/search/approved-catalog-storefront-capture-20260924.json').products;
const bindings = json('docs/search/approved-catalog-content-bindings-20260924.json').entries;
const reviews = json('docs/search/metadata-distinction-review-20260924.json').rows;
const fixture = () => ({ product: structuredClone(products[0]), page: structuredClone(products[0]), draft: structuredClone(drafts[0]) });

test('all 208 current versions can feed the existing PDP; no review-only proposal leaks into approved text', () => {
  assert.equal(manifest.entries.length, 208);
  for (const binding of manifest.entries) {
    const product = products.find((p: any) => p.canonical_product_id === binding.canonical_product_id);
    const draft = drafts.find((d: any) => d.id === binding.draft_id);
    const copy = selectApprovedStorefrontCopy({ product, page: product, draft }, binding);
    assert.ok(copy); assert.equal(copy.metadata.title, draft.seo_title);
    assert.equal(copy.draft.h1, draft.h1); assert.equal(copy.draft.intro, draft.intro);
    assert.equal(copy.draft.pdp_blocks.length, 4);
  }
});
test('missing/unknown release, production target and disabled auth cannot activate review', () => {
  const env = { FEYA_APPROVED_CONTENT_REVIEW: manifest.version, VERCEL_ENV: 'preview', FEYA_ADMIN_AUTH_REQUIRED: 'true' };
  assert.equal(approvedContentReviewMode({}, manifest.version), 'disabled');
  assert.equal(approvedContentReviewMode(env, manifest.version), 'review');
  for (const patch of [{ FEYA_APPROVED_CONTENT_REVIEW: 'true' }, { VERCEL_ENV: 'production' }, { VERCEL_ENV: undefined }, { FEYA_ADMIN_AUTH_REQUIRED: 'false' }]) {
    assert.equal(approvedContentReviewMode({ ...env, ...patch }, manifest.version), 'blocked');
  }
});
test('version drift, latest replacement, revoked approval, payload or route drift fail closed', () => {
  for (const mutate of [
    (x: any) => x.draft.updated_at = '2026-09-24T23:59:59Z',
    (x: any) => x.draft.updated_at = x.draft.updated_at.replace('616961', '616962'),
    (x: any) => x.draft.id = 'another-draft',
    (x: any) => x.draft.review_status = 'changes_requested',
    (x: any) => x.draft.archived_at = '2026-09-24',
    (x: any) => x.draft.agent_output_snapshot.pdp_blocks[0].body += ' altered',
    (x: any) => x.page.seo_page_id = 'another-page',
    (x: any) => x.page.url_path += '-moved',
  ]) { const x = fixture(); mutate(x); assert.equal(selectApprovedStorefrontCopy(x, manifest.entries[0]), null); }
  const same = fixture(); same.draft.updated_at = same.draft.updated_at.replace(' ', 'T') + ':00';
  assert.ok(selectApprovedStorefrontCopy(same, manifest.entries[0]));
});
test('metadata proposals preserve descriptions and reject unknown fields, stale sources and wrong product identity', () => {
  for (const review of reviews.filter((r: any) => r.status === 'proposed')) {
    const b = bindings.find((b: any) => b.identity.canonical_product_id === review.canonical_product_id);
    const original = JSON.stringify(b), result = previewMetadataReview(b.payload, b.identity, review);
    assert.deepEqual(result.draft.pdp_blocks, b.payload.draft.pdp_blocks);
    assert.equal(result.draft.intro, b.payload.draft.intro); assert.equal(result.metadata.description, b.payload.metadata.description);
    assert.equal(JSON.stringify(b), original);
    for (const patch of [{ proposed: { intro: 'Overwrite' } }, { source_content_sha256: 'changed' }, { canonical_product_id: 'other' }, { status: 'held' }]) {
      assert.throws(() => previewMetadataReview(b.payload, b.identity, { ...review, ...patch }));
    }
  }
});
