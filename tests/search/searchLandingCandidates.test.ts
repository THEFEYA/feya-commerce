import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEARCH_LANDING_CANDIDATES,
  getBusinessCaseLandingCandidates,
  getSearchLandingCandidate,
} from '../../config/searchLandingCandidates.ts';

test('Phase C exposes exactly ten noindex landing business cases',()=>{
  const business=getBusinessCaseLandingCandidates();
  assert.equal(business.length,10);
  assert.deepEqual(
    business.map((x)=>x.slug).sort(),
    [
      'bodysuits','burning-man-looks','costume-belts','costume-headpieces','costume-masks',
      'festival-outfits','festival-skirts','rave-outfits','shoulder-armor','stage-outfits',
    ].sort(),
  );
  assert.ok(business.every((x)=>x.searchStatus==='business_case_noindex'));
  assert.ok(business.every((x)=>typeof x.primaryCluster==='string'&&x.primaryCluster.length>0));
});

test('failed generic harness and outfits prototypes remain explicit holds',()=>{
  const harness=getSearchLandingCandidate('harness');
  const outfits=getSearchLandingCandidate('outfits');
  assert.equal(harness?.searchStatus,'hold_noindex');
  assert.equal(harness?.holdReason,'COMMERCIAL_SERP_GATE_FAILED');
  assert.equal(outfits?.searchStatus,'hold_noindex');
  assert.equal(outfits?.holdReason,'NO_DISTINCT_APPROVED_QUERY_OWNER');
});

test('candidate registry no longer contains title-match membership rules',()=>{
  for(const candidate of SEARCH_LANDING_CANDIDATES){
    assert.equal('matchTerms' in candidate,false);
  }
});
