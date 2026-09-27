import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {observedMetricSchemaSQL,metricMigrationSQL} from './helpers/observed-metric-schema.mjs';
import {previewDemandImport} from '../../lib/searchDemandImportPreview.ts';
import {prepareMetricImport,metricImportRequestKey,importMetricsAtomically,METRIC_IMPORT_RPC,METRIC_IMPORT_HEALTH_RPC,metricImportWriteBlockers} from '../../lib/searchMetricAtomicStorage.ts';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
let db;
const tables=['feya_commerce_seo_keyword_metric_import_staging_v1','feya_commerce_seo_keyword_metric_snapshots_v1','feya_commerce_seo_metric_import_receipts_v1'];
const bankID='10000000-0000-4000-8000-000000000001';
const now=new Date();
const day=n=>new Date(now.getTime()-n*86400000).toISOString().slice(0,10);
const periodEnd=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0)).toISOString().slice(0,10);
const periodStart=new Date(Date.UTC(now.getUTCFullYear()-1,now.getUTCMonth(),1)).toISOString().slice(0,10);
function row(patch={}) {return {keyword:'synthetic shoulder armor',metric_source:'google_ads_csv',source_ref:'fixture:atomic-only',region:'US',language:'en',network:'GOOGLE_SEARCH',period_start:periodStart,period_end:periodEnd,last_checked:day(1),avg_monthly_searches:'0',competition:'LOW',competition_index:'12',low_bid:'1.25',high_bid:'2.5',bid_currency_code:'UAH',monthly_history_json:JSON.stringify([{month:periodEnd.slice(0,7),searches:0}]),keyword_bank_id:bankID,existing_snapshot_id:'900',...patch};}
function payload(rows=[row()],ref='fixture:context-review') {return prepareMetricImport(previewDemandImport({rows},now),ref);}
const query='select public.feya_commerce_import_keyword_metrics_atomic_v1($1,$2::jsonb) result';
async function nativeConnect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000});await c.connect();return c;}
async function service(fn){await db.exec('set role service_role');try{return await fn();}finally{await db.exec('reset role');}}
async function save(p,key=metricImportRequestKey(p),client=db){return (await client.query(query,[key,JSON.stringify(p)])).rows[0].result;}
async function counts(){return Promise.all(tables.map(async t=>(await db.query(`select count(*)::int n from public.${t}`)).rows[0].n));}
const transport={rpc:async(name,args)=>{try{return {data:await service(async()=> name===METRIC_IMPORT_HEALTH_RPC?(await db.query('select public.feya_commerce_keyword_metric_import_contract_v1() value')).rows[0].value:await save(args.p_payload,args.p_request_key)),error:null};}catch(error){return {data:null,error};}}};

before(async()=>{
 if(nativeURL){const c=await nativeConnect();db={query:(s,v)=>c.query(s,v),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0,'Dedicated empty DB required');}
 else db=await PGlite.create();
 await db.exec(await observedMetricSchemaSQL());
 await db.exec(`insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches) values('${bankID}','synthetic shoulder armor','synthetic shoulder armor','product','approved_draft',77,90);
 insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values(800,'synthetic shoulder armor','synthetic shoulder armor',3,'test','test');
 insert into public.feya_commerce_seo_keyword_metric_snapshots_v1(snapshot_id,keyword_norm,source_api,geo,language,avg_monthly_searches,data_freshness_status) values(900,'synthetic shoulder armor','google_ads_csv','US','en',90,'fresh_manual_import');
 insert into public.feya_commerce_seo_keyword_metric_import_staging_v1(import_row_id,batch_code,keyword_norm,avg_monthly_searches,import_status) values(900,'legacy-fixture','synthetic shoulder armor',90,'promoted_to_snapshots');`);
 await db.exec(await metricMigrationSQL());
});
after(async()=>{await db?.close();});

test('observed 7-table contract retains historical IDs, approvals and generated columns',async()=>{
 const b=(await db.query('select * from public.seo_keyword_bank_v1 where id=$1',[bankID])).rows[0];assert.equal(b.score,77);assert.equal(b.review_status,'approved_draft');
 const old=(await db.query('select * from public.feya_commerce_seo_keyword_metric_snapshots_v1 where snapshot_id=900')).rows[0];assert.equal(old.avg_monthly_searches,90);assert.equal(old.demand_observation_key,null);
 const generated=(await db.query("select count(*)::int n from pg_attribute a join pg_class c on c.oid=a.attrelid where c.relname in ('feya_metric_request_batch_v1','feya_metric_request_batch_keywords_v1') and a.attgenerated='s'")).rows[0].n;assert.equal(generated,14);
});
test('receipt and RPC reject anon/authenticated despite inherited broad defaults',async()=>{
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',[role,tables[2],'SELECT,INSERT,UPDATE,DELETE'])).rows[0].allowed,false);
  await db.exec(`set role ${role}`);try{await assert.rejects(save(payload()),/permission denied/);}finally{await db.exec('reset role');}
 }
 const f=(await db.query('select prosecdef,proconfig from pg_proc where proname=$1',[METRIC_IMPORT_RPC])).rows[0];assert.equal(f.prosecdef,false);assert.ok(f.proconfig.includes('search_path=""'));
 assert.equal((await db.query("select relrowsecurity from pg_class where relname=$1",[tables[2]])).rows[0].relrowsecurity,true);
});
let saved;
test('real parser → reviewed payload → SQL transaction stores zero, currency, dates, source and stable links',async()=>{
 saved=await importMetricsAtomically(transport,payload());assert.equal(saved.ok,true,saved.error);assert.equal(saved.httpStatus,201);
 const id=saved.receipt.entries[0].snapshot_id;
 const m=(await db.query(`select * from public.${tables[1]} where snapshot_id=$1`,[id])).rows[0];
 assert.equal(m.avg_monthly_searches,0);assert.equal(m.bid_currency_code,'UAH');assert.equal(String(m.keyword_id),'800');assert.equal(m.data_freshness_status,'context_review_required');
 assert.equal(m.demand_evidence_json.evidence.fetched_at,day(1));assert.deepEqual(m.monthly_search_volumes_json,[{month:periodEnd.slice(0,7),searches:0}]);assert.equal(m.demand_evidence_json.keyword_bank_id,bankID);
 assert.equal(new Date(m.fetched_at).toISOString().slice(0,10),day(1));assert.ok(m.targeting_context_hash);assert.equal(m.raw_payload_json.context_evidence_ref,'fixture:context-review');
 assert.equal((await db.query('select avg_monthly_searches from public.seo_keyword_bank_v1 where id=$1',[bankID])).rows[0].avg_monthly_searches,90);
});
test('same request and cross-request repeats reuse both row IDs',async()=>{
 const p=payload();const again=await importMetricsAtomically(transport,p);assert.equal(again.httpStatus,200);assert.deepEqual(again.receipt.entries,saved.receipt.entries);
 const next=await importMetricsAtomically(transport,p,'different-retry-key');assert.equal(next.httpStatus,201);assert.equal(next.receipt.inserted_observations,0);assert.deepEqual(next.receipt.entries,saved.receipt.entries);
});
test('changed payload under a reused client key returns 409 without overwriting',async()=>{
 const p=payload([row({source_ref:'fixture:conflict'})]);assert.equal((await importMetricsAtomically(transport,p,'same-client-key')).ok,true);
 const conflict=await importMetricsAtomically(transport,payload([row({source_ref:'fixture:conflict',avg_monthly_searches:'10'})]),'same-client-key');assert.equal(conflict.httpStatus,409);
});
test('same source identity with contradictory values is rejected across different request keys',async()=>{
 const before=await counts();const r=await importMetricsAtomically(transport,payload([row({avg_monthly_searches:'10'})]),'cross-batch-conflict');assert.equal(r.httpStatus,409);assert.deepEqual(await counts(),before);
});
test('ranges stay null in scalar columns and retain exact bounds in evidence',async()=>{
 const p=payload([row({source_ref:'fixture:range',avg_monthly_searches:'',volume_range_low:'0',volume_range_high:'1000'})]);const r=await importMetricsAtomically(transport,p);assert.equal(r.ok,true,r.error);
 const m=(await db.query(`select avg_monthly_searches,demand_evidence_json from public.${tables[1]} where snapshot_id=$1`,[r.receipt.entries[0].snapshot_id])).rows[0];assert.equal(m.avg_monthly_searches,null);assert.deepEqual(m.demand_evidence_json.evidence.search_volume_range,{low:0,high:1000});
});
test('row validation and malformed direct RPC input never write a passing subset',async()=>{
 assert.throws(()=>payload([row(),row({network:''})]),/Every input row/);
 const before=await counts();
 const mutations=[p=>{p.observations[0].evidence.network='';},p=>{p.observations[0].evidence.avg_monthly_searches='10';},p=>{p.observations[0].evidence.avg_monthly_searches=-1;},p=>{p.observations[0].evidence.avg_monthly_searches=2147483648;},p=>{p.observations[0].evidence.bid_currency_code=null;},p=>{p.observations[0].evidence.period_start='2026-02-30';},p=>{p.observations[0].evidence.fetched_at='2099-01-01';},p=>{p.observations[0].evidence.period_end='2020-01-01';},p=>{p.observations[0].keyword_bank_id='10000000-0000-4000-8000-000000000009';},p=>{p.observations[0].metadata.monthly_history_json='{}';},p=>{p.observations[0].metadata.monthly_history_json='[{"month":"2099-01","searches":0}]';},p=>{p.observations[0].keyword_norm='mismatched phrase';},p=>{p.observations[0].metadata.monthly_history_json='[{"month":"2026-06","searches":0},{"month":"2026-06","searches":1}]';}];
 for(const mutate of mutations){const p=payload([row({source_ref:'fixture:direct-bad'}),row({source_ref:'fixture:valid-other'})]);mutate(p);await service(()=>assert.rejects(save(p)));assert.deepEqual(await counts(),before);}
});
test('snapshot or receipt failure rolls back the entire batch, and retry recovers',async()=>{
 for(const table of [tables[1],tables[2]]){
 const before=await counts();const p=payload([row({source_ref:'fixture:failure:'+table}),row({source_ref:'fixture:failure-other:'+table})]);
 await db.exec(`create function public.test_metric_fail() returns trigger language plpgsql as $$ begin raise exception 'injected metric write failure'; end $$; create trigger test_metric_fail before insert on public.${table} for each row execute function public.test_metric_fail();`);
 await service(()=>assert.rejects(save(p),/injected metric/));assert.deepEqual(await counts(),before);
 await db.exec(`drop trigger test_metric_fail on public.${table}; drop function public.test_metric_fail();`);
 assert.equal((await service(()=>save(p))).inserted_observations,2);
 }
});
test('new observations and receipts are immutable while legacy update behavior is retained',async()=>{
 const id=saved.receipt.entries[0].snapshot_id;await service(()=>assert.rejects(db.query(`update public.${tables[1]} set avg_monthly_searches=99 where snapshot_id=$1`,[id]),/immutable/));
 await service(()=>assert.rejects(db.query(`delete from public.${tables[0]} where demand_observation_key is not null`),/immutable/));
 await service(()=>assert.rejects(db.query(`update public.${tables[2]} set payload='{}'`),/permission denied/));
 await service(()=>db.query(`update public.${tables[1]} set avg_monthly_searches=91 where snapshot_id=900`));assert.equal((await db.query(`select avg_monthly_searches from public.${tables[1]} where snapshot_id=900`)).rows[0].avg_monthly_searches,91);
});
test('half-written evidence pairs cannot pass SQL checks through null semantics',async()=>{
 for(const [key,evidence] of [[null,'{}'],['f'.repeat(64),null],['f'.repeat(64),'null']]){
  await service(()=>assert.rejects(db.query(`insert into public.${tables[0]}(batch_code,keyword_norm,demand_observation_key,demand_evidence_json) values('invalid-pair','synthetic', $1,$2::jsonb)`,[key,evidence]),/check constraint/));
 }
});
test('verified runtime still requires explicit storage activation and mandatory Auth',()=>{
 assert.deepEqual(metricImportWriteBlockers({FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true',FEYA_ADMIN_AUTH_REQUIRED:'true'}),[]);
 assert.deepEqual(metricImportWriteBlockers({FEYA_ADMIN_AUTH_REQUIRED:'true'}),['storage_disabled']);
 assert.deepEqual(metricImportWriteBlockers({FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true'}),['admin_auth_required']);
});
test('missing health RPC never falls back to separate inserts; invalid transport receipts fail closed',async()=>{
 const calls=[];const absent={rpc:async n=>{calls.push(n);return {data:null,error:{message:'missing'}};}};
 assert.equal((await importMetricsAtomically(absent,payload())).httpStatus,503);assert.deepEqual(calls,[METRIC_IMPORT_HEALTH_RPC]);
 const fake={rpc:async n=>({data:n===METRIC_IMPORT_HEALTH_RPC?'atomic_keyword_metric_import_v1':{request_key:'bad',entries:[]},error:null})};assert.equal((await importMetricsAtomically(fake,payload())).httpStatus,502);
});

test('native PostgreSQL: eight concurrent identical imports commit one receipt and one observation pair',{skip:!nativeURL},async()=>{
 const p=payload([row({source_ref:'fixture:race-identical'})]);const before=await counts();const clients=await Promise.all(Array.from({length:8},()=>nativeConnect()));
 try{await Promise.all(clients.map(c=>c.query('set role service_role')));const results=await Promise.all(clients.map(c=>save(p,metricImportRequestKey(p),c)));assert.equal(results.filter(r=>!r.replayed).length,1);assert.equal(new Set(results.map(r=>r.entries[0].snapshot_id)).size,1);assert.deepEqual(await counts(),before.map(n=>n+1));}finally{await Promise.all(clients.map(c=>c.end()));}
});
test('native PostgreSQL: reversed overlapping batches share rows without deadlocking',{skip:!nativeURL},async()=>{
 const p=payload([row({source_ref:'fixture:overlap-a'}),row({source_ref:'fixture:overlap-b'})]);const q={...structuredClone(p),observations:[...p.observations].reverse()};const before=await counts();const clients=await Promise.all([nativeConnect(),nativeConnect()]);
 try{await Promise.all(clients.map(c=>c.query('set role service_role')));const results=await Promise.all([save(p,'a'.repeat(64),clients[0]),save(q,'b'.repeat(64),clients[1])]);assert.equal(results.reduce((s,r)=>s+r.inserted_observations,0),2);assert.deepEqual(await counts(),before.map(n=>n+2));}finally{await Promise.all(clients.map(c=>c.end()));}
});
test('native PostgreSQL: conflicting source observations have one winner and no partial loser',{skip:!nativeURL},async()=>{
 const p=payload([row({source_ref:'fixture:race-conflict'})]),q=payload([row({source_ref:'fixture:race-conflict',avg_monthly_searches:'9'})]);const before=await counts();const clients=await Promise.all([nativeConnect(),nativeConnect()]);
 try{await Promise.all(clients.map(c=>c.query('set role service_role')));const results=await Promise.allSettled([save(p,metricImportRequestKey(p),clients[0]),save(q,metricImportRequestKey(q),clients[1])]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'23505');assert.deepEqual(await counts(),before.map(n=>n+1));}finally{await Promise.all(clients.map(c=>c.end()));}
});
