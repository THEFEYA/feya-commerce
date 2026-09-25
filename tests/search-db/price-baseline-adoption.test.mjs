import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {variantDependenciesSQL,seedVariantProduct,variantTestIds as ids,priceBaselineMigrationSQL,seedPriceProvenance,ensureExecutionReceiptDependency} from './helpers/price-baseline-adoption.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000041';
let db;
async function connect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000});await c.connect();return c;}
before(async()=>{
  if(nativeURL){const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedVariantProduct(db);await seedPriceProvenance(db);await ensureExecutionReceiptDependency(db);await db.exec(await priceBaselineMigrationSQL());
});
after(async()=>{await db?.close();});
async function service(fn,c=db){await c.query('set role service_role');try{return await fn(c);}finally{await c.query('reset role');}}
const preview=(c=db)=>service(async()=> (await c.query('select public.feya_commerce_preview_price_baseline_adoption_v1($1::uuid[]) r',[[ids.product]])).rows[0].r,c);
async function prepare(p,c=db){
  return service(async()=> (await c.query("select * from public.feya_fn_create_execution_request_v1('ADOPT_SOURCE_PRICE_BASELINE','COMMERCE_PRICE',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'human',$6,$7)",[
    JSON.stringify({entity_type:'RELEASE',entity_key:'synthetic-release'}),
    JSON.stringify({evidence_sha256:p.evidence_sha256,price_row_count:p.candidate_price_row_count}),
    JSON.stringify({contract_version:'commerce_price_baseline_adoption_v1',release_ref:'synthetic-release',canonical_product_ids:[ids.product],evidence_sha256:p.evidence_sha256,price_row_count:p.candidate_price_row_count}),
    JSON.stringify({mode:'explicit_compensating_change'}),
    JSON.stringify({payment_enabled:false,indexing_enabled:false}),
    actor,'price-baseline:'+p.evidence_sha256
  ])).rows[0],c);
}
async function approve(id,c=db){return service(()=>c.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',[id,'APPROVAL_REQUIRED',actor,'Synthetic exact baseline approval']),c);}
async function execute(id,c=db){return service(async()=> (await c.query('select public.feya_commerce_execute_price_baseline_adoption_v1($1) r',[id])).rows[0].r,c);}

test('preview is private and classifies clean unchanged source evidence without mutation',async()=>{
  const p=await preview();assert.equal(p.candidate_product_count,1);assert.equal(p.candidate_price_row_count,1);assert.equal(p.hold_product_count,0);
  const row=(await db.query('select review_status,price_status from public.feya_commerce_configuration_prices where configuration_price_id=$1',[ids.config])).rows[0];
  assert.deepEqual(row,{review_status:'not_reviewed',price_status:'draft'});
  for(const role of ['anon','authenticated']){await db.query('set role '+role);try{
    await assert.rejects(db.query('select public.feya_commerce_preview_price_baseline_adoption_v1($1::uuid[])',[[ids.product]]),/permission denied/);
    await assert.rejects(db.query('select public.feya_commerce_execute_price_baseline_adoption_v1($1)',[ids.product]),/permission denied/);
  }finally{await db.query('reset role');}}
});

let executionId;
test('approved Execution Gateway request adopts governance only and writes a succeeded receipt',async()=>{
  const p=await preview();const req=await prepare(p);executionId=req.execution_request_id;assert.equal(req.request_status,'APPROVAL_REQUIRED');
  await approve(executionId);
  const result=await execute(executionId);
  assert.equal(result.product_count,1);assert.equal(result.updated_price_rows,1);assert.equal(result.payment_enabled,false);assert.equal(result.indexing_enabled,false);
  const price=(await db.query('select review_status,price_status,source_amount,public_price_amount,manual_override_amount from public.feya_commerce_configuration_prices where configuration_price_id=$1',[ids.config])).rows[0];
  assert.equal(price.review_status,'approved');assert.equal(price.price_status,'approved');assert.equal(String(price.source_amount),'123.45');assert.equal(String(price.public_price_amount),'123.45');assert.equal(price.manual_override_amount,null);
  const cfg=(await db.query('select review_status from public.feya_commerce_sellable_configurations where sellable_configuration_id=$1',[ids.parent])).rows[0];assert.equal(cfg.review_status,'approved');
  const er=(await db.query('select request_status,approval_hash,request_hash from public.feya_growth_execution_requests_v1 where execution_request_id=$1',[executionId])).rows[0];assert.equal(er.request_status,'SUCCEEDED');assert.equal(er.approval_hash,er.request_hash);
  const receipt=(await db.query('select receipt_status,result_json from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[executionId])).rows[0];assert.equal(receipt.receipt_status,'SUCCEEDED');assert.equal(receipt.result_json.manual_overrides_included,false);
});

test('re-executing a succeeded request replays the same result without a second receipt',async()=>{
  const out=await execute(executionId);assert.equal(out.replayed,true);
  assert.equal((await db.query('select count(*)::int n from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[executionId])).rows[0].n,1);
});

test('manual override is held outside the batch',async()=>{
  await seedPriceProvenance(db);
  await db.query("update public.feya_commerce_configuration_prices set manual_override_amount=140,public_price_amount=140 where configuration_price_id=$1",[ids.config]);
  const p=await preview();assert.equal(p.candidate_product_count,0);assert.equal(p.hold_product_count,1);
  await seedPriceProvenance(db);
});

test('evidence drift after human approval fails closed and leaves statuses untouched',async()=>{
  const p=await preview();
  const realReq=await prepare(p);await approve(realReq.execution_request_id);
  await db.query("update public.feya_commerce_configuration_prices set public_price_amount=124 where configuration_price_id=$1",[ids.config]);
  await assert.rejects(execute(realReq.execution_request_id),/price_baseline_execution_evidence_conflict/);
  const row=(await db.query('select review_status,price_status from public.feya_commerce_configuration_prices where configuration_price_id=$1',[ids.config])).rows[0];
  assert.deepEqual(row,{review_status:'not_reviewed',price_status:'draft'});
});
