import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  parseShadowL0OwnerInput,validateShadowL0OwnerEvidence,
  SHADOW_L0_DECISIONS,
} from '../../lib/owner-ui/shadowL0OwnerDecision.ts';
import {
  isOwnerActionStepUpPath,ownerPreviewMutationAllowed
} from '../../lib/ownerActionStepUpPolicy.ts';

const caseId='23049f6b-35bd-4211-973c-d1ea3a82f708';
const workflowId='a3b35f49-3079-46e4-b77f-7c5279eff979';
const handoffId='512f2594-39cb-4a1b-8ce3-b963214eeb06';
const attentionId='1fb3cf4b-06b9-4c52-97a5-e1c7ae5a83f4';
const requestId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const l0Case={
  case_id:caseId,case_code:'GC-20261016-115345-3ADA3F',
  case_type:'TSEO_INDEXABILITY_SHADOW',case_status:'OPEN',
  current_accountable_domain:'TSEO',ownership_epoch:1,
};
const release={
  releaseCode:'organic-wave-a-20260926',releaseVersion:12,
  intendedIndex:18,intendedNoindex:210,approvedProducts:207,
};
const wf={
  workflow_run_id:workflowId,workflow_status:'COMPLETED',ownership_epoch:1,
  state_json:{indexability_receipt:{
    template:'TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1',
    source:'feya_search_releases_v1:ACTIVE',
    source_kind:'canonical_release_intent_not_google_actual_indexing',
    coverage:'COMPLETE',model_calls:0,changes_applied:0,independent_agent_qa:'NOT_RUN',
    release_code:release.releaseCode,release_version:release.releaseVersion,
    intended_index:release.intendedIndex,intended_noindex:release.intendedNoindex,
    approved_product_bindings:release.approvedProducts,
  }},
};
const h={
  handoff_id:handoffId,case_id:caseId,ownership_epoch:1,
  source_domain:'TSEO',target_domain:'GMEL',handoff_status:'COMPLETED',
  expected_output_schema_code:'GMEL_RELEASE_EVIDENCE_SCOPE_V1',
};
const reviewer={
  state:'DETERMINISTIC_RECONCILED',
  reviewMethod:'AUTOMATED_SQL_RECONCILIATION_NO_LLM',
};
const attention={
  attention_id:attentionId,attention_type:'HUMAN_ACTION',
  attention_status:'OPEN',case_id:caseId,
  context_json:{
    signal_code:'TSEO_SHADOW_L0_QA_REQUEST',
    signal_scope:'INTERNAL_SEARCH_RELEASE_INTENT_ONLY',
    case_id:caseId,case_code:l0Case.case_code,ownership_epoch:1,
    workflow_run_id:workflowId,handoff_id:handoffId,
    review_method:reviewer.reviewMethod,evidence_level:'L0_OBSERVATION',
    actual_google_indexing_observable:false,model_calls:0,changes_applied:0,
  }
};
const input=(override:Record<string,unknown>={})=>({
  attention_id:attentionId,decision:'CONFIRM_INTERNAL_L0',
  expected_status:'OPEN',reason:'Approve ONLY the internally verified L0 facts.',
  request_id:requestId,...override,
});

test('all three choices map only to a HUMAN decision receipt, never close the case',()=>{
  assert.deepEqual(SHADOW_L0_DECISIONS.CONFIRM_INTERNAL_L0,{
    status:'RESOLVED',code:'CONFIRM_INTERNAL_L0_ONLY',
  });
  assert.deepEqual(SHADOW_L0_DECISIONS.REQUEST_INDEPENDENT_QA,{
    status:'RESOLVED',code:'REQUEST_SEPARATE_INDEPENDENT_QA',
  });
  assert.deepEqual(SHADOW_L0_DECISIONS.ACKNOWLEDGE_FOR_LATER,{
    status:'ACKNOWLEDGED',code:null,
  });
});

test('only a fixed, bounded UUID-based decision input is accepted',()=>{
  const valid=parseShadowL0OwnerInput(input());
  assert.equal(valid.decision,'CONFIRM_INTERNAL_L0');
  assert.equal(valid.expected_status,'OPEN');
  for(const change of [
    {decision:'PAYMENT_APPROVAL'}, {attention_id:'bad'}, {request_id:'not-a-uuid'},
    {expected_status:'RESOLVED'}, {reason:'x'},
    {reason:'a'.repeat(501)}, {reason:42},
    {payment_enabled:true}, {case_id:caseId},
  ]){
    assert.throws(()=>parseShadowL0OwnerInput(input(change)));
  }
  assert.equal(parseShadowL0OwnerInput(input({
    decision:'ACKNOWLEDGE_FOR_LATER',reason:null,
  })).reason,null);
  assert.throws(()=>parseShadowL0OwnerInput(input({
    decision:'ACKNOWLEDGE_FOR_LATER',reason:null,expected_status:'ACKNOWLEDGED',
  })));
});

test('genuine persisted TSEO L0 attention is eligible for one scoped human review only',()=>{
  assert.deepEqual(validateShadowL0OwnerEvidence(
    attention,'OPEN',l0Case,wf,h,reviewer,release
  ),{allowed:true,reason:'READY'});
});

test('other owner decisions, forged signal and stale attention status are rejected',()=>{
  for(const change of [
    {attention_type:'POLICY_DECISION'},
    {context_json:{...attention.context_json,signal_code:'LAUNCH_COMMERCE_COMMERCE_CHECKOUT'}},
    {context_json:{...attention.context_json,signal_scope:'LIVE_REVENUE'}},
  ]){
    assert.equal(validateShadowL0OwnerEvidence(
      {...attention,...change},'OPEN',l0Case,wf,h,reviewer,release
    ).allowed,false);
  }
  assert.equal(validateShadowL0OwnerEvidence(
    attention,'ACKNOWLEDGED',l0Case,wf,h,reviewer,release
  ).reason,'WRONG_STATE');
});

test('stale case/epoch and replay against new workflow or handoff are blocked',()=>{
  for(const c of [
    {...l0Case,ownership_epoch:2},{...l0Case,case_id:'other-case-id'},
    {...l0Case,case_code:'different'},
  ]){
    assert.equal(validateShadowL0OwnerEvidence(
      attention,'OPEN',c,wf,h,reviewer,release
    ).allowed,false);
  }
  assert.equal(validateShadowL0OwnerEvidence(
    attention,'OPEN',l0Case,{...wf,workflow_run_id:'other'},h,reviewer,release
  ).allowed,false);
  assert.equal(validateShadowL0OwnerEvidence(
    attention,'OPEN',l0Case,wf,{...h,handoff_status:'STALE'},reviewer,release
  ).allowed,false);
});

test('source changes, fake independent AI or invalid recorded evidence fail closed',()=>{
  assert.equal(validateShadowL0OwnerEvidence(
    attention,'OPEN',l0Case,wf,h,reviewer,{...release,releaseVersion:13}
  ).allowed,false);
  assert.equal(validateShadowL0OwnerEvidence(
    attention,'OPEN',l0Case,wf,h,{state:'COMPLETED',reviewMethod:'AUTONOMOUS_GMEL'},release
  ).allowed,false);
  const altered={...attention,context_json:{...attention.context_json,model_calls:1}};
  assert.equal(validateShadowL0OwnerEvidence(
    altered,'OPEN',l0Case,wf,h,reviewer,release
  ).allowed,false);
});

test('new endpoint is narrowly gated by the existing Growth Shadow flag, unrelated actions still locked',()=>{
  const path='/api/admin/company/owner-attention/shadow-l0-decision';
  const unrelated='/api/admin/company/owner-attention/decision';
  const on={FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'};
  assert.equal(isOwnerActionStepUpPath(path),true);
  assert.equal(isOwnerActionStepUpPath(unrelated),false);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',on),true);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',{FEYA_OWNER_ACTION_AUTH_REQUIRED:'true'}),false);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',{FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'}),false);
  assert.equal(ownerPreviewMutationAllowed(path,'GET',on),false);
  assert.equal(ownerPreviewMutationAllowed(path,'DELETE',on),false);
  assert.equal(ownerPreviewMutationAllowed(unrelated,'POST',on),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/company/execution-approval','POST',on),false);
});

test('owner UI and server never implicitly enable general actions or silently mutate commerce/SEO/cases',()=>{
  const route=readFileSync('app/api/admin/company/owner-attention/shadow-l0-decision/route.ts','utf8');
  const page=readFileSync('app/admin/company/owner-attention/[id]/page.tsx','utf8');
  const client=readFileSync('components/admin/OwnerShadowL0DecisionClient.tsx','utf8');
  const oldRoute=readFileSync('app/api/admin/company/owner-attention/decision/route.ts','utf8');
  assert.match(route,/requireOwnerActionActor\('growth_shadow_work'\)/);
  assert.match(route,/validateShadowL0OwnerEvidence\(/);
  assert.match(route,/getActiveSearchEvidence\(/);
  assert.match(route,/feya_fn_transition_owner_attention_v1/);
  assert.match(route,/p_idempotency_key:input.request_id/);
  assert.match(page,/getOwnerActionConfigStatus\(isShadowL0\?'growth_shadow_work':'owner_actions'\)/);
  assert.match(page,/OwnerShadowL0DecisionClient/);
  assert.match(page,/OwnerAttentionDecisionClient/);
  assert.match(client,/Подтвердить внутреннюю L0-сверку/);
  assert.match(client,/Нужна отдельная независимая QA/);
  assert.match(client,/ACKNOWLEDGE_FOR_LATER/);
  assert.match(oldRoute,/requireOwnerActionActor\(\)/);
  assert.doesNotMatch(route,/feya_fn_transition_growth_case_v1|\.update\(|\.upsert\(|\.insert\(|\.delete\(/);
  assert.doesNotMatch(route+client,/api\.openai\.com|purchase_success|FEYA_OWNER_ACTIONS_ENABLED\s*=\s*true|provider_session_enabled:\s*true/);
});
