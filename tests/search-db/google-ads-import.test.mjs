import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {metricClosureSchemaSQL} from './helpers/observed-metric-closure.mjs';
import {readerMigrationSQL} from './helpers/observed-reader-boundary.mjs';
import {functionHardeningSQL} from './helpers/metric-function-hardening.mjs';
import {accessBoundarySQL} from './helpers/metric-access-boundary.mjs';
import {internalViewExtensionSchemaSQL,internalViewAccessSQL} from './helpers/internal-view-access.mjs';
import {googleFixture,googleBatch,googleIDs} from '../search/googleAdsFixture.ts';
import {googleRequestKey,prepareGoogleAdsPlan,googleAdsEvidencePayload} from '../../lib/googleAdsDemandAdapter.ts';
import {prepareMetricImport} from '../../lib/searchMetricAtomicStorage.ts';
import {previewDemandImport} from '../../lib/searchDemandImportPreview.ts';
const migration=()=>readFile(new URL('../../supabase/migrations/20260924095003_google_ads_atomic_evidence_v1.sql',import.meta.url),'utf8');
const query='select public.feya_commerce_import_keyword_metrics_atomic_v1($1,$2::jsonb) result';
const nativeURL=process.env.FEYA_TEST_DATABASE_URL;let db;
const x=googleFixture();const p=x.payload();
async function connect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:20000});await c.connect();return c;}
async function role(fn,r='service_role'){await db.exec('set role '+r);try{return await fn();}finally{await db.exec('reset role');}}
const save=(payload=p,key=googleRequestKey('fixture-api-first'),client=db)=>client.query(query,[key,JSON.stringify(payload)]).then(r=>r.rows[0].result);
const health=()=>db.query('select public.feya_commerce_google_ads_import_contract_v1() v').then(r=>r.rows[0].v);
const counts=async()=>Promise.all(['feya_commerce_seo_keyword_metric_import_staging_v1','feya_commerce_seo_keyword_metric_snapshots_v1','feya_commerce_seo_metric_import_receipts_v1'].map(t=>db.query('select count(*)::int n from public.'+t).then(r=>r.rows[0].n)));
async function seed(){
 await db.exec("insert into public.feya_metric_provider_config_v1(provider_code,provider_name,provider_type,preferred_mode,connection_status) values('google_ads_api','Synthetic only','api','api','not_connected') on conflict do nothing");
 await db.query("insert into public.feya_metric_request_batch_v1(metric_batch_id,provider_code,batch_code,batch_status,keyword_count,result_summary_json) values($1,'google_ads_api','synthetic-api-batch','ready',2,'{\"historical_note\":\"preserve\"}')",[googleBatch]);
 for(const r of x.rows)await db.query('insert into public.feya_metric_request_batch_keywords_v1(metric_batch_keyword_id,metric_batch_id,keyword,keyword_norm,evidence_json) values($1,$2,$3,$3,\'{"legacy_note":"preserve"}\')',[r.metric_batch_keyword_id,googleBatch,r.keyword]);
 await db.exec("insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values(9007199254740993,'synthetic armor outfit','synthetic armor outfit',3,'test','test')");
}
before(async()=>{
 if(nativeURL){const c=await connect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}else db=await PGlite.create();
 await db.exec(await observedMetricSchemaSQL());await db.exec(await metricClosureSchemaSQL());await db.exec(await internalViewExtensionSchemaSQL());
 await db.exec(await metricMigrationSQL());await db.exec(await readerMigrationSQL());await db.exec(await functionHardeningSQL());await db.exec(await accessBoundarySQL());await db.exec(await internalViewAccessSQL());
 await seed();
});
after(async()=>{await db?.close();});
test('preflight rejects changed importer without partial schema changes',async()=>{
 await db.exec('begin');await db.exec("create or replace function public.feya_commerce_import_keyword_metrics_atomic_v1(p_request_key text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$ begin return '{}'::jsonb; end $$");
 await assert.rejects(async()=>db.exec(await migration()),/Unexpected|must be/i);await db.exec('rollback');
 assert.equal((await db.query("select to_regprocedure('public.feya_commerce_google_ads_import_contract_v1()') v")).rows[0].v,null);
});
test('migration preserves RPC identity/ACL and enables only service API contract',async()=>{
 const before=(await db.query("select oid,proacl::text,proowner,prosecdef,proconfig from pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure")).rows[0];
 await db.exec(await migration());assert.equal(await role(health),'google_ads_atomic_evidence_v1');
 assert.deepEqual((await db.query("select oid,proacl::text,proowner,prosecdef,proconfig from pg_proc where oid='public.feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)'::regprocedure")).rows[0],before);
 for(const r of ['anon','authenticated'])await assert.rejects(()=>role(health,r),/permission denied/);
 assert.deepEqual(await counts(),[0,0,0]);
});
test('wrong selection, period, context or provider metadata has zero writes/status changes',async()=>{
 for(const mutate of [v=>{v.google_ads.request.geoTargetConstants=[];},v=>{v.google_ads.keyword_ids.reverse();v.google_ads.keyword_ids[0]=v.google_ads.keyword_ids[1];},v=>{v.observations[0].metadata.batch_keyword_id=googleBatch;},v=>{v.observations[0].evidence.period_start='2020-01-01';},v=>{delete v.google_ads;},v=>{v.google_ads.account_currency='USD';}]){
  const bad=structuredClone(p);mutate(bad);await assert.rejects(()=>role(()=>save(bad)));assert.deepEqual(await counts(),[0,0,0]);
 }
 assert.equal((await db.query('select batch_status from public.feya_metric_request_batch_v1')).rows[0].batch_status,'ready');
});
test('failed receipt rolls back observations AND both batch status updates',async()=>{
 await db.exec("create function public.fixture_fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'fixture receipt failure'; end $$; create trigger fixture_fail before insert on public.feya_commerce_seo_metric_import_receipts_v1 for each row execute function public.fixture_fail_receipt();");
 await assert.rejects(()=>role(()=>save()),/fixture receipt failure/);assert.deepEqual(await counts(),[0,0,0]);
 assert.equal((await db.query('select batch_status from public.feya_metric_request_batch_v1')).rows[0].batch_status,'ready');assert.equal((await db.query("select count(*)::int n from public.feya_metric_request_batch_keywords_v1 where keyword_status='queued_for_metric_request'")).rows[0].n,2);
 await db.exec('drop trigger fixture_fail on public.feya_commerce_seo_metric_import_receipts_v1; drop function public.fixture_fail_receipt();');
});
test('API stores immutable evidence/groups/large string IDs and advances fetch status atomically',async()=>{
 const r=await role(()=>save());assert.equal(r.inserted_observations,2);assert.deepEqual(await counts(),[2,2,1]);assert.equal(r.entries.find(e=>e.keyword_id)?.keyword_id,'9007199254740993');
 const rows=(await db.query('select * from public.feya_commerce_seo_keyword_metric_snapshots_v1 order by snapshot_id')).rows;
 assert.ok(rows.every(r=>r.data_freshness_status==='context_review_required'&&r.source_api==='google_ads_api'&&r.access_model==='google_cloud_project_oauth'&&r.avg_monthly_searches===0&&r.bid_currency_code==='UAH'));
 assert.equal(rows[0].demand_evidence_json.metadata.observation_group,rows[1].demand_evidence_json.metadata.observation_group);
 const b=(await db.query('select batch_status,"batchStatus",result_summary_json from public.feya_metric_request_batch_v1')).rows[0];assert.equal(b.batch_status,'applied');assert.equal(b.batchStatus,'applied');assert.equal(b.result_summary_json.historical_note,'preserve');
 assert.ok((await db.query('select keyword_status,evidence_json from public.feya_metric_request_batch_keywords_v1')).rows.every(r=>r.keyword_status==='metrics_fetched'&&r.evidence_json.legacy_note==='preserve'&&r.evidence_json.context_review_required));
 await assert.rejects(()=>role(()=>db.exec("update public.feya_commerce_seo_keyword_metric_snapshots_v1 set avg_monthly_searches=99 where demand_observation_key is not null")),/immutable/);
});
test('same API request returns first capture; changed request key context conflicts; new operation cannot refetch completed selection',async()=>{
 const replay=structuredClone(p);replay.google_ads.source_ref='google-ads:'+'a'.repeat(64);replay.observations.forEach(o=>{o.evidence.avg_monthly_searches=999;o.evidence.source_ref=replay.google_ads.source_ref;});
 const r=await role(()=>save(replay));assert.equal(r.replayed,true);assert.equal(r.inserted_observations,0);
 const conflict=structuredClone(p);conflict.google_ads.customer_id='9876543210';await assert.rejects(()=>role(()=>save(conflict)),/Idempotency/);
 await assert.rejects(()=>role(()=>save(p,googleRequestKey('different-operation'))),/Batch is not eligible/);assert.deepEqual(await counts(),[2,2,1]);
});
test('native concurrent fresh API requests settle on one receipt/capture', {skip:!nativeURL},async()=>{
 const batchId='30000000-0000-4000-8000-000000000011',ids=['30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000013'];
 await db.query("insert into public.feya_metric_request_batch_v1(metric_batch_id,provider_code,batch_code,batch_status,keyword_count) values($1,'google_ads_api','concurrent-fixture','ready',2)",[batchId]);
 const rows=x.rows.map((r,i)=>({...r,metric_batch_id:batchId,metric_batch_keyword_id:ids[i]}));
 for(const r of rows)await db.query('insert into public.feya_metric_request_batch_keywords_v1(metric_batch_keyword_id,metric_batch_id,keyword,keyword_norm) values($1,$2,$3,$3)',[r.metric_batch_keyword_id,batchId,r.keyword]);
 const plan=prepareGoogleAdsPlan({...x.batch,metric_batch_id:batchId},rows,{...x.input,keyword_ids:ids},x.env,new Date());
 const payloads=[2,1].map(ms=>googleAdsEvidencePayload(plan,x.response,x.context,'concurrent-fixture',new Date(Date.now()-ms)));
 const before=await counts(),clients=await Promise.all([connect(),connect()]);
 try{await Promise.all(clients.map(c=>c.query('set role service_role')));const r=await Promise.all(clients.map((c,i)=>save(payloads[i],googleRequestKey('fixture-api-concurrent'),c)));assert.equal(r.filter(x=>x.replayed).length,1);assert.equal(r.filter(x=>x.inserted_observations===2).length,1);assert.deepEqual(r[0].entries,r[1].entries);assert.deepEqual(await counts(),before.map((v,i)=>v+(i===2?1:2)));}
 finally{await Promise.all(clients.map(c=>c.end()));}
});
test('CSV behavior remains compatible; rollback preserves API history and closes API contract',async()=>{
 const csv={keyword:'synthetic csv after api',metric_source:'google_ads_csv',source_ref:'fixture:csv-after-api',region:'US',language:'en',network:'GOOGLE_SEARCH',period_start:x.plan.period_start,period_end:x.plan.period_end,last_checked:new Date(Date.now()-1000).toISOString(),avg_monthly_searches:'0'};
 const cp=prepareMetricImport(previewDemandImport({rows:[csv]},new Date()),'fixture:csv-context');assert.equal((await role(()=>save(cp,googleRequestKey('csv-compatibility')))).inserted_observations,1);
 const before=await counts();await db.exec(await readFile(new URL('./fixtures/rollback-google-ads-import.sql',import.meta.url),'utf8'));assert.equal(await role(health),null);assert.deepEqual(await counts(),before);
 assert.equal((await db.query('select public.feya_commerce_metric_reader_boundary_health_v1() v')).rows[0].v,'metric_reader_boundary_v1');
});
