/** Complete authenticated release flow, only in the existing loopback Supabase fixture. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { prepareReviewPresentation } from '../../lib/searchReviewPresentation.ts';

export async function verifyClosedReviewRuntime({db,browser,ownerPage,env,out,check,report,otherEmail,password}) {
  assert.ok(['localhost','127.0.0.1'].includes(db.connectionParameters.host));
  assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,'127.0.0.1');
  const read=async path=>JSON.parse(await readFile(path,'utf8'));
  const source=await read('docs/search/closed-review-source-manifest-20260924.json');
  const binding=await read('config/closed-review-presentation-binding.json');
  const release=prepareReviewPresentation(source,binding.source_sha256);
  assert.equal(release.presentation_sha256,binding.presentation_sha256);

  // Phase 4 runtime proof must exercise the actual Phase 3 card read model.
  // The isolated runtime previously restored only the legacy product view, so the
  // new server-only card relation did not exist and /shop correctly failed closed.
  // Restore the immutable facet shell, then apply the real card migrations.
  await check('Closed-review fixture restores exact 207-product card read model',async()=>{
    for(const migration of [
      'supabase/migrations/20260927212500_storefront_facet_snapshot_v1.sql',
      'supabase/migrations/20260928114500_storefront_facet_snapshot_axes_v2.sql',
      'supabase/migrations/20260928122000_storefront_facet_sellable_axis_v3.sql',
    ]) await db.query(await readFile(migration,'utf8'));

    const facetSnapshotId='00000000-0000-4000-8000-000000000207';
    await db.query(
      `insert into public.feya_storefront_facet_snapshots_v1(
        facet_snapshot_id,snapshot_code,facet_contract_version,source_revision,source_release_ref,
        product_count,snapshot_hash,snapshot_status,evidence_json
      ) values($1,'feya-n7-20260928-v3','feya-storefront-facets-v4',
        'runtime-closed-review-facet-shell','feya-review-207-20260924',207,$2,'PREVIEW',$3::jsonb)`,
      [facetSnapshotId,'f'.repeat(64),JSON.stringify({source:'runtime_exact_release_shell'})]
    );
    for(const entry of release.entries){
      await db.query(
        `insert into public.feya_storefront_facet_items_v1(
          facet_snapshot_id,canonical_product_id,source_draft_id,
          parent_components_json,child_components_json,component_groups_json,
          event_values_json,style_values_json,persona_values_json,canonical_color_label,
          item_hash,evidence_json,component_values_json,audience_values_json,material_values_json,
          sellable_component_values_json
        ) values($1,$2,$3,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
          '[]'::jsonb,$4,$5,$6::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`,
        [
          facetSnapshotId,
          entry.identity.canonical_product_id,
          entry.identity.draft_id,
          entry.product.canonical_color_label || null,
          entry.identity.content_sha256,
          JSON.stringify({source:'runtime_exact_release_shell'}),
        ]
      );
    }

    for(const migration of [
      'supabase/migrations/20260930231500_storefront_product_card_read_model_v1.sql',
      'supabase/migrations/20260930232500_storefront_product_card_price_parity_v2.sql',
      'supabase/migrations/20260930233500_storefront_product_card_snapshot_v3.sql',
      'supabase/migrations/20260930235500_storefront_card_exact_identity_v4.sql',
    ]) await db.query(await readFile(migration,'utf8'));

    await db.query("notify pgrst, 'reload schema'");
    const state=await db.query(
      `select count(*)::int n,count(distinct canonical_product_id)::int distinct_n
       from public.feya_storefront_product_cards_v1`
    );
    assert.deepEqual(state.rows[0],{n:207,distinct_n:207});

    // Wait on the Data API schema cache, not wall-clock sleep. The public Shop
    // loader uses PostgREST, so SQL visibility alone is not a sufficient gate.
    let cardApiReady=false,lastStatus=0,lastBody='';
    for(let i=0;i<40;i++){
      const response=await fetch(
        env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/feya_storefront_product_cards_v1?select=canonical_product_id&limit=1',
        {headers:{
          apikey:env.SUPABASE_SERVICE_ROLE_KEY,
          authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
        }}
      );
      lastStatus=response.status;
      lastBody=await response.text();
      if(response.ok){cardApiReady=true;break;}
      await new Promise(r=>setTimeout(r,200));
    }
    assert.equal(cardApiReady,true,'Card read model not visible through PostgREST: '+lastStatus+' '+lastBody.slice(0,160));
  });
  const first=release.entries[0], path=first.copy.metadata.canonical_path, base='http://127.0.0.1:3004';
  let server,page,outsiderContext,log='';
  const request=async route=>ownerPage.request.get(base+route);
  const assertClosed=async(response,url)=>{
    const status=typeof response.status==='function'?response.status():response.status;
    const html=await response.text();
    assert.ok([200,404].includes(status),`${url}: unexpected closed-review status ${status}`);
    assert.ok(!html.includes(first.copy.draft.intro),url);
    assert.ok(!html.includes('PRIVATE_APPROVAL_CANARY'),url);
    assert.ok(!html.includes('PRIVATE_OUTPUT_CANARY'),url);
    if(status===200){
      assert.match(html,/name=["']robots["']/i,url);
      assert.match(html,/noindex/i,url);
    }
    return html;
  };
  const documentData=async html=>page.evaluate(html=>{
    const d=new DOMParser().parseFromString(html,'text/html');
    return {title:d.title,h1:d.querySelector('h1')?.textContent,description:d.querySelector('meta[name="description"]')?.content,
      canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href'),robots:d.querySelector('meta[name="robots"]')?.content,
      cards:[...d.querySelectorAll('a[data-testid^="product-card-"]')].map(a=>a.getAttribute('href')),
      next:[...d.querySelectorAll('nav[aria-label="Catalog pages"] a')].find(a=>a.textContent==='Show 20 more')?.getAttribute('href'),
      links:[...d.querySelectorAll('a[href^="/shop?collection="]')].map(a=>a.getAttribute('href')),
      schema:d.querySelector('script[type="application/ld+json"]')?JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent):null,
      disabled:[...d.querySelectorAll('button')].some(b=>/Preview only/.test(b.textContent)&&b.disabled),
      blocks:[...d.querySelectorAll('article')].map(a=>([...a.querySelectorAll('p,li')].map(n=>n.textContent).join(' ')).replace(/\s+/g,' ').trim()),
    };
  },html);
  async function start(extra={}) {
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3004'],{
      env:{...env,VERCEL_ENV:'preview',FEYA_CLOSED_REVIEW_RELEASE:binding.release_id,FEYA_SEARCH_INDEXING_ENABLED:'true',FEYA_CANONICAL_ORIGIN_CONFIRMED:'true',NEXT_PUBLIC_SITE_URL:'https://release-fixture.example',...extra},stdio:['ignore','pipe','pipe'],
    });
    server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});
    let ready=false;
    for(let i=0;i<80;i++){try{if((await fetch(base+'/admin/login')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
    assert.ok(ready,'Closed-review server did not start');
  }
  async function stop() {if(server){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL');server=null;}}
  try {
    await start();page=await ownerPage.context().newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Keep actual pinned image URLs/DOM/hover logic; substitute only network image bytes.
    // This proves layout/interaction, not remote CDN delivery or photo quality.
    await page.route('**/*',route=>{
      if(route.request().resourceType()==='image') return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#393128"/></svg>'});
      if(route.request().resourceType()==='media') return route.abort();
      return route.continue();
    });
    await check('Closed release denies anonymous and authenticated outsider on Home, Shop and PDP',async()=>{
      for(const url of ['/', '/shop',path])await assertClosed(await fetch(base+url),url);
      outsiderContext=await browser.newContext();const outsiderPage=await outsiderContext.newPage();
      await outsiderPage.goto(base+'/admin/login');await outsiderPage.getByLabel('Email',{exact:true}).fill(otherEmail);await outsiderPage.getByLabel('Пароль',{exact:true}).fill(password);
      await outsiderPage.getByRole('button',{name:'Войти',exact:true}).click();await outsiderPage.waitForURL('**/admin/login?error=not_authorized');
      for(const url of ['/', '/shop',path])await assertClosed(await outsiderContext.request.get(base+url),url);
    });
    await check('Server HTML pagination exposes all 207 exact paths in eleven pages, without duplicate or suppressed listing',async()=>{
      const seen=new Set();let url='/shop',pages=0;
      while(url){const r=await request(url);assert.equal(r.status(),200,url);const html=await r.text();const d=await documentData(html);
        assert.match(r.headers()['cache-control']||'',/private|no-store/);assert.match(d.robots,/noindex/);assert.match(d.robots,/nofollow/);
        assert.equal(new URL(d.canonical).pathname+new URL(d.canonical).search,url);
        assert.equal(d.cards.length,pages===10?7:20);
        for(const p of d.cards){assert.ok(!seen.has(p),p);seen.add(p);}
        assert.ok(!html.includes('PRIVATE_APPROVAL_CANARY'));pages++;assert.ok(pages<=11);url=d.next;
      }
      assert.equal(pages,11);assert.deepEqual([...seen],release.entries.map(e=>e.copy.metadata.canonical_path));
      report.closed_review_crawlable_products=seen.size;report.closed_review_pagination_pages=pages;
      const homeResponse=await request('/');const homeHtml=await homeResponse.text();const home=await documentData(homeHtml);
      assert.equal(home.cards.length,8);assert.ok(home.cards.every(p=>seen.has(p)));assert.match(home.robots,/noindex/);
      for(const href of [
        '/collections/bodysuits',
        '/collections/shoulder-armor',
        '/collections/costume-masks',
        '/collections/costume-headpieces',
        '/collections/costume-belts',
        '/collections/festival-outfits',
        '/collections/rave-outfits',
        '/collections/burning-man-looks',
        '/collections/stage-outfits',
      ]) assert.ok(homeHtml.includes(`href="${href}"`),href);
      // Cache Components can stream the static shell before notFound() resolves, so
      // Phase 6 accepts Next's documented 200+noindex streamed-not-found semantics.
      // Phase 7 owns any final pre-stream exact-404 enforcement for impossible filter/page URLs.
      const suppressed=source.suppressed[0].url_path;await assertClosed(await request(suppressed),suppressed);
      await assertClosed(await request('/shop/nonexistent-release-product'),'/shop/nonexistent-release-product');
      for(const query of ['?page=0','?page=-1','?page=12','?page=1&page=2'])await assertClosed(await request('/shop'+query),'/shop'+query);
      const redirect=await ownerPage.request.get(base+'/shop?page=1',{maxRedirects:0});assert.ok([307,308].includes(redirect.status()));assert.equal(new URL(redirect.headers().location,base).pathname,'/shop');
    });
    await check('All 207 release PDPs preserve exact approved blocks and head/schema; checkout remains disabled',async()=>{
      for(const e of release.entries){
        const r=await request(e.copy.metadata.canonical_path);assert.equal(r.status(),200,e.identity.canonical_product_id);
        const html=await r.text(),d=await documentData(html);
        assert.equal(d.h1,e.copy.draft.h1);assert.equal(d.title,e.copy.metadata.title+' | TheFEYA');assert.equal(d.description,e.copy.metadata.description);
        assert.match(d.robots,/noindex/);assert.match(d.robots,/nofollow/);assert.equal(d.schema.url,d.canonical);assert.equal(d.schema.name,e.copy.draft.h1);
        assert.ok(!('offers' in d.schema));assert.equal(d.disabled,true);
        const normalized=e.copy.draft.pdp_blocks.map(b=>b.body.split('\n').map(l=>l.replace(/^\s*(?:[-*•●▪◦]+|\d+[.)])\s*/,'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim());
        assert.ok(normalized.every(b=>d.blocks.includes(b)),e.identity.canonical_product_id);assert.ok(!/PRIVATE_(APPROVAL|OUTPUT)_CANARY/.test(html));
        assert.ok(!html.includes('href="/collections/'));
      }
      report.closed_review_rendered_products=207;
    });
    await check('Fresh unapproved draft cannot replace pinned text; source product edits cannot alter release media',async()=>{
      const id=randomUUID();
      try{
        await db.query("insert into public.feya_commerce_seo_pack_drafts_v1(id,canonical_product_id,product_slug,status,review_status,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot) select $1,canonical_product_id,product_slug,'draft_generated','not_reviewed',now()+interval '1 day',seo_title,h1,meta_description,'NEW_UNAPPROVED_RELEASE_CANARY',agent_output_snapshot from public.feya_commerce_seo_pack_drafts_v1 where id=$2",[id,first.identity.draft_id]);
        const r=await request(path);assert.equal(r.status(),200);assert.ok(!(await r.text()).includes('NEW_UNAPPROVED_RELEASE_CANARY'));
      }finally{await db.query('delete from public.feya_commerce_seo_pack_drafts_v1 where id=$1',[id]);}
      const saved=(await db.query("select data from public.runtime_approved_products where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id])).rows[0].data;
      try{
        await db.query("update public.runtime_approved_products set data=data||$2::jsonb where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id,JSON.stringify({primary_image_url:'https://example.test/UNRELEASED_IMAGE',material:'UNRELEASED_MATERIAL'})]);
        const r=await request(path);assert.equal(r.status(),200);assert.ok(!(await r.text()).includes('UNRELEASED_'));
      }finally{await db.query("update public.runtime_approved_products set data=$2::jsonb where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id,JSON.stringify(saved)]);}
    });
    await check('Revoked/edited/archived pinned draft and product hold block the entire release then recover',async()=>{
      const saved=(await db.query('select review_status,archived_at::text,updated_at::text,agent_output_snapshot from public.feya_commerce_seo_pack_drafts_v1 where id=$1',[first.identity.draft_id])).rows[0];
      for(const change of ["review_status='changes_requested'","archived_at=now()","updated_at=updated_at+interval '1 microsecond'","agent_output_snapshot=jsonb_set(agent_output_snapshot,'{h1}','\"UNAPPROVED_EDIT\"')"]){
        try{await db.query(`update public.feya_commerce_seo_pack_drafts_v1 set ${change} where id=$1`,[first.identity.draft_id]);for(const url of ['/', '/shop',path])await assertClosed(await request(url),url);}
        finally{await db.query('update public.feya_commerce_seo_pack_drafts_v1 set review_status=$2,archived_at=$3,updated_at=$4,agent_output_snapshot=$5::jsonb where id=$1',[first.identity.draft_id,saved.review_status,saved.archived_at,saved.updated_at,JSON.stringify(saved.agent_output_snapshot)]);}
      }
      try{await db.query('update public.feya_commerce_product_drafts set do_not_publish_flag=true where canonical_product_id=$1',[first.identity.canonical_product_id]);await assertClosed(await request('/shop'),'/shop');}
      finally{await db.query('update public.feya_commerce_product_drafts set do_not_publish_flag=false where canonical_product_id=$1',[first.identity.canonical_product_id]);}
      assert.equal((await request(path)).status(),200);
    });
    await check('Missing live product and moved page do not fall back to a different catalog',async()=>{
      const saved=(await db.query("select data from public.runtime_approved_products where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id])).rows[0].data;
      try{await db.query("delete from public.runtime_approved_products where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id]);await assertClosed(await request('/shop'),'/shop');await assertClosed(await request(path),path);}
      finally{await db.query('insert into public.runtime_approved_products(data) values($1::jsonb)',[JSON.stringify(saved)]);}
      try{await db.query("update public.feya_commerce_seo_pages_v1 set url_path='/shop/runtime-moved-path' where seo_page_id=$1",[first.identity.seo_page_id]);await assertClosed(await request('/shop'),'/shop');}
      finally{await db.query('update public.feya_commerce_seo_pages_v1 set url_path=$2 where seo_page_id=$1',[first.identity.seo_page_id,path]);}
      assert.equal((await request('/shop')).status(),200);
    });
    await check('Hydrated and JavaScript-disabled pagination, filters, related links, hover and gallery work',async()=>{
      await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/shop');
      await page.getByRole('link',{name:'Show 20 more',exact:true}).click();await page.waitForURL('**/shop?page=2');
      assert.equal(await page.locator('a[data-testid^="product-card-"]').count(),20);
      const href=await page.locator('a[data-testid^="product-card-"]').first().getAttribute('href');assert.equal(href,release.entries[20].copy.metadata.canonical_path);
      await page.getByRole('link',{name:'Previous 20',exact:true}).click();await page.waitForURL('**/shop');
      const hover=page.locator('.product-card.has-hover-media').first();await hover.hover();
      await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.product-card:hover .hover-media')).opacity)>.9);
      await page.mouse.move(0,0);
      const colorEntry=release.entries.find(e=>e.product.canonical_color_label);
      if(colorEntry){
        const color=String(colorEntry.product.canonical_color_label);
        await page.goto(base+'/shop?color='+encodeURIComponent(color));
        assert.ok(await page.locator('a[data-testid^="product-card-"]').count()>0);
        const next=page.getByRole('link',{name:'Show 20 more',exact:true});
        if(await next.count()){assert.match(await next.getAttribute('href'),/color=/);}
      }
      await page.goto(base+path);const related=page.locator('a[href^="/collections/"]').first();if(await related.count()){const target=await related.getAttribute('href');assert.ok(target?.startsWith('/collections/'));}
      const galleryEntry=release.entries.find(e=>Array.isArray(e.product.media_gallery)&&e.product.media_gallery.length>1);
      await page.goto(base+galleryEntry.copy.metadata.canonical_path);
      const mainImage=page.locator('button[class*="max-w-[520px]"] img');
      const before=await mainImage.getAttribute('src');await page.locator('button[class*="max-w-[520px]"] svg.lucide-chevron-right').click();
      await page.waitForFunction(before=>Boolean(document.querySelector('button[class*="max-w-[520px]"] img')) && document.querySelector('button[class*="max-w-[520px]"] img').getAttribute('src')!==before,before);
      for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
        await page.setViewportSize(viewport);await page.goto(base+'/shop');await page.getByTestId('shop-page').waitFor();
        await page.screenshot({path:join(out,`closed-review-shop-${viewport.width}.png`),fullPage:true});
        await page.goto(base+path);await page.getByRole('button',{name:'Preview only',exact:false}).waitFor();
        await page.screenshot({path:join(out,`closed-review-pdp-${viewport.width}.png`),fullPage:true});
      }
      const noJs=await browser.newContext({javaScriptEnabled:false,storageState:await ownerPage.context().storageState()});
      try{await noJs.route('**/*',route=>route.request().resourceType()==='image'?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#393128"/></svg>'}):route.request().resourceType()==='media'?route.abort():route.continue());const p=await noJs.newPage();await p.goto(base+'/shop');await p.getByRole('link',{name:'Show 20 more',exact:true}).click();await p.waitForURL('**/shop?page=2');assert.equal(await p.locator('a[data-testid^="product-card-"]').count(),20);}finally{await noJs.close();}
      assert.deepEqual(errors,[]);assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);
    });
    await check('Measurement context exposes stable IDs but remains fail-closed in preview without consent activation',async()=>{
      await page.goto(base+path);
      const response=await page.request.get(base+'/api/measurement/context?path='+encodeURIComponent(path));
      assert.equal(response.status(),200);
      const body=await response.json();
      assert.equal(body.ok,true);
      assert.equal(body.context.page_id,first.identity.seo_page_id);
      assert.equal(body.context.canonical_product_id,first.identity.canonical_product_id);
      assert.equal(body.context.environment,'preview');
      assert.equal(body.context.measurement_enabled,false);
      assert.equal(body.context.ga4_measurement_id,null);

      await page.waitForFunction(()=>Boolean(window.__FEYA_MEASUREMENT_STATE__));
      let state=await page.evaluate(()=>window.__FEYA_MEASUREMENT_STATE__);
      assert.equal(state.consent,'unset');
      assert.equal(state.sent,0);
      assert.equal(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('feya_measurement_session_v1')),null);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('feya_measurement_landing_page_v1')),null);

      await page.evaluate(()=>localStorage.setItem('feya_analytics_consent_v1','granted'));
      await page.reload();
      await page.waitForFunction(()=>Boolean(window.__FEYA_MEASUREMENT_STATE__));
      state=await page.evaluate(()=>window.__FEYA_MEASUREMENT_STATE__);
      assert.equal(state.consent,'granted');
      assert.equal(state.sent,0,'Preview environment must not emit analytics even if local consent is granted');
      assert.ok(state.blocked>=1);
      assert.equal(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('feya_measurement_session_v1')),null);
      await page.evaluate(()=>localStorage.removeItem('feya_analytics_consent_v1'));
      report.measurement_preview_fail_closed=true;
    });

    await check('PDP keyboard flow covers gallery, configuration and modal focus without mouse-only dependency',async()=>{
      const galleryEntry=release.entries.find(e=>Array.isArray(e.product.media_gallery)&&e.product.media_gallery.length>1);
      assert.ok(galleryEntry,'Expected at least one multi-image release product');
      await page.setViewportSize({width:1440,height:1000});
      await page.goto(base+galleryEntry.copy.metadata.canonical_path);

      const mainMedia=page.getByRole('button',{name:/Open image \d+ of \d+/});
      await mainMedia.focus();
      assert.equal(await mainMedia.evaluate(el=>el===document.activeElement),true);

      const mainImage=mainMedia.locator('img');
      const before=await mainImage.getAttribute('src');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(before=>{
        const button=[...document.querySelectorAll('button')].find(el=>/^Open image \d+ of \d+/.test(el.getAttribute('aria-label')||''));
        const image=button?.querySelector('img');
        return Boolean(image&&image.getAttribute('src')!==before);
      },before);

      await page.keyboard.press('Enter');
      const dialog=page.getByRole('dialog',{name:/Image viewer:/});
      await dialog.waitFor();
      const close=page.getByRole('button',{name:'Close image viewer',exact:true});
      assert.equal(await close.evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(el=>el===document.activeElement),true,'Modal Tab must remain inside the one-control dialog');
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'detached'});
      assert.equal(await mainMedia.evaluate(el=>el===document.activeElement),true,'Closing dialog must restore prior focus');

      const config=page.locator('button[aria-controls="product-configuration-options"]');
      await config.focus();
      await page.keyboard.press('Enter');
      assert.equal(await config.getAttribute('aria-expanded'),'true');
      const firstOption=page.locator('#product-configuration-options button').first();
      await page.keyboard.press('Tab');
      assert.equal(await firstOption.evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Enter');
      assert.equal(await config.getAttribute('aria-expanded'),'false');

      const nav=page.locator('[data-testid="primary-nav"] a').first();
      await nav.focus();
      assert.equal(await nav.evaluate(el=>el===document.activeElement),true);
      assert.ok(await page.locator('button[aria-label^="Select color"]').count()>=0);
      assert.ok(await page.locator('button[aria-pressed]').count()>0);
      report.closed_review_keyboard_pass=true;
    });

    await check('Release lab asset budgets guard JavaScript and CSS regressions without claiming field CWV',async()=>{
      const routes=['/shop',path];
      const budgets={maxScriptBytes:2500000,maxStyleBytes:600000,maxScriptResources:48,maxStyleResources:16};
      const observed=[];
      for(const route of routes){
        await page.goto(base+route,{waitUntil:'networkidle'});
        const metrics=await page.evaluate(()=>{
          const resources=performance.getEntriesByType('resource');
          const size=r=>Number(r.encodedBodySize||r.transferSize||r.decodedBodySize||0);
          const scripts=resources.filter(r=>r.initiatorType==='script'||/\/_next\/static\/.*\.js(?:\?|$)/.test(r.name));
          const styles=resources.filter(r=>r.initiatorType==='css'||/\.css(?:\?|$)/.test(r.name));
          return{
            path:location.pathname+location.search,
            scriptBytes:scripts.reduce((sum,r)=>sum+size(r),0),
            styleBytes:styles.reduce((sum,r)=>sum+size(r),0),
            scriptResources:new Set(scripts.map(r=>r.name)).size,
            styleResources:new Set(styles.map(r=>r.name)).size,
          };
        });
        assert.ok(metrics.scriptBytes<=budgets.maxScriptBytes,JSON.stringify({kind:'script_bytes',metrics,budgets}));
        assert.ok(metrics.styleBytes<=budgets.maxStyleBytes,JSON.stringify({kind:'style_bytes',metrics,budgets}));
        assert.ok(metrics.scriptResources<=budgets.maxScriptResources,JSON.stringify({kind:'script_resources',metrics,budgets}));
        assert.ok(metrics.styleResources<=budgets.maxStyleResources,JSON.stringify({kind:'style_resources',metrics,budgets}));
        observed.push(metrics);
      }
      report.release_lab_asset_budget={budgets,observed,note:'CI regression guard only; not field Core Web Vitals.'};
    });

    await check('Mistaken production/index flags cannot expose a closed release or populate sitemap',async()=>{
      let r=await request('/sitemap.xml');assert.equal(r.status(),200);assert.ok(!(await r.text()).includes('<loc>'));
      await stop();await start({VERCEL_ENV:'production'});
      for(const url of ['/', '/shop',path])await assertClosed(await request(url),url);
      r=await request('/sitemap.xml');assert.equal(r.status(),200);assert.ok(!(await r.text()).includes('<loc>'));
      const robots=await (await request('/robots.txt')).text();assert.match(robots,/Disallow: \/(?:\r?\n|$)/);
    });
    report.closed_review_runtime_pass=true;report.closed_review_release_id=binding.release_id;report.closed_review_presentation_sha256=binding.presentation_sha256;
    report.limitations.push('Closed release uses pinned real copy/media URLs and source prices, loopback source/approval fixtures, and substituted browser image bytes. No production deployment, live CDN/price/orderability/payment or indexation certification.');
  }catch(error){
    if(page){
      await page.screenshot({path:join(out,'closed-review-failure.png'),fullPage:true}).catch(()=>{});
      await writeFile(join(out,'closed-review-failure.json'),JSON.stringify({url:page.url(),error:String(error.stack||error)},null,2));
    }
    throw error;
  }finally{
    await page?.close();await outsiderContext?.close();await stop();
    for(const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','FEYA_INTERNAL_API_TOKEN'])if(env[key])log=log.replaceAll(env[key],'[redacted]');
    await writeFile(join(out,'closed-review-next.log'),log);
  }
}
