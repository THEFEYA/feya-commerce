import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('public Shop trace reports only count/boolean observability and every explicit notFound reason',()=>{
 const src=readFileSync('app/shop/page.tsx','utf8');
 assert.ok(src.includes('feya_shop_trace_v1'));
 for(const reason of ['invalid_navigation','invalid_page_number','review_gate_blocked']) assert.ok(src.includes(reason));
 assert.ok(src.includes('feya_shop_filter_empty'),'valid empty color results are not an HTTP 404');
 assert.ok(src.includes("process.env.VERCEL_ENV === 'production'"));
 assert.ok(src.includes('readCachedApprovedStorefrontCatalogV1()'));
 assert.ok(!src.includes('console.log(params)'));
 assert.ok(!src.includes('JSON.stringify(params)'));
 assert.ok(!src.includes('console.warn(error)'));
});

test('public Shop successful INFO traces require an explicit production opt-in',()=>{
 const src=readFileSync('app/shop/page.tsx','utf8');
 assert.ok(src.includes("process.env.FEYA_SHOP_TRACE_ENABLED === 'true'"));
 assert.ok(src.includes("process.env.VERCEL_ENV === 'production' && process.env.FEYA_SHOP_TRACE_ENABLED === 'true'"));
 assert.equal((src.match(/if \(shouldTraceShop\(\)\)/g)||[]).length,3);
 assert.equal((src.match(/console\.info\('feya_shop_trace_v1'/g)||[]).length,3);
 for(const reason of ['invalid_navigation','invalid_page_number','review_gate_blocked']) assert.ok(src.includes("console.warn('feya_shop_not_found','"+reason+"')"));
 assert.doesNotMatch(src,/filteredCount===0\) notFound\(\)/);
 assert.ok(src.includes("console.warn('storefront_card_read_model_failed'"));
});
