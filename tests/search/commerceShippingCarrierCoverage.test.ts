import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {SHIPPING_CARRIER_COVERAGE,readShippingCarrierCoverage,
 parseShippingCarrierCoverageRequest} from '../../lib/commerceShippingCarrierCoverage.ts';
import {CARRIER_METHOD_EVIDENCE_CONTRACT} from '../../lib/commerceCarrierVerifiedMethod.ts';

const now='2026-10-09T20:00:00.000Z';
const request=()=>({shipping_quote_receipt_id:randomUUID()});
const source=(o:Record<string,unknown>={})=>({
  contract_version:CARRIER_METHOD_EVIDENCE_CONTRACT,
  capture_id:randomUUID(),source_digest_sha256:'a'.repeat(64),
  carrier:'ukrposhta',direction:'UA_EXPORT',country:'US',
  postal_prefix:null,method:'standard',carrier_service_code:'PARCEL_AVIA',
  parcel_class:'ordinary',carrier_api_result:'available',
  mapping_revision_id:randomUUID(),method_mapping_owner_approved:true,
  captured_at:'2026-10-09T19:59:00.000Z',
  expires_at:'2026-10-09T20:45:00.000Z',...o,
});
const methodContext=(list:unknown[]=[],extras:Record<string,unknown>={})=>({
  contract_version:'commerce_carrier_method_context_v1',
  evidence:list,evidence_count:list.length,checked_at:now,blocked:false,
  payable:false,public_rates_enabled:false,payment_enabled:false,
  provider_session_enabled:false,...extras,
});
const base=(id:string,items:unknown[]=[],extras:Record<string,unknown>={})=>({
  contract_version:SHIPPING_CARRIER_COVERAGE,
  shipping_quote_receipt_id:id,workspace_version_id:randomUUID(),
  workspace_revision:2,country:'US',postal_code:'10001',shipping_method:'standard',
  parcel_count:items.length,checked_at:now,quote_expires_at:'2026-10-09T20:10:00.000Z',
  globally_blocked:false,parcels:items,
  coverage_scope:'country_product_transport_only',
  parcel_dimensions_provider_verified:false,postal_route_provider_verified:false,
  payable:false,public_rates_enabled:false,payment_enabled:false,
  provider_session_enabled:false,...extras,
});
const parcel=(i:number,evidence:unknown[]=[],o:Record<string,unknown>={})=>({
  index:i,status:'country_product_source_check',parcel_class:'ordinary',
  method_context:methodContext(evidence),...o,
});
const db=(val:unknown,calls:string[]=[])=>({
  rpc:async(name:string,args:Record<string,unknown>)=>{
    calls.push(name);
    assert.equal(name,'feya_commerce_shipping_carrier_coverage_v1');
    assert.ok(typeof args.p_quote_id==='string');
    return {data:val,error:null};
  },
});

test('private quote read returns no verified route, no payable rates, and no browser address',async()=>{
 const req=request(),calls:string[]=[];
 const yes=source();
 const result=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,[parcel(1,[yes])]),calls),req);
 assert.deepEqual(calls,['feya_commerce_shipping_carrier_coverage_v1']);
 assert.equal(result.country_source_status,'country_product_source_positive');
 assert.equal(result.parcels[0].status,'source_positive_country_only');
 assert.deepEqual(result.parcels[0].carrier_options,['ukrposhta']);
 assert.deepEqual(result.parcels[0].evidence_capture_ids,[yes.capture_id]);
 assert.equal(result.coverage_scope,'country_product_transport_only');
 assert.equal(result.postal_route_provider_verified,false);
 assert.equal(result.parcel_dimensions_provider_verified,false);
 assert.equal(result.payable,false);assert.equal(result.public_rates_enabled,false);
 assert.equal(result.payment_enabled,false);assert.equal(result.provider_session_enabled,false);
 assert.equal('postal_code' in result,false);
 assert.ok(!JSON.stringify(result).includes('10001'));
});
test('Ukrposhta negative does not mask Nova Post positive; each parcel needs proof',async()=>{
 const req=request(),no=source({carrier_api_result:'unavailable'}),
  yes=source({carrier:'nova_post',carrier_service_code:'NOVA_OUTBOUND'});
 const result=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
  [parcel(1,[no,yes]),parcel(2,[])])),req);
 assert.deepEqual(result.parcels[0].carrier_options,['nova_post']);
 assert.equal(result.parcels[1].status,'carrier_not_verified');
 assert.equal(result.country_source_status,'incomplete');
 assert.equal(result.payable,false);
});
test('postal-specific unavailable beats country positive for SAME carrier, but another provider can serve',async()=>{
 const req=request(),wide=source(),rejected=source({
   carrier_api_result:'unavailable',postal_prefix:'100',
   mapping_revision_id:wide.mapping_revision_id,
 });
 const result=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
   [parcel(1,[wide,rejected])])),req);
 assert.equal(result.country_source_status,'incomplete');
 assert.equal(result.parcels[0].status,'carrier_not_verified');
 const other=source({carrier:'nova_post',carrier_service_code:'NOVA_ROUTE'});
 const alternative=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
   [parcel(1,[wide,rejected,other])])),req);
 assert.deepEqual(alternative.parcels[0].carrier_options,['nova_post']);
});
test('missing owner parcel review, capacity excess and mixed profiles never imply a shipment',async()=>{
 const req=request(),rows=[
   {index:1,status:'parcel_review_missing',parcel_class:null,method_context:null},
   {index:2,status:'parcel_capacity_exceeded',parcel_class:null,method_context:null},
   {index:3,status:'mixed_or_invalid_parcel',parcel_class:null,method_context:null},
 ];
 const result=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,rows)),req);
 assert.equal(result.country_source_status,'incomplete');
 assert.deepEqual(result.parcels.map(x=>x.status),rows.map(x=>x.status));
 assert.ok(result.parcels.every(x=>x.carrier_options.length===0));
 assert.equal(result.payable,false);
});
test('blocked destinations and domestic Ukraine cannot borrow country availability, including RU/BY/KP',async()=>{
 const req=request();
 for(const country of ['RU','BY','KP','SY','IR','UA']){
   const row={index:1,status:'destination_blocked',parcel_class:null,method_context:null};
   const d=base(req.shipping_quote_receipt_id,[row],{country,globally_blocked:true});
   const result=await readShippingCarrierCoverage(db(d),req);
   assert.equal(result.country_source_status,'incomplete');
   assert.equal(result.parcels[0].status,'destination_blocked');
   assert.equal(result.payable,false);
 }
});
test('method, parcel class, country, evidence freshness cannot be forged as positive',async()=>{
 const req=request();
 for(const fake of [
   source({country:'AU'}),source({method:'express'}),source({parcel_class:'oversize'}),
   source({expires_at:'2026-10-09T19:00:00.000Z'}),source({captured_at:'2026-10-09T20:01:00Z'}),
   source({method_mapping_owner_approved:false}),source({mapping_revision_id:'wrong'}),
 ]){
   const result=await readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
     [parcel(1,[fake])])),req);
   assert.equal(result.country_source_status,'incomplete',JSON.stringify(fake));
 }
});
test('data contract rejects browser-selected parcel class, carrier and vendor availability without reading DB',async()=>{
 const req=request();
 for(const payload of [
  {...req,parcel_class:'ordinary'}, {...req,shipping_method:'express'},
  {...req,carrier:'ukrposhta'}, {...req,payable:true},
  {...req,source_api_result:'available'}, {...req,customer_address:'private'},
  {shipping_quote_receipt_id:'wrong'},
 ]){
  await assert.rejects(readShippingCarrierCoverage({rpc:()=>{throw Error('should not call DB')}},payload),
    /carrier_coverage_request_invalid/);
 }
 assert.equal(parseShippingCarrierCoverageRequest(req).shipping_quote_receipt_id,req.shipping_quote_receipt_id);
});
test('reject altered provider payable flags, wrong quote ID, fake parcel sequence and stale quote',async()=>{
 const req=request(),p=parcel(1,[source()]);
 for(const extra of [
  {payment_enabled:true},{public_rates_enabled:true},{payable:true},
  {provider_session_enabled:true},{postal_route_provider_verified:true},
  {parcel_dimensions_provider_verified:true},{shipping_quote_receipt_id:randomUUID()},
  {quote_expires_at:'2026-10-09T19:00:00Z'},{checked_at:'bad'},
  {country:'ZZ'},{globally_blocked:true},
  {coverage_scope:'paid_route'},
 ]){
  await assert.rejects(readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,[p],extra)),req),
    /carrier_coverage_response_invalid/,JSON.stringify(extra));
 }
 await assert.rejects(readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
   [{...p,index:2}])),req),/carrier_coverage_response_invalid/);
 await assert.rejects(readShippingCarrierCoverage(db(base(req.shipping_quote_receipt_id,
   [parcel(1,[source()],{method_context:methodContext([source()],{checked_at:'1990-01-01T00:00:00Z'})})])),req),
   /carrier_coverage_response_invalid/);
});
test('storage failures are never reported as availability or public proof',async()=>{
 const req=request();
 await assert.rejects(readShippingCarrierCoverage({rpc:async()=>{throw Error('secret DSN');}},req),
   /carrier_coverage_storage_unavailable/);
 await assert.rejects(readShippingCarrierCoverage({rpc:async()=>({
    data:null,error:{message:'permission denied'},
 })},req),/carrier_coverage_storage_unavailable/);
});
