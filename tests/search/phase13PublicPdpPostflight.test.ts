import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');
const src=read('tests/runtime/phase13-public-pdp-copy-smoke.mjs');
const workflow=read('.github/workflows/ci.yml');
const cases=JSON.parse(read('tests/runtime/fixtures/phase13-pdp-owner-samples-v1.json'));
const pins=JSON.parse(read('config/approved-content-review-bindings.json')).entries.filter((x:{canonical_product_id:string})=>x.canonical_product_id!=='d42dd678-7b11-4f38-890e-411de686f418');

test('five PDP checks reference only original pinned source IDs, paths and immutable hashes',()=>{
 assert.equal(cases.samples.length,5);
 assert.equal(pins.length,207);
 for(const item of cases.samples){
  const pin=pins.find((p:{canonical_product_id:string;url_path:string;content_sha256:string})=>p.canonical_product_id===item.canonical_product_id);
  assert.ok(pin,item.canonical_product_id);
  assert.equal(pin.url_path,'/shop/'+item.slug);
  assert.match(pin.content_sha256,/^[0-9a-f]{64}$/);
  assert.ok(item.h1.length>5);
 }
});

test('PDP public smoke is strict on authorized main release only and retains noindex / layout safeguards',()=>{
 assert.ok(src.includes("PHASE13_REQUIRE_PUBLISHED_COPY==='true'"));
 assert.ok(src.includes("PHASE13_PRODUCTION_PUBLISH_AUTHORIZED\\s*=\\s*true"));
 assert.ok(src.includes('const strict=mainPush&&gitAuthorized'));
 assert.ok(src.includes("if(strict&&(report.reasons.length||report.checked!==5||report.passed!==5))"));
 for(const str of ['NEXT_HTTP_ERROR_FALLBACK;404','four_approved_blocks_missing_or_ordered_wrong','confirmed_physical_piece_not_rendered',
  'right_pdp_heading_missing','pdp_noindex_lost','pdp_canonical_changed','original_h1_not_rendered']){
   assert.ok(src.includes(str),str);
 }
 assert.ok(!src.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!src.includes('console.log(html)'));
});

test('GitHub performs PDP copy postflight only after exact Production SHA verification',()=>{
 const revision=workflow.indexOf('Verify exact deployed Production SHA before origin crawl');
 const shop=workflow.indexOf('Phase 13 full-stream public Shop SSR check');
 const pdp=workflow.indexOf('Phase 13 approved PDP exact-copy postflight');
 const artifacts=workflow.indexOf('Production crawl evidence');
 assert.ok(revision>0&&shop>revision&&pdp>shop&&artifacts>pdp);
 assert.ok(workflow.includes('PHASE13_REQUIRE_PUBLISHED_COPY:'));
 assert.ok(workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"));
 assert.ok(workflow.includes('runtime-results/phase13-public-pdp-copy-postflight.json'));
 assert.ok(!workflow.includes('FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF:'));
});
