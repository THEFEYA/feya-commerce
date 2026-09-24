import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServerClient } from '@supabase/ssr';
import { variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, variantDraftRequest, variantTestIds as ids } from '../search-db/helpers/variant-draft.mjs';

/** Actual Auth cookie -> Next route -> PostgREST -> transaction; all data and prices synthetic. */
export async function verifyVariantDraftRuntime({ db, browser, ownerPage, env, out, check, report, service, outsider, url, anon, otherEmail, password }) {
  assert.ok(['localhost','127.0.0.1'].includes(db.connectionParameters.host));
  const base='http://127.0.0.1:3003',path='/api/admin/products/'+ids.product+'/variants';
  let server,log='';
  const count=async()=> (await db.query("select (select count(*) from public.feya_commerce_variant_revisions_v1)::int revisions,(select count(*) from public.feya_commerce_variant_save_receipts_v1)::int receipts,(select count(*) from public.feya_commerce_variant_draft_outbox_v1)::int outbox")).rows[0];
  const read=async()=>{const r=await ownerPage.request.get(base+path);assert.equal(r.status(),200);assert.match(r.headers()['cache-control'],/no-store/);return r.json();};
  const post=async(body,extraHeaders={})=>{const r=await ownerPage.request.post(base+path,{data:body,headers:{Origin:base,...extraHeaders}});return {status:r.status(),body:await r.json()};};
  try {
    await check('Variant draft dependencies and private RPC restore on real Supabase',async()=>{
      const existing=(await db.query("select tablename from pg_tables where schemaname='public'")).rows.map(r=>r.tablename);
      await db.query(await variantDependenciesSQL({existing,existingAuth:true}));await db.query(await variantMigrationSQL());await seedVariantProduct(db);
      await db.query("notify pgrst,'reload schema'");
      let ready=false;for(let i=0;i<50;i++){const r=await service.rpc('feya_commerce_variant_draft_health_v1');if(!r.error&&r.data?.ready){ready=true;break;}await new Promise(r=>setTimeout(r,100));}
      assert.ok(ready,'Private variant RPC not available');
    });
    const activeEnv={...env,FEYA_PRODUCT_VARIANT_DRAFT_ENABLED:'true'};
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3003'],{env:activeEnv,stdio:['ignore','pipe','pipe']});
    server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
    let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/admin/login')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
    await check('Variant route denies anonymous access, default-off writes and foreign origins',async()=>{
      const r=await fetch(base+path);assert.equal(r.status,401);
      assert.equal((await ownerPage.request.get('http://127.0.0.1:3000'+path)).status(),423);
      const body=variantDraftRequest(await read(),randomUUID());
      assert.equal((await post(body,{Origin:'https://untrusted.example'})).status,403);
      assert.equal((await post(body,{Origin:'https://127.0.0.1:3003'})).status,403);
      assert.equal((await post(body,{Origin:'null'})).status,403);
      assert.equal((await ownerPage.request.post(base+path,{data:body})).status(),403);
      assert.equal((await count()).revisions,0);
    });
    await check('Authenticated outsider cannot save variants or bypass the server through private RPC',async()=>{
      const jar=new Map(),client=createServerClient(url,anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});
      assert.equal((await client.auth.signInWithPassword({email:otherEmail,password})).error,null);
      const context=await browser.newContext();await context.addCookies([...jar].map(([name,value])=>({name,value,url:base})));
      const body=variantDraftRequest(await read(),randomUUID());
      try{const r=await context.request.post(base+path,{data:body,headers:{Origin:base}});assert.equal(r.status(),403);}
      finally{await context.close();}
      for(const [name,args] of [['feya_commerce_read_variant_draft_v1',{p_product_id:ids.product}],['feya_commerce_save_variant_draft_v1',{p_actor_user_id:randomUUID(),p_payload:body}]]){
        const r=await outsider.rpc(name,args);assert.ok(r.error);assert.equal(r.status,403);
      }
      assert.equal((await count()).revisions,0);
    });
    let first,receipt;
    await check('Authenticated variant save and reload preserve shared configuration price and draft-only flags',async()=>{
      first=variantDraftRequest(await read(),randomUUID());
      first.snapshot.colors.push({id:ids.silver,label:'Silver',state:'confirmed'});
      first.snapshot.variants.push({...first.snapshot.variants[0],variant_id:ids.secondVariant,color_id:ids.silver});
      const r=await post(first);assert.equal(r.status,201,JSON.stringify(r.body));receipt=r.body;
      assert.equal(receipt.can_enable_checkout,false);assert.equal(receipt.can_publish,false);assert.equal(receipt.can_index,false);
      assert.deepEqual((await read()).snapshot,first.snapshot);assert.equal((await db.query('select count(*)::int n from public.feya_commerce_variant_quotes_v1')).rows[0].n,1);
    });
    await check('Variant same-key retries reuse the committed receipt; forged actor and approval fields are rejected',async()=>{
      const replay=await post(first);assert.equal(replay.status,200);assert.equal(replay.body.change_event_id,receipt.change_event_id);
      for(const patch of [{actor_user_id:randomUUID()},{can_publish:true}])assert.equal((await post({...first,...patch})).status,422);
      const active=structuredClone(first);active.snapshot.variants[0].state='active';assert.equal((await post(active)).status,422);
      const fakePrice=structuredClone(first);fakePrice.snapshot.configurations[0].base_price.status='verified_exact';assert.equal((await post(fakePrice)).status,422);
      const changed=structuredClone(first);changed.snapshot.colors[0].label='Changed';assert.equal((await post(changed)).status,409);
      assert.equal((await count()).revisions,1);
    });
    await check('Concurrent authenticated variant edits return one success and one stale-revision conflict',async()=>{
      const one=variantDraftRequest(await read(),randomUUID()),two=structuredClone(one);two.request_id=randomUUID();two.snapshot.colors[0].label='Other tab';
      const results=await Promise.all([post(one),post(two)]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal((await count()).revisions,2);
    });
    await check('Variant outbox failure rolls back the actual API transaction and same-key retry succeeds',async()=>{
      const p=variantDraftRequest(await read(),randomUUID()),before=await count();
      await db.query("create function public.runtime_reject_variant_outbox() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'injected variant outbox'; end $$;create trigger runtime_reject_variant_outbox before insert on public.feya_commerce_variant_draft_outbox_v1 for each row execute function public.runtime_reject_variant_outbox();");
      try{assert.equal((await post(p)).status,503);assert.deepEqual(await count(),before);}
      finally{await db.query('drop trigger runtime_reject_variant_outbox on public.feya_commerce_variant_draft_outbox_v1;drop function public.runtime_reject_variant_outbox();');}
      assert.equal((await post(p)).status,201);assert.equal((await read()).current_revision,3);
    });
    await check('Variant permission drift closes the actual API writer; source prices and IDs stay unchanged',async()=>{
      const p=variantDraftRequest(await read(),randomUUID()),before=await count();await db.query('grant select on public.feya_commerce_variant_quotes_v1 to anon');
      try{assert.equal((await post(p)).status,503);assert.deepEqual(await count(),before);}finally{await db.query('revoke select on public.feya_commerce_variant_quotes_v1 from anon');}
      const source=(await db.query('select configuration_price_id,source_amount::text,public_price_amount::text,price_status from public.feya_commerce_configuration_prices where configuration_price_id=$1',[ids.config])).rows[0];
      assert.equal(source.configuration_price_id,ids.config);assert.equal(Number(source.source_amount),123.45);assert.equal(Number(source.public_price_amount),123.45);assert.equal(source.price_status,'draft');
      assert.equal((await db.query("select count(*)::int n from public.feya_commerce_variant_draft_outbox_v1 where delivery_state='pending'")).rows[0].n,3);
    });
    report.variant_draft_runtime_pass=true;
    report.limitations.push('Variant writer uses synthetic catalog/prices and real isolated Auth/PostgREST transactions. Editor UI, hosted apply, quote approval and release/outbox consumption remain separate.');
  } finally {
    for(const value of [env.SUPABASE_SERVICE_ROLE_KEY,env.NEXT_PUBLIC_SUPABASE_ANON_KEY])if(value)log=log.replaceAll(value,'[redacted]');
    await writeFile(join(out,'variant-draft-runtime.log'),log);
    if(server){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL');}
  }
}
