import assert from 'node:assert/strict';
import test from 'node:test';
import {colorPriceGovernanceApprovalScopeDecision} from '../../lib/commerceColorPriceGovernanceApproval.ts';

const actor='70000000-0000-4000-8000-000000000101';
const releaseRef='feya-review-207-20260924';
const productIds=['7cf4ea37-cd11-4203-860c-7eed4ae965ba','882793f6-15ca-4617-a579-5cd47290ce72','de38a842-37c4-40a7-86b4-393341c4c9aa'].sort();
const evidence='a'.repeat(64),commercial='b'.repeat(64);

function row():any{
  return{
    action_code:'ADOPT_COLOR_PRICE_LANE_GOVERNANCE',
    mutation_domain:'COMMERCE_PRICE',
    request_status:'APPROVAL_REQUIRED',
    requested_by_type:'agent',
    requested_by_user_id:null,
    target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'color-price-lane',canonical_product_ids:productIds},
    target_version_refs_json:{release_ref:releaseRef,evidence_sha256:evidence,commercial_values_sha256:commercial,price_rows:9},
    request_payload_json:{contract_version:'color_price_lane_governance_v1',release_ref:releaseRef,canonical_product_ids:productIds,evidence_sha256:evidence,commercial_values_sha256:commercial,expected_products:3,expected_price_rows:9,expected_create_configurations:6},
  };
}

test('exact color-price exception lane can reach Human Owner approval',()=>{
  const result=colorPriceGovernanceApprovalScopeDecision({row:row(),actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,expectedCommercialValuesSha256:commercial});
  assert.deepEqual(result,{ok:true,reasons:[],requester:'agent'});
});

test('color-price approval fails closed on exact-scope drift',()=>{
  for(const mutate of [
    (x:any)=>{x.request_payload_json.expected_price_rows=8;},
    (x:any)=>{x.request_payload_json.evidence_sha256='c'.repeat(64);},
    (x:any)=>{x.target_version_refs_json.commercial_values_sha256='d'.repeat(64);},
    (x:any)=>{x.request_status='APPROVED';},
  ]){
    const current=row();mutate(current);
    const result=colorPriceGovernanceApprovalScopeDecision({row:current,actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,expectedCommercialValuesSha256:commercial});
    assert.equal(result.ok,false);
    assert.ok(result.reasons.length>0);
  }
});
