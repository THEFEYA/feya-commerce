import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const smoke=readFileSync('tests/runtime/phase13-collection-origin-smoke.mjs','utf8');
const workflow=readFileSync('.github/workflows/ci.yml','utf8');
const runtime=readFileSync('tests/runtime/closed-review-runtime.mjs','utf8');
const reader=readFileSync('lib/collectionCardFastReadModel.ts','utf8');
test('independent collection cutover retains exact old 31-column read contract',()=>{
 assert.ok(reader.includes("COLLECTION_FAST_VIEW='feya_storefront_collection_cards_fast_v2'"));
 assert.ok(reader.includes("'full_set_display_price_amount'"));
 assert.ok(!reader.includes("'configurations'"));
 assert.ok(!reader.includes('createPaymentSession'));
 assert.ok(runtime.includes('create view public.feya_storefront_collection_cards_fast_v2 with (security_invoker=true) as'));
 assert.ok(runtime.includes('/rest/v1/feya_storefront_collection_cards_fast_v2?select='));
 assert.ok(runtime.includes('grant select on public.feya_storefront_collection_cards_fast_v2 to service_role'));
});
test('whole-stream collection smoke catches HTTP 200 with hidden 404 and wrong immutable membership',()=>{
 for(const key of [
  '/collections/shoulder-armor',
  '/collections/festival-outfits',
  '/collections/costume-masks',
  "membership:80","membership:111","membership:11",
  'response.body.getReader()', 'NEXT_HTTP_ERROR_FALLBACK;404',
  'collection-snapshot-summary','orderable pieces','product-card-',
  'phase13-collection-origin-smoke.json',
 ])assert.ok(smoke.includes(key),key);
 assert.ok(!smoke.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!smoke.includes('console.log(html)'));
});
test('CI waits for actual Production revision before Shop and Collections, with evidence archived',()=>{
 const revision=workflow.indexOf('Verify exact deployed Production SHA before origin crawl');
 const shop=workflow.indexOf('Phase 13 full-stream public Shop SSR check');
 const collections=workflow.indexOf('Phase 13 full-stream Collections SSR check');
 const pdp=workflow.indexOf('Phase 13 approved PDP exact-copy postflight');
 assert.ok(revision>0&&shop>revision&&collections>shop&&pdp>collections);
 assert.ok(workflow.includes('node tests/runtime/phase13-collection-origin-smoke.mjs'));
 assert.ok(workflow.includes('runtime-results/phase13-collection-origin-smoke.json'));
});
