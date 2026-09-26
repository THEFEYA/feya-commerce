import assert from 'node:assert/strict';
import test from 'node:test';
import {releaseConfigurationRepairApprovalScopeDecision} from '../../lib/commerceReleaseConfigurationRepairApproval.ts';

const actor='70000000-0000-4000-8000-000000000091';
const releaseRef='feya-review-207-20260924';
const productIds=Array.from({length:207},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const evidence='a'.repeat(64);

function row():any{
  return {
    action_code:'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
    mutation_domain:'COMMERCE_CONFIGURATION',
    request_status:'APPROVAL_REQUIRED',
    requested_by_type:'agent',
    requested_by_user_id:null,
    target_scope_json:{entity_type:'RELEASE',entity_key:releaseRef,canonical_product_ids:productIds},
    target_version_refs_json:{release_ref:releaseRef,evidence_sha256:evidence,price_rows:856,configuration_axis_rows:846},
    request_payload_json:{
      contract_version:'release_configuration_binding_repair_v1',
      release_ref:releaseRef,
      canonical_product_ids:productIds,
      evidence_sha256:evidence,
      expected_price_rows:856,
      expected_configuration_axis_rows:846,
      expected_rebind_rows:631,
      expected_create_configurations:631,
    },
  };
}

test('exact agent-prepared catalog repair can be presented for Human Owner approval',()=>{
  const result=releaseConfigurationRepairApprovalScopeDecision({
    row:row(),actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,
  });
  assert.deepEqual(result,{ok:true,reasons:[],requester:'agent'});
});

test('human-prepared request must belong to the current authenticated owner',()=>{
  const current=row();
  current.requested_by_type='human';
  current.requested_by_user_id=actor;
  assert.equal(releaseConfigurationRepairApprovalScopeDecision({
    row:current,actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,
  }).ok,true);

  current.requested_by_user_id='70000000-0000-4000-8000-000000000092';
  assert.match(
    releaseConfigurationRepairApprovalScopeDecision({
      row:current,actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,
    }).reasons.join(','),
    /REQUESTER_AUTHORITY_MISMATCH/,
  );
});

test('scope, product set, counts and evidence drift all fail closed',()=>{
  const cases=[
    (x:any)=>{x.target_scope_json.entity_key='other-release';},
    (x:any)=>{x.request_payload_json.canonical_product_ids=x.request_payload_json.canonical_product_ids.slice(1);},
    (x:any)=>{x.request_payload_json.expected_rebind_rows=630;},
    (x:any)=>{x.request_payload_json.evidence_sha256='b'.repeat(64);},
    (x:any)=>{x.target_version_refs_json.evidence_sha256='c'.repeat(64);},
    (x:any)=>{x.request_status='APPROVED';},
  ];
  for(const mutate of cases){
    const current=row();mutate(current);
    const result=releaseConfigurationRepairApprovalScopeDecision({
      row:current,actorUserId:actor,releaseRef,productIds,expectedEvidenceSha256:evidence,
    });
    assert.equal(result.ok,false);
    assert.ok(result.reasons.length>0);
  }
});
