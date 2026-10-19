import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missionControlHref,resolveMissionEntry}
  from '../../lib/owner-ui/missionControlNavigation.ts';
import type {MissionSnapshot} from '../../lib/owner-ui/missionControlProjection.ts';

const caseId='23049f6b-35bd-4211-973c-d1ea3a82f708';
const snapshot={
 roles:[
   {code:'TSEO',label:'Technical SEO',mode:'SHADOW',autonomy:'PROPOSE_ONLY',openCases:2,runningWorkflows:0,reviewPending:0},
   {code:'GMEL',label:'Measurement',mode:'SHADOW',autonomy:'PROPOSE_ONLY',openCases:0,runningWorkflows:0,reviewPending:0},
 ],
 cases:[{id:caseId,code:'GC-test',title:'Search Release',owner:'TSEO',status:'OPEN',
   workflowStatus:'COMPLETED',attentionId:null,priority:'P3',dueAt:null,
   updatedAt:null,currentStep:null,waitReason:null,blockedReason:null}],
 events:[],totalOpenCases:1,currentlyRunning:0,historicalHandoffs:0,
 historyOnly:true,liveAgentExecutionProven:false,
} as unknown as MissionSnapshot;

test('all three views are addressed within ONE Mission Control route',()=>{
 assert.equal(missionControlHref(),'/admin/company/mission-control');
 assert.equal(missionControlHref({caseId}),'/admin/company/mission-control?case='+caseId);
 assert.equal(missionControlHref({view:'case',caseId}),
  '/admin/company/mission-control?view=case&case='+caseId);
 assert.equal(missionControlHref({view:'office',role:'GMEL'}),
  '/admin/company/mission-control?view=office&role=GMEL');
 assert.deepEqual(resolveMissionEntry({view:'case',case:caseId},snapshot),
  {view:'case',caseId,role:'TSEO'});
 assert.deepEqual(resolveMissionEntry({view:'graph',case:caseId,role:'GMEL'},snapshot),
  {view:'graph',caseId,role:'GMEL'});
});

test('unknown or ambiguous case/role never creates a fake focused agent or Case',()=>{
 const fake='99999999-9999-4999-8999-999999999999';
 assert.deepEqual(resolveMissionEntry({view:'case',case:fake,role:'SUPERADMIN'},snapshot),
  {view:'graph',caseId:null,role:'TSEO'});
 assert.deepEqual(resolveMissionEntry({view:'case',case:[caseId,fake],role:['OWNER','TSEO']},snapshot),
  {view:'graph',caseId:null,role:'TSEO'});
 assert.deepEqual(resolveMissionEntry({view:'office',role:'GMEL'},snapshot),
  {view:'office',caseId:null,role:'GMEL'});
 assert.deepEqual(resolveMissionEntry({view:'graph',role:'OWNER'},snapshot),
  {view:'graph',caseId:null,role:'OWNER'});
 assert.equal(missionControlHref({view:'case',caseId:'../admin',role:'SUPERADMIN'}),
  '/admin/company/mission-control?view=case');
});

test('owner Work, detail and diagram are reversibly navigable without new role runtime',()=>{
 const work=readFileSync('app/admin/company/work/page.tsx','utf8');
 const detail=readFileSync('app/admin/company/work/[id]/page.tsx','utf8');
 const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');
 const ui=readFileSync('components/admin/MissionControlClient.tsx','utf8');
 assert.match(work,/Показать команду на схеме/);
 assert.match(work,/missionControlHref\(\{caseId:item\.id\}\)/);
 assert.match(work,/missionControlHref\(\{role:role\.code\}\)/);
 assert.match(detail,/missionControlHref\(\{view:'case',caseId:id\}\)/);
 assert.match(detail,/Показать агента на схеме/);
 assert.match(page,/resolveMissionEntry\(params\|\|\{\},snapshot\)/);
 assert.match(ui,/useState<Mode>\(entry\.view\)/);
 assert.match(ui,/useState<string\|null>\(entry\.caseId\)/);
 assert.match(ui,/useState<Role>\(entry\.role\)/);
 assert.match(ui,/Открыть \{focusedCase\.code\}/);
 assert.doesNotMatch(work+detail+page+ui,/new Agent\(|createClient\(|\.insert\(|\.upsert\(|\.delete\(|OPENAI_API_KEY/);
});

