import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, variantDraftRequest, variantTestIds as ids } from './helpers/variant-draft.mjs';
import { VARIANT_DRAFT_SCHEMA, parseVariantDraftInput } from '../../lib/commerceVariantDraftSchema.ts';
const nativeURL = process.env.FEYA_TEST_DATABASE_URL;
const actor = '70000000-0000-4000-8000-000000000041';
let db, first, receipt, historical;
async function connect() {
  const url = new URL(nativeURL); assert.ok(['localhost','127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname,'/feya_test');
  const c = new pg.Client({connectionString:nativeURL,statement_timeout:15000,connectionTimeoutMillis:5000}); await c.connect(); return c;
}
before(async () => {
  if (nativeURL) { const c=await connect(); db={query:(s,p)=>c.query(s,p),exec:s=>c.query(s),close:()=>c.end()}; }
  else db=new PGlite();
  await db.exec(await variantDependenciesSQL({pglite:!nativeURL}));
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await seedVariantProduct(db); await db.exec(await variantMigrationSQL());
  historical=(await db.query('select to_jsonb(p) row from public.feya_commerce_configuration_prices p where configuration_price_id=$1',[ids.config])).rows[0].row;
});
after(async()=>{await db?.close();});
async function service(fn,c=db){await c.query('set role service_role');try{return await fn(c);}finally{await c.query('reset role');}}
const read = (c=db) => service(async()=> (await c.query('select public.feya_commerce_read_variant_draft_v1($1) result',[ids.product])).rows[0].result,c);
const save = (p,c=db,a=actor) => service(async()=> (await c.query('select public.feya_commerce_save_variant_draft_v1($1,$2::jsonb) result',[a,JSON.stringify(p)])).rows[0].result,c);
async function next(){return variantDraftRequest(await read(),randomUUID());}
async function counts(){return (await db.query("select (select count(*) from public.feya_commerce_variant_revisions_v1)::int revisions,(select count(*) from public.feya_commerce_variant_save_receipts_v1)::int receipts,(select count(*) from public.feya_growth_execution_requests_v1)::int executions,(select count(*) from public.feya_growth_change_events_v1)::int events,(select count(*) from public.feya_commerce_variant_draft_outbox_v1)::int outbox")).rows[0];}

test('fresh observed dependencies migrate; shared SQL/TS shape and private boundary agree',async()=>{
  assert.doesNotMatch(await variantDependenciesSQL({existingAuth:true}),/create (?:schema|table) if not exists auth/i);
  assert.deepEqual((await db.query('select public.feya_commerce_variant_draft_schema_v1() s')).rows[0].s,VARIANT_DRAFT_SCHEMA);
  const h=(await service(c=>c.query('select public.feya_commerce_variant_draft_health_v1() h'))).rows[0].h;assert.equal(h.ready,true);
  for(const role of ['anon','authenticated']){
    await db.query('set role '+role);
    try{await assert.rejects(db.query('select public.feya_commerce_read_variant_draft_v1($1)',[ids.product]),/permission denied/);
      await assert.rejects(db.query('select * from public.feya_commerce_variant_revisions_v1'),/permission denied/);}
    finally{await db.query('reset role');}
  }
});
test('atomic save records a private draft, canonical execution, change event and pending outbox',async()=>{
  first=await next(); parseVariantDraftInput(first,ids.product); receipt=await save(first);
  assert.equal(receipt.product_revision,1); assert.equal(receipt.replayed,false); assert.equal(receipt.can_publish,false); assert.equal(receipt.can_enable_checkout,false);
  assert.deepEqual((await read()).snapshot,first.snapshot);
  assert.deepEqual(await counts(),{revisions:1,receipts:1,executions:1,events:1,outbox:1});
  const ex=(await db.query('select * from public.feya_growth_execution_requests_v1 where execution_request_id=$1',[receipt.execution_request_id])).rows[0];
  assert.equal(ex.action_code,'SAVE_PRODUCT_VARIANT_DRAFT'); assert.equal(ex.request_status,'SUCCEEDED'); assert.equal(ex.approved_by_user_id,actor); assert.equal(ex.request_hash,ex.approval_hash);
});
test('retry after commit returns original IDs even after revision advances; changed payload or actor conflicts',async()=>{
  const p=await next(); p.snapshot.colors[0].label='Glossy Gold'; await save(p);
  const replay=await save(first); assert.equal(replay.replayed,true); assert.equal(replay.change_event_id,receipt.change_event_id); assert.equal(replay.product_revision,1);
  await assert.rejects(save({...first,expected_revision:1}),/variant_draft_scope_invalid/);
  const changed=structuredClone(first);changed.snapshot.colors[0].label='Changed';await assert.rejects(save(changed),/variant_request_conflict/);
  await assert.rejects(save(first,db,randomUUID()),/variant_request_conflict/);
  assert.equal((await counts()).receipts,2);
});
test('two colors share one quote and a rename preserves quote and variant identities',async()=>{
  const p=await next(); p.snapshot.colors.push({id:ids.silver,label:'Silver',state:'confirmed'});
  p.snapshot.variants.push({...structuredClone(p.snapshot.variants[0]),variant_id:ids.secondVariant,color_id:ids.silver});
  await save(p); assert.equal((await db.query('select count(*)::int n from public.feya_commerce_variant_quotes_v1')).rows[0].n,1);
  assert.equal((await read()).snapshot.configurations[0].base_price.quote_id,ids.quote);
});
test('stale editor cannot overwrite another revision',async()=>{
  const old=await next(),winner=structuredClone(old);winner.request_id=randomUUID();winner.snapshot.colors[0].label='Winner';await save(winner);
  await assert.rejects(save(old),/variant_revision_conflict/);assert.equal((await read()).snapshot.colors[0].label,'Winner');
});
test('unknown fields, forged approval, active offers, verified price, string revisions and malformed IDs are rejected in SQL',async()=>{
  const good=await next(),before=await counts();
  const mutations=[p=>p.actor_user_id=actor,p=>p.can_publish=true,p=>p.snapshot.variants[0].state='active',p=>p.snapshot.configurations[0].base_price.status='verified_exact',p=>p.expected_revision=String(p.expected_revision),p=>p.snapshot.colors[0].id='bad',p=>p.snapshot.colors[0].state='anything'];
  for(const mutate of mutations){const p=structuredClone(good);mutate(p);await assert.rejects(save(p),/variant_draft_shape_invalid/);assert.throws(()=>parseVariantDraftInput(p,ids.product));}
  assert.deepEqual(await counts(),before);
});
test('price/parent IDs cannot be borrowed from another product; changed source rows cause conflict',async()=>{
  const p=await next();p.snapshot.canonical_product_id=ids.otherProduct;const source=(await service(c=>c.query('select public.feya_commerce_read_variant_draft_v1($1) r',[ids.otherProduct]))).rows[0].r;p.source_bindings.product_fingerprint=source.source_bindings.product_fingerprint;p.expected_revision=0;p.snapshot.product_revision=1;
  await assert.rejects(save(p),/variant_configuration_scope_invalid/);
  const stale=await next();await db.query("update public.feya_commerce_configuration_prices set notes='changed source' where configuration_price_id=$1",[ids.config]);
  await assert.rejects(save(stale),/variant_source_conflict/);
  await db.query('update public.feya_commerce_configuration_prices set notes=$1,updated_at=$2 where configuration_price_id=$3',[historical.notes,historical.updated_at,ids.config]);
});
test('tuple/attribute identities cannot be reassigned, duplicated or deleted instead of retired',async()=>{
  const good=await next(),before=await counts();
  const mutations=[p=>p.snapshot.variants.pop(),p=>p.snapshot.colors.pop(),p=>p.snapshot.variants[0].color_id=ids.silver,p=>p.snapshot.variants.push({...p.snapshot.variants[0],variant_id:randomUUID()}),p=>p.snapshot.colors.push({...p.snapshot.colors[0]})];
  for(const mutate of mutations){const p=structuredClone(good);p.request_id=randomUUID();mutate(p);await assert.rejects(save(p),/variant_/);}
  assert.deepEqual(await counts(),before);
});
test('unselected foreign source bindings are rejected and broken parent joins cannot silently omit prices',async()=>{
  const p=await next(),before=await counts();
  p.source_bindings.configurations.push({...p.source_bindings.configurations[0],configuration_price_id:randomUUID()});
  await assert.rejects(save(p),/variant_configuration_scope_invalid/);assert.deepEqual(await counts(),before);
  await db.query('update public.feya_commerce_sellable_configurations set canonical_product_id=$1 where sellable_configuration_id=$2',[ids.otherProduct,ids.parent]);
  try{await assert.rejects(read(),/variant_configuration_scope_invalid/);}
  finally{await db.query('update public.feya_commerce_sellable_configurations set canonical_product_id=$1 where sellable_configuration_id=$2',[ids.product,ids.parent]);}
});
test('explicit exception price stays a draft and retiring a color retains identity and shared base price',async()=>{
  const p=await next(),base=p.snapshot.configurations[0].base_price;
  p.snapshot.variants[1].pricing={mode:'exception_override',exception_id:randomUUID(),reason:'Explicit draft proposal only',price:{...base,quote_id:randomUUID(),price_revision:1,amount_minor:15000}};
  await save(p);const q=await next();q.snapshot.colors[1].state='retired';q.snapshot.variants[1].state='retired';
  await save(q);const r=await read();assert.equal(r.snapshot.variants[1].variant_id,ids.secondVariant);
  assert.equal(r.snapshot.configurations[0].base_price.quote_id,ids.quote);assert.equal(r.can_enable_checkout,false);
  assert.equal((await db.query('select count(*)::int n from public.feya_commerce_variant_quotes_v1')).rows[0].n,2);
});
test('injected final outbox failure rolls back every write and the same request can recover',async()=>{
  const p=await next(),before=await counts();p.snapshot.colors[0].label='After recovery';
  await db.exec("create function public.test_reject_variant_outbox() returns trigger language plpgsql as $$ begin raise exception 'injected variant outbox failure'; end $$;create trigger test_reject_variant_outbox before insert on public.feya_commerce_variant_draft_outbox_v1 for each row execute function public.test_reject_variant_outbox();");
  try{await assert.rejects(save(p),/injected variant outbox/);assert.deepEqual(await counts(),before);}
  finally{await db.exec('drop trigger test_reject_variant_outbox on public.feya_commerce_variant_draft_outbox_v1;drop function public.test_reject_variant_outbox();');}
  await save(p);assert.equal((await read()).snapshot.colors[0].label,'After recovery');
});
test('permissions or capability drift close both reader and writer without partial records',async()=>{
  const p=await next(),before=await counts();
  await db.exec('grant select on public.feya_commerce_variant_revisions_v1 to anon');
  try{await assert.rejects(save(p),/variant_contract_not_ready/);await assert.rejects(read(),/variant_contract_not_ready/);assert.deepEqual(await counts(),before);}
  finally{await db.exec('revoke select on public.feya_commerce_variant_revisions_v1 from anon');}
  await db.exec("update public.feya_growth_registry_items_v1 set active_flag=false where item_code='SAVE_PRODUCT_VARIANT_DRAFT'");
  try{await assert.rejects(save(p),/variant_contract_not_ready/);assert.deepEqual(await counts(),before);}
  finally{await db.exec("update public.feya_growth_registry_items_v1 set active_flag=true where item_code='SAVE_PRODUCT_VARIANT_DRAFT'");}
});
test('native concurrent duplicate requests commit one revision/receipt/event', {skip:!nativeURL}, async()=>{
  const p=await next(),before=await counts(),clients=await Promise.all([connect(),connect()]);
  try{const out=await Promise.all(clients.map(c=>save(p,c)));assert.deepEqual(out.map(r=>r.replayed).sort(),[false,true]);assert.equal(out[0].change_event_id,out[1].change_event_id);assert.equal((await counts()).revisions,before.revisions+1);}
  finally{await Promise.all(clients.map(c=>c.end()));}
});
test('native concurrent edits to one revision produce one success and one conflict', {skip:!nativeURL}, async()=>{
  const p=await next(),other=structuredClone(p);other.request_id=randomUUID();other.snapshot.colors[0].label='Concurrent other';const clients=await Promise.all([connect(),connect()]);
  try{const out=await Promise.allSettled([save(p,clients[0]),save(other,clients[1])]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert.match(String(out.find(r=>r.status==='rejected').reason),/variant_revision_conflict/);}
  finally{await Promise.all(clients.map(c=>c.end()));}
});
test('original source prices and IDs stay intact; historical revisions cannot be updated even by table owner',async()=>{
  const current=(await db.query('select to_jsonb(p) row from public.feya_commerce_configuration_prices p where configuration_price_id=$1',[ids.config])).rows[0].row;
  for(const key of Object.keys(historical).filter(k=>k!=='updated_at'))assert.deepEqual(current[key],historical[key]);
  await assert.rejects(db.query("update public.feya_commerce_variant_revisions_v1 set snapshot='{}' where product_revision=1"),/immutable/);
  await assert.rejects(db.query('delete from public.feya_commerce_variant_quotes_v1'),/immutable/);
});
test('operational rollback disables the writer while preserving history and recoverable request receipts',async()=>{
  const before=await counts(),p=await next();
  await db.exec(await readFile(new URL('../../supabase/rollback/product_variant_draft_v1_disable.sql',import.meta.url),'utf8'));
  await assert.rejects(save(p),/permission denied/);assert.deepEqual(await counts(),before);
  await db.exec("begin;update public.feya_growth_registry_items_v1 set active_flag=true where registry_type='action_capability' and item_code='SAVE_PRODUCT_VARIANT_DRAFT' and version_no=1;grant execute on function public.feya_commerce_variant_draft_health_v1(),public.feya_commerce_read_variant_draft_v1(uuid),public.feya_commerce_save_variant_draft_v1(uuid,jsonb) to service_role;commit;");
  assert.equal((await save(first)).change_event_id,receipt.change_event_id);assert.deepEqual(await counts(),before);
});
