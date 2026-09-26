import test from 'node:test';
import assert from 'node:assert/strict';
import {manualPriceGovernanceApprovalDecision} from '../../lib/commerceManualPriceGovernanceApproval.ts';
const actor='70000000-0000-4000-8000-000000000091';
const products=['057fbd51-52f5-4404-b126-e5d75b8599f4','5602d557-9d98-454b-bc98-9b9ea84b442f'].sort();
const hash='a'.repeat(64);
const row=()=>({action_code:'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',mutation_domain:'COMMERCE_PRICE',request_status:'APPROVAL_REQUIRED',requested_by_type:'agent',requested_by_user_id:null,target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'manual-price-lane',canonical_product_ids:products},target_version_refs_json:{release_ref:'feya-review-207-20260924',evidence_sha256:hash,price_rows:6,configuration_rows:6},request_payload_json:{contract_version:'manual_price_lane_governance_v1',release_ref:'feya-review-207-20260924',canonical_product_ids:products,evidence_sha256:hash,expected_price_rows:6,expected_configuration_rows:6}});
test('exact agent-prepared governance request is eligible for human approval',()=>{const d=manualPriceGovernanceApprovalDecision({row:row(),actorUserId:actor,releaseRef:'feya-review-207-20260924',productIds:products,currentEvidenceSha256:hash});assert.equal(d.ok,true);assert.deepEqual(d.reasons,[])});
test('manual governance approval fails closed on authority/scope/evidence drift',()=>{
 const cases=[{action_code:'REPAIR_MANUAL_CONFIGURATION_BINDINGS'},{mutation_domain:'COMMERCE_CONFIGURATION'},{request_status:'APPROVED'},{requested_by_type:'human',requested_by_user_id:'70000000-0000-4000-8000-000000000099'},{target_scope_json:{entity_type:'PRODUCT_SET',entity_key:'other',canonical_product_ids:products}},{request_payload_json:{...row().request_payload_json,canonical_product_ids:[products[0]]}},{request_payload_json:{...row().request_payload_json,evidence_sha256:'b'.repeat(64)}}];
 for(const patch of cases){const d=manualPriceGovernanceApprovalDecision({row:{...row(),...patch},actorUserId:actor,releaseRef:'feya-review-207-20260924',productIds:products,currentEvidenceSha256:hash});assert.equal(d.ok,false,JSON.stringify(patch))}
});
