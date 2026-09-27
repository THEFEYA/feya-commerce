import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('public PDP pilot is content-only authority and cannot grant index or checkout',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../../config/approved-content-review-bindings.json',import.meta.url),'utf8'));
  assert.equal(manifest.public_pilot.enabled,true);
  assert.equal(manifest.public_pilot.environment,'production');
  assert.equal(manifest.public_pilot.content_state,'review_approved_cqa_pending');
  assert.equal(manifest.public_pilot.launch_product_count,207);
  assert.equal(manifest.public_pilot.can_index,false);
  assert.equal(manifest.public_pilot.can_enable_checkout,false);
  assert.deepEqual(manifest.public_pilot.excluded_canonical_product_ids,['d42dd678-7b11-4f38-890e-411de686f418']);
});

test('production pilot reads exact immutable draft binding, never latest copy',async()=>{
  const server=await readFile(new URL('../../lib/seoApprovedStorefrontServer.ts',import.meta.url),'utf8');
  assert.match(server,/approvedContentPublicPilotMode/);
  assert.match(server,/getSupabaseServiceRoleClient/);
  assert.match(server,/feya_commerce_seo_pack_drafts_v1/);
  assert.match(server,/\.eq\('id', binding\.draft_id\)/);
  assert.match(server,/\.eq\('seo_page_id', binding\.seo_page_id\)/);
  assert.match(server,/selectApprovedStorefrontCopy/);
  assert.match(server,/status: 'pilot'/);
});

test('approved PDP projection remains noindex and purchase-disabled in the pilot',async()=>{
  const page=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(page,/approvedCopy \? \{ robots: \{ index: false, follow: false \} \}/);
  assert.match(page,/previewMode=\{Boolean\(approvedCopy\)\}/);
});

test('canonical left PDP content order is About, Why, Included, Ideal, narrative',async()=>{
  const component=await readFile(new URL('../../components/ProductDetailClient.tsx',import.meta.url),'utf8');
  assert.match(component,/about_this_piece:\s*0/);
  assert.match(component,/why_youll_love_it:\s*1/);
  assert.match(component,/ideal_for:\s*2/);
  assert.match(component,/main_description:\s*3/);
  assert.match(component,/findIndex\(\(block\) => block\.block_key === 'why_youll_love_it'\)/);
  assert.match(component,/index === includedAfterIndex/);
});
