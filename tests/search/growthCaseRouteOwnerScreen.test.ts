import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const detail = readFileSync('app/admin/company/work/[id]/page.tsx','utf8');
const presentation = readFileSync('components/admin/OwnerCaseRouteTruth.tsx','utf8');
const generic = readFileSync('components/admin/OwnerWorkDetailContent.tsx','utf8');
const presenter = readFileSync('lib/owner-ui/presenters.ts','utf8');
const logic = readFileSync('lib/owner-ui/growthCaseRouteTruth.ts','utf8');

test('G2a uses existing protected owner work route and current Core tables only',()=>{
  assert.match(detail,/getAdminReadClient\(/);
  assert.match(detail,/feya_commerce_v_owner_work_safe_v1/);
  assert.match(detail,/from\('feya_growth_case_events_v1'\)/);
  assert.match(detail,/feya_commerce_v_owner_attention_safe_v3/);
  assert.match(detail,/feya_commerce_v_owner_attention_events_safe_v1/);
  assert.match(detail,/feya_growth_measurement_specs_v1/);
  assert.match(detail,/feya_growth_measurement_outcomes_v1/);
  assert.match(detail,/projectGrowthCaseRoute\(/);
  assert.match(detail,/projectGdaeArchiveForCase\(/);
  assert.match(detail,/<OwnerGdaeArchivedEvidence gate={gdaeArchive}[\s\S]*?metricGate={metricGate \|\| null}/);
  assert.match(detail,/<OwnerCaseRouteTruth route={caseRoute}/);
  assert.doesNotMatch(detail+logic+presentation,/\.rpc\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  assert.doesNotMatch(detail+logic+presentation,/SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|FEYA_GSC_OAUTH_REFRESH_TOKEN|OPENAI_API_KEY/);
});

test('G2a case journal query limits columns to non-PII, selected fields only',()=>{
  assert.match(detail,/\.select\('case_event_id,case_id,event_type,from_status,to_status,ownership_epoch,created_at'\)/);
  assert.doesNotMatch(detail,/\.select\('case_event_id,.*actor_user_id/);
  assert.doesNotMatch(detail,/\.select\('case_event_id,.*payload_json/);
  assert.match(detail,/\.eq\('case_id', id\)\.order\('created_at', \{ ascending: false \}\)\.limit\(80\)/);
  assert.match(detail,/caseRouteError = 'История решений или измерений недоступна/);
});

test('workflow completed and owner decision are never equivalent to case closure',()=>{
  assert.match(presentation,/Завершение технического workflow[\s\S]*не закрывают сам кейс/);
  assert.match(presentation,/Независимая экспертная QA этим решением не подтверждается/);
  assert.match(presentation,/Команды запуска здесь нет/);
  assert.match(presentation,/Реальные события, версии, причины ограничений/);
  assert.match(presenter,/caseStatus: text\(row\.case_status/);
  assert.match(presenter,/workflowStatus: text\(row\.workflow_status/);
  assert.match(generic,/Эти статусы независимы: завершение технического workflow не означает закрытие кейса/);
  assert.match(logic,/canExecuteTransition:false/);
  assert.match(logic,/independentQa:'NOT_ATTESTED'/);
});

test('owner sees minimal route first and expands audit history only on demand',()=>{
  assert.match(presentation,/Маршрут кейса/);
  assert.match(presentation,/1 · Бизнес-кейс/);
  assert.match(presentation,/2 · Техническая работа/);
  assert.match(presentation,/3 · Решение владельца/);
  assert.match(presentation,/4 · Измерение/);
  assert.match(presentation,/<details className="owner-disclosure owner-disclosure-section">/);
  assert.doesNotMatch(presentation,/<button|onClick=|setTimeout|Math\.random/);
});

test('G2a case detail route gains semantically accurate visual stages without any new write path',()=>{
  const moduleCss=readFileSync('components/admin/OwnerCaseRouteVisual.module.css','utf8');
  assert.match(presentation,/styles\.journey/);
  assert.match(presentation,/styles\.truthGrid/);
  assert.match(presentation,/Зелёная отметка говорит только о записи конкретного этапа/);
  assert.match(presentation,/route\.measurement==='RECORDED_OUTCOME'/);
  assert.match(presentation,/route\.ownerL0==='CONFIRMED_INTERNAL_ONLY'/);
  assert.match(presentation,/Execution Receipt здесь не подтверждён/);
  assert.match(moduleCss,/data-state="unknown"/);
  assert.match(moduleCss,/prefers-reduced-motion/);
  assert.doesNotMatch(presentation+moduleCss,/onClick=|<button|api\.openai\.com|\.insert\(|\.rpc\(/);
});

