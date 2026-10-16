import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gmelShadowReviewForCase } from '../../lib/owner-ui/gmelShadowReview.ts';
import type { GrowthHandoffRow } from '../../lib/types.ts';

const caseRow = {
  case_id: '10000000-0000-4000-8000-000000000001',
  case_type: 'TSEO_INDEXABILITY_SHADOW',
  ownership_epoch: 1,
  workflow_status: 'COMPLETED',
  case_status: 'OPEN',
};

const audit = {
  verdict: 'INTERNAL_RELEASE_CONSISTENCY_PASS',
  scope: 'ACTIVE_SEARCH_RELEASE_INTENT_ONLY',
  actual_google_indexing_observable: false,
  evidence_level: 'L0_OBSERVATION',
  business_outcome_state: 'NOT_MEASURABLE',
  independent_review_method: 'OPERATOR_ASSISTED_CHATGPT_SEPARATE_SQL_RECOUNT_NOT_AUTONOMOUS_GMEL_RUNTIME',
  autonomous_gmel_agent_executed: false,
  notes: 'Release intent reconciled; Google actual indexing unknown.',
};

function handoff(overrides: Record<string, unknown> = {}): GrowthHandoffRow {
  return {
    handoff_id: '20000000-0000-4000-8000-000000000001',
    case_id: caseRow.case_id,
    ownership_epoch: 1,
    source_domain: 'TSEO',
    target_domain: 'GMEL',
    handoff_status: 'COMPLETED',
    expected_output_schema_code: 'GMEL_RELEASE_EVIDENCE_SCOPE_V1',
    result_json: audit,
    completed_at: '2026-10-16T10:36:31Z',
    created_at: '2026-10-16T10:35:00Z',
    ...overrides,
  };
}

test('a real but operator-assisted review is precisely labelled; no autonomous agent is asserted',()=>{
  const out=gmelShadowReviewForCase(caseRow,[handoff()]);
  assert.equal(out?.state,'OPERATOR_REVIEWED');
  assert.equal(out?.reviewMethod,'OPERATOR_ASSISTED_CHATGPT');
  assert.equal(out?.evidenceLevel,'L0_OBSERVATION');
  assert.equal(out?.businessOutcome,'NOT_MEASURABLE');
  assert.match(out?.limitations||'',/Google actual indexing unknown/);
});

test('pending, rejected, stale and missing handoffs remain non-complete',()=>{
  assert.equal(gmelShadowReviewForCase(caseRow,[]),null);
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({handoff_status:'OPEN'})])?.state,'PENDING');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({handoff_status:'REJECTED'})])?.state,'REJECTED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({handoff_status:'STALE'})])?.state,'STALE');
});

test('cross-case, stale-epoch and wrong-domain receipts are ignored',()=>{
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({case_id:'90000000-0000-4000-8000-000000000099'})]),null);
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({ownership_epoch:2})]),null);
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({target_domain:'CQA'})]),null);
  assert.equal(gmelShadowReviewForCase({...caseRow,case_type:'OTHER'},[handoff()]),null);
});

test('fake success, wrong outcome or future self-reported autonomous work must not appear verified',()=>{
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...audit,verdict:'PASS'}})])?.state,'UNVERIFIED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...audit,business_outcome_state:'VALIDATED_WIN'}})])?.state,'UNVERIFIED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...audit,autonomous_gmel_agent_executed:true}})])?.state,'UNVERIFIED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:null})])?.state,'UNVERIFIED');
});

test('the Work and Today surfaces consume one shared verified handoff projection',()=>{
  const work=readFileSync(new URL('../../app/admin/company/work/page.tsx',import.meta.url),'utf8');
  const today=readFileSync(new URL('../../app/admin/company/page.tsx',import.meta.url),'utf8');
  const detail=readFileSync(new URL('../../app/admin/company/work/[id]/page.tsx',import.meta.url),'utf8');
  const presenter=readFileSync(new URL('../../lib/owner-ui/presenters.ts',import.meta.url),'utf8');
  for(const surface of [work,today,detail]) assert.match(surface,/gmelShadowReviewForCase/);
  assert.match(presenter,/EVIDENCE_REVIEWED/);
  assert.match(detail,/не автономным GMEL-исполнителем/);
});

test('automatic Core reconciliation is shown as NON-AI preflight, never autonomous GMEL',()=>{
  const result={
    ...audit,
    independent_review_method:'AUTOMATED_SQL_RECONCILIATION_NO_LLM',
    autonomous_gmel_agent_executed:false,
    deterministic_core_preflight_executed:true,
    model_calls:0,
    changes_applied:0,
  };
  const output=gmelShadowReviewForCase(caseRow,[handoff({result_json:result})]);
  assert.equal(output?.state,'DETERMINISTIC_RECONCILED');
  assert.equal(output?.reviewMethod,'AUTOMATED_SQL_RECONCILIATION_NO_LLM');
  assert.equal(output?.businessOutcome,'NOT_MEASURABLE');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...result,model_calls:1}})])?.state,'UNVERIFIED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...result,autonomous_gmel_agent_executed:true}})])?.state,'UNVERIFIED');
  assert.equal(gmelShadowReviewForCase(caseRow,[handoff({result_json:{...result,deterministic_core_preflight_executed:false}})])?.state,'UNVERIFIED');
});

test('automatic case display keeps the owner decision and future model review distinct',()=>{
  const presenter=readFileSync(new URL('../../lib/owner-ui/presenters.ts',import.meta.url),'utf8');
  const labels=readFileSync(new URL('../../lib/owner-ui/terminology.ts',import.meta.url),'utf8');
  const detail=readFileSync(new URL('../../app/admin/company/work/[id]/page.tsx',import.meta.url),'utf8');
  assert.match(presenter,/DETERMINISTIC_RECONCILED/);
  assert.match(presenter,/EVIDENCE_PREFLIGHT/);
  assert.match(labels,/AI-проверка ещё не выполнена/);
  assert.match(detail,/Автоматическая SQL-сверка · без AI/);
});
