import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('app/api/admin/gsc-official-capture/route.ts','utf8');
const writer = readFileSync('lib/gscOfficialCaptureServer.ts','utf8');
const ui = readFileSync('components/admin/OwnerGscCaptureClient.tsx','utf8');
const parent = readFileSync('components/admin/OwnerGscReadinessClient.tsx','utf8');
const system = readFileSync('app/admin/system-readiness/page.tsx','utf8');

test('GSC evidence capture requires authenticated allowlisted same-origin owner',()=>{
  assert.match(route,/export async function POST\(/);
  assert.match(route,/request\.headers\.get\('origin'\)/);
  assert.match(route,/GSC_CAPTURE_OWNER_ORIGIN_DENIED/);
  assert.match(route,/getSupabaseAuthServerClient\(/);
  assert.match(route,/auth\.auth\.getClaims\(/);
  assert.match(route,/adminAccessDecision\(/);
  assert.match(route,/config\.required/);
  assert.match(route,/config\.allowlistConfigured/);
  assert.ok(route.indexOf('adminAccessDecision(') < route.indexOf('captureOfficialGscOnce('));
  assert.ok(route.indexOf("FEYA_GSC_CAPTURE_ENABLED") < route.indexOf("captureOfficialGscOnce("));
});

test('GSC capture refuses browser-supplied provider rows and requires exact intent',()=>{
  assert.match(route,/request\.text\(\)/);
  assert.match(route,/text\.length > 256/);
  assert.match(route,/Object\.keys\(body\)\.length !== 1/);
  assert.match(route,/SAVE_GSC_OBSERVATION_V1/);
  assert.match(route,/GSC_CAPTURE_CONFIRMATION_REQUIRED/);
  assert.match(ui,/body:JSON\.stringify\(\{confirm:'SAVE_GSC_OBSERVATION_V1'\}\)/);
  for(const forbidden of ['p_daily_rows','client_secret','refresh_token','OPENAI_API_KEY','cron.schedule']){
    assert.equal(route.includes(forbidden),false,forbidden);
  }
});

test('shared storage writer fails closed and returns immutable receipt only',()=>{
  assert.match(writer,/FEYA_GSC_CAPTURE_ENABLED/);
  assert.match(writer,/FEYA_GSC_READ_ENABLED/);
  assert.match(writer,/getSupabaseServiceRoleClient\(/);
  assert.match(writer,/probeOfficialGscReadOnly\(/);
  assert.match(writer,/planOfficialGscCapture\(/);
  assert.match(writer,/service\.rpc\('feya_fn_stage_gsc_daily_observation_v1'/);
  assert.match(writer,/GSC_CAPTURE_ALREADY_RECORDED/);
  assert.match(writer,/source_health_promoted: false/);
  assert.match(writer,/auto_gmel_enabled: false/);
  assert.match(writer,/ai_calls: 0/);
  assert.ok(writer.indexOf('FEYA_GSC_CAPTURE_ENABLED') < writer.indexOf('probeOfficialGscReadOnly(process.env'));
  for(const forbidden of ['cron.schedule','openai.com','anthropic.com','FEYA_GA4_MEASUREMENT_ID']){
    assert.equal(writer.includes(forbidden),false,forbidden);
  }
});

test('new admin action is explicit, has safe feedback, and requires read before write',()=>{
  assert.match(ui,/Сохранить снимок GSC/);
  assert.match(ui,/acknowledged/);
  assert.match(ui,/readVerified/);
  assert.match(ui,/captureEnabled/);
  assert.match(ui,/disabled=\{!readVerified\|\|!captureEnabled\|\|!acknowledged\|\|running\}/);
  assert.match(ui,/FEYA_GSC_CAPTURE_ENABLED=true/);
  assert.match(parent,/<OwnerGscCaptureClient readVerified=\{result\?\.ok===true\} captureEnabled=\{captureEnabled\} \/>/);
  assert.ok(system.includes("captureEnabled={process.env.FEYA_GSC_CAPTURE_ENABLED === 'true'}"));
  assert.doesNotMatch(route+ui,/GOCSPX-|ya29\.|1\/\//);
});
