import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PRIVATE_CARRIER_PROOF_CONTEXT,lookupPrivateCarrierMethod } from '../../lib/commerceCarrierMethodEvidenceStorage.ts';
import { CARRIER_METHOD_EVIDENCE_CONTRACT } from '../../lib/commerceCarrierVerifiedMethod.ts';

const checkedAt='2026-10-09T13:00:00.000Z';
const request=()=>({country:'US',postal_code:'10 001',shipping_method:'standard',parcel_class:'ordinary'});
const carrierObservation=(overrides:Record<string,unknown>={})=>({
  contract_version:CARRIER_METHOD_EVIDENCE_CONTRACT,
  capture_id:randomUUID(),source_digest_sha256:'f'.repeat(64),
  carrier:'ukrposhta',direction:'UA_EXPORT',country:'US',
  postal_prefix:null,method:'standard',parcel_class:'ordinary',
  carrier_service_code:'PARCEL',carrier_api_result:'available',
  mapping_revision_id:randomUUID(),method_mapping_owner_approved:true,
  captured_at:'2026-10-09T12:30:00.000Z',expires_at:'2026-10-09T18:00:00.000Z',
  ...overrides,
});
const dbResponse=(evidence:unknown[],overrides:Record<string,unknown>={})=>({
  contract_version:PRIVATE_CARRIER_PROOF_CONTEXT,
  evidence_count:evidence.length,blocked:false,evidence,
  checked_at:checkedAt,payable:false,public_rates_enabled:false,
  payment_enabled:false,provider_session_enabled:false,...overrides,
});
const client=(data:unknown,calls:string[]=[])=>({rpc:async(name:string,args:Record<string,unknown>)=>{
  calls.push(name);
  assert.equal(name,'feya_commerce_carrier_method_context_v1');
  assert.deepEqual(args,{p_country:'US',p_postal_code:'10 001',p_shipping_method:'standard',p_parcel_class:'ordinary'});
  return {data,error:null};
}});

test('private carrier evidence reader returns not_verified with zero observations and no payable fields',async()=>{
  const calls:string[]=[];
  const out=await lookupPrivateCarrierMethod(client(dbResponse([]),calls),request());
  assert.equal(out.status,'not_verified');
  assert.deepEqual(out.carrier_options,[]);
  assert.equal(out.payable,false);
  assert.equal(out.public_rates_enabled,false);
  assert.equal(out.payment_enabled,false);
  assert.equal(out.provider_session_enabled,false);
  assert.equal(out.checked_at,checkedAt);
  assert.deepEqual(calls,['feya_commerce_carrier_method_context_v1']);
});

test('two providers compete on the exact current method; one positive permits only internal availability',async()=>{
  const un=carrierObservation({carrier:'ukrposhta',carrier_api_result:'unavailable'});
  const yes=carrierObservation({carrier:'nova_post',carrier_service_code:'NOVA_WORLD'});
  const out=await lookupPrivateCarrierMethod(client(dbResponse([un,yes])),request());
  assert.equal(out.status,'available');
  assert.deepEqual(out.carrier_options,['nova_post']);
  assert.deepEqual(out.evidence_capture_ids,[yes.capture_id]);
  assert.equal(out.payable,false);
});

test('expired or contradictory snapshot fails closed; stale data is not treated as approved checkout',async()=>{
  const stale=carrierObservation({expires_at:'2026-10-09T12:59:59.000Z'});
  const out=await lookupPrivateCarrierMethod(client(dbResponse([stale])),request());
  assert.equal(out.status,'unavailable');
  assert.deepEqual(out.carrier_options,[]);
});

test('blocked country skips DB, ignores erroneous positive carrier documents',async()=>{
  for(const country of ['RU','BY','KP','SY']){
    const out=await lookupPrivateCarrierMethod({rpc:()=>{throw Error('should not call DB');}}, {...request(),country});
    assert.equal(out.status,'unavailable',country);
    assert.equal(out.payable,false);
  }
});

test('browser cannot forge mapping, carrier result, amount, quantity, payment or authority',async()=>{
  for(const extra of [{amount_minor:1},{payment_enabled:true},{carrier_api_result:'available'},
    {source_digest_sha256:'f'.repeat(64)},{quantity:99},{carrier:'nova_post'},
    {delivery_fee_minor:500},{mapping_revision_id:randomUUID()}]){
    await assert.rejects(lookupPrivateCarrierMethod({rpc:()=>{throw Error('unexpected');}}, {...request(),...extra}),
      /carrier_method_lookup_request_invalid/);
  }
});

test('database failure and altered public/payable flags cannot be treated as valid evidence',async()=>{
  await assert.rejects(lookupPrivateCarrierMethod({rpc:async()=>{throw Error('DB down');}},request()),/storage_unavailable/);
  await assert.rejects(lookupPrivateCarrierMethod(client(dbResponse([],{payment_enabled:true})),request()),/response_invalid/);
  await assert.rejects(lookupPrivateCarrierMethod(client(dbResponse([],{checked_at:'bad'})),request()),/response_invalid/);
  await assert.rejects(lookupPrivateCarrierMethod(client(dbResponse([], {evidence_count:1})),request()),/response_invalid/);
});
