import test from 'node:test';
import assert from 'node:assert/strict';
import {productTitle} from '../../lib/storefront.ts';
import type {StorefrontProduct} from '../../lib/types.ts';

test('unavailable approved catalog does not crash home image and carousel alt generation',()=>{
  assert.equal(productTitle(undefined),'');
  assert.equal(productTitle(null),'');
  assert.equal(productTitle(undefined)||'TheFEYA hero','TheFEYA hero');
  assert.equal(productTitle(undefined)||'Shoulder armor','Shoulder armor');
});

test('existing nonempty product cards keep exact approved title semantics',()=>{
  const product={card_title:'Approved card',h1:'Approved H1'} as StorefrontProduct;
  assert.equal(productTitle(product),'Approved card');
  assert.equal(productTitle({card_title:'',h1:'Approved H1'} as StorefrontProduct),'Approved H1');
  assert.equal(productTitle({card_title:'',h1:''} as StorefrontProduct),'Atelier piece');
});
