import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  captureUkrposhtaVerifiedSource, parseUkrposhtaCaptureRequest,
  UKRPOSHTA_CAPTURE_CONTRACT, UKRPOSHTA_CAPTURE_RECEIPT_CONTRACT,
} from '../../lib/commerceUkrposhtaVerifiedCapture.ts';
import {
  UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION, UKRPOSHTA_INTERNATIONAL_AVAILABILITY_CONTRACT,
} from '../../lib/commerceUkrposhtaAvailabilityAdapter.ts';

const NOW=Date.parse('2026-10-09T13:00:30.000Z');
const now=()=>NOW;
const input=()=>({
  source_request_id:randomUUID(),mapping_revision_id:randomUUID(),
  country:'US',carrier_product:'PARCEL' as const,transport_type:'AVIA' as const,
});
const proof=(overrides:Record<string,unknown>={})=>({
  contract_version:UKRPOSHTA_INTERNATIONAL_AVAILABILITY_CONTRACT,
  source_adapter_version:UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION,
  country:'US',carrier_product:'PARCEL' as const,transport_type:'AVIA' as const,
  outcome:'available' as const,source_digest_sha256:'b'.repeat(64),
  captured_at:'2026-10-09T13:00:00.000Z',expires_at:'2026-10-09T14:00:00.000Z',
  shipping_method_mapping_owner_approved:false as const,standard_verified:false as const,
  express_verified:false as const,payable:false as const,
  payment_enabled:false as const,provider_session_enabled:false as const,
  ...overrides,
});
const response=(q:ReturnType<typeof input>,outcome='available',overrides:Record<string,unknown>={})=>({
  contract_version:UKRPOSHTA_CAPTURE_RECEIPT_CONTRACT,
  capture_id:randomUUID(),source_request_id:q.source_request_id,
  mapping_revision_id:q.mapping_revision_id,
  country:q.country,carrier_service_code:'PARCEL_AVIA',carrier_api_result:outcome,
  replayed:false,expired:false,method_mapping_owner_approved:true,
  payable:false,public_rates_enabled:false,payment_enabled:false,
  provider_session_enabled:false,...overrides,
});

test('trusted source capture writes only a sanitized current result under an exact mapping UUID',async()=>{
  const q=input(); const calls:Array<{name:string;args:Record<string,unknown>}>=[];
  let probes=0;
  const result=await captureUkrposhtaVerifiedSource(q,async p=>{
    probes++;
    assert.deepEqual(p,{country:'US',carrier_product:'PARCEL',transport_type:'AVIA'});
    return proof();
  },{rpc:async(name,args)=>{
    calls.push({name,args});return {data:response(q),error:null};
  }},now);
  assert.equal(probes,1);
  assert.equal(result.ok,true);
  if(result.ok){
    assert.equal(result.receipt.carrier_service_code,'PARCEL_AVIA');
    assert.equal(result.receipt.method_mapping_owner_approved,true);
    assert.equal(result.receipt.payable,false);
    assert.equal(result.receipt.payment_enabled,false);
  }
  assert.equal(calls.length,1);
  assert.equal(calls[0].name,'feya_commerce_record_ukrposhta_availability_v1');
  assert.deepEqual(calls[0].args,{p_capture:{
    contract_version:UKRPOSHTA_CAPTURE_CONTRACT,
    source_request_id:q.source_request_id,mapping_revision_id:q.mapping_revision_id,
    country:'US',carrier_product:'PARCEL',transport_type:'AVIA',
    carrier_api_result:'available',source_digest_sha256:'b'.repeat(64),
    source_adapter_version:UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION,
    captured_at:'2026-10-09T13:00:00.000Z',expires_at:'2026-10-09T14:00:00.000Z',
  }});
  assert.ok(!JSON.stringify(calls).includes('Bearer'));
  assert.ok(!JSON.stringify(calls).includes('userToken'));
  assert.ok(!JSON.stringify(calls).includes('postal_code'));
  assert.ok(!JSON.stringify(calls).includes('amount_minor'));
});

test('valid current provider NO is recorded as NO, not default YES or alternate method',async()=>{
  const q=input();
  const result=await captureUkrposhtaVerifiedSource(q,async()=>proof({outcome:'unavailable'}),
    {rpc:async(name,args)=>{
      assert.equal((args.p_capture as Record<string,unknown>).carrier_api_result,'unavailable');
      return {data:response(q,'unavailable'),error:null};
    }},now);
  assert.equal(result.ok,true);
  if(result.ok)assert.equal(result.receipt.carrier_api_result,'unavailable');
  assert.equal(result.payment_enabled,false);
});

test('unverified provider, missing key and blocked destinations never contact proof storage',async()=>{
  const q=input();
  let writes=0,probes=0;
  const never={rpc:async()=>{writes++;throw Error('must never write');}};
  for(const outcome of ['unknown','not_configured']){
    const r=await captureUkrposhtaVerifiedSource(q,async()=>proof({
      outcome,source_digest_sha256:null,captured_at:null,expires_at:null,
    }) as unknown as ReturnType<Parameters<typeof captureUkrposhtaVerifiedSource>[1]> extends Promise<infer T>?T:never,
      never,now);
    assert.equal(r.ok,false);
    assert.equal(r.payment_enabled,false);
  }
  const network=await captureUkrposhtaVerifiedSource(q,async()=>{throw Error('URL includes provider token');},never,now);
  assert.equal(network.ok,false);
  for(const country of ['RU','BY','KP','IR','SY','UA']){
    const r=await captureUkrposhtaVerifiedSource({...q,country},async()=>{probes++;return proof();},never,now);
    assert.equal(r.ok,false);if(!r.ok)assert.equal(r.code,'carrier_destination_blocked');
  }
  assert.equal(writes,0);assert.equal(probes,0);
});

test('strict request schema rejects unauthorized price, browser method, PII or source result before carrier network',async()=>{
  const q=input();
  for(const forged of [
    {...q,amount_minor:1900},{...q,shipping_method:'express'},{...q,postal_code:'10001'},
    {...q,carrier_api_result:'available'},{...q,source_digest_sha256:'b'.repeat(64)},
    {...q,carrier_product:'NOPE'},{...q,country:'ZZ'}, {...q,mapping_revision_id:'not-uuid'},
  ]){
    assert.throws(()=>parseUkrposhtaCaptureRequest(forged),/ukrposhta_capture_request_invalid/);
  }
});

test('expired/future or tampered probe evidence cannot be inserted',async()=>{
  const q=input();let writes=0;
  const never={rpc:async()=>{writes++;throw Error('unexpected');}};
  for(const bad of [
    {source_digest_sha256:'bad'},
    {country:'CA'},
    {transport_type:'GROUND'},
    {carrier_product:'EMS'},
    {source_adapter_version:'unapproved_version'},
    {payment_enabled:true},
    {shipping_method_mapping_owner_approved:true},
    {expires_at:'2026-10-09T13:00:00.000Z'},
    {expires_at:'2026-10-10T14:00:00.000Z'},
    {captured_at:'2026-10-09T13:01:00.000Z'},
    {captured_at:'2026-10-09T12:40:00.000Z'},
  ]){
    const r=await captureUkrposhtaVerifiedSource(q,
      async()=>proof(bad) as unknown as Awaited<ReturnType<Parameters<typeof captureUkrposhtaVerifiedSource>[1]>>,
      never,now);
    assert.equal(r.ok,false,JSON.stringify(bad));
  }
  assert.equal(writes,0);
});

test('DB unavailable, unreviewed mapping or tampered response cannot claim successful capture',async()=>{
  const q=input();
  await assert.rejects(captureUkrposhtaVerifiedSource(q,async()=>proof(),{
    rpc:async()=>{throw Error('secret database URL');},
  },now),/ukrposhta_capture_storage_unavailable/);
  await assert.rejects(captureUkrposhtaVerifiedSource(q,async()=>proof(),{
    rpc:async()=>({data:null,error:{code:'P0001',message:'ukrposhta_capture_mapping_not_reviewed'}}),
  },now),/ukrposhta_capture_mapping_not_reviewed/);
  for(const broken of [
    {payment_enabled:true},{payable:true},{country:'CA'},
    {carrier_service_code:'EMS_AVIA'},{source_request_id:randomUUID()},
    {expired:true},{method_mapping_owner_approved:false},
  ]){
    await assert.rejects(captureUkrposhtaVerifiedSource(q,async()=>proof(),{
      rpc:async()=>({data:response(q,'available',broken),error:null}),
    },now),/ukrposhta_capture_response_invalid/);
  }
});
