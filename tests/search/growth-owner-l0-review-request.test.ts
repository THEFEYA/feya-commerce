import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateOwnerL0ReviewRequest } from '../../lib/owner-ui/shadowL0ReviewRequest.ts';
import { isOwnerActionStepUpPath, ownerPreviewMutationAllowed } from '../../lib/ownerActionStepUpPolicy.ts';

const c={
  case_id:'23049f6b-35bd-4211-973c-d1ea3a82f708',
  case_type:'TSEO_INDEXABILITY_SHADOW',
  case_status:'OPEN',
  current_accountable_domain:'TSEO',
  ownership_epoch:1,
};
const active={
  releaseCode:'organic-wave-a-20260926',releaseVersion:12,
  intendedIndex:18,intendedNoindex:210,approvedProducts:207,
};
const w={
  workflow_status:'COMPLETED',ownership_epoch:1,
  state_json:{indexability_receipt:{
    template:'TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1',
    source:'feya_search_releases_v1:ACTIVE',
    source_kind:'canonical_release_intent_not_google_actual_indexing',
    coverage:'COMPLETE',
    independent_agent_qa:'NOT_RUN',
    model_calls:0,changes_applied:0,
    release_code:active.releaseCode,release_version:active.releaseVersion,
    intended_index:active.intendedIndex,intended_noindex:active.intendedNoindex,
    approved_product_bindings:active.approvedProducts,
  }},
};
const review={state:'DETERMINISTIC_RECONCILED',reviewMethod:'AUTOMATED_SQL_RECONCILIATION_NO_LLM'};

test('a real completed deterministic TSEO→GMEL L0 receipt permits requesting HUMAN QA, not declaring AI success',()=>{
  assert.deepEqual(evaluateOwnerL0ReviewRequest(c,w,review,active),{
    allowed:true,reason:'READY_FOR_HUMAN_QA_REQUEST'
  });
});

test('case closure/ownership changes or unmatched epoch fail before owner attention',()=>{
  for(const changed of [
    {...c,case_status:'CLOSED'}, {...c,current_accountable_domain:'SCO'},
    {...c,case_type:'UNRELATED'}, {...c,ownership_epoch:2},
  ]){
    assert.equal(evaluateOwnerL0ReviewRequest(changed,w,review,active).allowed,false);
  }
  assert.equal(evaluateOwnerL0ReviewRequest(c,{...w,workflow_status:'RUNNING'},review,active).allowed,false);
});

test('latest ACTIVE release mismatch, fake AI QA, modification claim and incomplete evidence fail closed',()=>{
  for(const altered of [
    {...active,releaseVersion:13},
    {...active,approvedProducts:208},
  ])assert.equal(evaluateOwnerL0ReviewRequest(c,w,review,altered).allowed,false);
  const patches=[
    {independent_agent_qa:'COMPLETE'},
    {model_calls:1}, {changes_applied:1}, {coverage:'PARTIAL'},
    {source_kind:'actual_google_indexing'}, {template:'unknown'},
  ];
  for(const patch of patches){
    const receipt={...(w.state_json.indexability_receipt),...patch};
    assert.equal(evaluateOwnerL0ReviewRequest(c,{
      ...w,state_json:{indexability_receipt:receipt}
    },review,active).allowed,false);
  }
});

test('missing/unsupported reviewer evidence cannot be passed off as autonomous GMEL QA',()=>{
  assert.equal(evaluateOwnerL0ReviewRequest(c,w,null,active).allowed,false);
  assert.equal(evaluateOwnerL0ReviewRequest(c,w,{
    state:'PENDING',reviewMethod:'AUTOMATED_SQL_RECONCILIATION_NO_LLM'
  },active).allowed,false);
  assert.equal(evaluateOwnerL0ReviewRequest(c,w,{
    state:'DETERMINISTIC_RECONCILED',reviewMethod:'AUTONOMOUS_MODEL'
  },active).allowed,false);
});

test('new review request follows same exact owner-step-up + shadow feature switch',()=>{
  const path='/api/admin/company/work/shadow-review-request';
  assert.equal(isOwnerActionStepUpPath(path),true);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',{}),false);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',{
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',
  }),false);
  assert.equal(ownerPreviewMutationAllowed(path,'POST',{
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'false', FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'
  }),false);
  const enabled={
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',
    FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'
  };
  assert.equal(ownerPreviewMutationAllowed(path,'POST',enabled),true);
  assert.equal(ownerPreviewMutationAllowed(path,'GET',enabled),false);
  assert.equal(ownerPreviewMutationAllowed(path,'DELETE',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/company/execution-approval','POST',enabled),false);
});

test('server uses current canonical source + one owner-only deduped attention record; no payment or model calls',()=>{
  const source=readFileSync('app/api/admin/company/work/shadow-review-request/route.ts','utf8');
  const component=readFileSync('components/admin/OwnerShadowReviewRequestClient.tsx','utf8');
  const page=readFileSync('app/admin/company/work/[id]/page.tsx','utf8');
  const decision=readFileSync('lib/owner-ui/decisions.ts','utf8');
  assert.match(source,/requireOwnerActionActor\('growth_shadow_work'\)/);
  assert.match(source,/getActiveSearchEvidence\(\)/);
  assert.match(source,/evaluateOwnerL0ReviewRequest\(/);
  assert.match(source,/gmelShadowReviewForCase\(/);
  assert.match(source,/feya_fn_enqueue_owner_attention_v1/);
  assert.match(source,/dedupKey/);
  assert.match(source,/created_new/);
  assert.match(source,/WAITING_HUMAN_QA/);
  assert.match(component,/crypto.randomUUID/);
  assert.match(component,/Запросить ручную проверку/);
  assert.match(page,/OwnerShadowReviewRequestClient/);
  assert.match(decision,/TSEO_SHADOW_L0_QA_REQUEST/);
  assert.doesNotMatch(source+component,/api.openai.com|payment_enabled:true|purchase_success|price_override/);
  assert.doesNotMatch(source,/feya_fn_transition_growth_case_v1|\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|FEYA_GSC_OAUTH_REFRESH_TOKEN|OPENAI_API_KEY/);
});
