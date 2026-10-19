import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MISSION_ROLE_CODES} from '../../lib/owner-ui/missionControlProjection.ts';
import {missionRolePresentation,missionOrganizationalLinks,missionAutonomyLabel}
  from '../../lib/owner-ui/missionRolePresentation.ts';

const ui=readFileSync('components/admin/MissionControlClient.tsx','utf8');
const css=readFileSync('components/admin/MissionControl.module.css','utf8');
const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');

test('visual layer uses eight existing canonical role contracts, not a ninth agent or new runtime',()=>{
  assert.deepEqual(Object.keys(missionRolePresentation).sort(),[...MISSION_ROLE_CODES].sort());
  assert.equal(missionOrganizationalLinks.length,11);
  const roster=new Set<string>([...MISSION_ROLE_CODES,'OWNER']);
  for(const edge of missionOrganizationalLinks){
    assert.ok(roster.has(edge.source),edge.source);
    assert.ok(roster.has(edge.target),edge.target);
    assert.notEqual(edge.source,edge.target);
  }
  assert.ok(Object.values(missionRolePresentation).every(m=>m.name&&m.section&&m.mission&&m.scope));
  assert.equal(missionAutonomyLabel.PROPOSE_ONLY,'Может предлагать');
  assert.ok(!Object.values(missionRolePresentation).some(m=>/\+\d+%|roi\s+\d|revenue\s+\d/i.test(m.mission)));
});

test('schema separates conceptual links from saved event links and animates only explicit replay',()=>{
  assert.match(ui,/showPolicyLinks&&!caseFocus\?missionOrganizationalLinks\.map/);
  assert.match(ui,/styles\.policyConnection/);
  assert.match(ui,/styles\.connection/);
  assert.match(ui,/Регламент, не событие/);
  assert.match(ui,/Сохранённые передачи/);
  assert.match(ui,/focused&&playing&&motion&&styles\.movingLine/);
  assert.match(ui,/e\.kind==='handoff'/);
  assert.match(ui,/Воспроизведение реальных событий/);
  assert.match(css,/policyConnection[\s\S]*stroke-dasharray/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(ui,/liveAgentExecutionProven\s*=\s*true/);
});

test('Office is a real role/task overview rather than decorative duplicate of the graph',()=>{
  assert.match(ui,/mode==='graph'\?<>/);
  assert.match(ui,/styles\.officeBoard/);
  assert.match(ui,/styles\.officeGrid/);
  assert.match(ui,/snapshot\.roles\.map\(r=><button/);
  assert.match(ui,/r\.openCases\?/);
  assert.match(ui,/Нет закреплённых открытых кейсов/);
  assert.match(ui,/selectRole\(r\.code\)/);
  assert.match(ui,/role="group" aria-label="Разделы досье"/);
  for(const label of ['Обзор','Задачи','Связи'])assert.ok(ui.includes('>'+label+'</button>'),label);
  assert.match(ui,/relatedCases\.length/);
  assert.match(ui,/relevantHandoffs\.length/);
  assert.match(ui,/missionAutonomyLabel\[selectedRole\.autonomy\]/);
});

test('premium visuals are scoped to the internal surface, with no added art assets or dependencies',()=>{
  assert.match(css,/FEYA Mission Control vNext — verified-status visual pass/);
  assert.match(css,/\.wrapper \[data-role="TSEO"\]/);
  assert.match(css,/\.botHead/);
  assert.match(css,/\.botVisor/);
  assert.match(css,/\.officeDesk/);
  assert.match(css,/\.dossierTabs/);
  assert.match(css,/\.eventButton\[data-kind="handoff"\]/);
  assert.match(ui,/data-kind=\{e\.kind\}/);
  assert.match(ui,/RolePortrait code=\{r\.code\}/);
  assert.match(ui,/setDossierTab\('overview'\)/);
  assert.match(page,/getAdminReadClient\(\)/);
  assert.doesNotMatch(page+ui,/\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|api\.openai\.com|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(css,/body\s*\{|\.product-card\s*\{|@import|url\(/);
});

test('third Case route is a real snapshot-projected view and filters history by period and type',()=>{
  const caseRoute=readFileSync('components/admin/MissionCaseRouteClient.tsx','utf8');
  const view=readFileSync('lib/owner-ui/missionControlView.ts','utf8');
  assert.ok(ui.includes("setMode('case')"));
  assert.ok(ui.includes('<MissionCaseRouteClient'));
  assert.ok(ui.includes("['7d','7 дней']"));
  assert.ok(ui.includes("['10d','10 дней']"));
  assert.ok(ui.includes('filterMissionHistory('));
  assert.ok(view.includes("86400000"));
  assert.ok(view.includes("source!==options.actor"));
  assert.ok(view.includes("event.kind!==options.kind"));
  assert.ok(caseRoute.includes('missionCaseDeadline'));
  assert.ok(caseRoute.includes('Техническая работа завершена, но кейс остаётся OPEN'));
  assert.ok(caseRoute.includes('Срок не установлен · просрочка не определяется'));
  assert.ok(caseRoute.includes('Execution Receipt здесь не проверен')===false);
  assert.ok(caseRoute.includes('Полная карточка'));
  assert.ok(view.includes('Независимая проверка'));
  assert.doesNotMatch(caseRoute,/\.insert\(|\.update\(|\.rpc\(|OPENAI_API_KEY|setInterval\(/);
});

