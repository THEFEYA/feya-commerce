import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {
  variantDependenciesSQL,ensureExecutionReceiptDependency,repairMigrationSQL,seedManualRepairFixture,ids,
  manualPriceGovernanceMigrationSQL,
} from './helpers/manual-price-governance.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000081';
let db,governanceEvidence,governanceRequest;

async function connect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');const c=new pg.Client({connectionString:nativeURL,statement_timeout:20000,connectionTimeoutMillis:5000});await c.connect();return c;}
before(async()=>{
  if(nativeURL){const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);}
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await ensureExecutionReceiptDependency(db);
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedManualRepairFixture(db);
  await db.exec(await repairMigrationSQL());

  const repairEvidence=(await service(async()=> (await db.query('select public.feya_commerce_manual_configuration_repair_evidence_v1() r')).rows[0].r));
  const repairReq=await service(async()=> (await db.query("select * from public.feya_fn_create_execution_request_v1('REPAIR_MANUAL_CONFIGURATION_BINDINGS','COMMERCE_CONFIGURATION',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'agent',null,$6)",[
    JSON.stringify({entity_type:'PRODUCT_SET',entity_key:'manual-price-lane'}),
    JSON.stringify({release_ref:'feya-review-207-20260924',evidence_sha256:repairEvidence.evidence_sha256}),
    JSON.stringify({contract_version:'manual_configuration_binding_repair_v1',release_ref:'feya-review-207-20260924',evidence_sha256:repairEvidence.evidence_sha256,expected_price_rows:6,expected_target_configurations:6}),
    JSON.stringify({mode:'explicit_compensating_change'}),
    JSON.stringify({commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false}),
    'repair-before-governance:'+repairEvidence.evidence_sha256
  ])).rows[0]);
  await service(()=>db.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',[repairReq.execution_request_id,'APPROVAL_REQUIRED',actor,'Approve exact configuration repair before governance test']));
  await service(()=>db.query('select public.feya_commerce_execute_manual_configuration_repair_v1($1)',[repairReq.execution_request_id]));
  await db.exec(await manualPriceGovernanceMigrationSQL());
});
after(async()=>{await db?.close();});

async function service(fn){await db.query('set role service_role');try{return await fn();}finally{await db.query('reset role');}}
async function evidence(){return service(async()=> (await db.query('select public.feya_commerce_manual_price_lane_governance_evidence_v1() r')).rows[0].r);}
async function prepare(e){
  return service(async()=> (await db.query("select * from public.feya_fn_create_execution_request_v1('ADOPT_MANUAL_PRICE_LANE_GOVERNANCE','COMMERCE_PRICE',$1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'agent',null,$6)",[
    JSON.stringify({entity_type:'PRODUCT_SET',entity_key:'manual-price-lane'}),
    JSON.stringify({release_ref:'feya-review-207-20260924',evidence_sha256:e.evidence_sha256}),
    JSON.stringify({contract_version:'manual_price_lane_governance_v1',release_ref:'feya-review-207-20260924',evidence_sha256:e.evidence_sha256,expected_price_rows:6,expected_configuration_rows:6}),
    JSON.stringify({mode:'explicit_compensating_change'}),
    JSON.stringify({strict_ready_rows:6,commercial_values_unchanged:true,payment_enabled:false,indexing_enabled:false}),
    'manual-price-governance:'+e.evidence_sha256
  ])).rows[0]);
}
async function approve(id){return service(()=>db.query('select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',[id,'APPROVAL_REQUIRED',actor,'Approve exact post-repair manual price lane governance']));}
async function execute(id){return service(async()=> (await db.query('select public.feya_commerce_execute_manual_price_lane_governance_v1($1) r',[id])).rows[0].r);}

test('post-repair preview sees six configurations and remains human-gated',async()=>{
  governanceEvidence=await evidence();
  assert.equal(governanceEvidence.price_rows,6);
  assert.equal(governanceEvidence.configuration_rows,6);
  assert.equal(governanceEvidence.candidate,true);
  assert.equal(governanceEvidence.already_ready,false);
  assert.ok(governanceEvidence.strict_ready_rows<6);
  assert.equal(governanceEvidence.manual_override_rows,2);
  assert.equal(governanceEvidence.source_carry_forward_rows,4);
  for(const role of ['anon','authenticated']){await db.query('set role '+role);try{
    await assert.rejects(db.query('select public.feya_commerce_execute_manual_price_lane_governance_v1($1)',[actor]),/permission denied/);
  }finally{await db.query('reset role');}}
});

test('agent prepares but cannot execute without human approval',async()=>{
  governanceRequest=await prepare(governanceEvidence);
  assert.equal(governanceRequest.request_status,'APPROVAL_REQUIRED');
  await assert.rejects(execute(governanceRequest.execution_request_id),/not_approved/);
  await approve(governanceRequest.execution_request_id);
});

test('approved governance makes all six prices quote-ready without altering commercial values',async()=>{
  const before=(await db.query("select configuration_price_id,sellable_configuration_id,source_amount,public_price_amount,manual_override_amount,source_currency from public.feya_commerce_configuration_prices where canonical_product_id in ($1,$2) order by configuration_price_id",[ids.p057,ids.p560])).rows;
  const result=await execute(governanceRequest.execution_request_id);
  assert.equal(result.price_rows,6);
  assert.equal(result.configuration_rows,6);
  assert.equal(result.strict_ready_rows,6);
  assert.equal(result.updated_source_price_rows,4);
  assert.equal(result.manual_override_rows_preserved,2);
  assert.equal(result.commercial_values_unchanged,true);
  assert.equal(result.payment_enabled,false);assert.equal(result.indexing_enabled,false);

  const after=(await db.query("select configuration_price_id,sellable_configuration_id,source_amount,public_price_amount,manual_override_amount,source_currency from public.feya_commerce_configuration_prices where canonical_product_id in ($1,$2) order by configuration_price_id",[ids.p057,ids.p560])).rows;
  assert.deepEqual(after,before);

  const manual=(await db.query("select configuration_price_id,review_status,price_status,public_price_amount,manual_override_amount from public.feya_commerce_configuration_prices where configuration_price_id in ($1,$2) order by configuration_price_id",[ids.coupleFullPrice,ids.full560Price])).rows;
  assert.deepEqual(manual.map(r=>[r.configuration_price_id,r.review_status,r.price_status,String(r.public_price_amount),String(r.manual_override_amount)]),[
    [ids.coupleFullPrice,'approved','approved','460.44','460.44'],
    [ids.full560Price,'approved','owner_reviewed','260.00','260.00'],
  ].sort((a,b)=>a[0].localeCompare(b[0])));

  const final=await evidence();
  assert.equal(final.strict_ready_rows,6);
  assert.equal(final.already_ready,true);
  assert.equal(final.candidate,false);
});

test('succeeded governance retry is idempotent',async()=>{
  const replay=await execute(governanceRequest.execution_request_id);
  assert.equal(replay.replayed,true);
  assert.equal((await db.query('select count(*)::int n from public.feya_growth_execution_receipts_v1 where execution_request_id=$1',[governanceRequest.execution_request_id])).rows[0].n,1);
});
