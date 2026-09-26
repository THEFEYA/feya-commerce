import test from 'node:test';
import assert from 'node:assert/strict';
import {priceBaselineApprovalScopeDecision} from '../../lib/commercePriceBaselineApproval.ts';

const actor='70000000-0000-4000-8000-000000000051';
const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
const hash='a'.repeat(64);
function row(patch:Record<string,unknown>={}){
  return {
    action_code:'ADOPT_SOURCE_PRICE_BASELINE',
    mutation_domain:'COMMERCE_PRICE',
    request_status:'APPROVAL_REQUIRED',
    requested_by_type:'human',
    requested_by_user_id:actor,
    target_scope_json:{entity_type:'RELEASE',entity_key:'release-a'},
    target_version_refs_json:{release_ref:'release-a',evidence_sha256:hash,price_row_count:2},
    request_payload_json:{
      contract_version:'commerce_price_baseline_adoption_v1',
      release_ref:'release-a',
      canonical_product_ids:[...ids].reverse(),
      evidence_sha256:hash,
      price_row_count:2,
    },
    ...patch,
  };
}
const decide=(r:any)=>priceBaselineApprovalScopeDecision({row:r,actorUserId:actor,releaseRef:'release-a',cleanProductIds:ids,expectedRows:2});

test('exact human-prepared request is approvable independent of ID order',()=>{
  assert.deepEqual(decide(row()),{ok:true,reasons:[],requester:'human'});
});

test('agent/system can prepare the exact request but cannot impersonate a human user',()=>{
  assert.equal(decide(row({requested_by_type:'agent',requested_by_user_id:null})).ok,true);
  assert.equal(decide(row({requested_by_type:'system',requested_by_user_id:null})).ok,true);
  assert.deepEqual(decide(row({requested_by_type:'agent',requested_by_user_id:actor})).reasons,['REQUESTER_AUTHORITY_MISMATCH']);
  assert.deepEqual(decide(row({requested_by_type:'human',requested_by_user_id:'70000000-0000-4000-8000-000000000099'})).reasons,['REQUESTER_AUTHORITY_MISMATCH']);
});

test('same-count substituted or duplicate product IDs are rejected',()=>{
  const substituted=row({request_payload_json:{...row().request_payload_json,canonical_product_ids:[ids[0],'10000000-0000-4000-8000-000000000099']}});
  assert.ok(decide(substituted).reasons.includes('PRODUCT_SET_MISMATCH'));
  const duplicate=row({request_payload_json:{...row().request_payload_json,canonical_product_ids:[ids[0],ids[0]]}});
  assert.ok(decide(duplicate).reasons.includes('PRODUCT_SET_MISMATCH'));
});

test('generic action, stale status, release or evidence drift are rejected',()=>{
  for(const [patch,reason] of [
    [{action_code:'PUBLISH_CONTENT'},'ACTION_CODE_MISMATCH'],
    [{request_status:'APPROVED'},'STATUS_MISMATCH'],
    [{target_scope_json:{entity_type:'RELEASE',entity_key:'other'}},'TARGET_SCOPE_MISMATCH'],
    [{target_version_refs_json:{release_ref:'release-a',evidence_sha256:'b'.repeat(64),price_row_count:2}},'EVIDENCE_MISMATCH'],
  ] as any[]){
    assert.ok(decide(row(patch)).reasons.includes(reason));
  }
});
