import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {
  variantDependenciesSQL,ensureExecutionReceiptDependency,priceBaselineMigrationSQL,
  seedFullPriceBaselineRehearsal,commercialValueFingerprint,
} from './helpers/price-baseline-rehearsal.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000051';
let db,fixture,beforeFingerprint,prepared;

async function connect(){
  const u=new URL(nativeURL);
  assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
  assert.equal(u.pathname,'/feya_test');
  const c=new pg.Client({connectionString:nativeURL,statement_timeout:30000,connectionTimeoutMillis:5000});
  await c.connect();return c;
}
before(async()=>{
  if(nativeURL){
    const c=await connect();
    db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0,'Dedicated empty DB required');
  }else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await ensureExecutionReceiptDependency(db);
  await db.query('insert into auth.users(id) values($1)',[actor]);
  fixture=await seedFullPriceBaselineRehearsal(db);
  beforeFingerprint=await commercialValueFingerprint(db);
  await db.exec(await priceBaselineMigrationSQL());
});
after(async()=>{await db?.close();});

async function service(fn){
  await db.query('set role service_role');
  try{return await fn();}
  finally{await db.query('reset role');}
}
async function preview(){
  return service(async()=> (await db.query(
    'select public.feya_commerce_preview_price_baseline_adoption_v1($1::uuid[]) r',
    [fixture.productIds],
  )).rows[0].r);
}
async function createRequest(p){
  return service(async()=> (await db.query(`
    select * from public.feya_fn_create_execution_request_v1(
      'ADOPT_SOURCE_PRICE_BASELINE','COMMERCE_PRICE',
      $1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,'human',$6,$7
    )`,[
      JSON.stringify({entity_type:'RELEASE',entity_key:fixture.audit.release_ref}),
      JSON.stringify({release_ref:fixture.audit.release_ref,evidence_sha256:p.evidence_sha256,price_row_count:p.candidate_price_row_count}),
      JSON.stringify({contract_version:'commerce_price_baseline_adoption_v1',release_ref:fixture.audit.release_ref,canonical_product_ids:fixture.productIds,evidence_sha256:p.evidence_sha256,price_row_count:p.candidate_price_row_count}),
      JSON.stringify({mode:'explicit_compensating_change',preserve_audit_history:true}),
      JSON.stringify({expected_price_rows:fixture.audit.counts.clean_source_price_rows,payment_enabled:false,indexing_enabled:false}),
      actor,`rehearsal:${fixture.audit.release_ref}:${p.evidence_sha256}`,
    ])).rows[0]);
}
async function approve(id){
  return service(()=>db.query(
    'select * from public.feya_fn_approve_execution_request_v1($1,$2,$3,$4)',
    [id,'APPROVAL_REQUIRED',actor,'Isolated 205-product baseline rehearsal approval'],
  ));
}
async function execute(id){
  return service(async()=> (await db.query(
    'select public.feya_commerce_execute_price_baseline_adoption_v1($1) r',[id]
  )).rows[0].r);
}

test('isolated rehearsal mirrors the audited 205-product / 850-row clean lane',async()=>{
  assert.equal(fixture.productIds.length,205);
  assert.equal(fixture.priceRows.length,850);
  assert.equal(fixture.audit.counts.manual_override_products,2);

  const p=await preview();
  assert.equal(p.requested_product_count,205);
  assert.equal(p.candidate_product_count,205);
  assert.equal(p.candidate_price_row_count,850);
  assert.equal(p.already_ready_product_count,0);
  assert.equal(p.hold_product_count,0);
  assert.equal(p.manual_overrides_included,false);
  assert.equal(p.payment_enabled,false);
  assert.equal(p.indexing_enabled,false);
});

test('prepare stage creates one approval-required request without changing any price governance',async()=>{
  const p=await preview();
  prepared=await createRequest(p);
  assert.equal(prepared.request_status,'APPROVAL_REQUIRED');

  const status=(await db.query(`
    select
      count(*) filter(where review_status='approved')::int approved_prices,
      count(*) filter(where price_status='approved')::int exact_prices
    from public.feya_commerce_configuration_prices
  `)).rows[0];
  assert.deepEqual(status,{approved_prices:0,exact_prices:0});
  assert.equal(await commercialValueFingerprint(db),beforeFingerprint);
});

test('human approval plus executor moves all 850 rows to strict quote-ready governance',async()=>{
  await approve(prepared.execution_request_id);
  const result=await execute(prepared.execution_request_id);
  assert.equal(result.product_count,205);
  assert.equal(result.price_row_count,850);
  assert.equal(result.updated_price_rows,850);
  assert.equal(result.manual_overrides_included,false);
  assert.equal(result.offer_promotion_enabled,false);
  assert.equal(result.order_creation_enabled,false);
  assert.equal(result.payment_enabled,false);
  assert.equal(result.indexing_enabled,false);

  const gate=(await db.query(`
    select
      count(*)::int total,
      count(*) filter(
        where p.review_status='approved'
          and p.price_status='approved'
          and p.fallback_flag=false
          and p.public_price_amount>0
          and p.source_currency~'^[A-Z]{3}$'
          and c.review_status='approved'
          and c.is_public_candidate=true
          and c.is_sampler=false
      )::int strict_ready
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id
     and c.canonical_product_id=p.canonical_product_id
  `)).rows[0];
  assert.deepEqual(gate,{total:850,strict_ready:850});
});

test('rehearsal changes governance only; commercial values and stable IDs are byte-for-byte unchanged',async()=>{
  assert.equal(await commercialValueFingerprint(db),beforeFingerprint);
  const p=await preview();
  assert.equal(p.candidate_product_count,0);
  assert.equal(p.already_ready_product_count,205);
  assert.equal(p.hold_product_count,0);

  const receipt=(await db.query(`
    select receipt_status,result_json
    from public.feya_growth_execution_receipts_v1
    where execution_request_id=$1
  `,[prepared.execution_request_id])).rows[0];
  assert.equal(receipt.receipt_status,'SUCCEEDED');
  assert.equal(receipt.result_json.updated_price_rows,850);
});

test('production-only lanes remain outside the rehearsal by construction',async()=>{
  const manual=new Set(fixture.audit.manual_override_product_ids||[]);
  assert.equal(manual.size,2);
  assert.equal(fixture.productIds.some(id=>manual.has(id)),false);
  assert.equal(fixture.audit.production_mutation,false);
});
