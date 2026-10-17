import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decideDailyGscCadence,expectedFinalGscWindow} from '../../lib/gscDailyCadencePolicy.ts';

const prod={
  VERCEL_ENV:'production',
  VERCEL_GIT_COMMIT_REF:'main',
  FEYA_GSC_DAILY_ENABLED:'true',
  FEYA_GSC_READ_ENABLED:'true',
  FEYA_GSC_CAPTURE_ENABLED:'true',
};
const date=new Date('2026-10-18T12:00:00Z');

test('GSC rolling final window is Pacific calendar based and lasts fourteen days',()=>{
  assert.deepEqual(expectedFinalGscWindow(date),{
    start_date:'2026-10-02',end_date:'2026-10-15'
  });
  assert.deepEqual(expectedFinalGscWindow(new Date('2026-10-17T02:00:00Z')),{
    start_date:'2026-09-30',end_date:'2026-10-13'
  });
  assert.deepEqual(expectedFinalGscWindow(new Date('2026-11-01T08:30:00Z')),{
    start_date:'2026-10-16',end_date:'2026-10-29'
  });
  assert.equal(expectedFinalGscWindow(new Date('bad')),null);
});

test('daily GSC is strictly disabled by default and outside production/main',()=>{
  for(const env of [{...prod,FEYA_GSC_DAILY_ENABLED:'false'},
    {...prod,FEYA_GSC_CAPTURE_ENABLED:'false'},
    {...prod,FEYA_GSC_READ_ENABLED:'false'}]){
    const r=decideDailyGscCadence(env,'2026-10-14',date);
    assert.equal(r.allowed,false);
    assert.equal(r.code,'GSC_DAILY_DISABLED');
  }
  for(const env of [{...prod,VERCEL_ENV:'preview'},
    {...prod,VERCEL_GIT_COMMIT_REF:'work/foo'}]){
    const r=decideDailyGscCadence(env,'2026-10-14',date);
    assert.equal(r.code,'GSC_DAILY_NOT_PRODUCTION');
  }
});

test('scheduler does not bootstrap source and cannot silently skip older final dates',()=>{
  const scenarios:[
    string|null,'GSC_DAILY_FIRST_RECEIPT_REQUIRED'|'GSC_DAILY_BACKFILL_REQUIRED'|
    'GSC_DAILY_BAD_WATERMARK'|'GSC_DAILY_ALREADY_COVERED'|'GSC_DAILY_RUN_ALLOWED'
  ][]=[
    [null,'GSC_DAILY_FIRST_RECEIPT_REQUIRED'],
    ['2026-09-30','GSC_DAILY_BACKFILL_REQUIRED'],
    ['2026-10-01','GSC_DAILY_RUN_ALLOWED'],
    ['2026-10-14','GSC_DAILY_RUN_ALLOWED'],
    ['2026-10-15','GSC_DAILY_ALREADY_COVERED'],
    ['2026-10-16','GSC_DAILY_BAD_WATERMARK'],
    ['2026-02-30','GSC_DAILY_BAD_WATERMARK'],
    ['2026-10-not-date','GSC_DAILY_BAD_WATERMARK'],
  ];
  for(const [previous,code] of scenarios){
    const result=decideDailyGscCadence(prod,previous,date);
    assert.equal(result.code,code,JSON.stringify({previous,code}));
    assert.equal(result.allowed,code==='GSC_DAILY_RUN_ALLOWED');
    assert.equal(result.source_health_promoted,false);
  }
});

test('cron route requires explicit CRON_SECRET before any backend call and has no active registration',()=>{
  const route=readFileSync('app/api/cron/gsc-daily/route.ts','utf8');
  const config=readFileSync('vercel.json','utf8');
  assert.match(route,/timingSafeEqual/);
  assert.match(route,/CRON_SECRET/);
  assert.match(route,/authorization/);
  assert.match(route,/FEYA_GSC_DAILY_ENABLED/);
  assert.match(route,/FEYA_GSC_READ_ENABLED/);
  assert.match(route,/FEYA_GSC_CAPTURE_ENABLED/);
  assert.match(route,/VERCEL_ENV/);
  assert.match(route,/VERCEL_GIT_COMMIT_REF/);
  assert.match(route,/GSC_DAILY_FIRST_RECEIPT_REQUIRED|decideDailyGscCadence/);
  assert.match(route,/captureOfficialGscOnce\(/);
  assert.match(route,/GSC_DAILY_WATERMARK_UNAVAILABLE/);
  assert.match(route,/private, no-store/);
  assert.ok(route.indexOf('CRON_SECRET')<route.indexOf('getSupabaseServiceRoleClient('));
  for(const bad of ['OPENAI_API_KEY','cron.schedule','FEYA_ADMIN_ALLOWED_USER_IDS','FEYA_GSC_OAUTH_CLIENT_SECRET']){
    assert.equal(route.includes(bad),false,bad);
  }
  assert.equal(JSON.parse(config).crons,undefined,'daily task must not register until owner grants rotation and cadence');
});

test('config documents explicit OFF until later owner-approved schedule',()=>{
  const env=readFileSync('.env.example','utf8');
  assert.match(env,/FEYA_GSC_DAILY_ENABLED=false/);
  assert.match(env,/CRON_SECRET=/);
});
