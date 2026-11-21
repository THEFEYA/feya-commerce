import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_CASE_TRIAGE_ACTION,
  parseOwnerCaseTriageInput,
  checkOwnerCaseTriageEvidence,
  ownerCaseTriageIdempotencyKey,
  attestOwnerCaseTriageWrite,
  type TriageEvidence,
} from '../../lib/owner-ui/growthCaseTriage.ts';
import {
  isOwnerActionStepUpPath,
  ownerPreviewMutationAllowed,
} from '../../lib/ownerActionStepUpPolicy.ts';

const caseId='23049f6b-35bd-4211-973c-d1ea3a82f708';
const workflowId='a3b35f49-3079-46e4-b77f-7c5279eff979';
const handoffId='512f2594-39cb-4a1b-8ce3-b963214eeb06';
const attentionId='1fb3cf4b-06b9-4c52-97a5-e1c7ae5a83f4';
const caseEventId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ownerEventActor='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const release={
  releaseCode:'organic-wave-a-20260926',releaseVersion:12,
  intendedIndex:18,intendedNoindex:210,approvedProducts:207,
};
const reason='Владелец подтверждает только техническую L0-сверку без заявлений о продажах или индексации Google.';
function input(overrides:Record<string,unknown>={}) {
  return {
    action:OWNER_CASE_TRIAGE_ACTION,case_id:caseId,
    expected_case_event_id:caseEventId,expected_status:'OPEN',
    expected_ownership_epoch:1,request_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    reason,confirm_l0_limits:true,...overrides,
  };
}
function evidence():TriageEvidence {
  return {
    caseRow:{
      case_id:caseId,case_code:'GC-20261016-115345-3ADA3F',
      case_type:'TSEO_INDEXABILITY_SHADOW',
      case_status:'OPEN',current_accountable_domain:'TSEO',ownership_epoch:1,
    },
    latestCaseEvent:{
      case_event_id:caseEventId,case_id:caseId,event_type:'CASE_CREATED',
      to_status:'OPEN',ownership_epoch:1,
    },
    workflow:{
      workflow_run_id:workflowId,workflow_type:'RECORD_INDEXABILITY_PROPOSAL',
      workflow_status:'COMPLETED',ownership_epoch:1,
      state_json:{indexability_receipt:{
        template:'TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1',
        source:'feya_search_releases_v1:ACTIVE',
        source_kind:'canonical_release_intent_not_google_actual_indexing',
        coverage:'COMPLETE',independent_agent_qa:'NOT_RUN',model_calls:0,
        changes_applied:0,release_code:release.releaseCode,
        release_version:release.releaseVersion,intended_index:release.intendedIndex,
        intended_noindex:release.intendedNoindex,
        approved_product_bindings:release.approvedProducts,
      }},
    },
    handoff:{
      handoff_id:handoffId,case_id:caseId,ownership_epoch:1,
      source_domain:'TSEO',target_domain:'GMEL',handoff_status:'COMPLETED',
      expected_output_schema_code:'GMEL_RELEASE_EVIDENCE_SCOPE_V1',
    },
    review:{state:'DETERMINISTIC_RECONCILED',reviewMethod:'AUTOMATED_SQL_RECONCILIATION_NO_LLM'},
    activeSearch:release,
    attention:{
      attention_id:attentionId,case_id:caseId,
      attention_type:'HUMAN_ACTION',attention_status:'RESOLVED',
      context_json:{
        signal_code:'TSEO_SHADOW_L0_QA_REQUEST',
        signal_scope:'INTERNAL_SEARCH_RELEASE_INTENT_ONLY',
        case_id:caseId,case_code:'GC-20261016-115345-3ADA3F',
        ownership_epoch:1,workflow_run_id:workflowId,handoff_id:handoffId,
        review_method:'AUTOMATED_SQL_RECONCILIATION_NO_LLM',
        evidence_level:'L0_OBSERVATION',model_calls:0,changes_applied:0,
        actual_google_indexing_observable:false,
      },
      resolution_json:{
        source:'OWNER_L0_SHADOW_DECISION',case_id:caseId,
        ownership_epoch:1,workflow_run_id:workflowId,handoff_id:handoffId,
        decision_code:'CONFIRM_INTERNAL_L0_ONLY',
        decision_scope:'INTERNAL_SEARCH_RELEASE_INTENT_ONLY',
        evidence_level:'L0_OBSERVATION',
        independent_agent_qa:'NOT_RUN',
        business_outcome_state:'NOT_MEASURABLE',
        model_calls:0,changes_applied:0,
        actual_google_indexing_observable:false,
      },
    },
    latestAttentionEvent:{
      attention_id:attentionId,event_type:'RESOLVED',to_status:'RESOLVED',
      decision_code:'CONFIRM_INTERNAL_L0_ONLY',actor_user_id:ownerEventActor,
    },
  };
}

test('only a strict owner-confirmed TSEO L0 OPEN→TRIAGED request is accepted',()=>{
  const valid=parseOwnerCaseTriageInput(input());
  assert.equal(valid.action,OWNER_CASE_TRIAGE_ACTION);
  assert.equal(valid.expected_status,'OPEN');
  assert.equal(valid.confirm_l0_limits,true);
  assert.deepEqual(checkOwnerCaseTriageEvidence(valid,evidence()),{allowed:true,reason:'READY'});
  const bad=[
    {action:'AUTO_EXECUTE'},{case_id:'bad'},
    {expected_case_event_id:'x'},{expected_ownership_epoch:0},
    {expected_ownership_epoch:'1'},{expected_status:'CLOSED'},
    {reason:'too short'},{reason:'a'.repeat(501)},{request_id:'bad'},
    {confirm_l0_limits:false},{publish:true},{budget:0},{url:'https://any.com'},
  ];
  for(const change of bad)assert.throws(()=>parseOwnerCaseTriageInput(input(change)));
});

test('status, epoch, role, case code and last canonical event must match',()=>{
  const x=parseOwnerCaseTriageInput(input());
  for(const changes of [
    {case_type:'PAYMENT_CHECKOUT'}, {case_status:'TRIAGED'},
    {current_accountable_domain:'CPIM'}, {ownership_epoch:2},{case_id:ownerId},
  ]){
    const e=evidence();e.caseRow={...e.caseRow!,...changes};
    assert.equal(checkOwnerCaseTriageEvidence(x,e).allowed,false,JSON.stringify(changes));
  }
  for(const changes of [
    {event_type:'STATUS_TRANSITIONED'}, {ownership_epoch:2},
    {case_event_id:ownerId}, {to_status:'TRIAGED'}, {case_id:ownerId},
  ]){
    const e=evidence();e.latestCaseEvent={...e.latestCaseEvent!,...changes};
    assert.equal(checkOwnerCaseTriageEvidence(x,e).allowed,false,JSON.stringify(changes));
  }
});

test('completed workflow is not sufficient without authoritative Search Release and real L0',()=>{
  const x=parseOwnerCaseTriageInput(input());
  const e=evidence();e.workflow={...e.workflow!,workflow_status:'RUNNING'};
  assert.equal(checkOwnerCaseTriageEvidence(x,e).reason,'WORKFLOW_OR_RELEASE_MISSING');
  const stale=evidence();stale.activeSearch={...release,releaseVersion:13};
  assert.equal(checkOwnerCaseTriageEvidence(x,stale).allowed,false);
  const unverified=evidence();unverified.review={state:'COMPLETED',reviewMethod:'AUTONOMOUS_GMEL'};
  assert.equal(checkOwnerCaseTriageEvidence(x,unverified).allowed,false);
  const wrong=evidence();wrong.handoff={...wrong.handoff!,target_domain:'CPIM'};
  assert.equal(checkOwnerCaseTriageEvidence(x,wrong).reason,'HANDOFF_UNVERIFIED');
});

test('a resolved attention with a wrong or absent immutable HUMAN event is NOT owner approval',()=>{
  const x=parseOwnerCaseTriageInput(input());
  const variants=[
    (e:TriageEvidence)=>{e.latestAttentionEvent=null;},
    (e:TriageEvidence)=>{e.latestAttentionEvent={...e.latestAttentionEvent!,decision_code:'REQUEST_SEPARATE_INDEPENDENT_QA'};},
    (e:TriageEvidence)=>{e.latestAttentionEvent={...e.latestAttentionEvent!,actor_user_id:null};},
    (e:TriageEvidence)=>{e.attention={...e.attention!,attention_status:'OPEN'};},
    (e:TriageEvidence)=>{e.attention={...e.attention!,case_id:ownerId};},
    (e:TriageEvidence)=>{e.attention={...e.attention!,resolution_json:{}};},
    (e:TriageEvidence)=>{e.attention={...e.attention!,context_json:{
      ...(e.attention!.context_json as Record<string,unknown>),model_calls:1,
    }};},
    (e:TriageEvidence)=>{e.attention={...e.attention!,resolution_json:{
      ...(e.attention!.resolution_json as Record<string,unknown>),
      decision_code:'APPROVE_PRICE_UPDATE',
    }};},
  ];
  for(const mutate of variants){
    const e=evidence();mutate(e);
    assert.equal(checkOwnerCaseTriageEvidence(x,e).reason,'OWNER_L0_NOT_CONFIRMED');
  }
});

test('immutable idempotency key binds actor, exact case, reason, epoch, event, request id',()=>{
  const a=parseOwnerCaseTriageInput(input());
  const initial=ownerCaseTriageIdempotencyKey(a,ownerId);
  assert.match(initial,/^G2B_[a-f0-9]{64}$/);
  assert.equal(initial,ownerCaseTriageIdempotencyKey(a,ownerId));
  assert.notEqual(initial,ownerCaseTriageIdempotencyKey(a,ownerEventActor));
  for(const variant of [
    {request_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'},
    {expected_ownership_epoch:2},
    {expected_case_event_id:ownerEventActor},
    {reason:reason+' Дополнительный запрос.'},
    {case_id:ownerEventActor},
  ]){
    assert.notEqual(initial,ownerCaseTriageIdempotencyKey(
      parseOwnerCaseTriageInput(input(variant)),ownerId));
  }
  assert.throws(()=>ownerCaseTriageIdempotencyKey(a,'invalid-id'));
});

test('successful RPC response is insufficient without exact stored receipt AND current case readback',()=>{
  const x=parseOwnerCaseTriageInput(input());
  const key=ownerCaseTriageIdempotencyKey(x,ownerId);
  const receipt={
    case_id:caseId,previous_status:'OPEN',new_status:'TRIAGED',ownership_epoch:1,
  };
  const current={
    case_id:caseId,case_status:'TRIAGED',current_accountable_domain:'TSEO',
    ownership_epoch:1,
  };
  const event={
    case_id:caseId,event_type:'STATUS_TRANSITIONED',
    from_status:'OPEN',to_status:'TRIAGED',ownership_epoch:1,
    actor_type:'human',actor_user_id:ownerId,reason:x.reason,idempotency_key:key,
  };
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,receipt,current,[event]),true);
  // Network timeout: safe retry may succeed from the exact stored event only.
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,null,current,[event]),true);
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,null,null,[event]),false);
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,receipt,current,[]),false);
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,receipt,current,[event,event]),false);
  for(const changed of [
    {idempotency_key:'old-key'}, {actor_user_id:ownerEventActor},
    {reason:'Different approval'}, {to_status:'CLOSED'},
    {event_type:'CASE_CREATED'}, {ownership_epoch:2},
  ]){
    assert.equal(attestOwnerCaseTriageWrite(x,ownerId,receipt,current,[{...event,...changed}]),false);
  }
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,
    {...receipt,new_status:'CLOSED'},current,[event]),false);
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,
    receipt,{...current,case_status:'ACTIONING'},[event]),false);
  assert.equal(attestOwnerCaseTriageWrite(x,ownerId,
    receipt,{...current,ownership_epoch:2},[event]),false);
  // Replay collision: same user request_id but different reason requires another key;
  // previous persisted event can NEVER attest the changed intent.
  const modified=parseOwnerCaseTriageInput(input({reason:reason+' Новое намерение.'}));
  assert.equal(attestOwnerCaseTriageWrite(modified,ownerId,receipt,current,[event]),false);
});

test('preview/admin step-up is enabled ONLY when all three exact triage switches permit POST',()=>{
  const path='/api/admin/company/work/owner-case-triage';
  const on={
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',
    FEYA_GROWTH_SHADOW_WORK_ENABLED:'true',
    FEYA_GROWTH_CASE_TRIAGE_ENABLED:'true',
  };
  assert.equal(isOwnerActionStepUpPath(path),true);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',on),true);
  assert.equal(ownerPreviewMutationAllowed(path,'GET',on),false);
  assert.equal(ownerPreviewMutationAllowed(path,'DELETE',on),false);
  for(const key of Object.keys(on)){
    const off={...on,[key]:'false'};
    assert.equal(ownerPreviewMutationAllowed(path,'POST',off),false,key);
  }
  const other='/api/admin/company/execution-approval';
  assert.equal(ownerPreviewMutationAllowed(other,'POST',on),false);
});
