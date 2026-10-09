import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { CART_SHIPPING_OPTIONS_CONTRACT, resolveCartShippingOptions } from '../../lib/commerceCartShippingOptions.ts';
import { APPROVED_DELIVERY_CONTEXT } from '../../lib/commerceApprovedDeliveryResolution.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryCatalog, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

const id1=randomUUID(), id2=randomUUID(), approvalId=randomUUID();
const request=()=>({contract_version:CART_SHIPPING_OPTIONS_CONTRACT,quote_receipt_ids:[id1],country:'US',postal_code:'10 001'});
function context() {
  return {
    contract_version:APPROVED_DELIVERY_CONTEXT,calculated_at:'2026-10-09T11:00:00.000Z',
    public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
    approval:{contract_version:'commerce_delivery_approval_v1',revision:1,approval_id:approvalId,
      workspace_version_id:deliveryIds.version,workspace_revision:1,snapshot_sha256:'a'.repeat(64),
      catalog_sha256:'b'.repeat(64),approved_at:'2026-10-09T10:00:00Z',
      public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false},
    approved_workspace:{contract_version:'commerce_delivery_workspace_draft_v1',revision:1,version_id:deliveryIds.version,
      snapshot_sha256:'a'.repeat(64),draft:syntheticDeliveryWorkspace(),updated_at:'2026-10-09T10:00:00Z',
      public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false},
    catalog:structuredClone(syntheticDeliveryCatalog),catalog_sha256:'b'.repeat(64),
    merchandise:[{quote_receipt_id:id1,canonical_product_id:deliveryIds.product,
      configuration_price_id:deliveryIds.configuration,variant_id:randomUUID(),color_id:null,size_id:null,
      quantity:1,unit_amount_minor:15500,line_amount_minor:15500,currency:'EUR',
      offer_revision_id:randomUUID(),price_quote_id:randomUUID(),price_revision:1,release_ref:'test_release'}],
  };
}
function rpc(x:ReturnType<typeof context>, calls:string[]=[]){
  return {rpc:async(name:string,args?:Record<string,unknown>)=>{
    assert.equal(name,'feya_commerce_approved_delivery_context_v1');
    calls.push(name);
    assert.ok(Array.isArray(args?.p_quote_receipt_ids));
    return {data:structuredClone(x),error:null};
  }};
}

test('one cart-wide selector returns real approved Standard/Express prices and distinct non-guaranteed ETA windows',async()=>{
  const c=context(),calls:string[]=[];
  const a=await resolveCartShippingOptions(rpc(c,calls),request());
  assert.equal(a.currency,'EUR');
  assert.equal(a.options.length,2);
  assert.deepEqual(a.options.map(x=>[x.shipping_method,x.amount_minor]),[['standard',1900],['express',3500]]);
  assert.equal(a.options[0].parcel_count,1);
  assert.ok(a.options[1].estimated_arrival.to<a.options[0].estimated_arrival.to);
  assert.equal(a.options[0].event_date_guaranteed,false);
  assert.equal(a.payable,false);
  assert.equal(a.public_rates_enabled,false);
  assert.equal(a.payment_enabled,false);
  assert.equal(a.provider_session_enabled,false);
  assert.equal(calls.length,2);
  assert.equal(a.postal_code,'10001');
});

test('different listing complexities delay both methods by latest item, never by sum of workdays',async()=>{
  const c=context(), other=structuredClone(c.merchandise[0]);
  other.quote_receipt_id=id2;other.canonical_product_id=deliveryIds.other;
  other.configuration_price_id=deliveryIds.otherConfiguration;
  other.quantity=1;other.unit_amount_minor=22200;other.line_amount_minor=22200;
  c.merchandise.push(other);
  c.approved_workspace.draft.production_profiles.push({...structuredClone(c.approved_workspace.draft.production_profiles[0]),
    id:randomUUID(),name:'Complex stage costume',duration:{min:7,max:10,unit:'business_days'}});
  c.approved_workspace.draft.assignments.push({
    canonical_product_id:deliveryIds.other,configuration_price_id:null,
    shipping_profile_id:null,production_profile_id:c.approved_workspace.draft.production_profiles.at(-1)!.id,
  });
  const single=await resolveCartShippingOptions(rpc({...c,merchandise:[c.merchandise[0]]}),request());
  const both=await resolveCartShippingOptions(rpc(c),{...request(),quote_receipt_ids:[id2,id1]});
  assert.ok(both.options[0].estimated_arrival.to>single.options[0].estimated_arrival.to);
  assert.ok(both.options[1].estimated_arrival.to>single.options[1].estimated_arrival.to);
  assert.equal(both.options[0].amount_minor,1900); // one eligible parcel, not per listing
  assert.equal(both.options[1].amount_minor,3500);
  assert.equal(both.options[0].parcel_count,1);
  assert.equal(both.payable,false);
});

test('method-specific explicit exception can remove Express without substituting a made-up rate',async()=>{
  const c=context();
  c.approved_workspace.draft.shipping_profiles[0].rules.push({
    id:randomUUID(),scope:'country',countries:['US'],postal_prefix:null,
    standard:{amount_minor:1900,transit:{min:10,max:14,unit:'business_days'},
      calendar:{working_weekdays:[1,2,3,4,5],holidays:[]}},
    express:null,
  });
  const out=await resolveCartShippingOptions(rpc(c),request());
  assert.deepEqual(out.options.map(x=>x.shipping_method),['standard']);
  assert.equal(out.payable,false);
});

test('unapproved or unserved country fails closed, not a worldwide default',async()=>{
  const c=context();
  await assert.rejects(resolveCartShippingOptions(rpc(c),{...request(),country:'SA'}),/delivery_country_not_served/);
  c.approved_workspace.draft.shipping_profiles[0].served_countries=[];
  await assert.rejects(resolveCartShippingOptions(rpc(c),request()),/delivery_country_not_served/);
});

test('browser controls identities and destination only; amounts, shipping choice, dates and readiness are forbidden',async()=>{
  for(const extra of [{amount_minor:500},{currency:'EUR'},{shipping_method:'express'},
    {calculated_at:'2026-10-09'},{quantity:2},{approved_rates:true}]) {
    await assert.rejects(resolveCartShippingOptions({rpc:()=>{throw Error('called unexpectedly');}},
      {...request(),...extra}),/cart_shipping_options_request_invalid/);
  }
});

test('approval or current-basket identity changing mid-two-method computation is rejected',async()=>{
  const c=context(),d=context();d.approval.approval_id=randomUUID();
  let calls=0;const client={rpc:async()=>{
    calls++;
    return {data:calls===1?c:d,error:null};
  }};
  await assert.rejects(resolveCartShippingOptions(client,request()),/cart_shipping_options_approval_or_quote_changed/);
  assert.equal(calls,2);
});
