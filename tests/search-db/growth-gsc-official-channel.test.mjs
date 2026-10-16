import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

const native=process.env.FEYA_TEST_DATABASE_URL;
if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');}
let db;
const query=async(sql,args=[]) =>(await db.query(sql,args)).rows;
const read=(file)=>readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
const iso=n=>new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()-n)).toISOString().slice(0,10);
const start=iso(6),end=iso(3);
const rows=[{date:iso(5),clicks:1,impressions:3,position:6},{date:iso(3),clicks:1,impressions:7,position:5}];
const expectedPosition=5.3;
async function capture(channel='GOOGLE_GSC_OFFICIAL_READONLY',overrides={}){
 const input={rows,start,end,ref:'official-gsc:'+start+':'+end,
  clicks:2,impressions:10,position:expectedPosition,...overrides};
 return query('select * from public.feya_fn_stage_gsc_daily_observation_v1($1::text,$2::text,$3::date,$4::date,$5::date,$6::jsonb,$7::bigint,$8::bigint,$9::numeric,$10::text)',
  ['sc-domain:thefeya.com',channel,input.start,input.end,input.end,
   JSON.stringify(input.rows),input.clicks,input.impressions,input.position,input.ref]);
}
const count=async()=>Number((await query('select count(*)::int n from public.feya_growth_gsc_observation_receipts_v1'))[0].n);

before(async()=>{
 if(native){
  const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
  await client.connect();
  db={exec:x=>client.query(x),query:(x,a)=>client.query(x,a),close:()=>client.end()};
  assert.equal((await query("select count(*)::int n from pg_tables where schemaname='public'"))[0].n,0);
 }else db=await PGlite.create();
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(await read('20261016200000_growth_gsc_manual_observation_receipts_v1.sql'));
 await db.exec(await read('20261016223000_growth_gsc_official_channel_v1.sql'));
});
after(async()=>db?.close());
beforeEach(async()=>{await db.exec('truncate public.feya_growth_gsc_observation_receipts_v1;');});

test('previously approved HYPD manual route and official OAuth are separate channels',async()=>{
 const manual=await capture('HYPD_MCP_READONLY_MANUAL',{ref:'github-issue:145:gsc-unchanged-fixture'});
 const official=await capture();
 assert.equal(manual[0].created_new,true);
 assert.equal(official[0].created_new,true);
 assert.notEqual(manual[0].payload_sha256,official[0].payload_sha256);
 assert.equal(await count(),2);
 const result=await query('select source_channel,source_health_promoted from public.feya_growth_gsc_observation_receipts_v1 order by source_channel');
 assert.deepEqual(result.map(x=>x.source_channel),['GOOGLE_GSC_OFFICIAL_READONLY','HYPD_MCP_READONLY_MANUAL']);
 assert.ok(result.every(x=>x.source_health_promoted===false));
});

test('replays of direct source are idempotent while late Google corrections append new version',async()=>{
 const first=(await capture())[0];
 const same=(await capture('GOOGLE_GSC_OFFICIAL_READONLY',{rows:[...rows].reverse()}))[0];
 assert.equal(same.created_new,false);
 assert.equal(same.receipt_id,first.receipt_id);
 assert.equal(await count(),1);
 const corrected=[{...rows[0],impressions:4},rows[1]];
 const later=(await capture('GOOGLE_GSC_OFFICIAL_READONLY',{
  rows:corrected,impressions:11,position:(4*6+7*5)/11
 }))[0];
 assert.equal(later.created_new,true);
 assert.notEqual(later.payload_sha256,first.payload_sha256);
 assert.equal(await count(),2);
});

test('direct source must use exact bounded OAuth provenance, not manual or unknown trust',async()=>{
 for(const channel of ['DIRECT_OFFICIAL_GSC','EXTERNAL_CSV','']){
  await assert.rejects(capture(channel),/GSC_RECEIPT_INVALID_ENVELOPE/);
 }
 for(const ref of ['github-issue:145:fake','official-gsc:2020-01-01:2020-01-13','official-gsc:fake']){
  await assert.rejects(capture('GOOGLE_GSC_OFFICIAL_READONLY',{ref}),/GSC_RECEIPT_INVALID_ENVELOPE/);
 }
 assert.equal(await count(),0);
});

test('strict row totals, freshness and no manufactured missing days remain enforced',async()=>{
 const bad=[
  {rows:[rows[0],rows[0]],clicks:2,impressions:6,position:6},
  {rows:[],clicks:0,impressions:0,position:null},
  {rows:[{...rows[0],clicks:8},rows[1]]},
  {rows:[{...rows[0],date:iso(2)},rows[1]]},
  {rows:[{...rows[0],position:-1},rows[1]]},
  {impressions:9},
  {position:42},
 ];
 for(const change of bad)await assert.rejects(capture('GOOGLE_GSC_OFFICIAL_READONLY',change));
 assert.equal(await count(),0);
});

test('no auth grants, no direct table writes, immutable historical data',async()=>{
 const access=(await query("select has_function_privilege('anon',p.oid,'execute') anon,has_function_privilege('authenticated',p.oid,'execute') auth,has_function_privilege('service_role',p.oid,'execute') service from pg_proc p where p.proname='feya_fn_stage_gsc_daily_observation_v1'"))[0];
 assert.deepEqual(access,{anon:false,auth:false,service:true});
 const grants=(await query("select has_table_privilege('anon','public.feya_growth_gsc_observation_receipts_v1','SELECT') anon,has_table_privilege('service_role','public.feya_growth_gsc_observation_receipts_v1','SELECT') service_read,has_table_privilege('service_role','public.feya_growth_gsc_observation_receipts_v1','INSERT') service_insert"))[0];
 assert.deepEqual(grants,{anon:false,service_read:true,service_insert:false});
 await capture();
 await assert.rejects(query("update public.feya_growth_gsc_observation_receipts_v1 set source_channel='HYPD_MCP_READONLY_MANUAL'"),/GSC_RECEIPT_IMMUTABLE/);
 await assert.rejects(query("delete from public.feya_growth_gsc_observation_receipts_v1"),/GSC_RECEIPT_IMMUTABLE/);
});

test('migration neither rewrites source health nor enables priced GMEL',async()=>{
 const ddl=await read('20261016223000_growth_gsc_official_channel_v1.sql');
 for(const forbidden of [
  'feya_growth_data_source_health_v1','feya_growth_ai_spend_reservations_v1',
  'feya_growth_ai_budget_policies_v1','cron.schedule','INSERT INTO public.feya_growth_cases_v1'
 ])assert.equal(ddl.includes(forbidden),false,forbidden);
 assert.equal(await count(),0);
});
