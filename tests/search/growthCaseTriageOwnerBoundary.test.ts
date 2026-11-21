import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route=readFileSync('app/api/admin/company/work/owner-case-triage/route.ts','utf8');
const client=readFileSync('components/admin/OwnerCaseTriageClient.tsx','utf8');
const work=readFileSync('app/admin/company/work/[id]/page.tsx','utf8');
const policy=readFileSync('lib/ownerActionStepUpPolicy.ts','utf8');
const auth=readFileSync('lib/ownerActionAuth.ts','utf8');
const env=readFileSync('.env.example','utf8');
const contract=readFileSync('lib/owner-ui/growthCaseTriage.ts','utf8');

test('G2b has one server-side Core mutation, never client-side SQL or global owner unlock',()=>{
  assert.match(route,/requireOwnerActionActor\('growth_case_triage'\)/);
  assert.match(route,/request\.headers\.get\('origin'\) !== request\.nextUrl\.origin/);
  assert.match(route,/checkOwnerCaseTriageEvidence\(/);
  assert.match(route,/ownerCaseTriageIdempotencyKey\(/);
  assert.match(route,/attestOwnerCaseTriageWrite\(/);
  assert.match(route,/feya_fn_transition_growth_case_v1/);
  assert.match(route,/p_expected_status:'OPEN'/);
  assert.match(route,/p_new_status:'TRIAGED'/);
  assert.match(route,/p_actor_type:'human'/);
  assert.match(route,/p_idempotency_key:key/);
  assert.doesNotMatch(route,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|payment_enabled|purchase_success/);
  assert.doesNotMatch(route+client+contract,/api\.openai\.com|OPENAI_API_KEY|CRON_SECRET|FEYA_GSC_OAUTH_REFRESH_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route+policy+auth,/FEYA_OWNER_ACTIONS_ENABLED\s*=\s*true/);
});

test('G2b owner context binds only the real L0 TSEO case with existing separate flag',()=>{
  assert.match(work,/getOwnerActionConfigStatus\('growth_case_triage'\)/);
  assert.match(work,/caseRoute\.ownerL0 === 'CONFIRMED_INTERNAL_ONLY'/);
  assert.match(work,/caseRoute\.eventContinuity === 'VERIFIED_LATEST'/);
  assert.match(work,/caseRoute\.permissibleNextStep === 'TRIAGED'/);
  assert.match(work,/mayShowTriage && triageActor\?\.ok/);
  assert.match(work,/requireOwnerActionActor\('growth_case_triage'\)/);
  assert.match(auth,/FEYA_GROWTH_CASE_TRIAGE_ENABLED === 'true'/);
  assert.match(auth,/FEYA_GROWTH_SHADOW_WORK_ENABLED === 'true'/);
  assert.match(policy,/FEYA_GROWTH_CASE_TRIAGE_ENABLED==='true'/);
  assert.match(env,/FEYA_GROWTH_CASE_TRIAGE_ENABLED=false/);
});

test('owner screen requires explicit acknowledgement, cannot claim QA, Google indexing or ROI',()=>{
  assert.match(client,/Принять технический кейс к дальнейшей проверке/);
  assert.match(client,/confirm_l0_limits:true/);
  assert.match(client,/Подтвердить переход в TRIAGED/);
  assert.match(client,/disabled={!confirmed\|\|busy}/);
  assert.match(client,/credentials:'same-origin'/);
  assert.match(client,/crypto\.randomUUID\(\)/);
  assert.match(client,/if \(!requestId\.current\)/);
  assert.match(client,/reason:REASON/);
  assert.match(client,/requestId\.current=null/);
  assert.match(client,/Независимая QA, индексация Google и коммерческий результат/);
  assert.doesNotMatch(client,/\.rpc\(|\.update\(|fetch\('https:\/\/www\.google/);
});
