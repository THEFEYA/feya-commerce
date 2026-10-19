import test from 'node:test';
import assert from 'node:assert/strict';
import type {CaseRouteTruth} from '../../lib/owner-ui/growthCaseRouteTruth.ts';
import {explainGrowthCaseAndon} from '../../lib/owner-ui/growthCaseAndon.ts';
import {readFileSync} from 'node:fs';

const baseline:CaseRouteTruth={
  caseId:'11111111-1111-4111-8111-111111111111',
  caseStatus:'OPEN',caseOwner:'TSEO',ownershipEpoch:1,
  workflowStatus:'COMPLETED',timeline:[],
  eventContinuity:'VERIFIED_LATEST',
  ownerL0:'CONFIRMED_INTERNAL_ONLY',measurement:'NO_PLAN',
  independentQa:'NOT_ATTESTED',permissibleNextStep:'TRIAGED',
  canExecuteTransition:false,
};
const inspect=(changes:Partial<CaseRouteTruth>)=>
  explainGrowthCaseAndon({...baseline,...changes});

test('real TSEO workflow complete + human L0 still requires guarded owner triage',()=>{
  const x=inspect({});
  assert.equal(x.state,'NEXT');
  assert.match(x.title,/TRIAGED/);
  assert.equal(x.canExecute,false);
  assert.equal(x.evidenceCeiling,'CASE_JOURNAL_ONLY');
  assert.ok(x.missing.some(z=>z.includes('Независимый акт')));
  assert.ok(x.missing.some(z=>z.includes('план измерения')));
});

test('Jidoka stops on inconsistent latest case journal or ownership epoch',()=>{
  for(const continuity of ['NO_EVENT_HISTORY','EVENT_STATUS_MISMATCH','EVENT_EPOCH_MISMATCH'] as const){
    assert.equal(inspect({eventContinuity:continuity}).state,'STOP');
  }
  assert.equal(inspect({ownershipEpoch:null}).state,'STOP');
  assert.equal(inspect({caseStatus:'BLOCKED'}).state,'STOP');
  assert.equal(inspect({caseStatus:'NOT_OBSERVABLE'}).state,'STOP');
});

test('owner requested vs missing decision vs completed workflow are distinct',()=>{
  const pending=inspect({ownerL0:'REQUEST_PENDING'});
  assert.equal(pending.state,'WAIT');assert.equal(pending.actor,'Владелец');
  assert.match(pending.title,/Ожидается решение/);
  const noL0=inspect({ownerL0:'UNVERIFIED_OR_ABSENT'});
  assert.equal(noL0.state,'REVIEW');
  assert.equal(inspect({workflowStatus:'RUNNING'}).state,'REVIEW');
  assert.equal(inspect({workflowStatus:'FAILED'}).state,'REVIEW');
});

test('PDCA measurement cannot self-certify improvement without locked design and outcome',()=>{
  assert.equal(inspect({caseStatus:'ACTIONING'}).state,'STOP');
  assert.equal(inspect({caseStatus:'MEASURING'}).state,'STOP');
  const awaiting=inspect({caseStatus:'MEASURING',measurement:'LOCKED_NO_OUTCOME'});
  assert.equal(awaiting.state,'WAIT');
  assert.match(awaiting.nextAction,/источник/);
  const closed=inspect({caseStatus:'CLOSED',measurement:'RECORDED_OUTCOME',permissibleNextStep:null});
  assert.equal(closed.state,'RECORDED');
  assert.ok(closed.missing.some(z=>z.includes('Независимый акт')));
  assert.equal(closed.canExecute,false);
  assert.equal(inspect({caseStatus:'CLOSED',measurement:'LOCKED_NO_OUTCOME'}).state,'RECORDED');
  assert.equal(inspect({caseStatus:'DEFERRED'}).state,'RECORDED');
  assert.equal(inspect({caseStatus:'CANCELLED'}).state,'RECORDED');
});

test('UI is owner-first, read-only and no synthetic SLA, KPI, task or autonomous action',()=>{
  const source=readFileSync('lib/owner-ui/growthCaseAndon.ts','utf8');
  const ui=readFileSync('components/admin/OwnerCaseRouteTruth.tsx','utf8');
  assert.match(ui,/explainGrowthCaseAndon/);
  assert.match(ui,/что необходимо для продолжения/i);
  assert.doesNotMatch(source+ui,/\.rpc\(|\.insert\(|\.update\(|\.delete\(|createClient\(|fetch\(|Math\.random\(|setInterval\(/);
  assert.doesNotMatch(source,/\bdeadline\s*=|\+30%|measured_growth:true/);
  assert.match(source,/canExecute:false/);
});
