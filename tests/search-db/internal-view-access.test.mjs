import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {readerMigrationSQL} from './helpers/observed-reader-boundary.mjs';
import {functionHardeningSQL} from './helpers/metric-function-hardening.mjs';
import {metricClosureFixture,metricClosureSchemaSQL} from './helpers/observed-metric-closure.mjs';
import {accessBoundarySQL} from './helpers/metric-access-boundary.mjs';
import {internalViewFixture,internalViewExtensionSchemaSQL,internalViewAccessSQL,internalViewRollbackSQL,internalViewSeedSQL} from './helpers/internal-view-access.mjs';
let db,fixture,views,targets,baseline,definitions,healthIdentity;
const health=async()=>(await db.query('select public.feya_commerce_metric_access_boundary_health_v1() value')).rows[0].value;
async function role(name,fn){await db.exec('set role '+name);try{return await fn();}finally{await db.exec('reset role');}}
const identities=async()=>(await db.query("select c.oid,c.relname,pg_get_viewdef(c.oid) definition,c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by c.relname")).rows;
async function rows(){const all={};await db.exec('begin');try{for(const name of views)all[name]=(await db.query(`select coalesce(jsonb_agg(x.row order by x.row::text),'[]') value from (select to_jsonb(v)-'generated_at'-'checked_at'-'observed_at'-'evaluated_at'-'measured_at' row from public."${name}" v) x`)).rows[0].value;return all;}finally{await db.exec('rollback');}}
before(async()=>{
 const native=process.env.FEYA_TEST_DATABASE_URL;
 if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:native,statement_timeout:30000,connectionTimeoutMillis:5000});await c.connect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}else db=await PGlite.create();
 fixture=await internalViewFixture();const old=await metricClosureFixture();
 views=[...new Set([...old.relations,...fixture.relations].filter(r=>r.kind==='v').map(r=>r.name))].sort();
 targets=fixture.downstream.filter(n=>!old.relations.some(r=>r.name===n&&r.in_metric_closure));assert.equal(targets.length,7);
 await db.exec(await observedMetricSchemaSQL());await db.exec(await metricClosureSchemaSQL());await db.exec(await internalViewExtensionSchemaSQL());await db.exec(await internalViewSeedSQL());
 await db.exec(`insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches) values('20000000-0000-4000-8000-000000000025','legacy fixture','legacy fixture','product','approved_draft',77,90);`);
 await db.exec(await metricMigrationSQL());await db.exec(await readerMigrationSQL());await db.exec(await functionHardeningSQL());await db.exec(await accessBoundarySQL());
 baseline=await role('service_role',rows);definitions=await identities();healthIdentity=(await db.query("select oid,proowner,proacl::text,prosecdef,proconfig from pg_proc where oid='public.feya_commerce_metric_access_boundary_health_v1()'::regprocedure")).rows[0];assert.equal(views.length,84);
 for(const n of targets)assert.ok(baseline[n].length>0,'Positive fixture required: '+n);
});
after(async()=>db?.close());

test('preflight rejects changed metadata and leaves all prior grants/manifests unchanged',async()=>{
 const view='public.feya_commerce_v_keyword_cleanup_review_risk_v1';await db.exec(`alter view ${view} set (security_invoker=true)`);
 try{await assert.rejects(db.exec(await internalViewAccessSQL()),/Internal access preflight drift/);}finally{await db.exec('rollback');await db.exec(`alter view ${view} reset (security_invoker)`);}
 assert.equal(await health(),'metric_access_boundary_v1');assert.equal((await db.query('select count(*)::int n from public.feya_commerce_seo_metric_access_contracts_v1')).rows[0].n,50);
 for(const n of targets)assert.equal((await db.query("select has_table_privilege('anon',$1,'SELECT') ok",['public.'+n])).rows[0].ok,true);
});
test('an unreviewed downstream consumer aborts the extension atomically',async()=>{
 await db.exec('create view public.unreviewed_internal_consumer as select * from public.feya_commerce_v_keyword_cleanup_review_risk_v1');
 try{await assert.rejects(db.exec(await internalViewAccessSQL()),/Extended access postcondition failed/);}finally{await db.exec('rollback');await db.exec('drop view public.unreviewed_internal_consumer');}
 assert.equal(await health(),'metric_access_boundary_v1');assert.equal((await db.query('select count(*)::int n from public.feya_commerce_seo_metric_access_contracts_v1')).rows[0].n,50);
});
test('seven additional views close while all 84 view rows/definitions/OIDs/options and service access remain equal',async()=>{
 await db.exec(await internalViewAccessSQL());assert.equal(await role('service_role',health),'metric_access_boundary_v2');
 assert.deepEqual(await role('service_role',rows),baseline);assert.deepEqual(await identities(),definitions);
 assert.deepEqual((await db.query("select oid,proowner,proacl::text,prosecdef,proconfig from pg_proc where oid='public.feya_commerce_metric_access_boundary_health_v1()'::regprocedure")).rows[0],healthIdentity);
 assert.equal((await db.query('select count(*)::int n from public.feya_commerce_seo_metric_access_contracts_v1')).rows[0].n,57);
});
test('both public roles are denied across 57 protected objects; service cannot edit the manifest',async()=>{
 const names=(await db.query('select object_identity from public.feya_commerce_seo_metric_access_contracts_v1')).rows.map(r=>r.object_identity);
 for(const r of ['anon','authenticated'])for(const n of names)await role(r,()=>assert.rejects(db.query('select * from '+n+' limit 1'),/permission denied/));
 for(const r of ['anon','authenticated'])await role(r,()=>assert.rejects(db.query('select public.feya_commerce_metric_access_boundary_health_v1()'),/permission denied/));
 await role('service_role',()=>assert.rejects(db.query('delete from public.feya_commerce_seo_metric_access_contracts_v1'),/permission denied/));
 await role('anon',()=>db.query('select * from public.feya_commerce_v_step7_storefront_products_api limit 1'));
});
test('every new grant, PUBLIC inheritance, downstream view/materialization and helper-body drift close health',async()=>{
 const riskDefinition=fixture.relations.find(r=>r.name==='feya_commerce_v_keyword_cleanup_review_risk_v1').definition.replace(/;\s*$/,'');
 const drift=[`create or replace view public.feya_commerce_v_keyword_cleanup_review_risk_v1 as select * from (${riskDefinition}) q where false`,...targets.map(n=>`grant select on public.${n} to anon`),
  'grant select on public.feya_commerce_v_page_ownership_shortlist_v1 to public',
  'create view public.unreviewed_internal_consumer as select * from public.feya_commerce_v_keyword_cleanup_review_risk_v1',
  'create materialized view public.unreviewed_internal_consumer as select * from public.feya_commerce_v_page_ownership_shortlist_v1 with no data',
  "create or replace function public.feya_fn_content_token_set_v1(p_text text) returns text[] language sql immutable set search_path='' as $$select array[]::text[]$$"];
 for(const sql of drift){await db.exec('begin');try{await db.exec(sql);assert.equal(await role('service_role',health),null,sql);}finally{await db.exec('rollback');}}
 assert.equal(await health(),'metric_access_boundary_v2');
});
test('stable product/page/cluster/recommendation IDs and historical human state are preserved',async()=>{
 const b=(await db.query("select review_status,score,avg_monthly_searches from public.seo_keyword_bank_v1 where id='20000000-0000-4000-8000-000000000025'")).rows[0];assert.deepEqual(b,{review_status:'approved_draft',score:77,avg_monthly_searches:90});
 assert.equal((await db.query('select review_status from public.feya_commerce_seo_keyword_ai_cleanup_v1 where cleanup_id=820')).rows[0].review_status,'pending');
 const s=(await db.query('select seo_page_id,query_cluster_id,canonical_product_id,shortlist_method from public.feya_commerce_v_page_ownership_shortlist_v1')).rows[0];
 assert.deepEqual(s,{seo_page_id:'20000000-0000-4000-8000-000000000024',query_cluster_id:'20000000-0000-4000-8000-000000000023',canonical_product_id:'20000000-0000-4000-8000-000000000022',shortlist_method:'lexical_candidate_retrieval_not_ownership'});
 assert.equal((await db.query('select count(*)::int n from public.feya_commerce_seo_page_query_ownership_v1')).rows[0].n,0);
});
test('rollback restores only seven legacy grants, retaining prior 50 denials, history and closed write health',async()=>{
 await db.exec(await internalViewRollbackSQL());assert.equal(await health(),null);
 assert.equal((await db.query('select public.feya_commerce_metric_reader_boundary_health_v1() v')).rows[0].v,'metric_reader_boundary_v1');
 for(const n of targets)await role('anon',()=>db.query('select * from public.'+n+' limit 1'));
 await role('anon',()=>assert.rejects(db.query('select * from public.feya_commerce_v_seo_metric_system_status_v1'),/permission denied/));
 assert.deepEqual(await role('service_role',rows),baseline);
 try{await assert.rejects(db.exec(await internalViewAccessSQL()),/Prior access\/reader boundary unhealthy/);}finally{await db.exec('rollback');}
});
