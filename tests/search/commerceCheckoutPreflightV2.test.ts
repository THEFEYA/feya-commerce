import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 CHECKOUT_PREFLIGHT_V2,createCheckoutPreflightV2,
 parseCheckoutPreflightV2Request,CheckoutPreflightError,
} from '../../lib/commerceCheckoutPreflightV2.ts';
import {COMMERCE_CHECKOUT_DESTINATION_V2} from '../../lib/commerceCheckoutDestinationV2.ts';

const id=()=>randomUUID();
const destination=()=>({
  contract_version:COMMERCE_CHECKOUT_DESTINATION_V2,
  country:'US',postal_code:'10 001',
  recipient_full_name:'Test Customer',contact_email:'TEST@EXAMPLE.ORG',
  contact_phone:null,region:'NY',city:'New York',
  address_line1:'123 Demo Street',address_line2:null,
});
const request=()=>({
  contract_version:CHECKOUT_PREFLIGHT_V2,request_id:id(),
  shipping_quote_receipt_id:id(),destination:destination(),
  policy_acknowledgement:{accepted:true,bundle_sha256:'a'.repeat(64)},
});
function response(req:ReturnType<typeof request>,extra:Record<string,unknown>={}){
  return {
    contract_version:CHECKOUT_PREFLIGHT_V2,
    preflight_id:id(),request_id:req.request_id,
    shipping_quote_receipt_id:req.shipping_quote_receipt_id,
    delivery_approval_id:id(),delivery_approval_revision:1,workspace_version_id:id(),
    basket_sha256:'b'.repeat(64),destination_sha256:'c'.repeat(64),
    policy_bundle_sha256:req.policy_acknowledgement.bundle_sha256,currency:'EUR',
    merchandise_subtotal_minor:15000,shipping_amount_minor:1900,
    handling_amount_minor:500,additional_distinct_listing_count:1,
    pre_tax_estimate_minor:17400,taxes_minor:null,discount_minor:null,
    provider_fees_minor:null,amount_due_minor:null,tax_status:'unresolved',
    carrier_proof_complete:false,policy_accepted:true,
    created_at:'2026-10-09T21:01:00.000Z',
    expires_at:'2026-10-09T21:15:00.000Z',
    replayed:false,expired:false,payable:false,order_creation_enabled:false,
    public_rates_enabled:false,payment_enabled:false,
    provider_session_enabled:false,...extra,
  };
}
test('normalizes destination but accepts no client pricing, taxes, discounts or payment state',()=>{
  const req=request(),r=parseCheckoutPreflightV2Request(req);
  assert.equal(r.destination.postal_code,'10001');
  assert.equal(r.destination.contact_email,'test@example.org');
  assert.equal(r.policy_acknowledgement.accepted,true);
  assert.equal(r.shipping_quote_receipt_id,req.shipping_quote_receipt_id);
  for(const extras of [
    {total_amount_minor:1},{amount_due_minor:0},{taxes_minor:0},
    {shipping_amount_minor:1},{handling_amount_minor:0},{payment_enabled:true},
    {customer_id:id()},{client_discount:100},{carrier_confirmed:true},
  ]){
    assert.throws(()=>parseCheckoutPreflightV2Request({...req,...extras}),/checkout_preflight_request_invalid/);
  }
});
test('no policy acknowledgement, malformed address, disallowed destination never reaches storage',async()=>{
 const req=request();let calls=0;
 const never={rpc:async()=>{calls++;throw Error('not reached')}};
 for(const bad of [
  {...req,policy_acknowledgement:{accepted:false,bundle_sha256:'a'.repeat(64)}},
  {...req,policy_acknowledgement:{accepted:true,bundle_sha256:'bad'}},
  {...req,destination:{...destination(),amount_minor:100}},
  {...req,destination:{...destination(),postal_code:''}},
  {...req,destination:{...destination(),contact_email:'not an email'}},
  {...req,destination:{...destination(),country:'RU'}},
  {...req,destination:{...destination(),country:'BY'}},
  {...req,destination:{...destination(),country:'UA'}},
 ]){
  await assert.rejects(createCheckoutPreflightV2(never,bad),/checkout_preflight_(request_invalid|destination_unserved)/);
 }
 assert.equal(calls,0);
});
test('one safe service-only RPC creates immutable nonpayable receipt and NEVER echoes PII',async()=>{
 const req=request();let calls=0;
 const c={rpc:async(name:string,args:Record<string,unknown>)=>{
    calls++;
    assert.equal(name,'feya_commerce_create_checkout_preflight_v2');
    const payload=args.p_request as ReturnType<typeof request>;
    assert.equal(payload.destination.contact_email,'test@example.org');
    assert.equal(payload.destination.postal_code,'10001');
    assert.equal(Object.keys(payload).sort().join(','),
      'contract_version,destination,policy_acknowledgement,request_id,shipping_quote_receipt_id');
    return {data:response(req),error:null};
 }};
 const out=await createCheckoutPreflightV2(c,req);
 assert.equal(calls,1);assert.equal(out.pre_tax_estimate_minor,17400);
 assert.equal(out.handling_amount_minor,500);
 assert.equal(out.amount_due_minor,null);
 assert.equal(out.tax_status,'unresolved');
 assert.equal(out.carrier_proof_complete,false);
 assert.equal(out.payable,false);
 assert.equal(out.order_creation_enabled,false);
 assert.equal(out.payment_enabled,false);
 assert.equal(out.provider_session_enabled,false);
 assert.equal('destination' in out,false);
 assert.ok(!JSON.stringify(out).includes('TEST@'));
 assert.ok(!JSON.stringify(out).includes('Demo Street'));
});
test('historic exact retry can only replay nonpayable receipt; expiry is reported, not refreshed',async()=>{
 const req=request(),stored=response(req,{replayed:true,expired:true});
 const out=await createCheckoutPreflightV2({
   rpc:async()=>({data:stored,error:null}),
 },req);
 assert.equal(out.replayed,true);
 assert.equal(out.expired,true);
 assert.equal(out.amount_due_minor,null);
});
test('malformed totals and fake payment flags are rejected after service response',async()=>{
 const req=request();
 for(const wrong of [
   {amount_due_minor:17400},{taxes_minor:0},
   {handling_amount_minor:1000},{pre_tax_estimate_minor:17401},
   {carrier_proof_complete:true},{payment_enabled:true},
   {public_rates_enabled:true},{policy_accepted:false},
   {destination:{contact_email:'leak@test.com'}},
   {contact_email:'leak@test.com'},
   {policy_bundle_sha256:'f'.repeat(64)},
   {currency:'USD'},{replayed:'true'},
 ]){
   await assert.rejects(createCheckoutPreflightV2({
     rpc:async()=>({data:response(req,wrong),error:null}),
   },req),/checkout_preflight_response_invalid/);
 }
});
test('database and policy failures do not masquerade as a successful purchase',async()=>{
 const req=request();
 await assert.rejects(createCheckoutPreflightV2({
   rpc:async()=>{throw new Error('DB URL includes private password');},
 },req),(err:any)=>err instanceof CheckoutPreflightError
    &&err.message==='checkout_preflight_storage_unavailable'
    &&err.outcome==='unknown');
 await assert.rejects(createCheckoutPreflightV2({
   rpc:async()=>({data:null,error:{code:'P0001',message:'checkout_preflight_policy_version_conflict'}}),
 },req),/checkout_preflight_policy_version_conflict/);
 await assert.rejects(createCheckoutPreflightV2({
   rpc:async()=>({data:null,error:{code:'XX000',message:'internal private data'}}),
 },req),/checkout_preflight_storage_outcome_unknown/);
});
