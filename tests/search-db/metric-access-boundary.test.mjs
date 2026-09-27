import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {readerMigrationSQL} from './helpers/observed-reader-boundary.mjs';
import {functionHardeningSQL} from './helpers/metric-function-hardening.mjs';
import {metricClosureFixture,metricClosureSchemaSQL} from './helpers/observed-metric-closure.mjs';
import {accessBoundarySQL,accessBoundaryRollbackSQL} from './helpers/metric-access-boundary.mjs';
let db,fixture,baseline,definitions;
const health=async()=>(await db.query('select public.feya_commerce_metric_access_boundary_health_v1() value')).rows[0].value;
async function asRole(role,fn){await db.exec('set role '+role);try{return await fn();}finally{await db.exec('reset role');}}
async function viewRows(){const result={};await db.exec('begin');try{for(const v of fixture.relations.filter(r=>r.kind==='v')){
 // Some Growth projections include the current clock. Compare data excluding only explicitly volatile observation fields.
 result[v.name]=(await db.query(`select coalesce(jsonb_agg(x.row order by x.row::text),'[]') value from (select to_jsonb(v)-'generated_at'-'checked_at'-'observed_at'-'evaluated_at'-'measured_at' row from public."${v.name}" v) x`)).rows[0].value;
 }return result;}finally{await db.exec('rollback');}}
before(async()=>{
 const native=process.env.FEYA_TEST_DATABASE_URL;
 if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:native,statement_timeout:30000,connectionTimeoutMillis:5000});await c.connect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
 else db=await PGlite.create();
 fixture=await metricClosureFixture();await db.exec(await observedMetricSchemaSQL());await db.exec(await metricClosureSchemaSQL());
 await db.exec(`insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values(19,'synthetic closure armor','synthetic closure armor',3,'test','test');
 insert into public.feya_commerce_seo_keyword_metric_snapshots_v1(keyword_norm,source_api,geo,language,avg_monthly_searches,data_freshness_status) values('synthetic closure armor','google_ads_csv','US','en',90,'fresh_manual_import');
 insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches) values('10000000-0000-4000-8000-000000000019','synthetic closure armor','synthetic closure armor','product','approved_draft',77,90);`);
 await db.exec(await metricMigrationSQL());await db.exec(await readerMigrationSQL());await db.exec(await functionHardeningSQL());
 definitions=(await db.query("select c.oid,c.relname,pg_get_viewdef(c.oid) definition,c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by c.relname")).rows;
 baseline=await asRole('service_role',viewRows);await db.exec(await accessBoundarySQL());
});
after(async()=>db?.close());

test('all 80 actual view definitions restore; service reads retain data, OIDs and security options after 50-object revocation',async()=>{
 assert.equal(definitions.length,80);assert.deepEqual(await asRole('service_role',viewRows),baseline);
 assert.deepEqual((await db.query("select c.oid,c.relname,pg_get_viewdef(c.oid) definition,c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by c.relname")).rows,definitions);
 assert.equal(await asRole('service_role',health),'metric_access_boundary_v1');
});
test('anon and authenticated cannot SELECT any direct/downstream view or raw metric table',async()=>{
 const targets=fixture.relations.filter(r=>r.in_metric_closure);assert.equal(targets.length,50);
 for(const role of ['anon','authenticated'])for(const r of targets){
  assert.equal((await db.query('select has_table_privilege($1,$2,\'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER\') value',[role,'public.'+r.name])).rows[0].value,false);
  await asRole(role,()=>assert.rejects(db.query('select * from public."'+r.name+'" limit 1'),/permission denied/));
 }
 for(const role of ['anon','authenticated'])await asRole(role,()=>assert.rejects(db.query('select public.feya_commerce_metric_access_boundary_health_v1()'),/permission denied/));
 await asRole('service_role',()=>assert.rejects(db.query('delete from public.feya_commerce_seo_metric_access_contracts_v1'),/permission denied/));
});
test('public storefront read contract remains available and legacy bank approval retains its ID/value',async()=>{
 await asRole('anon',()=>db.query('select * from public.feya_commerce_v_step7_storefront_products_api limit 1'));
 const b=(await db.query("select id,score,review_status,avg_monthly_searches from public.seo_keyword_bank_v1 where id='10000000-0000-4000-8000-000000000019'")).rows[0];
 assert.deepEqual(b,{id:'10000000-0000-4000-8000-000000000019',score:77,review_status:'approved_draft',avg_monthly_searches:90});
});
test('grant drift, PUBLIC inheritance, and new downstream consumers close access health',async()=>{
 const view='public.feya_commerce_v_growth_signal_candidates_safe_v2';
 for(const sql of [`grant select on ${view} to anon`,`grant select on ${view} to public`,`create view public.unreviewed_downstream as select * from ${view}`,`create materialized view public.unreviewed_downstream as select * from ${view} with no data`]){
  await db.exec('begin');try{await db.exec(sql);assert.equal(await asRole('service_role',health),null);}finally{await db.exec('rollback');}
 }
 assert.equal(await health(),'metric_access_boundary_v1');
});
test('unknown downstream definition is rejected without changing prior access',async()=>{
 await db.exec(await accessBoundaryRollbackSQL());
 await db.exec('alter view public.feya_commerce_v_growth_signal_candidates_safe_v2 set (security_barrier=false)');
 try{await assert.rejects(db.exec(await accessBoundarySQL()),/Access preflight drift/);}finally{await db.exec('rollback');}
 assert.equal((await db.query("select has_table_privilege('anon','public.feya_commerce_v_growth_signal_candidates_safe_v2','SELECT') value")).rows[0].value,true);
 await db.exec('alter view public.feya_commerce_v_growth_signal_candidates_safe_v2 set (security_barrier=true)');
});
test('rollback restores previous role access and reader isolation but deliberately leaves access/write gate closed',async()=>{
 assert.equal(await health(),null);assert.equal((await db.query('select public.feya_commerce_metric_reader_boundary_health_v1() value')).rows[0].value,'metric_reader_boundary_v1');
 await asRole('anon',()=>db.query('select * from public.feya_commerce_v_query_cluster_review_queue_v1 limit 1'));
 assert.equal((await db.query("select count(*)::int n from public.feya_commerce_seo_keyword_metric_snapshots_v1 where keyword_norm='synthetic closure armor'")).rows[0].n,1);
});
