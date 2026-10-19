import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMissionSnapshot, MISSION_ROLE_CODES, missionEventsForCase, projectMissionOwnerAttention} from '../../lib/owner-ui/missionControlProjection.ts';

const c1='23049f6b-35bd-4211-973c-d1ea3a82f708';
const c2='b7d44cf3-7bc0-4b61-8ce7-d189bb323127';
const attention='1fb3cf4b-06b9-4c52-97a5-e1c7ae5a83f4';
const raw=()=>{
  const roles=MISSION_ROLE_CODES.map(code=>({
    role_code:code,runtime_status:['CPIM','GDAE','GROWTH_DIRECTOR'].includes(code)?'INACTIVE':'SHADOW',
    autonomy_ceiling:'PROPOSE_ONLY',
  }));
  const cases=[
    {case_id:c1,case_code:'GC-1',title:'Search Release audit',case_status:'OPEN',
      current_accountable_domain:'TSEO',workflow_status:'COMPLETED'},
    {case_id:c2,case_code:'GC-2',title:'Earlier shadow check',case_status:'OPEN',
      current_accountable_domain:'TSEO',workflow_status:'COMPLETED'},
  ];
  const workflowEvents=[
    {workflow_event_id:'event-1',case_id:c1,event_type:'WORKFLOW_CREATED',created_at:'2026-10-16T11:53:45Z'},
    {workflow_event_id:'event-2',case_id:c1,event_type:'WORKFLOW_CLAIMED',created_at:'2026-10-16T11:53:46Z'},
    {workflow_event_id:'event-3',case_id:c1,event_type:'WORKFLOW_COMPLETED',created_at:'2026-10-16T11:53:47Z'},
  ];
  const handoffs=[{handoff_id:'handoff-1',case_id:c1,source_domain:'TSEO',target_domain:'GMEL',
    handoff_status:'COMPLETED',created_at:'2026-10-16T11:53:48Z',completed_at:'2026-10-16T11:53:49Z'}];
  const attentionRows=[{attention_id:attention,case_id:c1,attention_status:'RESOLVED',
    source_code:'TSEO_SHADOW_L0_QA_REQUEST',created_at:'2026-10-18T16:09:41Z'}];
  const attentionEvents=[{attention_event_id:'owner-event-1',attention_id:attention,
    to_status:'RESOLVED',decision_code:'CONFIRM_INTERNAL_L0_ONLY',
    created_at:'2026-10-18T18:59:29Z'}];
  return {roles,cases,workflowEvents,handoffs,attention:attentionRows,attentionEvents};
};

test('exactly eight canonical roles including dormant ones; SHADOW never means RUNNING',()=>{
  const snapshot=buildMissionSnapshot(raw());
  assert.equal(snapshot.roles.length,8);
  assert.equal(snapshot.roles.filter(r=>r.mode==='SHADOW').length,5);
  assert.equal(snapshot.roles.filter(r=>r.mode==='INACTIVE').length,3);
  assert.equal(snapshot.currentlyRunning,0);
  assert.equal(snapshot.liveAgentExecutionProven,false);
  assert.equal(snapshot.historyOnly,true);
});

test('completed TSEO technical step and resolved owner review do not close the Growth Case',()=>{
  const s=buildMissionSnapshot(raw());
  assert.equal(s.cases.length,2);
  assert.equal(s.totalOpenCases,2);
  assert.equal(s.roles.find(r=>r.code==='TSEO')?.openCases,2);
  assert.equal(s.roles.find(r=>r.code==='TSEO')?.runningWorkflows,0);
  assert.equal(s.cases[0].status,'OPEN');
  assert.equal(s.cases[0].attentionId,attention);
});

test('historical edge exists only when real persisted handoff exists; owner audit shows limited L0',()=>{
  const s=buildMissionSnapshot(raw());
  const edges=s.events.filter(e=>e.kind==='handoff');
  assert.equal(s.historicalHandoffs,1);
  assert.equal(edges.length,2);
  assert.ok(edges.every(e=>e.source==='TSEO'&&e.target==='GMEL'));
  assert.ok(s.events.some(e=>e.phase==='owner_resolved' &&
    e.title.includes('только внутреннюю L0')));
  assert.ok(s.events.some(e=>e.phase==='owner_requested' && e.target==='OWNER'));
  assert.equal(s.events[s.events.length-1].phase,'owner_resolved');
});

test('do not fabricate graph links, fake role events, or replay nonexistent owner decisions',()=>{
  const source=raw();
  source.handoffs=[];
  source.attentionEvents=[];
  const result=buildMissionSnapshot(source);
  assert.equal(result.historicalHandoffs,0);
  assert.equal(result.events.filter(e=>e.kind==='handoff').length,0);
  assert.equal(result.events.filter(e=>e.phase==='owner_resolved').length,0);
  assert.equal(result.roles.length,8);
});

test('unknown Growth Cases, events without timestamp and alien source role never enter Mission Control',()=>{
  const source=raw();
  source.workflowEvents.push(
    {workflow_event_id:'bad-1',case_id:'other-business',event_type:'WORKFLOW_CREATED',created_at:'2026-10-16T11:53:46Z'},
    {workflow_event_id:'bad-2',case_id:c1,event_type:'WORKFLOW_CLAIMED',created_at:'not-a-date'},
  );
  source.handoffs.push({handoff_id:'alien',case_id:c1,source_domain:'EXTERNAL',
    target_domain:'GMEL',handoff_status:'COMPLETED',
    created_at:'2026-10-16T11:53:49Z',completed_at:'2026-10-16T11:53:50Z'});
  const s=buildMissionSnapshot(source);
  assert.equal(s.historicalHandoffs,1);
  assert.equal(s.events.filter(e=>e.kind==='workflow').length,3);
  assert.equal(s.events.filter(e=>e.kind==='handoff').length,2);
});

test('missing data leaves eight roles UNKNOWN, not simulated eight running employees',()=>{
  const s=buildMissionSnapshot({
    roles:[],cases:[],workflowEvents:[],handoffs:[],attention:[],attentionEvents:[],
  });
  assert.equal(s.roles.length,8);
  assert.ok(s.roles.every(r=>r.mode==='UNKNOWN'));
  assert.equal(s.totalOpenCases,0);
  assert.equal(s.events.length,0);
});

test('owner-only visual page reads bounded safe registries without privileged writes or external models',()=>{
  const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');
  const component=readFileSync('components/admin/MissionControlClient.tsx','utf8');
  const shell=readFileSync('components/admin/OwnerShell.tsx','utf8');
  const work=readFileSync('app/admin/company/work/page.tsx','utf8');
  assert.match(page,/await connection\(\)/);
  assert.match(page,/getAdminReadClient\(\)/);
  for(const view of [
    'feya_commerce_v_role_activation_safe_v1',
    'feya_commerce_v_owner_work_safe_v1',
    'feya_commerce_v_growth_workflow_events_safe_v1',
    'feya_commerce_v_growth_handoffs_safe_v1',
    'feya_commerce_v_owner_attention_safe_v3',
    'feya_commerce_v_owner_attention_events_safe_v1',
  ])assert.ok(page.includes(view),view);
  assert.equal((page.match(/\.limit\(/g)||[]).length,7);
  assert.match(page,/feya_commerce_v_owner_attention_safe_v2/);
  assert.match(page,/count:'exact'/);
  assert.match(component,/setMode\('office'\)/);
  assert.match(component,/Воспроизведение реальных событий/);
  assert.match(component,/prefers-reduced-motion/);
  assert.match(component,/setPointerCapture/);
  assert.match(shell,/\/admin\/company\/mission-control/);
  assert.match(work,/href="\/admin\/company\/mission-control"/);
  assert.match(work,/missionControlHref\(\)/);
  assert.doesNotMatch(page+component,/\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|OPENAI_API_KEY|api\.openai\.com|setInterval\([^]*fetch\(/);
  assert.doesNotMatch(page,/\.select\('\*'\)|result_json|context_json|authorization|SUPABASE_SERVICE_ROLE_KEY/);
});


test('case focus isolates independently persisted cases and rejects nonexistent Case IDs',()=>{
  const source=raw();
  source.workflowEvents.push({
    workflow_event_id:'event-case2',case_id:c2,event_type:'WORKFLOW_CREATED',
    created_at:'2026-10-16T12:01:00Z',
  });
  const snapshot=buildMissionSnapshot(source);
  const all=missionEventsForCase(snapshot,null);
  const first=missionEventsForCase(snapshot,c1);
  const second=missionEventsForCase(snapshot,c2);
  assert.deepEqual(all,snapshot.events);
  assert.ok(first.length>0);
  assert.ok(first.length<all.length);
  assert.ok(first.every(e=>e.caseId===c1));
  assert.equal(second.length,1);
  assert.ok(second.every(e=>e.caseId===c2));
  assert.equal(missionEventsForCase(snapshot,'other-business-id').length,0);
  assert.equal(missionEventsForCase(snapshot,'').length,0);
  assert.equal(snapshot.totalOpenCases,2); // Focus does not change durable Case status.
});

test('case-focused mobile owner interface navigates existing protected routes and stays non-executing',()=>{
  const ui=readFileSync('components/admin/MissionControlClient.tsx','utf8');
  const css=readFileSync('components/admin/MissionControl.module.css','utf8');
  assert.match(ui,/missionEventsForCase\(snapshot,caseFocus\)/);
  assert.match(ui,/Фокус кейса/);
  assert.match(ui,/mobileRoster/);
  assert.match(ui,/Мои решения/);
  assert.match(ui,/\/admin\/company\/owner-attention/);
  assert.match(ui,/\/admin\/company\/work/);
  assert.match(ui,/RUNNING по записи/);
  assert.match(ui,/Воспроизведение реальных событий/);
  assert.match(css,/mobileMapOpen/);
  assert.match(css,/stageArea:not\(\.mobileMapOpen\) \.stage/);
  assert.match(css,/focus-visible/);
  assert.doesNotMatch(ui,/api\.openai\.com|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\/api\/agent\/run/);
});

test('owner attention preview preserves exact count and fails closed on unverified data',()=>{
  const a='c551c9a2-b099-4b5d-a8ed-7d6f34f603ce';
  const b='cd76ffcd-e529-4fea-9406-4d10f2479a30';
  const rows=[
    {attention_id:a,attention_status:'OPEN',priority:'P1',title:'Policy review'},
    {attention_id:b,attention_status:'ACKNOWLEDGED',priority:'P2',title:'Checkout review'},
  ];
  const result=projectMissionOwnerAttention(rows,2);
  assert.equal(result?.total,2);
  assert.deepEqual(result?.items.map(x=>x.priority),['P1','P2']);
  assert.deepEqual(result?.items.map(x=>x.id),[a,b]);
  assert.equal(projectMissionOwnerAttention([],0)?.total,0);
  assert.equal(projectMissionOwnerAttention([],null),null);
  assert.equal(projectMissionOwnerAttention([],2),null);
  assert.equal(projectMissionOwnerAttention(rows,1),null);
  assert.equal(projectMissionOwnerAttention([{...rows[0],attention_status:'RESOLVED'}],1),null);
  assert.equal(projectMissionOwnerAttention([{...rows[0],attention_id:'unsafe'}],1),null);
  assert.equal(projectMissionOwnerAttention([{...rows[0],priority:'unknown'}],1)?.items[0].priority,'UNKNOWN');
});

test('new attention summary only navigates to the original guarded queue, never approves',()=>{
  const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');
  const ui=readFileSync('components/admin/MissionControlClient.tsx','utf8');
  const css=readFileSync('components/admin/MissionControl.module.css','utf8');
  assert.ok(page.includes(".in('attention_status',['OPEN','ACKNOWLEDGED'])"));
  assert.ok(page.includes(".order('created_at',{ascending:true}).limit(3)"));
  assert.ok(ui.includes('snapshot.ownerAttention.items.map'));
  assert.ok(ui.includes('Состояние Owner Attention не подтверждено'));
  assert.ok(ui.includes('Открыть общую очередь'));
  assert.ok(css.includes('attentionBrief'));
  for(const forbidden of ['approveEverything','sendPayment','runModel','.insert(','.update(']){
    assert.ok(!ui.includes(forbidden),forbidden);
  }
});

test('Mission Control uses bounded current Case metadata and a server snapshot time, not invented SLAs',()=>{
  const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');
  assert.ok(page.includes('priority,due_at,updated_at,current_step_code,wait_reason,blocked_reason'));
  assert.ok(page.includes('capturedAt:new Date().toISOString()'));
  const snap=buildMissionSnapshot(raw());
  assert.equal(snap.cases[0].priority,'UNKNOWN');
  assert.equal(snap.cases[0].dueAt,null);
  assert.equal(snap.cases[0].blockedReason,null);
});

