import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

const native=process.env.FEYA_TEST_DATABASE_URL;
if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');}
let db;
const read=()=>readFile(new URL('../../supabase/migrations/20261016200000_growth_gsc_manual_observation_receipts_v1.sql',import.meta.url),'utf8');
const q=async(sql,args=[]) =>(await db.query(sql,args)).rows;
const daysBack=n=>new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()-n)).toISOString().slice(0,10);
const end=daysBack(3),start=daysBack(6);
const positions=Object.freeze([
 {date:daysBack(5),clicks:1,impressions:10,position:5},
 {date:daysBack(3),clicks:2,impressions:20,position:7}
]);
function args(overrides={}){
 return {property:'sc-domain:thefeya.com',channel:'HYPD_MCP_READONLY_MANUAL',
  start,end,finalized:end,rows:positions,clicks:3,impressions:30,
  average:190/30,ref:'github-issue:145:gsc-readonly-fixture',...overrides};
}
async function record(p=args()){
 const sql='select * from public.feya_fn_stage_gsc_daily_observation_v1($1::text,$2::text,$3::date,$4::date,$5::date,$6::jsonb,$7::bigint,$8::bigint,$9::numeric,$10::text)';
 return q(sql,[p.property,p.channel,p.start,p.end,p.finalized,JSON.stringify(p.rows),p.clicks,p.impressions,p.average,p.ref]);
}
async function count(){return Number((await q('select count(*)::int n from public.feya_growth_gsc_observation_receipts_v1'))[0].n);}

before(async()=>{
 if(native){
  const c=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
  await c.connect();
  db={exec:s=>c.query(s),query:(s,a)=>c.query(s,a),close:()=>c.end()};
  assert.equal((await q("select count(*)::int n from pg_tables where schemaname='public'"))[0].n,0);
 }else db=await PGlite.create();
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 await db.exec(await read());
});
after(async()=>db?.close());
beforeEach(async()=>{await db.exec('truncate public.feya_growth_gsc_observation_receipts_v1;');});

test('RLS and server-only RPC: no direct anon/auth access',async()=>{
 const row=(await q("select has_function_privilege('anon',p.oid,'execute') anon, has_function_privilege('authenticated',p.oid,'execute') auth, has_function_privilege('service_role',p.oid,'execute') service from pg_proc p where p.proname='feya_fn_stage_gsc_daily_observation_v1'"))[0];
 assert.deepEqual(row,{anon:false,auth:false,service:true});
 const perms=(await q("select has_table_privilege('anon','public.feya_growth_gsc_observation_receipts_v1','SELECT') anon,has_table_privilege('authenticated','public.feya_growth_gsc_observation_receipts_v1','SELECT') auth,has_table_privilege('service_role','public.feya_growth_gsc_observation_receipts_v1','SELECT') service_read,has_table_privilege('service_role','public.feya_growth_gsc_observation_receipts_v1','INSERT') service_write"))[0];
 assert.deepEqual(perms,{anon:false,auth:false,service_read:true,service_write:false});
});

test('valid final daily snapshot is immutable and does not promote data health',async()=>{
 const r=(await record())[0];
 assert.equal(r.created_new,true);
 assert.match(r.payload_sha256,/^[a-f0-9]{64}$/);
 assert.equal(r.observed_days,2);
 assert.equal(await count(),1);
 const [saved]=await q('select property_url,source_channel,data_state,observed_days,clicks_total::int clicks_total,impressions_total::int impressions_total,source_health_promoted,daily_rows_json from public.feya_growth_gsc_observation_receipts_v1');
 assert.equal(saved.property_url,'sc-domain:thefeya.com');
 assert.equal(saved.source_channel,'HYPD_MCP_READONLY_MANUAL');
 assert.equal(saved.data_state,'final');
 assert.equal(saved.clicks_total,3);
 assert.equal(saved.impressions_total,30);
 assert.equal(saved.source_health_promoted,false);
 assert.deepEqual(saved.daily_rows_json.map(x=>x.date),[daysBack(5),daysBack(3)]);
 await assert.rejects(q('update public.feya_growth_gsc_observation_receipts_v1 set source_health_promoted=true'),/GSC_RECEIPT_IMMUTABLE/);
 await assert.rejects(q('delete from public.feya_growth_gsc_observation_receipts_v1'),/GSC_RECEIPT_IMMUTABLE/);
});

test('replays and row order are idempotent, revisions are add-only',async()=>{
 const first=(await record())[0];
 const second=(await record(args({rows:[...positions].reverse()})))[0];
 assert.equal(second.created_new,false);
 assert.equal(second.receipt_id,first.receipt_id);
 assert.equal(await count(),1);
 const corrected=[{...positions[0],impressions:11},{...positions[1]}];
 const next=(await record(args({rows:corrected,clicks:3,impressions:31,average:(5*11+7*20)/31})))[0];
 assert.equal(next.created_new,true);
 assert.notEqual(next.payload_sha256,first.payload_sha256);
 assert.equal(await count(),2);
});

test('empty source response is NULL and not manufactured zero metrics',async()=>{
 const first=(await record(args({rows:[],clicks:null,impressions:null,average:null})))[0];
 assert.equal(first.observed_days,0);
 const [saved]=await q('select clicks_total,impressions_total,average_position from public.feya_growth_gsc_observation_receipts_v1');
 assert.deepEqual(saved,{clicks_total:null,impressions_total:null,average_position:null});
 await assert.rejects(record(args({rows:[],clicks:0,impressions:0,average:null})),/GSC_RECEIPT_EMPTY_IS_NOT_ZERO/);
});

test('wrong property, stale scope and invalid provenance refuse receipts',async()=>{
 for(const o of [
  {property:'https://thefeya.com/'},{property:'sc-domain:other.com'},
  {channel:'DIRECT_OFFICIAL_GSC'},{start:daysBack(36)},
  {end:daysBack(1)},{finalized:daysBack(7)},
  {ref:'unsafe?token=secret'},{rows:null}
 ])await assert.rejects(record(args(o)));
 assert.equal(await count(),0);
});

test('duplicate days, invalid counts and mismatched evidence fail closed',async()=>{
 const bad=[
  {rows:[positions[0],positions[0]],clicks:2,impressions:20,average:5},
  {rows:[{...positions[0],clicks:-1}],clicks:-1,impressions:10,average:5},
  {rows:[{...positions[0],clicks:2.2}],clicks:2,impressions:10,average:5},
  {rows:[{...positions[0],clicks:11}],clicks:11,impressions:10,average:5},
  {rows:[{...positions[0],position:-3}],clicks:1,impressions:10,average:-3},
  {rows:[{...positions[0],date:'2026-02-30'}],clicks:1,impressions:10,average:5},
  {rows:[{...positions[0],country:'USA'}],clicks:1,impressions:10,average:5},
  {impressions:29},{clicks:4},{average:6.9}
 ];
 for(const o of bad)await assert.rejects(record(args(o)),'expected rejection: '+JSON.stringify(o));
 assert.equal(await count(),0);
});

test('staging cannot mutate canonical health, policy, or GMEL runtime',async()=>{
 await record();
 const ddl=await read();
 assert.doesNotMatch(ddl,/INSERT INTO public\.feya_growth_data_source_health_v1/);
 assert.doesNotMatch(ddl,/UPDATE public\.feya_growth_data_source_health_v1/);
 assert.doesNotMatch(ddl,/feya_growth_ai_budget_policies_v1|feya_growth_ai_spend_reservations_v1/);
 assert.equal(await count(),1);
});
