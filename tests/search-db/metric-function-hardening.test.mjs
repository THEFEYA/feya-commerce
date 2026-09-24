import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {readerBoundarySchemaSQL,readerMigrationSQL} from './helpers/observed-reader-boundary.mjs';
import {functionHardeningSQL,functionHardeningRollbackSQL} from './helpers/metric-function-hardening.mjs';

let db,original,viewContracts,identities;
const bankId='10000000-0000-4000-8000-000000000007';
const staging='public.feya_commerce_seo_keyword_metric_import_staging_v1';
const snapshots='public.feya_commerce_seo_keyword_metric_snapshots_v1';
const health=async()=>(await db.query('select public.feya_commerce_metric_reader_boundary_health_v1() value')).rows[0].value;
const catalog=async()=>(await db.query('select oid,oid::regprocedure::text identity,prosrc,proacl::text acl,proconfig,proowner,prosecdef,prorettype,proargtypes::text args from pg_proc where oid::regprocedure::text=any($1) order by identity',[identities])).rows;
const views=async()=>(await db.query("select * from public.feya_commerce_seo_metric_reader_contracts_v1 where object_kind='view' order by object_identity")).rows;
async function asService(fn){await db.exec('set role service_role');try{return await fn();}finally{await db.exec('reset role; reset search_path');}}
before(async()=>{
 const native=process.env.FEYA_TEST_DATABASE_URL;
 if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:native,statement_timeout:20000,connectionTimeoutMillis:5000});await c.connect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
 else db=await PGlite.create();
 const fixture=JSON.parse(await readFile(new URL('./fixtures/observed-metric-security-20260924.json',import.meta.url),'utf8'));identities=fixture.functions.map(f=>f.identity);
 await db.exec(await observedMetricSchemaSQL());await db.exec(await readerBoundarySchemaSQL());await db.exec(await metricMigrationSQL());await db.exec(await readerMigrationSQL());
 original=await catalog();assert.equal(original.length,4);viewContracts=await views();
 await db.exec(await functionHardeningSQL());
});
after(async()=>db?.close());

test('only four function paths and three matching manifest entries change; OIDs, bodies, ACLs and 14 view contracts survive',async()=>{
 assert.deepEqual(await catalog(),original.map(f=>({...f,proconfig:['search_path=pg_catalog, pg_temp']})));
 assert.deepEqual(await views(),viewContracts);assert.equal(await asService(health),'metric_reader_boundary_v1');
 for(const role of ['anon','authenticated'])for(const identity of identities.filter(n=>!n.startsWith('seo_keyword_bank_v1_set_updated_at'))){
  assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') allowed',[role,'public.'+identity])).rows[0].allowed,false);
 }
});

test('legacy normalize, ready-view apply and candidate update ignore hostile caller search_path',async()=>{
 await db.exec(`create schema feya_spoof; grant usage on schema feya_spoof to service_role;
 create function feya_spoof.lower(text) returns text language plpgsql as $$ begin raise exception 'spoof lower invoked'; end $$;
 create function feya_spoof.btrim(text) returns text language plpgsql as $$ begin raise exception 'spoof trim invoked'; end $$;
 create function feya_spoof.now() returns timestamptz language plpgsql as $$ begin raise exception 'spoof clock invoked'; end $$;
 insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority,active_flag) values(17,'synthetic path armor','synthetic path armor',3,'test','test',true);
 insert into ${staging}(batch_code,keyword,keyword_norm,geo,language,avg_monthly_searches) values('path-fixture','  Synthetic Path Armor  ','','US','en',7);
 insert into public.feya_commerce_v_seo_keyword_validation_export_us_en_v1(batch_code,keyword_norm,geo,language) values('path-fixture','synthetic path armor','US','en');
 insert into public.feya_manual_keyword_candidate_v1(manual_keyword_candidate_id,keyword_text,keyword_norm,candidate_status) values('${bankId}','synthetic path armor','synthetic path armor','draft');`);
 await asService(async()=>{
  await db.exec('set search_path=feya_spoof,public,pg_catalog');
  const p=(await db.query("select * from public.feya_commerce_fn_promote_keyword_metric_import_v1('path-fixture')")).rows[0];assert.equal(p.normalized_rows,1);assert.equal(p.inserted_snapshots,1);
  const a=(await db.query("select * from public.feya_commerce_apply_seo_keyword_metric_import_v1('path-fixture',null)")).rows[0];assert.equal(a.inserted_snapshots,1);
  const m=(await db.query("select * from public.feya_fn_apply_manual_keyword_metrics_v1('path-fixture')")).rows[0];assert.equal(m.updated_rows,1);
  assert.equal((await db.query('show search_path')).rows[0].search_path,'feya_spoof, public, pg_catalog','caller settings restored');
 });
 assert.equal((await db.query(`select count(*)::int n from ${snapshots} where keyword_norm='synthetic path armor' and avg_monthly_searches=7`)).rows[0].n,2);
 assert.equal((await db.query('select avg_monthly_searches from public.feya_manual_keyword_candidate_v1')).rows[0].avg_monthly_searches,7);
});

test('bank trigger uses trusted clock without changing stable ID, score or approval',async()=>{
 await db.query("insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches,updated_at) values($1,'synthetic path armor','synthetic path armor','product','approved_draft',77,90,'2000-01-01')",[bankId]);
 await asService(async()=>{await db.exec('set search_path=feya_spoof,public,pg_catalog');await db.query('update public.seo_keyword_bank_v1 set keyword=keyword where id=$1',[bankId]);});
 const row=(await db.query("select id,score,review_status,avg_monthly_searches,updated_at > '2026-01-01'::timestamptz as clock_ok from public.seo_keyword_bank_v1 where id=$1",[bankId])).rows[0];
 assert.deepEqual(row,{id:bankId,score:77,review_status:'approved_draft',avg_monthly_searches:90,clock_ok:true});
});

test('new context-pending rows stay excluded after function hardening',async()=>{
 await db.exec(`insert into ${staging}(batch_code,keyword,keyword_norm,geo,language,avg_monthly_searches,demand_observation_key,demand_evidence_json) values('held-fixture','synthetic path armor','synthetic path armor','US','en',999999,repeat('a',64),'{}');
 insert into public.feya_commerce_v_seo_keyword_validation_export_us_en_v1(batch_code,keyword_norm,geo,language) values('held-fixture','synthetic path armor','US','en');`);
 await asService(async()=>{
  assert.equal((await db.query("select * from public.feya_commerce_fn_promote_keyword_metric_import_v1('held-fixture')")).rows[0].inserted_snapshots,0);
  assert.equal((await db.query("select * from public.feya_commerce_apply_seo_keyword_metric_import_v1('held-fixture',null)")).rows[0].inserted_snapshots,0);
  assert.equal((await db.query("select * from public.feya_fn_apply_manual_keyword_metrics_v1('held-fixture')")).rows[0].updated_rows,0);
 });
 assert.equal((await db.query(`select count(*)::int n from ${staging} where demand_observation_key is not null`)).rows[0].n,1);
});

test('reader health still fails closed if a protected function path drifts',async()=>{
 await db.exec('begin');try{await db.exec('alter function public.feya_fn_apply_manual_keyword_metrics_v1(text) reset search_path');assert.equal(await asService(health),null);}finally{await db.exec('rollback');}
 assert.equal(await health(),'metric_reader_boundary_v1');
});

test('rollback and reapply preserve reader isolation, observations and historical approvals',async()=>{
 const before=(await db.query(`select count(*)::int n from ${staging}`)).rows[0].n;
 await db.exec(await functionHardeningRollbackSQL());assert.deepEqual(await catalog(),original);assert.deepEqual(await views(),viewContracts);assert.equal(await health(),'metric_reader_boundary_v1');
 assert.equal((await db.query(`select count(*)::int n from ${staging}`)).rows[0].n,before);
 assert.equal((await db.query('select score from public.seo_keyword_bank_v1 where id=$1',[bankId])).rows[0].score,77);
 await db.exec(await functionHardeningSQL());assert.equal(await health(),'metric_reader_boundary_v1');
});

test('preflight refuses unknown trigger code before any settings or contracts change',async()=>{
 await db.exec(await functionHardeningRollbackSQL());
 const body=original.find(f=>f.identity==='seo_keyword_bank_v1_set_updated_at()').prosrc;
 await db.exec('create or replace function public.seo_keyword_bank_v1_set_updated_at() returns trigger language plpgsql as $$ begin return new; end $$;');
 const before=await catalog();
 await assert.rejects(db.exec(await functionHardeningSQL()),/Function hardening preflight drift/);await db.exec('rollback');
 assert.deepEqual(await catalog(),before);assert.equal(await health(),'metric_reader_boundary_v1');
 await db.exec('create or replace function public.seo_keyword_bank_v1_set_updated_at() returns trigger language plpgsql as $restore$'+body+'$restore$;');
 await db.exec(await functionHardeningSQL());
});
