import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {
  variantDependenciesSQL,variantMigrationSQL,commerceQuoteMigrationSQL,offerPromotionMigrationSQL,
  seedVariantProduct,variantTestIds as ids,saveBaseVariant,approveBaseConfiguration,
} from './helpers/offer-promotion.mjs';
const nativeURL=process.env.FEYA_TEST_DATABASE_URL;
const actor='70000000-0000-4000-8000-000000000041';
let db,base;
async function connect(){const u=new URL(nativeURL);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');
  const c=new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000});await c.connect();return c;}
before(async()=>{
  if(nativeURL){const c=await connect();db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0,'Dedicated empty DB required');}
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedVariantProduct(db);await db.exec(await variantMigrationSQL());base=await saveBaseVariant(db,actor);
  await db.exec(await commerceQuoteMigrationSQL());await db.exec(await offerPromotionMigrationSQL());await approveBaseConfiguration(db);
});
after(async()=>{await db?.close();});
async function service(fn,c=db){await c.query('set role service_role');try{return await fn(c);}finally{await c.query('reset role');}}
const payload=(requestId=randomUUID(),patch={})=>({contract_version:'commerce_offer_promotion_v1',request_id:requestId,canonical_product_id:ids.product,
  expected_variant_revision:1,expected_offer_revision:0,release_ref:'synthetic-release',max_quantity_per_line:4,variant_ids:[ids.variant],...patch});
const promote=(p,c=db,a=actor)=>service(async()=> (await c.query('select public.feya_commerce_promote_offer_v1($1,$2::jsonb) r',[a,JSON.stringify(p)])).rows[0].r,c);
const counts=async()=> (await db.query("select (select count(*)::int from public.feya_commerce_offer_revisions_v1) offers,(select count(*)::int from public.feya_commerce_offer_variant_items_v1) items,(select count(*)::int from public.feya_commerce_offer_promotion_receipts_v1) receipts,(select count(*)::int from public.feya_commerce_offer_promotion_outbox_v1) outbox")).rows[0];

test('promotion writer is security-definer only while service role has no direct offer table mutation',async()=>{
  const h=(await service(c=>c.query('select public.feya_commerce_offer_promotion_health_v1() h'))).rows[0].h;
  assert.equal(h.ready,true);assert.equal(h.direct_offer_table_write_enabled,false);assert.equal(h.payment_enabled,false);
  assert.equal((await db.query("select prosecdef from pg_proc where oid=to_regprocedure('public.feya_commerce_promote_offer_v1(uuid,jsonb)')")).rows[0].prosecdef,true);
  assert.equal((await db.query("select has_table_privilege('service_role','public.feya_commerce_offer_revisions_v1','INSERT,UPDATE,DELETE') allowed")).rows[0].allowed,false);
  for(const role of ['anon','authenticated']){await db.query('set role '+role);try{
    await assert.rejects(db.query('select public.feya_commerce_promote_offer_v1($1,$2::jsonb)',[actor,JSON.stringify(payload())]),/permission denied/);
  }finally{await db.query('reset role');}}
});
let firstPayload,firstReceipt;
test('reviewed exact configuration promotes one immutable active offer and canonical execution approval',async()=>{
  firstPayload=payload();firstReceipt=await promote(firstPayload);
  assert.equal(firstReceipt.offer_revision,1);assert.equal(firstReceipt.variant_count,1);assert.equal(firstReceipt.quote_ready,true);
  assert.deepEqual(await counts(),{offers:1,items:1,receipts:1,outbox:1});
  const item=(await db.query('select * from public.feya_commerce_offer_variant_items_v1 where offer_revision_id=$1',[firstReceipt.offer_revision_id])).rows[0];
  assert.equal(String(item.amount_minor),'12345');assert.equal(item.currency,'EUR');assert.equal(item.price_source,'configuration_base');
  const ex=(await db.query('select * from public.feya_growth_execution_requests_v1 where execution_request_id=$1',[firstReceipt.execution_request_id])).rows[0];
  assert.equal(ex.action_code,'PROMOTE_PRODUCT_OFFER');assert.equal(ex.request_status,'SUCCEEDED');assert.equal(ex.approved_by_user_id,actor);assert.equal(ex.approval_hash,ex.request_hash);
});
test('same request replays exact receipt and changed payload/actor conflict without new offer',async()=>{
  const replay=await promote(firstPayload);assert.equal(replay.replayed,true);assert.equal(replay.offer_revision_id,firstReceipt.offer_revision_id);
  await assert.rejects(promote({...firstPayload,max_quantity_per_line:5}),/offer_promotion_request_conflict/);
  await assert.rejects(promote(firstPayload,db,randomUUID()),/offer_promotion_request_conflict/);
  assert.deepEqual(await counts(),{offers:1,items:1,receipts:1,outbox:1});
});
test('new promotion requires both current variant revision and current offer revision',async()=>{
  const before=await counts();
  await assert.rejects(promote(payload(randomUUID(),{expected_variant_revision:2,expected_offer_revision:1})),/variant_revision_conflict/);
  await assert.rejects(promote(payload(randomUUID(),{expected_offer_revision:0})),/offer_revision_conflict/);
  assert.deepEqual(await counts(),before);
});
test('unapproved, fallback, missing or unsupported exact price evidence cannot promote',async()=>{
  const before=await counts();
  const states=[
    ["update public.feya_commerce_configuration_prices set review_status='needs_review' where configuration_price_id=$1",/price_not_approved/],
    ["update public.feya_commerce_configuration_prices set review_status='approved',price_status='draft' where configuration_price_id=$1",/price_not_exact/],
    ["update public.feya_commerce_configuration_prices set price_status='approved',fallback_flag=true where configuration_price_id=$1",/fallback_price_forbidden/],
    ["update public.feya_commerce_configuration_prices set fallback_flag=false,public_price_amount=null where configuration_price_id=$1",/public_price_invalid/],
    ["update public.feya_commerce_configuration_prices set public_price_amount=123.45,source_currency='ZZZ' where configuration_price_id=$1",/currency_unsupported/],
  ];
  for(const [sql,re] of states){await db.query(sql,[ids.config]);await assert.rejects(promote(payload(randomUUID(),{expected_offer_revision:1})),re);}
  await approveBaseConfiguration(db);assert.deepEqual(await counts(),before);
});
test('configuration approval is independent from price approval',async()=>{
  const before=await counts();await db.query("update public.feya_commerce_sellable_configurations set review_status='not_reviewed' where sellable_configuration_id=$1",[ids.parent]);
  await assert.rejects(promote(payload(randomUUID(),{expected_offer_revision:1})),/configuration_not_approved/);
  await db.query("update public.feya_commerce_sellable_configurations set review_status='approved' where sellable_configuration_id=$1",[ids.parent]);
  assert.deepEqual(await counts(),before);
});
test('explicit draft exception is held until a dedicated verified exception workflow exists',async()=>{
  const ctx=await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) r',[ids.product])).rows[0].r);
  const p={...base.payload,request_id:randomUUID(),expected_revision:ctx.current_revision,snapshot:{...structuredClone(ctx.snapshot),product_revision:ctx.current_revision+1}};
  p.snapshot.variants[0].pricing={mode:'exception_override',exception_id:randomUUID(),reason:'Synthetic exception pending verification',
    price:{...p.snapshot.configurations[0].base_price,quote_id:randomUUID(),price_revision:1,amount_minor:15000}};
  await service(c=>c.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb)',[actor,JSON.stringify(p)]));
  await assert.rejects(promote(payload(randomUUID(),{expected_variant_revision:2,expected_offer_revision:1})),/exception_price_not_ready/);
});
test('after restoring base pricing, second offer revision can promote and server quote binds to the new head',async()=>{
  const ctx=await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) r',[ids.product])).rows[0].r);
  const p={...base.payload,request_id:randomUUID(),expected_revision:ctx.current_revision,snapshot:{...structuredClone(ctx.snapshot),product_revision:ctx.current_revision+1}};
  p.snapshot.variants[0].pricing={mode:'configuration_base'};
  await service(c=>c.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb)',[actor,JSON.stringify(p)]));
  const second=await promote(payload(randomUUID(),{expected_variant_revision:3,expected_offer_revision:1}));
  assert.equal(second.offer_revision,2);
  const q=await service(c=>c.query('select public.feya_commerce_create_quote_v1($1::jsonb) r',[JSON.stringify({
    request_id:randomUUID(),canonical_product_id:ids.product,variant_id:ids.variant,configuration_price_id:ids.config,
    color_id:ids.gold,size_id:null,expected_product_revision:3,expected_offer_revision:2,quantity:2,
  })]));
  assert.equal(q.rows[0].r.line_amount_minor,24690);assert.equal(q.rows[0].r.payment_enabled,false);
});
test('historical offer/item/promotion receipts are immutable while the head advances',async()=>{
  await assert.rejects(db.query("update public.feya_commerce_offer_revisions_v1 set release_ref='x' where offer_revision=1"),/immutable/);
  await assert.rejects(db.query('delete from public.feya_commerce_offer_promotion_receipts_v1'),/immutable/);
  assert.equal((await db.query('select count(*)::int n from public.feya_commerce_offer_revisions_v1')).rows[0].n,2);
});
test('injected outbox failure rolls back offer, execution, event and receipt together',async()=>{
  const ctx=await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) r',[ids.product])).rows[0].r);
  const p={...base.payload,request_id:randomUUID(),expected_revision:ctx.current_revision,snapshot:{...structuredClone(ctx.snapshot),product_revision:ctx.current_revision+1}};
  await service(c=>c.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb)',[actor,JSON.stringify(p)]));
  const before=await counts(),request=payload(randomUUID(),{expected_variant_revision:4,expected_offer_revision:2});
  await db.exec("create function public.test_reject_offer_outbox() returns trigger language plpgsql as $$ begin raise exception 'injected offer outbox failure'; end $$;create trigger test_reject_offer_outbox before insert on public.feya_commerce_offer_promotion_outbox_v1 for each row execute function public.test_reject_offer_outbox();");
  try{await assert.rejects(promote(request),/injected offer outbox failure/);assert.deepEqual(await counts(),before);}
  finally{await db.exec('drop trigger test_reject_offer_outbox on public.feya_commerce_offer_promotion_outbox_v1;drop function public.test_reject_offer_outbox();');}
  const recovered=await promote(request);assert.equal(recovered.offer_revision,3);
});
test('native concurrent identical promotion requests create one offer revision and one receipt',{skip:!nativeURL},async()=>{
  const ctx=await service(async()=> (await db.query('select public.feya_commerce_read_variant_draft_v1($1) r',[ids.product])).rows[0].r);
  const p={...base.payload,request_id:randomUUID(),expected_revision:ctx.current_revision,snapshot:{...structuredClone(ctx.snapshot),product_revision:ctx.current_revision+1}};
  await service(c=>c.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb)',[actor,JSON.stringify(p)]));
  const before=await counts(),req=payload(randomUUID(),{expected_variant_revision:5,expected_offer_revision:3}),clients=await Promise.all([connect(),connect(),connect()]);
  try{const out=await Promise.all(clients.map(c=>promote(req,c)));assert.equal(out.filter(x=>!x.replayed).length,1);assert.equal(new Set(out.map(x=>x.offer_revision_id)).size,1);
    const after=await counts();assert.equal(after.offers,before.offers+1);assert.equal(after.receipts,before.receipts+1);}
  finally{await Promise.all(clients.map(c=>c.end()));}
});
