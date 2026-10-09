import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  CARRIER_METHOD_EVIDENCE_CONTRACT, assessCurrentCarrierMethod,
  parseUkrposhtaCountryAvailability,
  type VerifiedCarrierMethodObservation,
} from '../../lib/commerceCarrierVerifiedMethod.ts';

const NOW='2026-10-09T12:00:00.000Z';
function proof(overrides:Partial<VerifiedCarrierMethodObservation>={}):VerifiedCarrierMethodObservation{
  return {
    contract_version:CARRIER_METHOD_EVIDENCE_CONTRACT,
    capture_id:randomUUID(),source_digest_sha256:'a'.repeat(64),
    carrier:'ukrposhta',direction:'UA_EXPORT',
    country:'US',postal_prefix:null,method:'standard',
    carrier_service_code:'PARCEL',parcel_class:'ordinary',
    carrier_api_result:'available',mapping_revision_id:randomUUID(),
    method_mapping_owner_approved:true,
    captured_at:'2026-10-09T11:30:00Z',expires_at:'2026-10-09T16:00:00Z',
    ...overrides,
  };
}
const check=(country:string,method:'standard'|'express',data:VerifiedCarrierMethodObservation[],postal='10001',pack:'ordinary'|'oversize'='ordinary')=>
  assessCurrentCarrierMethod(country,postal,method,pack,data,NOW);

test('actual available Ukrposhta OR Nova Post evidence passes only the exact country and mapped method',()=>{
  const no=proof({carrier:'ukrposhta',carrier_api_result:'unavailable'}),
    yes=proof({carrier:'nova_post',carrier_service_code:'NOVA_WORLD',carrier_api_result:'available'});
  const r=check('US','standard',[no,yes]);
  assert.equal(r.status,'available');assert.deepEqual(r.carrier_options,['nova_post']);
  assert.deepEqual(r.evidence_capture_ids,[yes.capture_id]);
  assert.equal(r.payable,false);assert.equal(r.provider_session_enabled,false);
  assert.equal(check('US','express',[no,yes]).status,'unavailable');
  assert.equal(check('AU','standard',[no,yes]).status,'unavailable');
  assert.equal(check('US','standard',[no,yes],'10001','oversize').status,'unavailable');
});

test('global blocked destinations always fail even with positive recent carrier API evidence',()=>{
  for(const country of ['RU','BY','KP','AF','IR','SY','SD']){
    const r=check(country,'standard',[proof({country})]);
    assert.equal(r.status,'unavailable',country);assert.equal(r.carrier_options.length,0);
  }
});

test('stale, future, unapproved mappings or missing provider credentials are not live service evidence',()=>{
  assert.equal(check('US','standard',[]).status,'unavailable');
  for(const change of [
    {expires_at:'2026-10-09T11:59:59Z'},
    {captured_at:'2026-10-09T12:00:01Z'},
    {captured_at:'2026-10-07T12:00:00Z',expires_at:'2026-10-10T12:00:00Z'},
    {method_mapping_owner_approved:false as true},
    {mapping_revision_id:'wrong'},
    {source_digest_sha256:'not-sha'},
    {carrier_service_code:''},
    {parcel_class:'oversize' as const},
    {method:'express' as const},
  ]){
    assert.equal(check('US','standard',[proof(change)]).status,'unavailable',JSON.stringify(change));
  }
});

test('specific postal rejection overrides broad carrier country yes; an independent carrier positive still works',()=>{
  const base=proof({carrier:'ukrposhta',postal_prefix:null});
  const sameMapping=base.mapping_revision_id;
  const reject=proof({carrier:'ukrposhta',postal_prefix:'100',carrier_api_result:'unavailable',mapping_revision_id:sameMapping});
  assert.equal(check('US','standard',[base,reject],'10001').status,'unavailable');
  assert.equal(check('US','standard',[base,reject],'90001').status,'available');
  const second=proof({carrier:'nova_post',carrier_service_code:'NOVA_SMALL',postal_prefix:null});
  assert.deepEqual(check('US','standard',[base,reject,second],'10001').carrier_options,['nova_post']);
});

test('contradictory same-country service evidence cannot choose cheaper provider or best result',()=>{
  const r=proof();
  const conflict=proof({mapping_revision_id:r.mapping_revision_id,carrier_service_code:r.carrier_service_code,carrier_api_result:'unavailable'});
  assert.equal(check('US','standard',[r,conflict]).status,'unavailable');
  assert.equal(check('US','standard',[r,{...conflict,carrier_api_result:'available',carrier_service_code:'OTHER'}]).status,'unavailable');
});

test('Ukrposhta official availability response must bind requested country and actual product; no default all-world yes',()=>{
  const sample={country:'BG',packageType:'EMS',transportType:'AVIA',available:true};
  assert.deepEqual(parseUkrposhtaCountryAvailability(sample,'BG','EMS'),sample);
  for(const body of [
    {...sample,country:'US'},
    {...sample,packageType:'PARCEL'},
    {...sample,available:'true'},
    {...sample,transportType:'UNKNOWN'},
    {...sample,secret:'not allowed'},
    null,
  ])assert.throws(()=>parseUkrposhtaCountryAvailability(body,'BG','EMS'),/ukrposhta_country_availability_invalid/);
  assert.equal(parseUkrposhtaCountryAvailability({...sample,available:false},'BG','EMS').available,false);
});
