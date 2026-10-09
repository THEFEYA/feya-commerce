import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  calculateExtraListingHandlingDraft,
  DISTINCT_LISTING_HANDLING_CONTRACT,
  EXTRA_DISTINCT_LISTING_EUR_MINOR,
} from '../../lib/commerceExtraListingHandlingEur.ts';

const a=randomUUID(),b=randomUUID(),c=randomUUID();
const line=(product=a,config=randomUUID(),quantity=1)=>({
  quote_receipt_id:randomUUID(), canonical_product_id:product,
  configuration_price_id:config,quantity,currency:'EUR'
});

test('one listing with many differently priced configurations/variants still has zero extra handling fee',()=>{
  const items=[line(a),line(a),line(a,randomUUID(),4)];
  const result=calculateExtraListingHandlingDraft(items);
  assert.equal(result.contract_version,DISTINCT_LISTING_HANDLING_CONTRACT);
  assert.equal(result.distinct_listing_count,1);
  assert.equal(result.additional_listing_count,0);
  assert.equal(result.amount_minor,0);
  assert.equal(result.currency,'EUR');
  assert.equal(result.payable,false);
  assert.equal(result.taxes_confirmed,false);
});

test('owner-approved EUR 5 fee applies once per additional distinct listing, not once per quantity or parcel',()=>{
  const first=calculateExtraListingHandlingDraft([line(a,randomUUID(),20)]);
  const two=calculateExtraListingHandlingDraft([line(a),line(b,randomUUID(),4),line(b)]);
  const three=calculateExtraListingHandlingDraft([line(a),line(b),line(c),line(c)]);
  assert.equal(first.amount_minor,0);
  assert.equal(two.amount_minor,500);
  assert.equal(three.amount_minor,1000);
  assert.equal(EXTRA_DISTINCT_LISTING_EUR_MINOR,500);
  assert.equal(two.scope,'once_per_order');
  assert.equal(two.provider_session_enabled,false);
  assert.equal(three.payment_enabled,false);
});

test('never convert incoming USD price or accept malformed receipts as shipping/handling authority',()=>{
  const x=line(a),y=line(b);y.currency='USD';
  assert.throws(()=>calculateExtraListingHandlingDraft([x,y]),/extra_listing_currency_mismatch/);
  assert.throws(()=>calculateExtraListingHandlingDraft([]),/extra_listing_merchandise_invalid/);
  assert.throws(()=>calculateExtraListingHandlingDraft([x,x]),/extra_listing_receipt_duplicate/);
  assert.throws(()=>calculateExtraListingHandlingDraft([{...x,quantity:0}]),/extra_listing_merchandise_invalid/);
  assert.throws(()=>calculateExtraListingHandlingDraft([{...x,canonical_product_id:'not-uuid'}]),/extra_listing_merchandise_invalid/);
  assert.throws(()=>calculateExtraListingHandlingDraft(Array.from({length:21},()=>line(a))),/extra_listing_merchandise_invalid/);
});

test('fee remains separate nonpayable line, never mutates source merchandise or creates taxes or checkout total',()=>{
  const items=[line(a),line(b)];
  const original=structuredClone(items);
  const fee=calculateExtraListingHandlingDraft(items);
  assert.equal(fee.amount_minor,500);
  assert.deepEqual(items,original);
  assert.equal('total_amount_minor' in fee,false);
  assert.equal('tax_amount_minor' in fee,false);
  assert.equal('shipping_method' in fee,false);
  assert.equal(fee.payable,false);
});
