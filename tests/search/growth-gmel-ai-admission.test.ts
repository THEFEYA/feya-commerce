import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateGmelAiAdmission,
  type FeyaEvidenceSource,
  type GmelAdmissionInput,
} from '../../lib/growthGmelAiAdmission.ts';

const now=new Date('2026-10-16T12:00:00.000Z');
const codes=['ORGANIC_SEARCH_PERFORMANCE','BEHAVIORAL_ANALYTICS','COMMERCE_ORDER_TRUTH','COMMERCE_REVENUE_TRUTH'];
const fresh=()=>codes.map(source_code=>({
  source_code, health_state:'HEALTHY', freshness_state:'FRESH',
  checked_at:'2026-10-16T11:00:00.000Z',
})) satisfies FeyaEvidenceSource[];

function input():GmelAdmissionInput {
 return {
  role:{role_code:'GMEL',runtime_status:'SHADOW',allowed_action_codes_json:['RECORD_LEARNING_EVIDENCE']},
  sources:fresh(),
  purpose:'COMMERCIAL_OUTCOME',
  case_status:'OPEN',
  current_accountable_domain:'TSEO',
  question_is_new_and_semantic:true,
  model_executor_enabled:false,
  budget:null,
  now,
 };
}

test('connected sources alone cannot trigger an AI request without budget and executor',()=>{
 const r=evaluateGmelAiAdmission(input());
 assert.equal(r.allowed_to_dispatch,false);
 assert.equal(r.status,'WAITING_POLICY');
 assert.ok(r.blockers.includes('MODEL_EXECUTOR_DISABLED'));
 assert.ok(r.blockers.includes('OWNER_BUDGET_NOT_APPROVED'));
 assert.ok(r.blockers.includes('SPEND_RESERVATION_UNAVAILABLE'));
 assert.equal(r.production_mutation_allowed,false);
 assert.equal(r.measurement_claim_allowed,false);
});

test('real 2026-09-18 legacy source snapshot and current missing organic data fail closed',()=>{
 const x=input();
 x.sources=[
  {source_code:'ORGANIC_SEARCH_PERFORMANCE',health_state:'UNAVAILABLE',freshness_state:'UNKNOWN',checked_at:'2026-09-18T10:08:59Z'},
  {source_code:'BEHAVIORAL_ANALYTICS',health_state:'UNAVAILABLE',freshness_state:'UNKNOWN',checked_at:'2026-09-18T10:08:59Z'},
 ];
 const r=evaluateGmelAiAdmission(x);
 assert.equal(r.status,'NOT_OBSERVABLE');
 assert.ok(r.blockers.includes('ORGANIC_SEARCH_PERFORMANCE_UNAVAILABLE'));
 assert.ok(r.blockers.includes('COMMERCE_ORDER_TRUTH_UNAVAILABLE'));
 assert.equal(r.source_states.ORGANIC_SEARCH_PERFORMANCE,'UNAVAILABLE/UNKNOWN');
});

test('old or future-dated HEALTHY/FRESH cannot smuggle a stale source through',()=>{
 const x=input();
 x.sources=fresh().map(s=>({...s,checked_at:'2026-09-18T10:08:59Z'}));
 const old=evaluateGmelAiAdmission(x);
 assert.equal(old.status,'NOT_OBSERVABLE');
 assert.ok(old.blockers.includes('SOURCE_EVIDENCE_NOT_FRESH'));
 x.sources=fresh().map(s=>({...s,checked_at:'2026-10-17T12:00:00Z'}));
 assert.equal(evaluateGmelAiAdmission(x).status,'NOT_OBSERVABLE');
});

test('role inactive, wrong accountable domain and duplicate questions deny execution',()=>{
 const x=input();
 x.role={role_code:'GMEL',runtime_status:'INACTIVE',allowed_action_codes_json:[]};
 x.current_accountable_domain='GMEL';
 x.question_is_new_and_semantic=false;
 const r=evaluateGmelAiAdmission(x);
 assert.ok(r.blockers.includes('ROLE_NOT_SHADOW_OR_ACTIVE'));
 assert.ok(r.blockers.includes('ROLE_ACTION_NOT_GRANTED'));
 assert.ok(r.blockers.includes('CASE_OWNER_MISMATCH'));
 assert.ok(r.blockers.includes('MEANINGFUL_NEW_QUESTION_MISSING'));
});

test('budget needs owner approval, finite explicit cap, unexpired policy and atomic reservation',()=>{
 const x=input();x.model_executor_enabled=true;
 x.budget={
  enabled:true,approved_by_owner:false,policy_version:'owner-budget-v1',
  approved_until:'2026-10-17T00:00:00Z',
  max_total_usd:5,remaining_usd:5,max_single_call_usd:0.1,
  price_contract_version:'model-price-v1',reserved_atomically:false,
 };
 let r=evaluateGmelAiAdmission(x);
 assert.ok(r.blockers.includes('OWNER_BUDGET_NOT_APPROVED'));
 assert.ok(r.blockers.includes('SPEND_RESERVATION_UNAVAILABLE'));
 x.budget.approved_by_owner=true;
 r=evaluateGmelAiAdmission(x);
 assert.equal(r.allowed_to_dispatch,false);
 x.budget.reserved_atomically=true;
 r=evaluateGmelAiAdmission(x);
 assert.equal(r.allowed_to_dispatch,true);
 assert.equal(r.status,'READY_WITH_ATOMIC_RESERVATION');
 assert.equal(r.production_mutation_allowed,false);
 x.budget.approved_until='2026-10-15T00:00:00Z';
 assert.ok(evaluateGmelAiAdmission(x).blockers.includes('OWNER_BUDGET_NOT_APPROVED'));
});

test('organic-only question requires organic evidence; business ROI requires actual order and GA4 data',()=>{
 const x=input();x.purpose='SEARCH_PERFORMANCE';
 x.sources=[fresh()[0]];
 assert.equal(evaluateGmelAiAdmission(x).status,'WAITING_POLICY');
 x.purpose='COMMERCIAL_OUTCOME';
 assert.equal(evaluateGmelAiAdmission(x).status,'NOT_OBSERVABLE');
});

test('FEYA owner UI reads canonical data source health, never a fake test metric',()=>{
 const page=readFileSync(new URL('../../app/admin/company/work/[id]/page.tsx',import.meta.url),'utf8');
 assert.match(page,/feya_commerce_v_data_source_health_effective_safe_v2/);
 assert.match(page,/gmelAiAdmission = evaluateGmelAiAdmission/);
 assert.match(page,/model_executor_enabled: false/);
 assert.match(page,/budget: null/);
 assert.match(page,/Платных вызовов отсюда не происходит/);
});
