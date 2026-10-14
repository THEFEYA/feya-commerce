import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase13 Shop real streamed SSR proof is independent of early SEO metadata check',()=>{
 const workflow=readFileSync('.github/workflows/ci.yml','utf8');
 const smoke=readFileSync('tests/runtime/phase13-shop-origin-smoke.mjs','utf8');
 assert.ok(workflow.includes('node tests/runtime/phase13-shop-origin-smoke.mjs'));
 assert.ok(workflow.includes('runtime-results/phase13-shop-origin-smoke.json'));
 assert.ok(smoke.includes("'NEXT_HTTP_ERROR_FALLBACK;404'"));
 assert.ok(smoke.includes('product-card-'));
 assert.ok(smoke.includes("'/shop?page=2'"));
 assert.ok(smoke.includes("'/shop?color=Gold'"));
 assert.ok(smoke.includes("'/shop?piece=Skirt'"));
 assert.ok(smoke.includes('response.body.getReader()'));
 assert.ok(smoke.includes('process.env.PHASE12_ALLOW_BLOCKED'));
 assert.ok(!smoke.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!smoke.includes('console.log(html)'));
 assert.ok(!smoke.includes('console.log(response.headers)'));
});
