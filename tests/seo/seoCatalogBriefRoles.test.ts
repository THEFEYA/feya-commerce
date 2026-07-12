import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { isImageOnlySeoBucket } from '../../lib/seoKeywordBucket.ts';

test('keeps approved product_or_alt primary as a product keyword', () => {
  assert.equal(isImageOnlySeoBucket('product_or_alt'), false);
  assert.equal(isImageOnlySeoBucket('image_alt'), true);
  assert.equal(isImageOnlySeoBucket('visual_search'), true);
});
