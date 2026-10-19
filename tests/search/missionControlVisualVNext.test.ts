import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MISSION_ROLE_CODES} from '../../lib/owner-ui/missionControlProjection.ts';
import {missionRolePresentation,missionOrganizationalLinks,missionAutonomyLabel}
  from '../../lib/owner-ui/missionRolePresentation.ts';

const ui=readFileSync('components/admin/MissionControlClient.tsx','utf8');
const css=readFileSync('components/admin/MissionControl.module.css','utf8');
const page=readFileSync('app/admin/company/mission-control/page.tsx','utf8');
const inspector=readFileSync('components/admin/MissionRoleInspector.tsx','utf8');
const robot=readFileSync('components/admin/MissionRobotPortrait.tsx','utf8');
const robotCss=readFileSync('components/admin/MissionRobotPortrait.module.css','utf8');
const route=readFileSync('components/admin/MissionCaseRouteClient.tsx','utf8');
const projection=readFileSync('lib/owner-ui/missionControlView.ts','utf8');

test('only eight canonical roles with human owner, no invented agent runtime or permissions',()=>{
  assert.deepEqual(Object.keys(missionRolePresentation).sort(),[...MISSION_ROLE_CODES].sort());
  assert.equal(missionOrganizationalLinks.length,11);
  const roster=new Set([...MISSION_ROLE_CODES,'OWNER']);
  for(const edge of missionOrganizationalLinks){
    assert.ok(roster.has(edge.source),edge.source);
    assert.ok(roster.has(edge.target),edge.target);
    assert.notEqual(edge.source,edge.target);
  }
  assert.equal(missionAutonomyLabel.PROPOSE_ONLY,'Может предлагать');
  assert.ok(Object.values(missionRolePresentation).every(r=>r.name&&r.section&&r.mission&&r.scope));
  assert.ok(!Object.values(missionRolePresentation).some(r=>/\+\d+%|roi\s+\d|revenue\s+\d/i.test(r.mission)));
  assert.ok(ui.includes('snapshot.roles.map'));
  assert.ok(robot.includes("role==='OWNER'"));
  assert.ok(!ui.includes('new Agent('));
});

test('graph differentiates static passport links from persisted handoffs, animates only history',()=>{
  assert.ok(ui.includes('showPolicyLinks&&!caseFocus?missionOrganizationalLinks.map'));
  assert.ok(ui.includes('styles.policyConnection'));
  assert.ok(ui.includes('styles.connection'));
  assert.ok(ui.includes('Регламент, не событие'));
  assert.ok(ui.includes('Сохранённые передачи'));
  assert.ok(ui.includes('focused&&playing&&motion&&styles.movingLine'));
  assert.ok(ui.includes("e.kind==='handoff'"));
  assert.ok(ui.includes('Воспроизведение реальных событий'));
  assert.match(css,/\.policyConnection\{[\s\S]*?stroke-dasharray/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.ok(ui.includes('setPointerCapture'));
  assert.ok(ui.includes('prefers-reduced-motion'));
  assert.doesNotMatch(ui,/liveAgentExecutionProven\s*=\s*true|Math\.random\(|api\.openai\.com/);
});

test('premium SVG robots and command-first viewport replace generic geometric role placeholders',()=>{
  assert.ok(robot.includes('linearGradient'));
  assert.ok(robot.includes('radialGradient'));
  assert.ok(robot.includes('MissionRobotPortrait'));
  assert.ok(robotCss.includes('.ownerHalo'));
  assert.ok(robotCss.includes('.specialty'));
  assert.ok(css.includes('.agent:hover'));
  assert.ok(css.includes('.edgeLabel'));
  assert.ok(css.includes('.commandHead'));
  assert.ok(css.includes('.topModes'));
  assert.ok(css.includes('.commandStats'));
  assert.ok(css.includes('.roleBrief'));
  assert.ok(ui.includes('<MissionRobotPortrait role={r.code}/>'));
  assert.ok(ui.includes('<MissionRoleInspector'));
  assert.ok(!page.includes('<h1>Mission Control</h1>'));
  assert.ok(page.includes('<MissionControlClient snapshot={snapshot}/>'));
  assert.ok(!css.includes('@import'));
  assert.ok(!css.includes('.product-card'));
});

test('the Office is an actual roster, not the graph with painted rectangles',()=>{
  assert.ok(ui.includes("mode==='office'"));
  assert.ok(ui.includes('styles.officeBoard'));
  assert.ok(ui.includes('styles.officeGrid'));
  assert.ok(ui.includes('snapshot.roles.map(r=><button'));
  assert.ok(ui.includes('r.openCases>0'));
  assert.ok(ui.includes('Нет закреплённых открытых кейсов'));
  assert.ok(ui.includes('onClick={()=>selectRole(r.code)}'));
  assert.ok(ui.includes('<MissionRoleInspector'));
  assert.ok(inspector.includes('role="group" aria-label="Разделы комнаты"'));
  for(const label of ['Обзор','Связи','Задачи','Метрики']){
    assert.ok(inspector.includes("'"+label+"'"),label);
  }
  assert.ok(inspector.includes('onOpenCase'));
  assert.ok(inspector.includes('missionAutonomyLabel[role.autonomy]'));
  assert.ok(inspector.includes('handoffs'));
  assert.ok(inspector.includes('Метрики результата здесь не выводятся без проверенного источника'));
  assert.ok(inspector.includes('Открытие материалов не запускает AI или публикацию'));
});

test('the Case route uses existing real snapshots, detailed steps and bounded owner decisions',()=>{
  assert.ok(ui.includes("setMode('case')"));
  assert.ok(ui.includes('<MissionCaseRouteClient'));
  assert.ok(ui.includes('<MissionCaseDecisionPanel'));
  assert.ok(route.includes('missionCaseDeadline'));
  assert.ok(route.includes('Техническая работа завершена, но кейс остаётся OPEN'));
  assert.ok(route.includes('Срок не установлен · просрочка не определяется'));
  assert.ok(route.includes('Полная карточка'));
  assert.ok(route.includes('Решение владельца'));
  assert.ok(route.includes('setSelectedStage'));
  assert.ok(route.includes('routeExplanation'));
  assert.ok(route.includes('onClick={onShowRole}'));
  assert.ok(projection.includes('Независимая проверка'));
  assert.ok(projection.includes('Execution Receipt здесь не проверен'));
  assert.ok(route.includes('не означает разрешение менять Production'));
  assert.doesNotMatch(route,/\.insert\(|\.update\(|\.rpc\(|setInterval\(|OPENAI_API_KEY/);
});

test('the command center filters exact saved timelines and takes no privileged actions',()=>{
  assert.ok(ui.includes("['7d','7 дней']"));
  assert.ok(ui.includes("['10d','10 дней']"));
  assert.ok(ui.includes('filterMissionHistory('));
  assert.ok(projection.includes('86400000'));
  assert.ok(projection.includes('source!==options.actor'));
  assert.ok(projection.includes('event.kind!==options.kind'));
  assert.ok(ui.includes('Вся история'));
  assert.ok(ui.includes("window.setInterval")); // historic play only, never a network poll
  assert.doesNotMatch(ui,/setInterval\([^]*fetch\(/);
  assert.ok(ui.includes('Состояние Owner Attention не подтверждено'));
  assert.ok(ui.includes('snapshot.ownerAttention.items.map'));
  assert.ok(ui.includes('Мои решения'));
  assert.ok(ui.includes('/admin/company/work'));
  assert.ok(ui.includes('/admin/company/owner-attention'));
  assert.ok(page.includes('getAdminReadClient()'));
  assert.doesNotMatch(page+ui+inspector+route,/\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|api\.openai\.com|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
