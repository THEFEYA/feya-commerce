import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

function gitBlobSha(path:string){
  const body=readFileSync(path);
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
}

test('Phase 12 foundational v2 pins exact current Wave A source blobs',()=>{
  const migration=readFileSync('supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql','utf8');
  const sources=[
    ['/', 'app/page.tsx'],
    ['/collections','app/collections/page.tsx'],
    ['/about','app/about/page.tsx'],
    ['/size-guide','app/size-guide/page.tsx'],
    ['/care','app/care/page.tsx'],
    ['/shipping','app/shipping/page.tsx'],
    ['/returns','app/returns/page.tsx'],
    ['/contact','app/contact/page.tsx'],
  ] as const;
  for(const [path,file] of sources){
    const sha=gitBlobSha(file);
    assert.ok(migration.includes(sha),file+': missing exact Git blob SHA');
    assert.ok(migration.includes(`'${path}'`),path+': missing governed path');
  }
  assert.match(migration,/foundational_page_content_manifest_v2/);
  assert.match(migration,/content_status','CQA_PASS'/);
  assert.match(migration,/release_status','HOLD'/);
  assert.match(migration,/phase12_foundational_refresh_requires_zero_active_search_releases/);
  assert.match(migration,/phase12_foundational_exact_binding_invalid/);
});

test('Phase 12 first Wave A keeps Shop as a noindex dependency rather than fabricating ownership',()=>{
  const sitemap=readFileSync('app/sitemap.ts','utf8');
  const release=readFileSync('lib/searchReleaseIndexationServer.ts','utf8');
  const readiness=readFileSync('docs/search/PHASE12_SEARCH_RELEASE_READINESS_20261001.md','utf8');
  assert.match(sitemap,/readActiveSearchReleaseIndexItems/);
  assert.match(release,/item_role','INDEX_CANDIDATE'/);
  assert.match(release,/intended_index_state','index'/);
  assert.ok(readiness.includes('keep `/shop` crawlable but **noindex**'));
  assert.ok(readiness.includes('no immutable page_version and no primary query ownership'));
});

test('Phase 12 migrations do not activate Search Release',()=>{
  for(const path of [
    'supabase/migrations/20261001143000_phase12_owner_route_renames_v1.sql',
    'supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql',
    'supabase/migrations/20261001165000_phase12_wave_a_release_v10.sql',
  ]){
    const source=readFileSync(path,'utf8');
    assert.doesNotMatch(source,/set\s+release_status\s*=\s*'ACTIVE'/i);
    assert.doesNotMatch(source,/feya_search_prepare_release_activation_v1\s*\(/);
    assert.doesNotMatch(source,/feya_search_execute_release_activation_v1\s*\(/);
  }
});

test('Phase 12 v10 materializes the exact owner-approved Wave A while remaining fail-closed',()=>{
  const source=readFileSync('supabase/migrations/20261001165000_phase12_wave_a_release_v10.sql','utf8');
  assert.match(source,/release_version,release_status/);
  assert.match(source,/\n\s*10,\n\s*'GATE_FAILED'/);
  assert.match(source,/51f4973a516bcd1205d123681f66dc2ff2d44bfb/);
  assert.match(source,/\/collections\/burning-man-outfits/);
  assert.match(source,/\/collections\/performance-costumes/);
  assert.match(source,/feya_storefront_approved_product_bindings_v1/);
  assert.match(source,/product_items<>207/);
  assert.match(source,/index_items<>18/);
  assert.match(source,/noindex_items<>210/);
  assert.match(source,/gate_count<>20/);
  assert.match(source,/fail_count<>4/);
  assert.match(source,/'K02','FAIL'/);
  assert.match(source,/'K14','FAIL'/);
  assert.match(source,/'K19','FAIL'/);
  assert.match(source,/'K20','FAIL'/);
  assert.doesNotMatch(source,/feya_search_prepare_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/feya_search_execute_release_activation_v1\s*\(/);
  assert.doesNotMatch(source,/set\s+release_status\s*=\s*'ACTIVE'/i);
});
