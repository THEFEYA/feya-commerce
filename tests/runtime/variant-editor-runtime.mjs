import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { variantTestIds as ids } from '../search-db/helpers/variant-draft.mjs';

/** Actual Product/Growth UI, cookie Auth, API and DB. Only the fact-queue fixture is synthetic projection. */
export async function verifyVariantEditorRuntime({db,ownerPage,base,out,check,report,service}) {
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
  const product=ids.otherProduct,parent='20000000-0000-4000-8000-000000000042',config='30000000-0000-4000-8000-000000000042';
  const api=base+'/api/admin/products/'+product+'/variants',url=base+'/admin/products/'+product;
  const page=await ownerPage.context().newPage(),other=await ownerPage.context().newPage(),growth=await ownerPage.context().newPage(),errors=[];
  for(const p of [page,other,growth]){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',dialog=>dialog.accept());}
  const editor=p=>p.getByTestId('variant-editor');
  const openGrowthWithKeyboard=async(mode)=>{
    const trigger=growth.getByRole('button',{name:'Разобрать',exact:true});await trigger.scrollIntoViewIfNeeded();
    const hit=await trigger.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {mode:el.closest('table')?'table':'other',hitTag:target?.tagName,clickCovered:!(target===el||el.contains(target)),viewport:{width:innerWidth,height:innerHeight}};});
    report.legacy_growth_trigger_hit_tests??={};report.legacy_growth_trigger_hit_tests[mode]=hit;
    await growth.screenshot({path:join(out,`variant-growth-entry-${mode}.png`),fullPage:true});
    // Actual keyboard activation, never force-click through a covered control. Keep the observed legacy layout intact.
    await trigger.focus();await trigger.press('Enter');await growth.getByRole('dialog').waitFor();
  };
  const revision=async(p,n)=>p.locator(`[data-testid="variant-editor-revision"][data-revision="${n}"]`).waitFor();
  const read=async()=>{const r=await ownerPage.request.get(api);assert.equal(r.status(),200);return r.json();};
  const save=async(p,n)=>{await editor(p).getByRole('button',{name:'Сохранить варианты',exact:true}).click();await revision(p,n);await editor(p).getByRole('status').filter({hasText:'Сохранено и проверено'}).waitFor();};
  const selectTuple=async(color)=>{await editor(page).getByLabel('Комплектация сочетания',{exact:true}).selectOption(config);await editor(page).getByLabel('Цвет сочетания',{exact:true}).selectOption({label:color});await editor(page).getByLabel('Размер сочетания',{exact:true}).selectOption({label:'M'});await editor(page).getByRole('button',{name:'Добавить сочетание',exact:true}).click();};
  try {
    await check('Existing Product page hosts editor with observed builder view restored and private synthetic Growth queue fixture',async()=>{
      assert.ok((await db.query("select to_regclass('public.feya_commerce_v_step6_product_builder_detail') r")).rows[0].r);
      await db.query('update public.feya_commerce_product_drafts set draft_site_title=$1 where canonical_product_id=$2',['Synthetic variant editor product',product]);
      await db.query("insert into public.feya_commerce_sellable_configurations(sellable_configuration_id,canonical_product_id,configuration_name,normalized_key) values($1,$2,'Synthetic Full Set','editor-full-set')",[parent,product]);
      await db.query("insert into public.feya_commerce_configuration_prices(configuration_price_id,canonical_product_id,sellable_configuration_id,source_amount,source_currency,public_price_amount,review_status,price_status) values($1,$2,$3,222.22,'EUR',222.22,'not_reviewed','draft')",[config,product,parent]);
      assert.equal((await db.query("select to_regclass('public.feya_commerce_v_product_fact_review_queue_safe_v1') r")).rows[0].r,null,'Never replace an observed reader with a synthetic fixture');
      await db.query(`create view public.feya_commerce_v_product_fact_review_queue_safe_v1 with(security_invoker=true) as select
        '80000000-0000-4000-8000-000000000042'::uuid fact_review_id,canonical_product_id,10::integer issue_priority,draft_site_title current_title,
        null::text final_primary_part,null::text final_product_type,null::text final_material_primary,null::text final_color_primary,
        '["COLOR_UNRESOLVED"]'::jsonb issue_codes_json,'pending'::text review_status,'unresolved'::text resolution_status,updated_at
        from public.feya_commerce_product_drafts where canonical_product_id='${product}'::uuid;
        revoke all on public.feya_commerce_v_product_fact_review_queue_safe_v1 from public,anon,authenticated;
        grant select on public.feya_commerce_v_product_fact_review_queue_safe_v1 to service_role;
        notify pgrst,'reload schema';`);
      let ready=false;for(let i=0;i<40;i++){const r=await service.from('feya_commerce_v_product_fact_review_queue_safe_v1').select('*');if(!r.error&&r.data?.length===1){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
      await page.goto(url+'#product-variants');await revision(page,0);assert.equal((await read()).snapshot,null);
    });
    let first,second;
    await check('Actual editor initializes explicit attributes and one tuple; save reloads the same draft without choosing a price',async()=>{
      await editor(page).getByLabel('Исходная комплектация',{exact:true}).selectOption(config);await editor(page).getByRole('button',{name:'Добавить комплектацию',exact:true}).click();
      for(const label of ['Gold','Silver']){await editor(page).getByLabel('Новый цвет',{exact:true}).fill(label);await editor(page).getByRole('button',{name:'Добавить цвет',exact:true}).click();}
      await editor(page).getByLabel('Новый размер',{exact:true}).fill('M');await editor(page).getByRole('button',{name:'Добавить размер',exact:true}).click();
      assert.equal(await editor(page).locator('[data-variant-id]').count(),0);await selectTuple('Gold');await editor(page).locator('[data-variant-id]').waitFor();await save(page,1);
      first=await read();assert.equal(first.snapshot.variants.length,1);assert.equal(first.snapshot.colors.length,2);assert.equal(first.snapshot.configurations.length,1);
      assert.equal(first.snapshot.configurations[0].base_price.amount_minor,null);assert.equal(first.snapshot.configurations[0].base_price.status,'unverified');
      await page.reload();await revision(page,1);assert.equal(await editor(page).getByLabel('Цвет 1',{exact:true}).inputValue(),'Gold');
      assert.equal(await editor(page).locator('[data-variant-id]').getAttribute('data-variant-id'),first.snapshot.variants[0].variant_id);
    });
    await check('Adding a second color tuple keeps one price; keyboard-opened Growth drawer reads the same revision and hash',async()=>{
      await selectTuple('Silver');await save(page,2);second=await read();assert.equal(second.snapshot.variants.length,2);
      assert.deepEqual(second.snapshot.configurations,first.snapshot.configurations);
      assert.equal((await db.query('select count(*)::int n from public.feya_commerce_variant_quotes_v1 where canonical_product_id=$1',[product])).rows[0].n,1);
      await growth.goto(base+'/admin/product-facts-review');await openGrowthWithKeyboard('enabled');
      const rev=growth.locator('[data-testid="variant-summary-revision"][data-revision="2"]');await rev.waitFor();assert.equal(await rev.getAttribute('data-snapshot-hash'),second.snapshot_sha256);
      assert.match(await growth.getByTestId('variant-summary').innerText(),/Gold, Silver/);assert.equal(await growth.getByRole('button',{name:'Сохранить варианты',exact:true}).count(),0);
      await growth.screenshot({path:join(out,'variant-growth-summary.png'),fullPage:true});await growth.getByRole('button',{name:'Закрыть',exact:true}).click();
    });
    await check('Two real editor tabs retain the losing edits and require explicit reload after conflict',async()=>{
      await other.goto(url);await revision(other,2);
      await editor(page).getByLabel('Цвет 1',{exact:true}).fill('Glossy Gold');await editor(other).getByLabel('Цвет 2',{exact:true}).fill('Losing Silver');
      await save(page,3);await editor(other).getByRole('button',{name:'Сохранить варианты',exact:true}).click();
      await editor(other).getByRole('status').filter({hasText:'Ваши изменения не записаны'}).waitFor();
      assert.equal(await editor(other).getByLabel('Цвет 2',{exact:true}).inputValue(),'Losing Silver');assert.equal((await read()).snapshot.colors[1].label,'Silver');
      await editor(other).getByRole('button',{name:'Загрузить актуальную версию',exact:true}).click();await revision(other,3);
      assert.equal(await editor(other).getByLabel('Цвет 1',{exact:true}).inputValue(),'Glossy Gold');assert.equal(await editor(other).getByLabel('Цвет 2',{exact:true}).inputValue(),'Silver');
    });
    await check('Browser reload after committed response loss replays the identical request with no duplicate revision',async()=>{
      let captured=null;
      await page.route(api,async route=>{if(route.request().method()!=='POST')return route.continue();captured=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),201);await route.abort('failed');});
      await editor(page).getByLabel('Цвет 1',{exact:true}).fill('Gold Gloss Finish');await editor(page).getByRole('button',{name:'Сохранить варианты',exact:true}).click();
      await editor(page).getByRole('status').filter({hasText:'Результат сохранения пока не подтверждён'}).waitFor();assert.equal((await read()).current_revision,4);assert.ok(captured);
      await page.unroute(api);await page.reload();await editor(page).getByRole('button',{name:'Проверить результат',exact:true}).waitFor();
      assert.equal(await editor(page).getByLabel('Цвет 1',{exact:true}).isDisabled(),true);
      const requestPromise=page.waitForRequest(r=>r.url()===api&&r.method()==='POST');const responsePromise=page.waitForResponse(r=>r.url()===api&&r.request().method()==='POST');
      await editor(page).getByRole('button',{name:'Проверить результат',exact:true}).click();assert.deepEqual((await requestPromise).postDataJSON(),captured);assert.equal((await responsePromise).status(),200);
      await revision(page,4);await editor(page).getByRole('status').filter({hasText:'Сохранено и проверено'}).waitFor();
      assert.equal((await read()).current_revision,4);assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('feya.variant.pending.v1:')).length),0);
    });
    await check('Unavailable browser recovery storage prevents sending a mutation; changed actor precondition is rejected',async()=>{
      let posts=0;const count=r=>{if(r.url()===api&&r.method()==='POST')posts++;};page.on('request',count);
      await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('feya.variant.pending.v1:'))throw new Error('storage unavailable');return original.call(this,key,value);};});
      await editor(page).getByLabel('Цвет 1',{exact:true}).fill('Must remain unsaved');await editor(page).getByRole('button',{name:'Сохранить варианты',exact:true}).click();
      await editor(page).getByRole('status').filter({hasText:'Запись в БД не отправлена'}).waitFor();assert.equal(posts,0);page.off('request',count);assert.equal((await read()).current_revision,4);
      const r=await ownerPage.request.post(api,{data:{},headers:{Origin:base,'X-Feya-Editor-Actor':'90000000-0000-4000-8000-000000000099'}});assert.equal(r.status(),409);assert.equal((await r.json()).code,'variant_editor_actor_changed');
      await page.reload();await revision(page,4);
    });
    await check('Archiving a color retires its tuple while preserving identities, source amounts and the base quote',async()=>{
      await editor(page).getByLabel('Статус: цвет 2',{exact:true}).selectOption('retired');await save(page,5);const current=await read();
      const old=second.snapshot.variants.find(v=>v.color_id===second.snapshot.colors[1].id),now=current.snapshot.variants.find(v=>v.variant_id===old.variant_id);
      assert.equal(now.state,'retired');assert.deepEqual(current.snapshot.configurations,first.snapshot.configurations);
      const source=(await db.query('select source_amount::text,public_price_amount::text,price_status from public.feya_commerce_configuration_prices where configuration_price_id=$1',[config])).rows[0];
      assert.equal(Number(source.source_amount),222.22);assert.equal(Number(source.public_price_amount),222.22);assert.equal(source.price_status,'draft');
      assert.equal((await db.query('select count(*)::int n from public.feya_commerce_variant_save_receipts_v1 where canonical_product_id=$1',[product])).rows[0].n,5);
    });
    await check('Desktop and mobile editor render without errors; default-off Product and Growth surfaces hide the integration',async()=>{
      await page.setViewportSize({width:1440,height:1050});await editor(page).scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'variant-editor-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});await editor(page).scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow on mobile');
      await page.screenshot({path:join(out,'variant-editor-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
      await other.goto(url.replace(':3003',':3000'));assert.equal(await other.getByTestId('variant-editor').count(),0);
      await growth.goto(base.replace(':3003',':3000')+'/admin/product-facts-review');await openGrowthWithKeyboard('disabled');assert.equal(await growth.getByTestId('variant-summary').count(),0);assert.deepEqual(report.legacy_growth_trigger_hit_tests.enabled,report.legacy_growth_trigger_hit_tests.disabled,'New integration must not change the existing table trigger hit area');
    });
    report.variant_editor_runtime_pass=true;
    report.limitations.push('The existing Growth table sticky header can cover the first-row trigger at the test viewport, including with the variant flag OFF. Growth integration is verified by native keyboard activation, not mouse click; the legacy pointer/layout issue is separate and remains open.');
    report.limitations.push('C4.2 restores the captured Product builder view; the existing page resolves this synthetic product through its catalog fallback. Products/prices and the private Growth queue projection are synthetic; full Product Truth/media/review-event readers are not seeded. Real editor controls/Auth/API/DB/reload are exercised; hosted catalog/release/price approval remain separate.');
  } catch(error) {
    await growth.screenshot({path:join(out,'variant-growth-failure.png'),fullPage:true}).catch(()=>{});
    await page.screenshot({path:join(out,'variant-editor-failure.png'),fullPage:true}).catch(()=>{});
    await writeFile(join(out,'variant-editor-failure.json'),JSON.stringify({error:String(error.message),body:(await page.locator('body').innerText().catch(()=>'')),pageErrors:errors,layout:await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,editorWidth:document.querySelector('[data-testid=variant-editor]')?.getBoundingClientRect().width,editorScrollWidth:document.querySelector('[data-testid=variant-editor]')?.scrollWidth,selectLabels:[...document.querySelectorAll('[data-testid=variant-editor] select')].map(x=>({aria:x.getAttribute('aria-label'),label:x.closest('label')?.textContent}))})).catch(()=>null)},null,2));
    throw error;
  } finally {await Promise.all([page.close(),other.close(),growth.close()]);}
}
