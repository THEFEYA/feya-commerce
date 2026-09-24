/** Extends the isolated Supabase runtime. Never connects to a hosted database.
 * Actual captured customer copy; a synthetic public product view isolates rendering
 * from the full inventory import. This is not a production catalog/price proof. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve, join } from 'node:path';

export async function verifyApprovedContentRuntime({ db, browser, ownerPage, env, out, check, report }) {
  assert.ok(['localhost', '127.0.0.1'].includes(db.connectionParameters.host));
  assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname, '127.0.0.1');
  const read = async path => JSON.parse(await readFile(path, 'utf8'));
  const drafts = (await read('docs/search/approved-catalog-content-capture-20260924.json')).products;
  const products = (await read('docs/search/approved-catalog-storefront-capture-20260924.json')).products;
  const manifest = await read('config/approved-content-review-bindings.json');
  const observed = await read('tests/search-db/fixtures/observed-schema-20260923.json');
  const first = drafts[0], product = products.find(p => p.canonical_product_id === first.canonical_product_id);
  const base = 'http://127.0.0.1:3002', path = `/shop/${product.product_slug}`;
  let server, log = '', page;
  await check('Approved-content runtime seeds all 208 captured versions into loopback fixtures', async () => {
    const fields = `canonical_product_id product_slug matched_etsy_listing_id source_url card_title h1 seo_title meta_description product_type material color size_mode production_profile shipping_profile handmade_flag styled_imagery_flag primary_image_url primary_image_alt secondary_image_url hover_image_url video_url media_count has_video min_price max_price currency price_contract_version price_source_mode price_confidence_status has_unverified_discount has_russian_public_label needs_price_review needs_label_review full_set_display_price_amount component_sum_display_price_amount full_set_savings_amount full_set_savings_percent category_label world_label canonical_color_label color_options configurations media_gallery`.split(' ');
    const numbers = new Set('media_count min_price max_price full_set_display_price_amount component_sum_display_price_amount full_set_savings_amount full_set_savings_percent'.split(' '));
    const jsonFields = new Set(['configurations', 'color_options', 'media_gallery']);
    const columns = fields.map(f => `${f} ${jsonFields.has(f) ? 'jsonb' : numbers.has(f) ? 'numeric' : /^(has_|needs_)|_flag$/.test(f) ? 'boolean' : 'text'}`).join(',');
    await db.query(`create table public.runtime_approved_products(data jsonb not null);
      alter table public.runtime_approved_products enable row level security;
      create policy fixture_public_product_read on public.runtime_approved_products for select to anon,authenticated using(true);
      grant select on public.runtime_approved_products to anon,authenticated,service_role;
      create view public.feya_commerce_v_step7_storefront_products_api_v4 with(security_invoker=true) as
        select r.* from public.runtime_approved_products p cross join lateral jsonb_to_record(p.data) as r(${columns});
      grant select on public.feya_commerce_v_step7_storefront_products_api_v4 to anon,authenticated,service_role;`);
    if (!(await db.query("select to_regclass('public.feya_commerce_v_seo_pack_drafts_latest_v1') n")).rows[0].n) {
      const definition = observed.views.find(v => v.name === 'feya_commerce_v_seo_pack_drafts_latest_v1').definition;
      await db.query(`create view public.feya_commerce_v_seo_pack_drafts_latest_v1 as ${definition}`);
    }
    await db.query('revoke all on public.feya_commerce_v_seo_pack_drafts_latest_v1 from public,anon,authenticated; grant select on public.feya_commerce_v_seo_pack_drafts_latest_v1 to service_role');
    for (const p of products) {
      await db.query('insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code,card_title,h1) values($1,$2,$3,$4)', [p.canonical_product_id, 'runtime_copy_fixture', p.card_title, p.h1]);
      await db.query("insert into public.feya_commerce_seo_pages_v1(seo_page_id,page_type,url_path,canonical_product_id) values($1,'product',$2,$3)", [p.seo_page_id, p.url_path, p.canonical_product_id]);
      // Neutral placeholder avoids dependence on remote media/CDN; no claim of photo verification.
      const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect width="600" height="800" fill="%23252525"/%3E%3C/svg%3E';
      await db.query('insert into public.runtime_approved_products(data) values($1::jsonb)', [JSON.stringify({ ...p, primary_image_url: image, media_gallery: [], media_count: 1, color_options: [] })]);
    }
    for (const d of drafts) {
      await db.query(`insert into public.feya_commerce_seo_pack_drafts_v1(id,canonical_product_id,product_slug,status,review_status,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot,human_review_notes)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,'PRIVATE_APPROVAL_CANARY')`,
      [d.id,d.canonical_product_id,d.product_slug,d.status,d.review_status,d.updated_at,d.seo_title,d.h1,d.meta_description,d.intro,JSON.stringify({ ...d.agent_output_snapshot, private_canary: 'PRIVATE_OUTPUT_CANARY' })]);
    }
    await db.query("notify pgrst, 'reload schema'");
    assert.equal((await db.query('select count(*)::int n from public.runtime_approved_products')).rows[0].n, 208);
    // Wait on concrete PostgREST schema readiness, not a fixed sleep.
    let ready = false;
    for (let i = 0; i < 30; i++) {
      const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/feya_commerce_v_step7_storefront_products_api_v4?select=canonical_product_id&limit=1`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
      if (r.ok) { ready = true; break; } await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(ready, 'PostgREST catalog fixture did not become ready');
  });
  try {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'], {
      env: { ...env, VERCEL_ENV: 'preview', FEYA_APPROVED_CONTENT_REVIEW: manifest.version }, stdio: ['ignore','pipe','pipe'],
    });
    server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
    let ready = false;
    for (let i=0;i<60;i++) { try { if ((await fetch(base+'/admin/login')).status === 200) { ready=true; break; } } catch {} await new Promise(r=>setTimeout(r,250)); }
    assert.ok(ready, 'Review server did not start');
    await check('Anonymous visitor cannot read approved PDP review or receive private draft details', async () => {
      const response = await fetch(base+path); assert.equal(response.status, 404);
      const html = await response.text(); assert.ok(!html.includes(first.intro)); assert.ok(!html.includes('PRIVATE_APPROVAL_CANARY'));
    });
    page = await ownerPage.context().newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base+path); await page.getByRole('heading', {level:1, name:first.h1, exact:true}).waitFor();
    await check('All 208 actual Next server pages preserve approved copy, metadata, JSON-LD and noindex', async () => {
      for (const d of drafts) {
        const p = products.find(p => p.canonical_product_id === d.canonical_product_id);
        const response = await ownerPage.request.get(base+p.url_path); assert.equal(response.status(), 200, d.canonical_product_id);
        assert.match(response.headers()['cache-control'] || '', /no-store|private/);
        const html = await response.text(); assert.ok(!/PRIVATE_(APPROVAL|OUTPUT)_CANARY/.test(html));
        const result = await page.evaluate(({html,d}) => {
          const document = new DOMParser().parseFromString(html,'text/html');
          const normalize = text => (text||'').replace(/\s+/g,' ').trim();
          const articles = [...document.querySelectorAll('article')].map(a => normalize([...a.querySelectorAll('p,li')].map(n => n.textContent).join(' ')));
          const bodies = d.agent_output_snapshot.pdp_blocks.map(b => normalize(b.body.split('\n').map(l => l.replace(/^\s*(?:[-*•●▪◦]+|\d+[.)])\s*/, '').trim()).filter(Boolean).join(' ')));
          return { h1:normalize(document.querySelector('h1')?.textContent), title:document.title,
            description:document.querySelector('meta[name="description"]')?.content,
            robots:document.querySelector('meta[name="robots"]')?.content,
            canonical:document.querySelector('link[rel="canonical"]')?.href,
            schema:JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
            bodiesMatch:bodies.every(b=>articles.includes(b)),
            previewDisabled:[...document.querySelectorAll('button')].some(b=>/Preview only/i.test(b.textContent)&&b.disabled) };
        }, {html,d});
        assert.equal(result.h1,d.h1); assert.equal(result.title,`${d.seo_title} | TheFEYA`);
        assert.equal(result.description,d.meta_description); assert.match(result.robots,/noindex/); assert.match(result.robots,/nofollow/);
        assert.equal(new URL(result.canonical).pathname,p.url_path); assert.equal(result.schema.url,result.canonical);
        assert.equal(result.schema.name,d.h1); assert.equal(result.schema.description,d.meta_description);
        assert.ok(!('offers' in result.schema)); assert.equal(result.bodiesMatch,true,d.canonical_product_id); assert.equal(result.previewDisabled,true);
      }
      report.approved_copy_rendered_products=208;
    });
    await check('Hydrated desktop/mobile PDP uses the existing renderer and disabled purchase button', async () => {
      for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
        await page.setViewportSize(viewport); await page.goto(base+path);
        await page.getByRole('button',{name:'Preview only',exact:false}).waitFor();
        assert.equal(await page.getByRole('button',{name:'Preview only',exact:false}).isDisabled(),true);
        assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);
        assert.equal(await page.locator('h1').innerText(),first.h1);
        await page.screenshot({path:join(out,`approved-content-${viewport.width}.png`),fullPage:true});
      }
      assert.deepEqual(errors,[]);
    });
    await check('Revocation and stale copy fail closed; restored version works without process restart', async () => {
      for (const sql of ["review_status='changes_requested'", "updated_at=updated_at+interval '1 microsecond'", "agent_output_snapshot=jsonb_set(agent_output_snapshot,'{h1}','\"Changed content\"')"]) {
        await db.query(`update public.feya_commerce_seo_pack_drafts_v1 set ${sql} where id=$1`,[first.id]);
        const response = await ownerPage.request.get(base+path); assert.equal(response.status(),404);
        await db.query('update public.feya_commerce_seo_pack_drafts_v1 set review_status=$2,updated_at=$3,agent_output_snapshot=$4::jsonb where id=$1',[first.id,first.review_status,first.updated_at,JSON.stringify(first.agent_output_snapshot)]);
        assert.equal((await ownerPage.request.get(base+path)).status(),200);
      }
    });
    await check('Default-off server retains original storefront behavior for the same fixture', async () => {
      const response = await ownerPage.request.get('http://127.0.0.1:3000'+path); assert.equal(response.status(),200);
      const html = await response.text(); assert.ok(!html.includes(first.agent_output_snapshot.pdp_blocks[0].body));
      assert.ok(!html.includes('PRIVATE_APPROVAL_CANARY'));
    });
    report.approved_content_runtime_pass=true;
    report.limitations.push('Approved-copy runtime uses captured 208 drafts and a synthetic public catalog view; real price tuples, remote photos and hosted environment mapping are not certified.');
  } finally {
    await page?.close();
    if(server) { server.kill('SIGTERM'); await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]); if(server.exitCode===null)server.kill('SIGKILL'); }
    for(const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','FEYA_INTERNAL_API_TOKEN']) if(env[key])log=log.replaceAll(env[key],'[redacted]');
    await writeFile(resolve(out,'approved-content-next.log'),log);
  }
}
