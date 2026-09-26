import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('root defaults noindex and only active release may opt a path into indexing',async()=>{
  const layout=await readFile(new URL('../../app/layout.tsx',import.meta.url),'utf8');
  const helper=await readFile(new URL('../../lib/searchReleaseIndexationServer.ts',import.meta.url),'utf8');
  assert.match(layout,/robots: \{ index: false, follow: true, nocache: true \}/);
  assert.match(helper,/release_status','ACTIVE'/);
  assert.match(helper,/intended_index_state/);
  assert.match(helper,/page_version_id/);
  assert.match(helper,/membership_snapshot_id/);
  assert.match(helper,/content_hash/);
  assert.match(helper,/INDEX_CANDIDATE/);
  assert.match(helper,/return\{index:true,follow:true\}/);
  assert.match(helper,/return\{index:false,follow:true,nocache:true\}/);
});


test('active collection rendering is pinned to the exact immutable release item',async()=>{
  const renderer=await readFile(new URL('../../lib/searchLandingPageServer.ts',import.meta.url),'utf8');
  assert.match(renderer,/readSearchReleasePathState/);
  assert.match(renderer,/activeBinding\.pageVersionId/);
  assert.match(renderer,/\.eq\('page_version_id',activeBinding\.pageVersionId\)/);
  assert.match(renderer,/SEARCH_LANDING_ACTIVE_RELEASE_PAGE_MISMATCH/);
  assert.match(renderer,/SEARCH_LANDING_ACTIVE_RELEASE_VERSION_MISMATCH/);
  assert.match(renderer,/SEARCH_LANDING_ACTIVE_RELEASE_MEMBERSHIP_MISMATCH/);
  assert.match(renderer,/SEARCH_LANDING_ACTIVE_RELEASE_CONTENT_HASH_MISMATCH/);
  assert.match(renderer,/readBreadcrumbs\(service,pageId,content\.h1\)/);
});

test('sitemap is sourced only from active release index candidates',async()=>{
  const sitemap=await readFile(new URL('../../app/sitemap.ts',import.meta.url),'utf8');
  assert.match(sitemap,/readActiveSearchReleaseIndexItems/);
  assert.doesNotMatch(sitemap,/feya_commerce_v_seo_page_portfolio_safe_v1/);
  assert.match(sitemap,/Duplicate path in active search release/);
});

test('all Wave A route families ask the release manifest for their robots directive',async()=>{
  const paths=[
    '../../app/page.tsx',
    '../../app/collections/page.tsx',
    '../../app/collections/[slug]/page.tsx',
    '../../app/about/page.tsx',
    '../../app/size-guide/page.tsx',
    '../../app/care/page.tsx',
    '../../app/shipping/page.tsx',
    '../../app/returns/page.tsx',
    '../../app/contact/page.tsx',
  ];
  for(const path of paths){
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    assert.match(source,/releaseRobotsForPath/);
  }
});

test('prelaunch cart and account remain explicit noindex utilities',async()=>{
  for(const path of ['../../app/cart/page.tsx','../../app/account/page.tsx']){
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    assert.match(source,/robots:\{index:false,follow:false\}/);
    assert.match(source,/not active/i);
  }
});
