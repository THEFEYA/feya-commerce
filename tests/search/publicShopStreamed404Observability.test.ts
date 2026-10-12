import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('public Shop trace reports only count/boolean observability and every explicit notFound reason',()=>{
 const src=readFileSync('app/shop/page.tsx','utf8');
 assert.ok(src.includes('feya_shop_trace_v1'));
 for(const reason of ['invalid_navigation','utility_without_results','invalid_page_number']) assert.ok(src.includes(reason));
 assert.ok(src.includes("process.env.VERCEL_ENV === 'production'"));
 assert.ok(src.includes('readCachedApprovedStorefrontCatalogV1()'));
 assert.ok(!src.includes('console.log(params)'));
 assert.ok(!src.includes('JSON.stringify(params)'));
 assert.ok(!src.includes('console.warn(error)'));
});
