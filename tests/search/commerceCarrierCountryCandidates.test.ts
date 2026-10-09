import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARRIER_COUNTRY_CANDIDATES_CONTRACT, CARRIER_SUSPENDED_COUNTRIES_2026,
  CARRIER_MANUAL_REVIEW_TERRITORIES, CARRIER_COUNTRY_SNAPSHOT_ID,
  OWNER_EXCLUDED_COUNTRIES, referenceCountryAssessment, listCarrierReferenceCandidates,
  describeCarrierCountryReference,
} from '../../lib/commerceCarrierCountryCandidates.ts';

test('Ukrposhta official PDF + published 12 May 2026 suspension + Nova Post network form evidence-only candidates',()=>{
  const snapshot=describeCarrierCountryReference();
  assert.equal(snapshot.contract_version,CARRIER_COUNTRY_CANDIDATES_CONTRACT);
  assert.equal(snapshot.snapshot_id,CARRIER_COUNTRY_SNAPSHOT_ID);
  assert.equal(snapshot.newest_source_date,'2026-05-12');
  assert.equal(snapshot.candidate_count,209);
  assert.deepEqual(snapshot.candidate_countries,[...new Set(snapshot.candidate_countries)].sort());
  assert.equal(snapshot.carrier_method_checked,false);
  assert.equal(snapshot.buyer_payment_enabled,false);
  assert.equal(snapshot.payable,false);
});

test('Russia Belarus North Korea plus 22 temporarily suspended destinations always fail closed',()=>{
  assert.equal(CARRIER_SUSPENDED_COUNTRIES_2026.length,22);
  for(const code of new Set([...CARRIER_SUSPENDED_COUNTRIES_2026,...OWNER_EXCLUDED_COUNTRIES])){
    const result=referenceCountryAssessment(code);
    assert.equal(result.status,'prohibited_or_suspended',code);
    assert.equal(result.payable,false);
    assert.equal(result.standard_verified,false);
    assert.equal(result.express_verified,false);
    assert.ok(!listCarrierReferenceCandidates().includes(code),code);
  }
  assert.equal(referenceCountryAssessment('RU').status,'prohibited_or_suspended');
  assert.equal(referenceCountryAssessment('BY').status,'prohibited_or_suspended');
  assert.equal(referenceCountryAssessment('KP').status,'prohibited_or_suspended');
});

test('AU/MX/NZ and normal SA are shipping-route candidates, NOT proven methods and not automatically payable',()=>{
  for(const code of ['AU','MX','NZ','SA','US','CA','DE','ES','GB','JP','CN']){
    const x=referenceCountryAssessment(code);
    assert.equal(x.status,'carrier_reference_candidate',code);
    assert.ok(x.references.includes('ukrposhta'));
    assert.equal(x.payable,false);
    assert.equal(x.standard_verified,false);
    assert.equal(x.express_verified,false);
  }
  assert.ok(referenceCountryAssessment('DE').references.includes('nova_post'));
  assert.ok(referenceCountryAssessment('US').references.includes('nova_post'));
});

test('special remote polar/non-commercial routes require separate review without penalizing every island',()=>{
  for(const code of CARRIER_MANUAL_REVIEW_TERRITORIES)
    assert.equal(referenceCountryAssessment(code).status,'special_route_review');
  assert.equal(referenceCountryAssessment('GB').status,'carrier_reference_candidate');
  assert.equal(referenceCountryAssessment('JP').status,'carrier_reference_candidate');
  assert.equal(referenceCountryAssessment('NZ').status,'carrier_reference_candidate');
  assert.equal(referenceCountryAssessment('ZZ').status,'no_documented_route');
  assert.equal(referenceCountryAssessment('UA').status,'no_documented_route');
});
