import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedPurchaseFromReceipt} from '../../lib/measurementVerifiedPurchase.ts';
import type {OwnerCartPreviewItem} from '../../lib/commerceOwnerCartReview.ts';

const pid='057fbd51-52f5-4404-b126-e5d75b8599f4';
const sku='26274d0c-81c9-44e6-9ce7-c3056c62040c';
const bag:OwnerCartPreviewItem[]=[{
  id:pid+'-line-1',canonical_product_id:pid,slug:'couple-set',title:'Couple Set',image:'',
  config:'Full Set',size:'M',color:'Gold',qty:2,price:189,currency:'EUR',
  configuration_id:sku,compare_at_unit_price_amount:null,price_contract_version:null,price_confidence_status:null,
}];
const receipt={
  kind:'customer',status:'paid',currency:'EUR',
  order_number:'FEYA-20261026-ABCD',total_minor:41300,merchandise_minor:37800,
  lines:[{title:'Couple Set',option:'Full Set',color:'Gold',size:'M',quantity:2,line_minor:37800}],
};

test('PAID customer receipt yields clean GA4 purchase with original SKU and trusted money',()=>{
  assert.deepEqual(verifiedPurchaseFromReceipt(receipt,bag),{
    transactionId:receipt.order_number,receiptId:receipt.order_number,
    currency:'EUR',value:413,items:[{
      canonical_product_id:pid,sku_id:sku,quantity:2,item_price:189,item_value:378,currency:'EUR',
    }],
  });
});

test('rejects unpaid, test payment, unverified, unknown SKU and amount mismatch',()=>{
  assert.equal(verifiedPurchaseFromReceipt({...receipt,status:'pending_payment'},bag),null);
  assert.equal(verifiedPurchaseFromReceipt({...receipt,kind:'test'},bag),null);
  assert.equal(verifiedPurchaseFromReceipt({...receipt,merchandise_minor:100},bag),null);
  assert.equal(verifiedPurchaseFromReceipt({...receipt,lines:[{...receipt.lines[0],quantity:1}]},bag),null);
  assert.equal(verifiedPurchaseFromReceipt({...receipt,total_minor:10},bag),null);
  assert.equal(verifiedPurchaseFromReceipt({...receipt,order_number:'buyer@example.com'},bag),null);
  assert.equal(verifiedPurchaseFromReceipt(receipt,[{...bag[0],configuration_id:null}]),null);
  assert.equal(verifiedPurchaseFromReceipt(receipt,[]),null);
});
