import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
  CART_COST_BREAKDOWN_CONTRACT, resolveCartCostBreakdown,
} from '../../lib/commerceCartCostBreakdown.ts';
import {APPROVED_DELIVERY_CONTEXT} from '../../lib/commerceApprovedDeliveryResolution.ts';
import {
  syntheticDeliveryWorkspace,syntheticDeliveryCatalog,deliveryIds,
} from '../fixtures/commerceDeliveryWorkspace.ts';

const q1=randomUUID(),q2=randomUUID(),q3=randomUUID(),approvalId=randomUUID();
const req=(ids=[q1])=>({
  contract_version:CART_COST_BREAKDOWN_CONTRACT,
  quote_receipt_ids:ids,country:'US',postal_code:'10 001',
  shipping_method:'standard' as const,
});
function context(){
  return {
    contract_version:APPROVED_DELIVERY_CONTEXT,
    calculated_at:'2026-10-09T11:00:00.000Z',
    public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
    approval:{contract_version:'commerce_delivery_approval_v1',revision:1,approval_id:approvalId,
      workspace_version_id:deliveryIds.version,workspace_revision:1,snapshot_sha256:'a'.repeat(64),
      catalog_sha256:'b'.repeat(64),approved_at:'2026-10-09T10:00:00Z',
      public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false},
    approved_workspace:{contract_version:'commerce_delivery_workspace_draft_v1',revision:1,version_id:deliveryIds.version,
      snapshot_sha256:'a'.repeat(64),draft:syntheticDeliveryWorkspace(),updated_at:'2026-10-09T10:00:00Z',
      public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false},
    catalog:structuredClone(syntheticDeliveryCatalog),catalog_sha256:'b'.repeat(64),
    merchandise:[{quote_receipt_id:q1,canonical_product_id:deliveryIds.product,
      configuration_price_id:deliveryIds.configuration,variant_id:randomUUID(),color_id:null,size_id:null,
      quantity:1,unit_amount_minor:15500,line_amount_minor:15500,currency:'EUR',
      offer_revision_id:randomUUID(),price_quote_id:randomUUID(),price_revision:1,release_ref:'test_release'}],
  };
}
function client(x:ReturnType<typeof context>,calls:string[]=[]){
  return {rpc:async(name:string,args?:Record<string,unknown>)=>{
    calls.push(name);
    assert.equal(name,'feya_commerce_approved_delivery_context_v1');
    assert.ok(Array.isArray(args?.p_quote_receipt_ids));
    return {data:structuredClone(x),error:null};
  }};
}
test('single server context produces merchandise + one Standard shipment, no hidden tax or payable total',async()=>{
  const calls:string[]=[];
  const result=await resolveCartCostBreakdown(client(context(),calls),req());
  assert.deepEqual(calls,['feya_commerce_approved_delivery_context_v1']);
  assert.equal(result.merchandise_subtotal_minor,15500);
  assert.equal(result.shipping_amount_minor,1900);
  assert.equal(result.handling_amount_minor,0);
  assert.equal(result.estimate_before_tax_minor,17400);
  assert.equal(result.distinct_listing_count,1);
  assert.equal(result.additional_listing_count,0);
  assert.equal(result.taxes_minor,null);
  assert.equal(result.discount_minor,null);
  assert.equal(result.provider_fees_minor,null);
  assert.equal(result.amount_due_minor,null);
  assert.equal(result.tax_status,'unresolved');
  assert.equal(result.shipping_serviceability,'awaiting_live_carrier_proof');
  assert.equal(result.estimate_only,true);
  assert.equal(result.payable,false);
  assert.equal(result.public_rates_enabled,false);
  assert.equal(result.payment_enabled,false);
  assert.equal(result.provider_session_enabled,false);
  assert.equal(result.event_deadline_guaranteed,false);
  assert.equal(result.postal_code,'10001');
});
test('one extra DISTINCT listing incurs EUR 5, not a duplicate shipment fee',async()=>{
  const x=context();
  const row=structuredClone(x.merchandise[0]);
  row.quote_receipt_id=q2;
  row.canonical_product_id=deliveryIds.other;
  row.configuration_price_id=deliveryIds.otherConfiguration;
  row.quantity=2;row.unit_amount_minor=20000;row.line_amount_minor=40000;
  x.merchandise.push(row);
  x.approved_workspace.draft.assignments.push({
    canonical_product_id:deliveryIds.other,
    configuration_price_id:null,shipping_profile_id:null,
    production_profile_id:x.approved_workspace.draft.production_profiles[0].id,
  });
  const r=await resolveCartCostBreakdown(client(x),req([q2,q1]));
  assert.equal(r.merchandise_subtotal_minor,55500);
  assert.equal(r.shipping_amount_minor,1900);
  assert.equal(r.handling_amount_minor,500);
  assert.equal(r.distinct_listing_count,2);
  assert.equal(r.additional_listing_count,1);
  assert.equal(r.estimate_before_tax_minor,57900);
  assert.equal(r.amount_due_minor,null);
  assert.equal(r.payable,false);
});
test('multiple options and quantities from same listing do NOT cause additional handling',async()=>{
  const x=context();const row=structuredClone(x.merchandise[0]);
  row.quote_receipt_id=q2;
  row.variant_id=randomUUID();row.configuration_price_id=deliveryIds.configuration;
  row.quantity=3;row.unit_amount_minor=15500;row.line_amount_minor=46500;
  x.merchandise.push(row);
  const r=await resolveCartCostBreakdown(client(x),req([q2,q1]));
  assert.equal(r.merchandise_subtotal_minor,62000);
  assert.equal(r.handling_amount_minor,0);
  assert.equal(r.additional_listing_count,0);
});
test('Express is cart-wide and never claims accelerated manufacturing or event guarantee',async()=>{
  const r=await resolveCartCostBreakdown(client(context()),{...req(),shipping_method:'express'});
  assert.equal(r.shipping_amount_minor,3500);
  assert.equal(r.estimate_before_tax_minor,19000);
  assert.equal(r.event_deadline_guaranteed,false);
  assert.equal(r.amount_due_minor,null);
});
test('unapproved or unserved countries cannot get a nominal estimate',async()=>{
  await assert.rejects(resolveCartCostBreakdown(client(context()),{...req(),country:'SA'}),/delivery_country_not_served/);
  const x=context();x.approved_workspace.draft.shipping_profiles[0].served_countries=[];
  await assert.rejects(resolveCartCostBreakdown(client(x),req()),/delivery_country_not_served/);
});
test('client cannot send EUR5, tax assumptions, optional services, discounts, PII or payment flags',async()=>{
  for(const forged of [
    {handling_amount_minor:0},{taxes_minor:0},{currency:'USD'},{amount_due_minor:15},
    {discount_minor:500},{quantity:99},{contact_email:'private@example.com'},
    {payment_enabled:true},{gift_box_minor:1000},{provider_fees_minor:0},
  ]){
    const failClient={rpc:async()=>{throw Error('unexpected database access');}};
    await assert.rejects(resolveCartCostBreakdown(failClient,{...req(),...forged}),
      /cart_cost_breakdown_request_invalid/);
  }
});
test('provider faults and mismatched current source receipt set are not silently treated as valid totals',async()=>{
  await assert.rejects(resolveCartCostBreakdown({rpc:async()=>{throw Error('DB outage');}},req()),
    /approved_delivery_storage_unavailable/);
  const x=context();x.merchandise[0].currency='USD';
  await assert.rejects(resolveCartCostBreakdown(client(x),req()),/approved_delivery_(context_invalid|currency_mismatch)/);
  const y=context();y.merchandise[0].line_amount_minor=-200;
  await assert.rejects(resolveCartCostBreakdown(client(y),req()),/approved_delivery_context_invalid/);
  const z=context();z.merchandise[0].quote_receipt_id=q3;
  await assert.rejects(resolveCartCostBreakdown(client(z),req()),/approved_delivery_context_invalid/);
});
