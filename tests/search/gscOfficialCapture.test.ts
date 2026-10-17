import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planOfficialGscCapture} from '../../lib/gscOfficialCapture.ts';
import type {GscSourceProbe} from '../../lib/gscOfficialReadOnly.ts';

const now=new Date('2026-10-16T17:00:00Z');
const allowed={FEYA_GSC_CAPTURE_ENABLED:'true',FEYA_GSC_READ_ENABLED:'true'};
const rows=[
 {date:'2026-10-04',clicks:2,impressions:51,position:5},
 {date:'2026-10-13',clicks:1,impressions:9,position:7},
];
const report=():GscSourceProbe=>({
 ok:true,code:'GSC_VERIFIED_WITH_FINAL_ROWS',property:'sc-domain:thefeya.com',
 scope_required:'https://www.googleapis.com/auth/webmasters.readonly',
 checked_at:now.toISOString(),window:{start_date:'2026-09-30',end_date:'2026-10-13'},
 property_permission:'siteOwner',days_observed:2,daily_rows:rows,
 last_observed_date:'2026-10-13',clicks_in_observed_rows:3,
 impressions_in_observed_rows:60,persisted:false,
 growth_os_source_healthy:false,indexed_urls_observed:false
});
test('separate GSC capture switch remains OFF without extra owner authorization',()=>{
 for(const env of [{},{FEYA_GSC_READ_ENABLED:'true'},{FEYA_GSC_CAPTURE_ENABLED:'true'}]){
  const planned=planOfficialGscCapture(env,report(),now);
  assert.equal(planned.ok,false);
  assert.equal(planned.code,'GSC_CAPTURE_DISABLED');
 }
});

test('authenticated, fresh, date-grouped provider data builds exact private receipt arguments',()=>{
 const planned=planOfficialGscCapture(allowed,report(),now);
 assert.equal(planned.ok,true);
 if(!planned.ok)return;
 assert.equal(planned.source_health_promoted,false);
 assert.equal(planned.args.p_source_channel,'GOOGLE_GSC_OFFICIAL_READONLY');
 assert.equal(planned.args.p_property_url,'sc-domain:thefeya.com');
 assert.equal(planned.args.p_query_start,'2026-09-30');
 assert.equal(planned.args.p_query_end,'2026-10-13');
 assert.equal(planned.args.p_finalized_through,'2026-10-13');
 assert.equal(planned.args.p_source_evidence_ref,'official-gsc:2026-09-30:2026-10-13');
 assert.equal(planned.args.p_expected_clicks,3);
 assert.equal(planned.args.p_expected_impressions,60);
 assert.ok(Math.abs((planned.args.p_expected_average_position||0)-5.3)<1e-9);
 assert.deepEqual(planned.args.p_daily_rows,rows);
 assert.equal(JSON.stringify(planned).includes('refresh'),false);
});

test('unknown Google days are never manufactured as zeros',()=>{
 const p=report();
 p.daily_rows=[rows[1],rows[0]];
 const plan=planOfficialGscCapture(allowed,p,now);
 assert.equal(plan.ok,true);
 if(plan.ok){
  assert.deepEqual(plan.args.p_daily_rows,rows);
  assert.equal(plan.args.p_daily_rows.length,2);
  assert.ok(!plan.args.p_daily_rows.some(d=>d.date==='2026-10-12'));
 }
 const noData={...report(),code:'GSC_VERIFIED_NO_FINAL_ROWS' as const,
  daily_rows:[],days_observed:0,clicks_in_observed_rows:null,
  impressions_in_observed_rows:null,last_observed_date:null};
 assert.equal(planOfficialGscCapture(allowed,noData,now).code,'GSC_CAPTURE_NO_FINAL_ROWS');
});

test('stale, invalid or unauthorized evidence refuses storage',()=>{
 const cases:GscSourceProbe[]=[
  {...report(),property:'https://thefeya.com/' as any},
  {...report(),scope_required:'https://www.googleapis.com/auth/webmasters' as any},
  {...report(),property_permission:null},
  {...report(),ok:false},
  {...report(),code:'GSC_INVALID_GOOGLE_RESPONSE'},
  {...report(),checked_at:'2026-10-16T16:50:00Z'},
  {...report(),checked_at:'2026-10-16T17:10:00Z'},
  {...report(),daily_rows:null},
  {...report(),daily_rows:[]},
  {...report(),days_observed:3},
  {...report(),last_observed_date:'2026-10-04'},
  {...report(),impressions_in_observed_rows:59},
  {...report(),clicks_in_observed_rows:4},
  {...report(),window:{start_date:'2026-10-15',end_date:'2026-10-13'}},
  {...report(),window:{start_date:'not-date',end_date:'2026-10-13'}},
  {...report(),daily_rows:[rows[0],rows[0]]},
  {...report(),daily_rows:[{...rows[0],position:-1},rows[1]]},
  {...report(),daily_rows:[{...rows[0],clicks:55},rows[1]]}
 ];
 for(const candidate of cases){
  const plan=planOfficialGscCapture(allowed,candidate,now);
  assert.equal(plan.ok,false,JSON.stringify(candidate));
  assert.equal(plan.source_health_promoted,false);
 }
});

test('data with returned zero-impression days still differs from missing days',()=>{
 const p=report();
 p.daily_rows=[{date:'2026-10-04',clicks:0,impressions:0,position:0}];
 p.days_observed=1;
 p.clicks_in_observed_rows=0;
 p.impressions_in_observed_rows=0;
 p.last_observed_date='2026-10-04';
 const planned=planOfficialGscCapture(allowed,p,now);
 assert.equal(planned.ok,true);
 if(planned.ok){
  assert.equal(planned.args.p_expected_average_position,null);
  assert.equal(planned.args.p_expected_clicks,0);
  assert.equal(planned.args.p_daily_rows.length,1);
 }
});

test('internal POST uses the same guarded writer as owner, with independent capture flag',()=>{
 const route=readFileSync('app/api/internal/gsc-official-capture/route.ts','utf8');
 const writer=readFileSync('lib/gscOfficialCaptureServer.ts','utf8');
 assert.match(route,/POST\s*=\s*withInternalApi\(handlePost\)/);
 assert.match(route,/captureOfficialGscOnce\(/);
 assert.match(writer,/FEYA_GSC_CAPTURE_ENABLED/);
 assert.match(writer,/FEYA_GSC_READ_ENABLED/);
 assert.match(writer,/getSupabaseServiceRoleClient\(/);
 assert.match(writer,/probeOfficialGscReadOnly\(/);
 assert.match(writer,/planOfficialGscCapture\(/);
 assert.match(writer,/feya_fn_stage_gsc_daily_observation_v1/);
 assert.ok(writer.indexOf("FEYA_GSC_CAPTURE_ENABLED") < writer.indexOf("probeOfficialGscReadOnly(process.env"));
 assert.doesNotMatch(route+writer,/cron\.schedule|openai\.com|anthropic\.com|process\.env\.OPENAI_API_KEY/);
 const env=readFileSync('.env.example','utf8');
 assert.match(env,/FEYA_GSC_CAPTURE_ENABLED=false/);
 assert.match(env,/FEYA_GSC_READ_ENABLED=false/);
});
