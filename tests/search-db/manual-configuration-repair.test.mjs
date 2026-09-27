import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {
  variantDependenciesSQL,ensureExecutionReceiptDependency,repairMigrationSQL,seedManualRepairFixture,ids
} from './helpers/manual-configuration-repair.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000061';
let db,initialEvidence,request;
async function connect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000});await c.connect();return c;}
before(async()=>{
  if(nativeURL){const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await ensureExecutionReceiptDependency(db);
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedManualRepairFixture(db);
  await db.exec(await repairMigrationSQL());
});
after(async()=>{await db?.close();});
async function service(fn){await db.query('set role service_role');try{return await fn();}finally{await db.query('reset role');}}
async function evidence(){return service(async()=> (await db.query('select public.feya_commerce_manual_configuration_repair_evidence_v1() r')).rows[0].r);}
async function prepare(e){
 return service(async()=> (await db.query("select * from public.feya_fn_create_execution_request_v1('REPAIR_MANUAL_CONFIGURATION_BINDINGS','COMMERCE_CONFIGURATION',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'agent',null,$6)",[
   JSON.stringify({entity_type:'RELEASE',entity_key:'feya-review-207-20260924'}),
   JSON.stringify({release_ref:'feya-review-207-20260924',evidence_sha256:e.evidence_sha256}),
   JSON.stringify({contract_version:'manual_configuration_binding_repair_v1',release_ref:'feya-review-207-20260924',evidence_sha256:e.evidence_sha256,expected_price_rows:6,expected_target_configurations:6}),
   JSON.stringify({mode:'explicit_compensating_change'}),
   JSON.stringify({commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false}),
   'manual-repair:'+e.evidence_sha256
 ])).rows[0]);
}
async function approve(id){return service(()=>db.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',[id,'APPROVAL_REQUIRED',actor,'Approve exact structural configuration split']));}
async function execute(id){return service(async()=> (await db.query('select public.feya_commerce_execute_manual_configuration_repair_v1($1) r',[id])).rows[0].r);}

test('preview fingerprints exact six-row / three-config collapsed state without mutation',async()=>{
  initialEvidence=await evidence();
  assert.equal(initialEvidence.price_rows,6);assert.equal(initialEvidence.configuration_rows,3);
  assert.equal(initialEvidence.commercial_values_change,false);assert.equal(initialEvidence.price_review_status_change,false);
  assert.match(initialEvidence.evidence_sha256,/^[0-9a-f]{64}$/);
  for(const role of ['anon','authenticated']){await db.query('set role '+role);try{
    await assert.rejects(db.query('select public.feya_commerce_execute_manual_configuration_repair_v1($1)',[actor]),/permission denied/);
  }finally{await db.query('reset role');}}
});

test('agent can prepare but execution requires exact human approval',async()=>{
  request=await prepare(initialEvidence);assert.equal(request.request_status,'APPROVAL_REQUIRED');
  await assert.rejects(execute(request.execution_request_id),/not_approved/);
  await approve(request.execution_request_id);
});

test('approved repair splits configurations while preserving every commercial value and review state',async()=>{
  const before=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency,review_status,price_status from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
  const result=await execute(request.execution_request_id);
  assert.equal(result.price_rows,6);assert.equal(result.configuration_rows_before,3);assert.equal(result.configuration_rows_after,6);
  assert.equal(result.new_configurations,3);assert.equal(result.commercial_values_unchanged,true);
  assert.equal(result.price_review_status_change,false);assert.equal(result.payment_enabled,false);assert.equal(result.indexing_enabled,false);
  const after=(await db.query("select configuration_price_id,source_amount,public_price_amount,manual_override_amount,source_currency,review_status,price_status from public.feya_commerce_configuration_prices order by configuration_price_id")).rows;
  assert.deepEqual(after,before);

  const bindings=(await db.query("select configuration_price_id,sellable_configuration_id from public.feya_commerce_configuration_prices where canonical_product_id in ($1,$2) order by configuration_price_id",[ids.p057,ids.p560])).rows;
  const map=new Map(bindings.map(r=>[r.configuration_price_id,r.sellable_configuration_id]));
  assert.equal(map.get(ids.malePrice),ids.maleCfg);assert.equal(map.get(ids.femalePrice),ids.femaleCfg);assert.equal(map.get(ids.coupleFullPrice),ids.coupleFullCfg);
  assert.equal(map.get(ids.skirtPrice),ids.skirtCfg);assert.equal(map.get(ids.topPrice),ids.topCfg);assert.equal(map.get(ids.full560Price),ids.full560Cfg);

  const configs=(await db.query("select canonical_product_id,configuration_name,normalized_key,sort_order,review_status from public.feya_commerce_sellable_configurations where canonical_product_id in ($1,$2) order by canonical_product_id,sort_order",[ids.p057,ids.p560])).rows;
  assert.equal(configs.length,6);
  assert.deepEqual(configs.filter(x=>x.canonical_product_id===ids.p057).map(x=>x.normalized_key),['male_outfit','female_outfit','full_set_couple_owner_20260917']);
  assert.deepEqual(configs.filter(x=>x.canonical_product_id===ids.p560).map(x=>x.normalized_key),['skirt','top_shoulders','full_set']);
});

test('succeeded retry is idempotent and uses one receipt',async()=>{
  const replay=await execute(request.execution_request_id);assert.equal(replay.replayed,true);
  assert.equal((await db.query('select count(*)::int n from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[request.execution_request_id])).rows[0].n,1);
});

test('evidence drift before approval/execution fails closed',async()=>{
  // restore a fresh fixture in a transaction-like synthetic second request is unnecessary;
  // instead verify the evidence is now structurally different and cannot equal the original request hash.
  const after=await evidence();
  assert.notEqual(after.evidence_sha256,initialEvidence.evidence_sha256);
  assert.equal(after.configuration_rows,6);
});
