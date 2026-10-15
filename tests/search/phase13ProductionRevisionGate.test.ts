import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEYA_PRODUCTION_REVISION_CONTRACT,verifiedProductionRevision} from '../../lib/productionRevisionPolicy.ts';

const sha='3abbb8eb17a9ed40bb4e17738d08ec337d3b0065';
const valid={
 VERCEL:'1',
 VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
 VERCEL_ENV:'production',
 VERCEL_GIT_COMMIT_REF:'main',
 VERCEL_GIT_COMMIT_SHA:sha,
};
const src=(p:string)=>readFileSync(p,'utf8');

test('only exact Vercel Production / project / main / full SHA supplies public provenance',()=>{
 assert.equal(FEYA_PRODUCTION_REVISION_CONTRACT,'feya_production_revision_v1');
 assert.equal(verifiedProductionRevision(valid),sha);
 for(const changes of [
  {VERCEL:'0'},
  {VERCEL_ENV:'preview'},
  {VERCEL_ENV:'development'},
  {VERCEL_PROJECT_ID:'another-project'},
  {VERCEL_GIT_COMMIT_REF:'work/test'},
  {VERCEL_GIT_COMMIT_SHA:'123'},
  {VERCEL_GIT_COMMIT_SHA:''},
  {VERCEL_GIT_COMMIT_SHA:undefined},
 ]) assert.equal(verifiedProductionRevision({...valid,...changes}),null);
});

test('revision route exposes no secrets, refuses missing SHA and is never cacheable or indexable',()=>{
 const route=src('app/api/production-revision/route.ts');
 assert.ok(route.includes('verifiedProductionRevision(process.env)'));
 assert.ok(route.includes("status:sha?200:503"));
 assert.ok(route.includes("'Cache-Control':'private, no-store, max-age=0'"));
 assert.ok(route.includes("'X-Robots-Tag':'noindex, nofollow'"));
 assert.ok(!route.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!route.includes('FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE'));
 assert.ok(!route.includes('FEYA_SELLER_ONLINE_PAYMENTS_ENABLED'));
});

test('main origin crawl verifies actual Production SHA BEFORE public Shop and SEO checks',()=>{
 const workflow=src('.github/workflows/ci.yml');
 const proof=src('tests/runtime/phase13-production-revision-gate.mjs');
 const label='Verify exact deployed Production SHA before origin crawl';
 const index=workflow.indexOf(label);
 const crawl=workflow.indexOf('Anonymous canonical-origin crawl');
 const shop=workflow.indexOf('Phase 13 full-stream public Shop SSR check');
 assert.ok(index>0&&crawl>index&&shop>crawl);
 assert.ok(workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"));
 assert.ok(workflow.includes('PHASE13_EXPECTED_PRODUCTION_SHA: ${{ github.sha }}'));
 assert.ok(workflow.includes('runtime-results/phase13-production-revision-gate.json'));
 assert.ok(proof.includes('maxWaitMs=240000'));
 assert.ok(proof.includes('sha!==expected'));
 assert.ok(proof.includes('status:sha?200:503')===false);
 assert.ok(proof.includes("if(enforced&&!matched)"));
 assert.ok(!proof.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!proof.includes('console.log(response.headers)'));
});
