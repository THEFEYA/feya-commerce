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
  const first=release.entries[0], path=first.copy.metadata.canonical_path, base='http://127.0.0.1:3004';
  let server,page,outsiderContext,log='';
  const request=async route=>ownerPage.request.get(base+route);
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
      for(const url of ['/', '/shop',path]){
        const r=await fetch(base+url);assert.equal(r.status,404,url);const html=await r.text();assert.ok(!html.includes(first.copy.draft.intro));
      }
      outsiderContext=await browser.newContext();const outsiderPage=await outsiderContext.newPage();
      await outsiderPage.goto(base+'/admin/login');await outsiderPage.getByLabel('Email',{exact:true}).fill(otherEmail);await outsiderPage.getByLabel('Пароль',{exact:true}).fill(password);
      await outsiderPage.getByRole('button',{name:'Войти',exact:true}).click();await outsiderPage.waitForURL('**/admin/login?error=not_authorized');
      for(const url of ['/', '/shop',path])assert.equal((await outsiderContext.request.get(base+url)).status(),404,url);
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
      const home=await documentData(await (await request('/')).text());assert.equal(home.cards.length,12);assert.ok(home.cards.every(p=>seen.has(p)));assert.match(home.robots,/noindex/);
      const suppressed=source.suppressed[0].url_path;assert.equal((await request(suppressed)).status(),404);
      assert.equal((await request('/shop/nonexistent-release-product')).status(),404);
      for(const query of ['?page=0','?page=-1','?page=12','?page=1&page=2'])assert.equal((await request('/shop'+query)).status(),404,query);
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
        try{await db.query(`update public.feya_commerce_seo_pack_drafts_v1 set ${change} where id=$1`,[first.identity.draft_id]);for(const url of ['/', '/shop',path])assert.equal((await request(url)).status(),404,url);}
        finally{await db.query('update public.feya_commerce_seo_pack_drafts_v1 set review_status=$2,archived_at=$3,updated_at=$4,agent_output_snapshot=$5::jsonb where id=$1',[first.identity.draft_id,saved.review_status,saved.archived_at,saved.updated_at,JSON.stringify(saved.agent_output_snapshot)]);}
      }
      try{await db.query('update public.feya_commerce_product_drafts set do_not_publish_flag=true where canonical_product_id=$1',[first.identity.canonical_product_id]);assert.equal((await request('/shop')).status(),404);}
      finally{await db.query('update public.feya_commerce_product_drafts set do_not_publish_flag=false where canonical_product_id=$1',[first.identity.canonical_product_id]);}
      assert.equal((await request(path)).status(),200);
    });
    await check('Missing live product and moved page do not fall back to a different catalog',async()=>{
      const saved=(await db.query("select data from public.runtime_approved_products where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id])).rows[0].data;
      try{await db.query("delete from public.runtime_approved_products where data->>'canonical_product_id'=$1",[first.identity.canonical_product_id]);assert.equal((await request('/shop')).status(),404);assert.equal((await request(path)).status(),404);}
      finally{await db.query('insert into public.runtime_approved_products(data) values($1::jsonb)',[JSON.stringify(saved)]);}
      try{await db.query("update public.feya_commerce_seo_pages_v1 set url_path='/shop/runtime-moved-path' where seo_page_id=$1",[first.identity.seo_page_id]);assert.equal((await request('/shop')).status(),404);}
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
      await page.goto(base+'/shop?collection=armor');assert.ok(await page.locator('a[data-testid^="product-card-"]').count()>0);
      const next=page.getByRole('link',{name:'Show 20 more',exact:true});if(await next.count()){assert.match(await next.getAttribute('href'),/collection=armor/);await next.click();await page.waitForURL('**/shop?collection=armor&page=2');}
      await page.goto(base+path);const related=page.locator('a[href^="/shop?collection="]').first();if(await related.count()){const target=await related.getAttribute('href');await related.click();await page.waitForURL(base+target);await page.getByTestId('shop-page').waitFor();assert.equal(await page.getByTestId('shop-page').count(),1);}
      const galleryEntry=release.entries.find(e=>Array.isArray(e.product.media_gallery)&&e.product.media_gallery.length>1);
      await page.goto(base+galleryEntry.copy.metadata.canonical_path);
      const mainImage=page.locator('button.aspect-\\[4\\/5\\] img');
      const before=await mainImage.getAttribute('src');await page.locator('svg.lucide-chevron-right').first().click();
      await page.waitForFunction(before=>document.querySelector('button.aspect-\\[4\\/5\\] img')?.getAttribute('src')!==before,before);
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
    await check('Mistaken production/index flags cannot expose a closed release or populate sitemap',async()=>{
      let r=await request('/sitemap.xml');assert.equal(r.status(),200);assert.ok(!(await r.text()).includes('<loc>'));
      await stop();await start({VERCEL_ENV:'production'});
      for(const url of ['/', '/shop',path])assert.equal((await request(url)).status(),404,url);
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
