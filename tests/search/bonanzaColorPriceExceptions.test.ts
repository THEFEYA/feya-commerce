import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXACT_COLOR_PRICE_PRODUCTS,isColorPriceException,verifiedColorPriceRows}
  from '../../lib/bonanzaColorPriceExceptions.ts';
import type {StorefrontConfiguration} from '../../lib/types.ts';

const prices:StorefrontConfiguration[]=[
  {configuration_id:'brown-existing-id',configuration_color:'Brown',display_price_amount:159.31},
  {configuration_id:'black-existing-id',configuration_color:'Black',display_price_amount:130.35},
  {configuration_id:'green-existing-id',configuration_color:'Green',display_price_amount:140.01},
];

test('three and only three existing leather products retain source-specific color prices',()=>{
  assert.equal(EXACT_COLOR_PRICE_PRODUCTS.length,3);
  assert.equal(new Set(EXACT_COLOR_PRICE_PRODUCTS).size,3);
  for(const id of EXACT_COLOR_PRICE_PRODUCTS){
    assert.ok(isColorPriceException(id));
    const rows=verifiedColorPriceRows(id,prices)!;
    assert.equal(rows.length,3);
    assert.strictEqual(rows,prices,'reader may not create/edit monetary rows');
    assert.deepEqual(rows.map(row=>row.display_price_amount),[159.31,130.35,140.01]);
    assert.equal(rows.find(r=>r.configuration_color==='White'),undefined,
      'Bonanza White is not priced: must remain quote-only');
    assert.deepEqual(verifiedColorPriceRows(id,prices.slice(1)),[]);
    assert.deepEqual(verifiedColorPriceRows(id,[...prices.slice(0,2),{...prices[2],configuration_color:'Black'}]),[]);
    assert.deepEqual(verifiedColorPriceRows(id,[...prices.slice(0,2),{...prices[2],display_price_amount:null}]),[]);
  }
  assert.equal(isColorPriceException('09f51ad4-6b90-4311-aa5a-54f91cf4b7bf'),false);
  assert.equal(verifiedColorPriceRows('09f51ad4-6b90-4311-aa5a-54f91cf4b7bf',prices),null);
});

test('PDP fixes price/selector mismatches and blocks unpriced colors from cart',()=>{
  const source=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(source,/pricedColors = verifiedColorPriceRows/);
  assert.match(source,/photographedPriceRow/);
  assert.match(source,/if \(pricedColors!==null\)/);
  assert.match(source,/const observed=pricedColors\.find/);
  assert.match(source,/setConfigKey\(observed \? optionKey\(observed,options\.indexOf\(observed\)\) : ''\)/);
  assert.match(source,/pricedColors!==null && !pricedColors\.some/);
  assert.match(source,/Color requires a custom quote/);
  assert.match(source,/This color needs a custom price quote/);
  assert.doesNotMatch(source,/\.insert\(|\.update\(|\.upsert\(/);
});
