import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const base='docs/owner/';
const documents={
  blueprint:base+'FEYA_GROWTH_OS_TARGET_OPERATING_BLUEPRINT_V1_20261018.md',
  roles:base+'FEYA_GROWTH_OS_ROLE_JOBS_KPI_MATRIX_V1_20261018.md',
  gaps:base+'FEYA_GROWTH_OS_GAP_REGISTER_AND_TEST_PLAN_V1_20261018.md',
  review:base+'FEYA_GROWTH_OS_INDEPENDENT_REVIEW_CLAUDE_BRIEF_V1_20261018.md',
};
const text=Object.fromEntries(Object.entries(documents).map(([key,path])=>[
  key,existsSync(path)?readFileSync(path,'utf8'):''
]));

test('FEYA full-target blueprint and audit dossier is present and explicitly subordinate to canonical v1.0',()=>{
  for(const [key,path] of Object.entries(documents)){
    assert.ok(existsSync(path),key+': '+path);
    assert.ok(text[key].length>2500,key+' must not be an empty placeholder');
  }
  assert.match(text.blueprint,/CANONICAL/);
  assert.match(text.blueprint,/восемь CANONICAL Agent Passports/);
  assert.match(text.blueprint,/девятую роль ради интерфейса/);
  assert.match(text.roles,/не новый CANONICAL паспорт/);
  assert.match(text.gaps,/нельзя.*пометить.*сделано|Нельзя.*пометить.*сделано/);
});

test('all eight canonical employee IDs survive the integrated human-friendly job design',()=>{
  for(const code of [
    'GROWTH_DIRECTOR','OSPM','CPIM','GMEL','SCO','CQA','TSEO','GDAE',
  ]){
    assert.ok(text.roles.includes(code),'Missing role '+code);
    assert.ok(text.blueprint.includes(code),'Missing role in source/interaction contract '+code);
  }
  for(const label of [
    'Директор роста','органического поиска','Коммерческий','Измерения',
    'SEO-контент','контроль качества','Технический SEO','Инженер данных',
  ])assert.ok(text.roles.toLowerCase().includes(label.toLowerCase()),'Russian owner copy: '+label);
});

test('every gap and failure-injection scenario has an explicit ID and proposed invariant',()=>{
  for(let i=1;i<=12;i++){
    assert.ok(text.gaps.includes('GAP-'+String(i).padStart(3,'0')),'Gap '+i);
  }
  for(let i=1;i<=35;i++){
    assert.ok(text.gaps.includes('SC'+String(i).padStart(2,'0')),'Missing regression scenario '+i);
  }
  for(const term of [
    'NO_DATA','NOT_OBSERVABLE','GSC','GA4','Seller Online','owner',
    'Case', 'rollback','idempotency','approval','Learning Registry',
  ])assert.ok((text.gaps+text.blueprint).toLowerCase().includes(term.toLowerCase()),term);
});

test('core owner and commerce constraints cannot disappear from living specification',()=>{
  for(const textValue of ['207','Search Release v12','V13','Owner','Execution Gateway',
    'L0','L1','L2','L3','согласованных','UNKNOWN','UNAVAILABLE']){
    assert.ok((text.blueprint+text.gaps).includes(textValue),'Invariant '+textValue);
  }
  for(const forbidden of [
    /FEYA_OWNER_ACTIONS_ENABLED\s*=\s*true/,
    /FEYA_ANALYTICS_ENABLED\s*=\s*true/,
    /FEYA_GROWTH_SHADOW_WORK_ENABLED\s*=\s*true/,
    /OPENAI_API_KEY\s*=/,
  ]){
    // Docs may mention a switch by name, but must never encode an enabling command.
    assert.doesNotMatch(text.blueprint+text.roles+text.gaps,forbidden);
  }
});

test('conversion KPI cannot mix population of all confirmed orders with GA4 consent-only sessions',()=>{
  assert.match(text.blueprint,/CVR_NOT_COMPARABLE/);
  assert.match(text.blueprint,/Commerce DB заказы на consent-only GA4 sessions/);
  assert.match(text.gaps,/same consent-eligible attributed order\/session cohort/);
});

test('independent reviewer cannot rewrite canon or activate a provider',()=>{
  assert.match(text.review,/read-only/);
  assert.match(text.review,/Не создавай новую/);
  assert.match(text.review,/BLOCKER\/MAJOR\/MINOR/);
  assert.match(text.review,/Не выполнять никакого кода/);
  assert.match(text.review,/CANONICAL/);
});

test('the baseline runtime and approved product/search state are still described accurately',()=>{
  const canonical=readFileSync('docs/owner/THEFEYA_GROWTH_OS_RUNTIME_ACTIVATION_20261015.md','utf8');
  const entry=readFileSync('AGENTS.md','utf8');
  assert.match(canonical,/восемь|eight|8 логических|eight logical|All eight/i);
  assert.match(entry,/207/);
  assert.match(entry,/Search Release v12/);
  assert.match(text.blueprint,/первые.*immutable|immutable.*receipts|immutable receipts/i);
});
