import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  CARRIER_OWNER_CONTEXT_V1,CARRIER_OWNER_RECEIPT_V1,
  parseCarrierOwnerContext,parseCarrierOwnerParcelRequest,
  readCarrierOwnerContext,confirmOwnerParcelReview,
} from '../../lib/commerceCarrierOwnerReview.ts';

const profileId=randomUUID(),ownerId=randomUUID(),versionId=randomUUID();
const request=()=>({
 request_id:randomUUID(),workspace_version_id:versionId,workspace_revision:16,
 shipping_profile_id:profileId,parcel_class:'ordinary',
 max_units_per_parcel:4,envelope_weight_grams:1800,
 envelope_length_mm:460,envelope_width_mm:350,envelope_height_mm:190,
 packaging_reference:'SYNTHETIC MEASURED PARCEL QA 09',business_review_confirmed:true,
});
const context=(status:'awaiting_delivery_approval'|'approved_workspace'='awaiting_delivery_approval')=>({
  contract_version:CARRIER_OWNER_CONTEXT_V1,status,
  saved_draft_revision:16,
  approved_workspace_version_id:status==='approved_workspace'?versionId:null,
  approved_workspace_revision:status==='approved_workspace'?16:null,
  profiles:status==='approved_workspace'?[{
    shipping_profile_id:profileId,name:'Owner EUR package',currency:'EUR',
    max_units_per_parcel:4,owner_review:null,
  }]:[],
  mapping_review_count:0,source_observation_count:0,
  payable:false,public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
});
const receipt=(q:ReturnType<typeof request>,v:Record<string,unknown>={})=>({
  contract_version:CARRIER_OWNER_RECEIPT_V1,
  review_id:q.request_id,shipping_profile_id:q.shipping_profile_id,
  workspace_version_id:q.workspace_version_id,workspace_revision:q.workspace_revision,
  parcel_class:q.parcel_class,reviewed_at:'2026-10-09T20:05:00.000Z',
  replayed:false,carrier_route_verified:false,
  payable:false,public_rates_enabled:false,payment_enabled:false,
  provider_session_enabled:false,...v,
});
test('owner carrier dashboard shows empty approvals without constructing default route or packed envelope',()=>{
 const x=parseCarrierOwnerContext(context());
 assert.equal(x.status,'awaiting_delivery_approval');
 assert.equal(x.saved_draft_revision,16);
 assert.deepEqual(x.profiles,[]);
 assert.equal(x.mapping_review_count,0);
 assert.equal(x.source_observation_count,0);
 assert.equal(x.payment_enabled,false);
 const checked=parseCarrierOwnerContext(context('approved_workspace'));
 assert.equal(checked.profiles[0].owner_review,null);
 assert.equal(checked.profiles[0].max_units_per_parcel,4);
});
test('only a measured specific parcel profile, with positive owner confirmation, is accepted',()=>{
 const q=request();
 assert.deepEqual(parseCarrierOwnerParcelRequest(q),q);
 for(const forged of [
  {...q,business_review_confirmed:false},
  {...q,reviewed_by:ownerId},
  {...q,source_availability:'available'},
  {...q,country:'US'},{...q,payment_enabled:true},
  {...q,shipping_method:'express'},
  {...q,envelope_weight_grams:0},
  {...q,envelope_length_mm:5001},
  {...q,max_units_per_parcel:0},
  {...q,parcel_class:'unknown'},
  {...q,packaging_reference:'guessed'},
  {...q,request_id:'bad'}, {...q,workspace_revision:-1},
 ])assert.throws(()=>parseCarrierOwnerParcelRequest(forged),/carrier_owner_review_request_invalid/);
});
test('protected owner context fetch requires exact nonpayable result, rejects tampering',async()=>{
 const calls:string[]=[];
 const result=await readCarrierOwnerContext({rpc:async(name,args)=>{
   calls.push(name);assert.equal(args,undefined);
   return {data:context(),error:null};
 }});
 assert.equal(result.status,'awaiting_delivery_approval');
 assert.deepEqual(calls,['feya_commerce_owner_carrier_review_context_v1']);
 for(const bad of [
  {payable:true},{payment_enabled:true},{mapping_review_count:-1},
  {status:'ready_for_checkout'},{profiles:[{shipping_profile_id:'wrong'}]},
  {source_observation_count:'100'},
 ]){
   await assert.rejects(readCarrierOwnerContext({
     rpc:async()=>({data:{...context(),...bad},error:null}),
   }),/carrier_owner_review_response_invalid/);
 }
});
test('server sends only exact actor-bound payload to private RPC; never a public carrier approval',async()=>{
 const q=request();let calls=0;
 const r=await confirmOwnerParcelReview({rpc:async(name,args)=>{
   calls++;assert.equal(name,'feya_commerce_confirm_owner_parcel_review_v1');
   assert.equal(args?.p_actor_id,ownerId);
   assert.deepEqual(args?.p_payload,q);
   return {data:receipt(q),error:null};
 }},q,ownerId);
 assert.equal(calls,1);
 assert.equal(r.review_id,q.request_id);
 assert.equal(r.carrier_route_verified,false);
 assert.equal(r.payable,false);
 assert.equal(r.payment_enabled,false);
 assert.equal(r.provider_session_enabled,false);
 assert.equal('weight_grams' in r,false);
});
test('same-key retries can return immutable source receipt; modified/readiness responses must fail',async()=>{
 const q=request();
 assert.equal((await confirmOwnerParcelReview({
  rpc:async()=>({data:receipt(q,{replayed:true}),error:null}),
 },q,ownerId)).replayed,true);
 for(const changed of [
  {payable:true},{public_rates_enabled:true},{payment_enabled:true},
  {provider_session_enabled:true},{carrier_route_verified:true},
  {review_id:randomUUID()},{shipping_profile_id:randomUUID()},
  {parcel_class:'oversize'}, {replayed:'true'},
  {workspace_revision:17},
 ]){
  await assert.rejects(confirmOwnerParcelReview({
    rpc:async()=>({data:receipt(q,changed),error:null}),
  },q,ownerId),/carrier_owner_review_response_invalid/);
 }
});
test('database failures or wrong user IDs are never reported as review success',async()=>{
 const q=request();
 await assert.rejects(confirmOwnerParcelReview({
   rpc:async()=>{throw Error('private database URL');},
 },q,ownerId),/carrier_owner_review_outcome_unknown/);
 await assert.rejects(confirmOwnerParcelReview({
   rpc:async()=>{throw Error('never reached');},
 },q,'not-uuid'),/carrier_owner_review_actor_invalid/);
 await assert.rejects(confirmOwnerParcelReview({
   rpc:async()=>({data:null,error:{code:'P0001',message:'carrier_owner_review_approval_required'}}),
 },q,ownerId),/carrier_owner_review_approval_required/);
});
test('new owner-facing HTTP route is strictly authenticated, owner-step-up, same-origin, default-OFF and private',()=>{
 const route=readFileSync('app/api/admin/company/carrier-review/route.ts','utf8');
 const policy=readFileSync('lib/ownerActionStepUpPolicy.ts','utf8');
 const component=readFileSync('components/admin/CarrierOwnerReviewClient.tsx','utf8');
 const env=readFileSync('.env.example','utf8');
 assert.match(route,/requireOwnerActionActor\('delivery_workspace_draft'\)/);
 assert.match(route,/FEYA_COMMERCE_CARRIER_OWNER_REVIEW_ENABLED/);
 assert.match(route,/sameOrigin\(request\)/);
 assert.match(route,/private, no-store/);
 assert.match(route,/confirmOwnerParcelReview\(actor.service,body,actor.userId\)/);
 assert.match(route,/3000/);
 assert.match(policy,/\/api\/admin\/company\/carrier-review/);
 assert.match(env,/FEYA_COMMERCE_CARRIER_OWNER_REVIEW_ENABLED=false/);
 assert.match(component,/type="checkbox"/);
 assert.match(component,/confirmed:\\s*false/);
 assert.match(component,/истор|измерен|измерен/i);
 assert.doesNotMatch(component,/Merchant of Record|Start payment|checkout enabled/);
});
