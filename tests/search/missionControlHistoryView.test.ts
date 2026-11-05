import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMissionHistory,missionCaseDeadline,missionCaseRouteStages} from '../../lib/owner-ui/missionControlView.ts';
import type {MissionCase,MissionEvent} from '../../lib/owner-ui/missionControlProjection.ts';

const ref='2026-10-19T12:00:00Z';
const caseId='1b69298e-65b1-4ca2-a6a8-de41daff1840';
const caseRow:MissionCase={
  id:caseId,code:'GC-test',title:'Техническая сверка',owner:'TSEO',
  status:'OPEN',workflowStatus:'COMPLETED',attentionId:null,
  priority:'P3',dueAt:null,updatedAt:'2026-10-16T12:00:00Z',currentStep:'VERIFY',
  waitReason:null,blockedReason:null,
};
const base={caseId,caseCode:'GC-test',attentionId:null} as const;
const events:MissionEvent[]=[
  {id:'wf',...base,at:'2026-10-17T12:00:00Z',kind:'workflow',phase:'step_complete',title:'Технический шаг завершён',source:'TSEO',target:null},
  {id:'handoff',...base,at:'2026-10-18T11:00:00Z',kind:'handoff',phase:'handoff_complete',title:'Передача записана',source:'TSEO',target:'GMEL'},
  {id:'owner',...base,at:'2026-10-19T09:00:00Z',kind:'owner',phase:'owner_resolved',title:'Владелец подтвердил внутреннюю L0',source:'OWNER',target:null},
];

test('period filters show actual events only and never reinterpret no event as no case',()=>{
  const run=(window:'all'|'24h'|'7d'|'10d'|'30d')=>filterMissionHistory(events,{window,kind:'all',actor:null,asOf:ref});
  assert.equal(run('all').length,3);
  assert.deepEqual(run('24h').map(x=>x.id),['owner']);
  assert.equal(run('7d').length,3);
  assert.equal(run('10d').length,3);
  assert.deepEqual(filterMissionHistory(events,{window:'all',kind:'handoff',actor:null,asOf:ref}).map(x=>x.id),['handoff']);
  assert.deepEqual(filterMissionHistory(events,{window:'all',kind:'all',actor:'GMEL',asOf:ref}).map(x=>x.id),['handoff']);
  assert.deepEqual(filterMissionHistory(events,{window:'all',kind:'all',actor:'OWNER',asOf:ref}).map(x=>x.id),['owner']);
  assert.deepEqual(filterMissionHistory(events,{window:'7d',kind:'all',actor:null,asOf:null}),[]);
  assert.equal(caseRow.status,'OPEN');
});

test('Case route cannot promote technical completion or handoff to independent QA, publication or measurement',()=>{
  const stages=missionCaseRouteStages(caseRow,events);
  assert.equal(stages.length,7);
  assert.equal(stages[0].status,'current');
  assert.equal(stages[1].status,'recorded');
  assert.equal(stages[2].status,'recorded');
  assert.equal(stages[3].status,'recorded');
  assert.equal(stages[4].status,'unknown');
  assert.equal(stages[5].status,'unknown');
  assert.equal(stages[6].status,'unknown');
  assert.ok(stages[1].basis.includes('отдельно от Case'));
  assert.ok(stages[4].basis.includes('не доказывает'));
});

test('no due_at means no invented overdue status or false urgency',()=>{
  assert.equal(missionCaseDeadline(caseRow.dueAt,ref),'not_set');
  assert.equal(missionCaseDeadline('2026-10-20T12:00:00Z',ref),'due');
  assert.equal(missionCaseDeadline('2026-10-18T12:00:00Z',ref),'overdue');
  assert.equal(missionCaseDeadline('invalid',ref),'unknown');
  assert.equal(missionCaseDeadline('2026-10-18T12:00:00Z',null),'unknown');
  const withoutHistory=missionCaseRouteStages(caseRow,[]);
  assert.equal(withoutHistory[2].status,'unknown');
  assert.equal(withoutHistory[3].status,'unknown');
});

