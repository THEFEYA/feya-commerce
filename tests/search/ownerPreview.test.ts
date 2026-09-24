import test from 'node:test';
import assert from 'node:assert/strict';
import {isOwnerPreviewDeployment,ownerPreviewReadFetch} from '../../lib/ownerPreviewPolicy.ts';
import {closedReviewMode,closedReviewRequested} from '../../lib/searchReviewPresentation.ts';
import {inspectSearchEnvironment} from '../../lib/searchEnvironmentGate.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const env = {VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',VERCEL_GIT_COMMIT_REF:'work/search-architecture-foundation-20260923'};
test('card prefetch correction preserves every existing visual/media byte',()=>{
 const card=readFileSync('components/ProductCard.tsx','utf8');
 assert.equal((card.match(/prefetch=\{false\}/g)||[]).length,1);
 const before=Buffer.from(card.replace('prefetch={false}','prefetch'));
 assert.equal(createHash('sha1').update(`blob ${before.length}\0`).update(before).digest('hex'),'e72043d3b354ccad56d832fcb772aec577a26ddc');
});
test('owner preview is confined to the authorized Vercel project and branch',()=>{
 assert.equal(isOwnerPreviewDeployment(env),true);
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL:''},{VERCEL_PROJECT_ID:'other'},{VERCEL_GIT_COMMIT_REF:'main'},{FEYA_OWNER_PREVIEW_DISABLED:'true'}]) assert.equal(isOwnerPreviewDeployment({...env,...patch}),false);
 for(const key of Object.keys(env)){const missing:Record<string,string>={...env};delete missing[key];assert.equal(isOwnerPreviewDeployment(missing),false);}
 assert.equal(isOwnerPreviewDeployment({}),false);
});
test('owner preview activates the sealed review without changing ordinary closed-review auth',()=>{
 assert.equal(closedReviewRequested(env),true);
 assert.equal(closedReviewMode(env,'feya-review-207-20260924'),'review');
 assert.equal(closedReviewMode({...env,FEYA_CLOSED_REVIEW_RELEASE:'unknown'},'feya-review-207-20260924'),'blocked');
 assert.equal(closedReviewMode({...env,FEYA_OWNER_PREVIEW_DISABLED:'true'},'feya-review-207-20260924'),'disabled');
 assert.equal(closedReviewMode({VERCEL_ENV:'preview',FEYA_CLOSED_REVIEW_RELEASE:'feya-review-207-20260924'},'feya-review-207-20260924'),'blocked');
 assert.equal(inspectSearchEnvironment({...env,FEYA_SEARCH_INDEXING_ENABLED:'true',FEYA_CANONICAL_ORIGIN_CONFIRMED:'true',NEXT_PUBLIC_SITE_URL:'https://example.test'}).enabled,false);
});
test('preview permits table reads and the two audited read RPCs without shared cache',async()=>{
 let calls=0;const transport:typeof fetch=async(_input,init)=>{calls++;assert.equal(init?.cache,'no-store');assert.equal(init?.redirect,'error');return new Response('[]');};
 const read=ownerPreviewReadFetch(transport,'https://feya.test');
 for(const method of ['GET','HEAD']) assert.equal((await read('https://feya.test/rest/v1/products?select=id',{method})).status,200);
 for(const name of ['feya_commerce_get_seo_product_truth_v4','feya_commerce_get_step7_storefront_products_api_v7']) assert.equal((await read(`https://feya.test/rest/v1/rpc/${name}`,{method:'POST',body:'{}'})).status,200);
 assert.equal(calls,4);
});
test('preview denies table writes, unknown RPCs, credentials, other origins and non-REST access before transport',async()=>{
 let calls=0;const read=ownerPreviewReadFetch(async()=>{calls++;return new Response('[]');},'https://feya.test');
 for(const method of ['POST','PUT','PATCH','DELETE']) assert.equal((await read('https://feya.test/rest/v1/products',{method})).status,423);
 for(const url of ['https://feya.test/rest/v1/rpc/delete_product','https://feya.test/auth/v1/admin/users','https://other.test/rest/v1/products','https://user:secret@feya.test/rest/v1/products']) assert.equal((await read(url)).status,423);
 assert.equal((await read(new Request('https://feya.test/rest/v1/products',{method:'DELETE'}))).status,423);
 assert.equal(calls,0);
});
