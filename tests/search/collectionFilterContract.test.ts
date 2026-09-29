import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('governed collection pages reuse the exact canonical Shop filter component', () => {
  const source = readFileSync('app/collections/[slug]/page.tsx','utf8');
  assert.match(source,/import \{ShopClient\} from '@\/components\/ShopClient'/);
  assert.match(source,/attachStorefrontFacets\(products\)/);
  assert.match(source,/<ShopClient products=\{facetedProducts\} embedded\/>/);
});

test('embedded ShopClient preserves membership scope and only filters the supplied products', () => {
  const source = readFileSync('components/ShopClient.tsx','utf8');
  assert.match(source,/embedded = false/);
  assert.match(source,/filterShopProducts\(products, filters\)/);
  assert.doesNotMatch(source,/fetch\(|supabase/i);
});
