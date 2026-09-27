import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import {
  variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, variantTestIds as ids,
  prepareVariantIdentity, commerceQuoteMigrationSQL, seedApprovedOfferProjection,
} from './helpers/commerce-quote.mjs';

const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000041';
let db, offer;
async function connect(){
  const url=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.pathname,'/feya_test');
  const c=new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000});await c.connect();return c;
}
before(async()=>{
  if(nativeURL){const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0,'Dedicated empty DB required');}
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedVariantProduct(db);
  await db.exec(await variantMigrationSQL());
  await prepareVariantIdentity(db,actor);
  await db.exec(await commerceQuoteMigrationSQL());
  offer=await seedApprovedOfferProjection(db,{});
  await db.query('insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id) values($1,$2)',[ids.product,offer.offerRevisionId]);
});
after(async()=>{await db?.close();});
async function service(fn,c=db){await c.query('set role service_role');try{return await fn(c);}finally{await c.query('reset role');}}
const payload=(requestId=randomUUID(),patch={})=>({
  request_id:requestId,canonical_product_id:ids.product,variant_id:ids.variant,configuration_price_id:ids.config,
  color_id:ids.gold,size_id:null,expected_product_revision:1,expected_offer_revision:1,quantity:2,...patch,
});
const quote=(p,c=db)=>service(async()=> (await c.query('select public.feya_commerce_create_quote_v1($1::jsonb) result',[JSON.stringify(p)])).rows[0].result,c);
const count=async()=>Number((await db.query('select count(*) n from public.feya_commerce_quote_receipts_v1')).rows[0].n);

test('quote schema is private and service role can insert receipts but cannot promote an offer',async()=>{
  const health=(await service(c=>c.query('select public.feya_commerce_quote_health_v1() h'))).rows[0].h;
  assert.equal(health.ready,true);assert.equal(health.offer_projection_write_enabled,false);assert.equal(health.order_creation_enabled,false);
  for(const role of ['anon','authenticated']){
    await db.query('set role '+role);
    try{
      await assert.rejects(db.query('select * from public.feya_commerce_offer_revisions_v1'),/permission denied/);
      await assert.rejects(db.query('select public.feya_commerce_create_quote_v1($1::jsonb)',[JSON.stringify(payload())]),/permission denied/);
    }finally{await db.query('reset role');}
  }
  assert.equal((await db.query("select has_table_privilege('service_role','public.feya_commerce_offer_revisions_v1','INSERT,UPDATE,DELETE') allowed")).rows[0].allowed,false);
});

let firstPayload,firstReceipt;
test('exact active offer tuple creates an immutable server-derived quote receipt',async()=>{
  firstPayload=payload();firstReceipt=await quote(firstPayload);
  assert.equal(firstReceipt.replayed,false);assert.equal(firstReceipt.unit_amount_minor,12345);assert.equal(firstReceipt.line_amount_minor,24690);
  assert.equal(firstReceipt.currency,'EUR');assert.equal(firstReceipt.variant_id,ids.variant);
  assert.equal(firstReceipt.order_creation_enabled,false);assert.equal(firstReceipt.payment_enabled,false);assert.equal(await count(),1);
});
test('same request is idempotent and changed payload with reused request id conflicts',async()=>{
  const replay=await quote(firstPayload);assert.equal(replay.replayed,true);assert.equal(replay.quote_receipt_id,firstReceipt.quote_receipt_id);
  await assert.rejects(quote({...firstPayload,quantity:3}),/quote_request_conflict/);assert.equal(await count(),1);
});
test('browser monetary/capability fields and malformed request types are rejected before any write',async()=>{
  const before=await count();
  for(const p of [
    {...payload(),unit_amount_minor:1},{...payload(),currency:'USD'},{...payload(),orderable:true},
    {...payload(),quantity:'2'},{...payload(),color_id:'bad'},
  ]) await assert.rejects(quote(p),/quote_request_invalid/);
  assert.equal(await count(),before);
});
test('stale offer/product revisions, wrong tuple and excessive quantity fail closed',async()=>{
  const before=await count();
  for(const [patch,code] of [
    [{expected_offer_revision:2},/quote_offer_revision_conflict/],
    [{expected_product_revision:2},/quote_product_revision_conflict/],
    [{variant_id:randomUUID()},/quote_variant_not_orderable/],
    [{configuration_price_id:randomUUID()},/quote_variant_conflict/],
    [{quantity:5},/quote_quantity_exceeds_offer_limit/],
  ]) await assert.rejects(quote(payload(randomUUID(),patch)),code);
  assert.equal(await count(),before);
});
test('hold pointer blocks quotes without deleting historical active offer or receipts',async()=>{
  const holdId='80000000-0000-4000-8000-000000000042';
  await seedApprovedOfferProjection(db,{offerRevisionId:holdId,priceQuoteId:'90000000-0000-4000-8000-000000000042',offerRevision:2,status:'hold'});
  await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2',[holdId,ids.product]);
  try{await assert.rejects(quote(payload(randomUUID(),{expected_offer_revision:2})),/quote_offer_not_orderable/);}
  finally{await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2',[offer.offerRevisionId,ids.product]);}
  assert.equal(await count(),1);
});
test('injected receipt failure rolls back and retry with same request id can recover',async()=>{
  const p=payload(),before=await count();
  await db.exec("create function public.test_reject_quote_receipt() returns trigger language plpgsql as $$ begin raise exception 'injected quote receipt failure'; end $$;create trigger test_reject_quote_receipt before insert on public.feya_commerce_quote_receipts_v1 for each row execute function public.test_reject_quote_receipt();");
  try{await assert.rejects(quote(p),/injected quote receipt failure/);assert.equal(await count(),before);}
  finally{await db.exec('drop trigger test_reject_quote_receipt on public.feya_commerce_quote_receipts_v1;drop function public.test_reject_quote_receipt();');}
  const recovered=await quote(p);assert.equal(recovered.replayed,false);assert.equal(await count(),before+1);
});
test('offer/item/receipt history is immutable; only the mutable head can point to a new governed revision',async()=>{
  await assert.rejects(db.query("update public.feya_commerce_offer_revisions_v1 set approval_ref='changed' where offer_revision_id=$1",[offer.offerRevisionId]),/immutable/);
  await assert.rejects(db.query("delete from public.feya_commerce_offer_variant_items_v1 where offer_revision_id=$1",[offer.offerRevisionId]),/immutable/);
  await assert.rejects(db.query("update public.feya_commerce_quote_receipts_v1 set quantity=9 where quote_receipt_id=$1",[firstReceipt.quote_receipt_id]),/immutable/);
});
test('permission drift closes the quote health gate before new receipt writes',async()=>{
  const p=payload(),before=await count();
  await db.exec('grant insert on public.feya_commerce_offer_revisions_v1 to service_role');
  try{await assert.rejects(quote(p),/quote_contract_not_ready/);assert.equal(await count(),before);}
  finally{await db.exec('revoke insert on public.feya_commerce_offer_revisions_v1 from service_role');}
});
test('native concurrent identical requests commit one quote receipt',{skip:!nativeURL},async()=>{
  const p=payload(),before=await count(),clients=await Promise.all([connect(),connect(),connect(),connect()]);
  try{
    const out=await Promise.all(clients.map(c=>quote(p,c)));
    assert.equal(out.filter(r=>r.replayed===false).length,1);
    assert.equal(new Set(out.map(r=>r.quote_receipt_id)).size,1);
    assert.equal(await count(),before+1);
  }finally{await Promise.all(clients.map(c=>c.end()));}
});
