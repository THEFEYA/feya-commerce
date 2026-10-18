import test from 'node:test';
import assert from 'node:assert/strict';
import { projectGrowthCaseRoute, type CaseRouteInput } from '../../lib/owner-ui/growthCaseRouteTruth.ts';

const CASE='23049f6b-35bd-4211-973c-d1ea3a82f708';
const OTHER='b7d44cf3-7bc0-4b61-8ce7-d189bb323127';
const CASE_EVENT='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ATT='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OWNER_EVENT='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const WORKFLOW_EVENT='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const HANDOFF='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const SPEC='ffffffff-ffff-4fff-8fff-ffffffffffff';
const OUTCOME='99999999-9999-4999-8999-999999999999';

function input():CaseRouteInput {
  return {
    caseRow: {
      case_id:CASE,case_status:'OPEN',workflow_status:'COMPLETED',
      current_accountable_domain:'TSEO',ownership_epoch:1,
    },
    caseEvents:[{
      case_event_id:CASE_EVENT,case_id:CASE,event_type:'CASE_CREATED',
      from_status:null,to_status:'OPEN',ownership_epoch:1,
      created_at:'2026-10-16T11:53:45Z',
    }],
    workflowEvents:[{
      case_id:CASE,workflow_event_id:WORKFLOW_EVENT,
      event_type:'WORKFLOW_COMPLETED',created_at:'2026-10-16T11:54:00Z',
    }],
    handoffs:[{
      case_id:CASE,handoff_id:HANDOFF,source_domain:'TSEO',
      target_domain:'GMEL',handoff_status:'COMPLETED',
      created_at:'2026-10-16T11:53:50Z',completed_at:'2026-10-16T11:53:56Z',
    }],
    attention:[{
      case_id:CASE,attention_id:OWNER_ATT,
      source_code:'TSEO_SHADOW_L0_QA_REQUEST',attention_status:'RESOLVED',
      created_at:'2026-10-18T16:09:41Z',resolved_at:'2026-10-18T18:59:29Z',
    }],
    attentionEvents:[{
      attention_id:OWNER_ATT,attention_event_id:OWNER_EVENT,
      event_type:'RESOLVED',to_status:'RESOLVED',
      decision_code:'CONFIRM_INTERNAL_L0_ONLY',created_at:'2026-10-18T18:59:29Z',
    }],
    specs:[],outcomes:[],
  };
}

test('real TSEO: Case OPEN + workflow COMPLETE + owner L0 decision are independent',()=>{
  const r=projectGrowthCaseRoute(input());
  assert.ok(r);
  assert.equal(r.caseStatus,'OPEN');
  assert.equal(r.workflowStatus,'COMPLETED');
  assert.equal(r.ownerL0,'CONFIRMED_INTERNAL_ONLY');
  assert.equal(r.independentQa,'NOT_ATTESTED');
  assert.equal(r.measurement,'NO_PLAN');
  assert.equal(r.ownershipEpoch,1);
  assert.equal(r.eventContinuity,'VERIFIED_LATEST');
  assert.equal(r.permissibleNextStep,'TRIAGED');
  assert.equal(r.canExecuteTransition,false);
  assert.ok(r.timeline.some(e=>e.label.includes('не кейс')));
  assert.ok(r.timeline.some(e=>e.label.includes('не доказана')));
  assert.ok(r.timeline.some(e=>e.label.includes('внутренний факт L0')));
  assert.equal(r.timeline.length,5);
  assert.deepEqual(r.timeline.map(e=>e.at),
    [...r.timeline.map(e=>e.at)].sort());
});

test('completed handoff without a separate QA authority cannot confirm independent GMEL',()=>{
  const x=input();x.attention=[];x.attentionEvents=[];
  const r=projectGrowthCaseRoute(x);
  assert.ok(r);
  assert.equal(r.independentQa,'NOT_ATTESTED');
  assert.equal(r.ownerL0,'UNVERIFIED_OR_ABSENT');
  assert.equal(r.caseStatus,'OPEN');
});

test('no case events = no verified transition recommendation; never imagine audit history',()=>{
  const x=input();x.caseEvents=[];
  const r=projectGrowthCaseRoute(x);
  assert.ok(r);
  assert.equal(r.eventContinuity,'NO_EVENT_HISTORY');
  assert.equal(r.permissibleNextStep,null);
  assert.equal(r.canExecuteTransition,false);
  assert.ok(!r.timeline.some(e=>e.kind==='CASE'));
});

test('stale or conflicting case event blocks even a read-only transition suggestion',()=>{
  const x=input();
  x.caseEvents=[{...x.caseEvents[0],to_status:'TRIAGED'}];
  assert.equal(projectGrowthCaseRoute(x)?.eventContinuity,'EVENT_STATUS_MISMATCH');
  assert.equal(projectGrowthCaseRoute(x)?.permissibleNextStep,null);
  const y=input();y.caseRow.ownership_epoch=2;
  assert.equal(projectGrowthCaseRoute(y)?.eventContinuity,'EVENT_EPOCH_MISMATCH');
  assert.equal(projectGrowthCaseRoute(y)?.permissibleNextStep,null);
});

test('ownership transfer may be last event without repeating the case status',()=>{
  const x=input();x.caseRow.ownership_epoch=2;
  x.caseEvents=[...x.caseEvents,{
    case_event_id:'12345678-1234-4234-8234-123456789abc',case_id:CASE,
    event_type:'OWNERSHIP_TRANSFERRED',from_status:null,to_status:null,
    ownership_epoch:2,created_at:'2026-10-17T10:00:00Z',
  }];
  assert.equal(projectGrowthCaseRoute(x)?.eventContinuity,'VERIFIED_LATEST');
  assert.equal(projectGrowthCaseRoute(x)?.permissibleNextStep,'TRIAGED');
});

test('no other case or wrong-scope attention may impersonate owner L0',()=>{
  const x=input();x.attention=[{...x.attention[0],case_id:OTHER}];
  assert.equal(projectGrowthCaseRoute(x)?.ownerL0,'UNVERIFIED_OR_ABSENT');
  const y=input();y.attention=[{...y.attention[0],source_code:'PAYMENT_APPROVAL'}];
  assert.equal(projectGrowthCaseRoute(y)?.ownerL0,'UNVERIFIED_OR_ABSENT');
});

test('resolved attention without matching immutable owner decision does not confirm L0',()=>{
  const x=input();x.attentionEvents=[];
  assert.equal(projectGrowthCaseRoute(x)?.ownerL0,'UNVERIFIED_OR_ABSENT');
  const y=input();y.attentionEvents=[{...y.attentionEvents[0],to_status:'ACKNOWLEDGED'}];
  assert.equal(projectGrowthCaseRoute(y)?.ownerL0,'OTHER_RECORDED_DECISION');
  const z=input();z.attention=[{...z.attention[0],attention_status:'OPEN'}];
  assert.equal(projectGrowthCaseRoute(z)?.ownerL0,'REQUEST_PENDING');
});

test('measurement with no predeclared LOCKED spec cannot be called an outcome',()=>{
  const x=input();
  x.outcomes=[{outcome_id:OUTCOME,measurement_spec_id:SPEC,
    measurement_spec_hash:'a'.repeat(64),outcome_state:'VALIDATED_WIN'}];
  assert.equal(projectGrowthCaseRoute(x)?.measurement,'NO_PLAN');
  x.specs=[{case_id:CASE,measurement_spec_id:SPEC,spec_hash:'a'.repeat(64),
    locked_at:null,measurement_status:'DRAFT',created_at:'2026-10-17'}];
  assert.equal(projectGrowthCaseRoute(x)?.measurement,'DRAFT_ONLY');
  x.specs=[{...x.specs[0],locked_at:'2026-10-18T12:00:00Z'}];
  assert.equal(projectGrowthCaseRoute(x)?.measurement,'RECORDED_OUTCOME');
  x.outcomes=[{...x.outcomes[0],measurement_spec_hash:'b'.repeat(64)}];
  assert.equal(projectGrowthCaseRoute(x)?.measurement,'LOCKED_NO_OUTCOME');
});

test('different-case spec and outcome may not be joined into this case',()=>{
  const x=input();
  x.specs=[{case_id:OTHER,measurement_spec_id:SPEC,spec_hash:'a'.repeat(64),
    locked_at:'2026-10-18T12:00:00Z'}];
  x.outcomes=[{outcome_id:OUTCOME,measurement_spec_id:SPEC,measurement_spec_hash:'a'.repeat(64)}];
  assert.equal(projectGrowthCaseRoute(x)?.measurement,'NO_PLAN');
});

test('case status not in canonical FSM and malformed case ID fail closed',()=>{
  assert.equal(projectGrowthCaseRoute({...input(),caseRow:{case_id:'wrong',case_status:'OPEN'}}),null);
  assert.equal(projectGrowthCaseRoute({...input(),caseRow:{case_id:CASE,case_status:'COMPLETED',
    current_accountable_domain:'TSEO',ownership_epoch:1}}),null);
});

test('no forged synthetic history from irrelevant, invalid or wrong-case events',()=>{
  const x=input();
  x.workflowEvents=[
    {...x.workflowEvents[0],case_id:OTHER},
    {...x.workflowEvents[0],workflow_event_id:'bad'},
    {...x.workflowEvents[0],event_type:'AI_AUTONOMOUS_SUCCESS'},
  ];
  x.handoffs=[];
  x.attention=[];x.attentionEvents=[];
  const r=projectGrowthCaseRoute(x);
  assert.ok(r);
  assert.equal(r.timeline.length,1);
  assert.equal(r.timeline[0].kind,'CASE');
});
