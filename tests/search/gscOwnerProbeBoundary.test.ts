import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('app/api/admin/gsc-readonly-probe/route.ts','utf8');
const screen = readFileSync('components/admin/OwnerGscReadinessClient.tsx','utf8');
const page = readFileSync('app/admin/system-readiness/page.tsx','utf8');

test('GSC owner check is POST-only, same-origin and allowlisted',()=>{
  assert.match(route,/export async function POST\(/);
  assert.doesNotMatch(route,/export async function GET\(/);
  assert.match(route,/request\.headers\.get\('origin'\)/);
  assert.match(route,/getSupabaseAuthServerClient\(/);
  assert.match(route,/auth\.auth\.getClaims\(/);
  assert.match(route,/adminAccessDecision\(/);
  assert.match(route,/config\.required/);
  assert.match(route,/config\.allowlistConfigured/);
  assert.ok(route.indexOf('adminAccessDecision(')<route.indexOf('probeOfficialGscReadOnly(process.env)'));
  assert.match(route,/FEYA_GSC_READ_ENABLED/);
});

test('GSC owner check sends only safe aggregate data and never writes or invokes models',()=>{
  assert.match(route,/probeOfficialGscReadOnly\(process\.env\)/);
  for(const forbidden of [
    'getSupabaseServiceRoleClient(', 'FEYA_GSC_OAUTH_CLIENT_SECRET',
    'FEYA_GSC_OAUTH_REFRESH_TOKEN','FEYA_INTERNAL_API_TOKEN',
    "service.rpc(",'.insert(','.upsert(','cron.schedule(','OPENAI_API_KEY'
  ]) assert.equal(route.includes(forbidden),false,forbidden);
  assert.match(route,/data_written: false/);
  assert.match(route,/source_health_promoted: false/);
  assert.match(route,/ai_calls: 0/);
  assert.match(route,/private, no-store/);
  assert.match(route,/noindex, nofollow/);
});

test('owner UI exposes a single on-demand diagnostic without credentials',()=>{
  assert.match(screen,/useState\(/);
  assert.match(screen,/\/api\/admin\/gsc-readonly-probe/);
  assert.match(screen,/method: 'POST'/);
  assert.match(screen,/Проверить подключение GSC/);
  assert.match(page,/<OwnerGscReadinessClient\s*\/>/);
  assert.match(page,/Google Ads API Basic подтверждён/);
  assert.doesNotMatch(screen,/client_secret|refresh_token|access_token/);
});
