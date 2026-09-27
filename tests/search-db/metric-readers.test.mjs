import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {readerFixture,readerMigrationSQL,readerBoundarySchemaSQL} from './helpers/observed-reader-boundary.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
let db,fixture,beforeRows,metadata;
const staging='feya_commerce_seo_keyword_metric_import_staging_v1',snapshots='feya_commerce_seo_keyword_metric_snapshots_v1';
const key='f'.repeat(64);
const queryHealth='select public.feya_commerce_metric_reader_boundary_health_v1() value';
async function state(){const out={};for(const r of fixture.dependencies.filter(r=>r.definition)){out[r.name]=(await db.query(`select coalesce(jsonb_agg(row order by row::text),'[]') value from (select to_jsonb(v) row from public."${r.name}" v) x`)).rows[0].value;}return out;}
async function catalog(){const out={};for(const r of fixture.dependencies.filter(r=>r.definition)){out[r.name]=(await db.query(`select relacl::text acl,reloptions,pg_get_userbyid(relowner) owner,(select jsonb_agg(jsonb_build_array(attname,format_type(atttypid,atttypmod)) order by attnum) from pg_attribute where attrelid=c.oid and attnum>0 and not attisdropped) columns from pg_class c where c.oid=$1::regclass`,['public.'+r.name])).rows[0];}return out;}
async function service(fn){await db.exec('set role service_role');try{return await fn();}finally{await db.exec('reset role');}}
before(async()=>{
 if(nativeURL){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:20000,connectionTimeoutMillis:5000});await c.connect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
 else db=await PGlite.create();
 fixture=await readerFixture();await db.exec(await observedMetricSchemaSQL());await db.exec(await readerBoundarySchemaSQL());
 await db.exec(`insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values (11,'synthetic armor','synthetic armor',2,'test','test');
 insert into public.feya_commerce_seo_keyword_ai_cleanup_v1(cleanup_id,keyword_id,keyword_norm,approved_keyword,approved_keyword_norm,review_status,approved_at,created_at,should_validate_api,should_hold) values(11,11,'synthetic armor','synthetic armor','synthetic armor','approved',now(),now(),true,false);
 insert into public.${staging}(import_row_id,batch_code,keyword,keyword_norm,avg_monthly_searches,competition,imported_at) values(11,'legacy-fixture','synthetic armor','synthetic armor',90,'LOW',now()-interval '2 days');
 insert into public.${snapshots}(snapshot_id,keyword_norm,source_api,geo,language,avg_monthly_searches,competition,fetched_at,data_freshness_status) values(11,'synthetic armor','google_ads_csv','US','en',90,'LOW',now()-interval '2 days','fresh_manual_import');
 insert into public.feya_manual_keyword_candidate_v1(manual_keyword_candidate_id,keyword_text,keyword_norm,candidate_status) values('10000000-0000-4000-8000-000000000001','synthetic armor','synthetic armor','draft');`);
 beforeRows=await state();metadata=await catalog();await db.exec(await metricMigrationSQL());
 await db.exec(await readerMigrationSQL());
});
after(async()=>{await db?.close();});

test('all 14 direct views compile; baseline rows, columns, grants and security options are unchanged',async()=>{
 assert.deepEqual(await state(),beforeRows);assert.deepEqual(await catalog(),metadata);
 assert.equal(beforeRows.feya_commerce_v_query_cluster_review_queue_v1.length,1);
 assert.equal(beforeRows.feya_commerce_v_query_cluster_proposal_candidates_v1[0].avg_monthly_searches,90);
 assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,'metric_reader_boundary_v1');
});
test('new pending observations cannot displace historical metrics in any captured direct view',async()=>{
 await db.exec(`insert into public.${staging}(batch_code,keyword,keyword_norm,avg_monthly_searches,competition,demand_observation_key,demand_evidence_json,import_status) values('new-fixture','synthetic armor','synthetic armor',999999,'HIGH','${key}','{}','promoted_to_snapshots');
 insert into public.${snapshots}(keyword_norm,source_api,geo,language,avg_monthly_searches,competition,fetched_at,data_freshness_status,demand_observation_key,demand_evidence_json) values('synthetic armor','google_ads_csv','US','en',999999,'HIGH',now(),'context_review_required','${key}','{}');`);
 assert.deepEqual(await state(),beforeRows);
 assert.equal((await db.query(`select count(*)::int n from public.${snapshots}`)).rows[0].n,2,'new evidence is retained in canonical storage');
});
test('manual candidate updater uses the legacy observation; new-only batch does not update candidates',async()=>{
 await service(()=>db.query('select * from public.feya_fn_apply_manual_keyword_metrics_v1(null)'));
 const c=(await db.query('select avg_monthly_searches,metric_batch_code from public.feya_manual_keyword_candidate_v1')).rows[0];assert.equal(c.avg_monthly_searches,90);assert.equal(c.metric_batch_code,'legacy-fixture');
 const r=(await service(()=>db.query("select * from public.feya_fn_apply_manual_keyword_metrics_v1('new-fixture')"))).rows[0];assert.equal(r.updated_rows,0);
});
test('legacy promoter ignores new observations but still promotes a legacy batch',async()=>{
 const before=(await db.query(`select count(*)::int n from public.${snapshots}`)).rows[0].n;
 const empty=(await service(()=>db.query("select * from public.feya_commerce_fn_promote_keyword_metric_import_v1('new-fixture')"))).rows[0];assert.equal(empty.inserted_snapshots,0);assert.equal(empty.updated_staging_rows,0);
 await db.exec(`insert into public.${staging}(batch_code,keyword,keyword_norm,avg_monthly_searches) values('legacy-promote','synthetic second armor','synthetic second armor',7);`);
 const legacy=(await service(()=>db.query("select * from public.feya_commerce_fn_promote_keyword_metric_import_v1('legacy-promote')"))).rows[0];assert.equal(legacy.inserted_snapshots,1);
 assert.equal((await db.query(`select count(*)::int n from public.${snapshots}`)).rows[0].n,before+1);
});
test('ready-view apply function cannot select an atomic batch even with matching export/master joins',async()=>{
 await db.exec(`insert into public.feya_commerce_v_seo_keyword_validation_export_us_en_v1(batch_code,keyword_norm,geo,language) values('new-fixture','synthetic armor','US','en');`);
 const r=(await service(()=>db.query("select * from public.feya_commerce_apply_seo_keyword_metric_import_v1('new-fixture',null)"))).rows[0];assert.equal(r.inserted_snapshots,0);
});
test('new health and manifest do not grant public access or broaden legacy function privileges',async()=>{
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',[role,'public.feya_commerce_seo_metric_reader_contracts_v1','SELECT,INSERT,UPDATE,DELETE'])).rows[0].allowed,false);
  await db.exec(`set role ${role}`);try{await assert.rejects(db.query(queryHealth),/permission denied/);}finally{await db.exec('reset role');}
 }
 for(const f of fixture.functions){const actual=(await db.query('select proacl::text acl,prosecdef,proconfig from pg_proc where oid=$1::regprocedure',['public.'+f.identity])).rows[0];assert.equal(actual.acl,f.acl);assert.equal(actual.prosecdef,f.security_definer);assert.deepEqual(actual.proconfig,f.options);}
 await service(()=>assert.rejects(db.query('delete from public.feya_commerce_seo_metric_reader_contracts_v1'),/permission denied/));
});
test('health fails closed after reader definition or grant drift',async()=>{
 const view='feya_commerce_v_seo_metric_system_status_v1';
 await db.exec('begin');try{await db.exec(`revoke select on public.${view} from anon`);assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,null);}finally{await db.exec('rollback');}
 await db.exec('begin');try{await db.exec(`alter view public.${view} set (security_barrier=true)`);assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,null);}finally{await db.exec('rollback');}
 assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,'metric_reader_boundary_v1');
});
test('new unregistered direct reader closes health until its evidence policy is reviewed',async()=>{
 for(const ddl of [`create view public.unreviewed_metric_reader as select * from public.${snapshots}`,`create materialized view public.unreviewed_metric_reader as select * from public.${snapshots} with no data`,`create function public.unreviewed_metric_reader() returns bigint language sql as $$ select count(*) from public.${snapshots} $$`]){
  await db.exec('begin');try{await db.exec(ddl);assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,null);}finally{await db.exec('rollback');}
 }
 assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,'metric_reader_boundary_v1');
});
test('migration preflight rejects unexpected definitions and does not overwrite later work',async()=>{
 await assert.rejects(db.exec(await readerMigrationSQL()),/Reader definition or privilege drift/);
 await db.exec('rollback');
 assert.equal((await service(()=>db.query(queryHealth))).rows[0].value,'metric_reader_boundary_v1');
});
