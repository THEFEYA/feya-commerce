import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reviewedProductSearchTitle } from '../../lib/storefrontReviewedProductSearchTitle.ts';

const manifest = JSON.parse(readFileSync(new URL('../../config/approved-content-review-bindings.json', import.meta.url), 'utf8'));
const productId = '51487104-166f-45e0-a528-d8b27a6258d6';
const previous = 'Gold Skirt And Top Set Festival';
const approved = 'Gold Fringe Skirt and Matching Top';

test('only the approved product snapshot receives its reviewed search title', () => {
  const changed = [];
  for (const entry of manifest.entries) {
    const product = {
      canonicalProductId: entry.canonical_product_id,
      slug: entry.url_path.slice('/shop/'.length),
      contentHash: entry.content_sha256,
    };
    const title = reviewedProductSearchTitle(product, previous);
    if (title !== previous) {
      assert.equal(title, approved);
      changed.push(product.canonicalProductId);
    }
  }
  assert.deepEqual(changed, [productId]);
});

test('a different source title, slug, product or snapshot keeps its own title', () => {
  const entry = manifest.entries.find((row: {canonical_product_id: string}) => row.canonical_product_id === productId);
  assert.ok(entry);
  const product = {
    canonicalProductId: productId,
    slug: entry.url_path.slice('/shop/'.length),
    contentHash: entry.content_sha256,
  };
  assert.equal(reviewedProductSearchTitle(product, 'Revised source title'), 'Revised source title');
  assert.equal(reviewedProductSearchTitle({...product, slug: 'another-model'}, previous), previous);
  assert.equal(reviewedProductSearchTitle({...product, canonicalProductId: 'another-product'}, previous), previous);
  assert.equal(reviewedProductSearchTitle({...product, contentHash: '0'.repeat(64)}, previous), previous);
});
