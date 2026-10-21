import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 isAiLookOwnerPreview,isAiLookGenerationConfigured,resolveAiLookOwnerTestKey,aiLookKeyInputIssue,AI_LOOK_PREVIEW_BRANCH,
} from '../../lib/aiLookPreviewPolicy.ts';
import {buildAiLookPreviewPrompt} from '../../lib/aiLookPreviewPrompt.ts';
import approvedCatalog from '../../config/bonanzaColorReviewCatalog20261020.json' with {type:'json'};

const file=(p:string)=>readFileSync(p,'utf8');

test('private FEYA try-on route is scoped to one Preview project, not public production',()=>{
 const ok={VERCEL:'1',VERCEL_ENV:'preview',
  VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
  VERCEL_GIT_COMMIT_REF:AI_LOOK_PREVIEW_BRANCH,
  FEYA_AI_LOOK_PREVIEW_ENABLED:'true',OPENAI_API_KEY:'sk-test-example'};
 assert.equal(isAiLookOwnerPreview(ok),true);
 assert.equal(isAiLookGenerationConfigured(ok),true);
 for(const invalid of [
  {VERCEL:'0'},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},
  {VERCEL_PROJECT_ID:'another-project'}, {VERCEL_GIT_COMMIT_REF:'main'},
  {VERCEL_GIT_COMMIT_REF:'work/bonanza-color-variants-20261020'},
  {FEYA_OWNER_PREVIEW_DISABLED:'true'},
 ]){
  assert.equal(isAiLookOwnerPreview({...ok,...invalid}),false);
  assert.equal(isAiLookGenerationConfigured({...ok,...invalid}),false);
 }
 assert.equal(isAiLookGenerationConfigured({...ok,OPENAI_API_KEY:undefined}),false);
 assert.equal(isAiLookGenerationConfigured({...ok,FEYA_AI_LOOK_PREVIEW_ENABLED:'false'}),false);
 assert.equal(isAiLookGenerationConfigured({...ok,FEYA_AI_LOOK_PREVIEW_ENABLED:undefined}),true);
 assert.equal(isAiLookGenerationConfigured({...ok,FEYA_AI_LOOK_PREVIEW_ENABLED:undefined,VERCEL_ENV:'production'}),false);
 assert.match(file('app/experiments/ai-look-preview/page.tsx'),/robots:\{index:false,follow:false/);
 assert.match(file('app/experiments/ai-look-preview/page.tsx'),/isAiLookOwnerPreview\(process.env\)/);
 assert.match(file('next.config.ts'),/work\/ai-look-preview-prototype-20261020/);
});

test('ephemeral owner key never enables Production or a different branch',()=>{
 const fake='sk-test-'+'X'.repeat(70);
 const env={VERCEL:'1',VERCEL_ENV:'preview',
  VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
  VERCEL_GIT_COMMIT_REF:AI_LOOK_PREVIEW_BRANCH};
 assert.equal(resolveAiLookOwnerTestKey(env,fake),fake);
 assert.equal(resolveAiLookOwnerTestKey({...env,VERCEL_ENV:'production'},fake),null);
 assert.equal(resolveAiLookOwnerTestKey({...env,VERCEL_GIT_COMMIT_REF:'main'},fake),null);
 assert.equal(resolveAiLookOwnerTestKey({...env,FEYA_OWNER_PREVIEW_DISABLED:'true'},fake),null);
 assert.equal(resolveAiLookOwnerTestKey(env,'not-a-key'),null);
 assert.equal(resolveAiLookOwnerTestKey(env,fake+' '),null);
 assert.equal(resolveAiLookOwnerTestKey(env,('sk-'+'A'.repeat(500))),null);
});

test('dashboard masks and tracking IDs must not be treated as authentication secrets',()=>{
 assert.equal(aiLookKeyInputIssue('key_0123456789'),'tracking_id');
 assert.equal(aiLookKeyInputIssue('sk-...-demo'),'masked_secret');
 assert.equal(aiLookKeyInputIssue('OPENAI_API_KEY'),'bad_prefix');
 assert.equal(aiLookKeyInputIssue('sk-too-short'),'key_too_short');
 const full='sk-test-'+ 'Y'.repeat(80);
 assert.equal(aiLookKeyInputIssue(full),null);
 assert.equal(aiLookKeyInputIssue(full.slice(0,18)),'key_too_short');
 const health=file('app/api/experiments/ai-look-preview/health/route.ts');
 assert.match(health,/aiLookKeyIssueMessage\(issue\)/);
 assert.match(health,/return json\(\{ok:false,status:issue/);
});

test('experiment binds only reviewed 207 products to truthful variant identities',()=>{
 assert.equal(approvedCatalog.count,207);
 assert.equal(approvedCatalog.products.length,207);
 const product=file('lib/aiLookPreviewCatalogServer.ts');
 assert.match(product,/readCachedStorefrontProductPresentation/);
 assert.match(product,/product\.canonical_product_id!==row\.id/);
 assert.match(product,/sortedOptions\(product\)/);
 assert.match(product,/optionKey\(option,i\)/);
 assert.match(product,/getMedia\(product\)/);
 assert.match(product,/productColorChoices\(product\)/);
 assert.match(product,/recommendedReferenceIndex/);
});

test('owner Preview has a no-image OpenAI connectivity probe and never exposes secrets',()=>{
 const source=file('app/api/experiments/ai-look-preview/health/route.ts');
 assert.match(source,/isAiLookOwnerPreview\(process\.env\)/);
 assert.match(file('lib/aiLookPreviewPolicy.ts'),/FEYA_AI_LOOK_PREVIEW_ENABLED/);
 assert.match(source,/server-side OpenAI key/);
 assert.match(source,/api\.openai\.com\/v1\/models\/gpt-image-1\.5/);
 assert.match(source,/Cache-Control/);
 assert.doesNotMatch(source,/console\.log\(|key:\s*secret|secret:\s*secret/);
 const ui=file('components/AiLookPreviewClient.tsx');
 assert.match(ui,/checkConnection\(\)/);
 assert.match(ui,/tryon-connection/);
 assert.match(ui,/Verify connection/);
 assert.match(ui,/type="password"/);
 assert.match(ui,/method:suppliedKey\?'POST':'GET'/);
 assert.match(ui,/form\.set\('ownerApiKey',verifiedOwnerKeyRef\.current\)/);
 assert.match(ui,/verifiedOwnerKeyRef\.current=suppliedKey&&json\.ok\?supplied:''/);
 assert.doesNotMatch(ui,/form\.set\('ownerApiKey',apiKey\)/);
 assert.match(source,/export async function POST\(request:NextRequest\)/);
 assert.match(source,/isOwnOrigin\(request\)/);
 assert.match(source,/resolveAiLookOwnerTestKey\(process\.env,raw\)/);
 assert.match(ui,/Awaiting OpenAI connection/);
 assert.match(ui,/disabled=\{generating\|\|remaining===0\|\|!connected\|\|blockedForCurrent\}/);
});

test('customer reference images are verified, server-only; provider never gets client-supplied product URL',()=>{
 const server=file('lib/aiLookPreviewGenerationServer.ts');
 const route=file('app/api/experiments/ai-look-preview/generate/route.ts');
 assert.match(server,/https:\/\/api\.openai\.com\/v1\//);
 assert.match(server,/image\[\]/);
 assert.match(server,/chat\/completions/);
 assert.match(server,/images\/edits/);
 assert.match(server,/rankReferenceImages/);
 assert.match(server,/hostname==='i\.etsystatic\.com'/);
 assert.match(server,/redirect:'error'/);
 assert.match(server,/input_fidelity','high'/);
 assert.match(server,/data\.length>3_700_000/);
 assert.match(server,/output_compression','78'/);
 assert.match(route,/same_origin_required/);
 assert.match(route,/resolveAiLookOwnerTestKey\(process\.env,form\.get\('ownerApiKey'\)\)/);
 assert.match(route,/aiLookReadApprovedListing\(slug\)/);
 assert.match(route,/product\.configs\.find/);
 assert.match(route,/product\.colors\.some/);
 assert.doesNotMatch(route,/\.upsert\(|\.insert\(|\.update\(/);
 assert.doesNotMatch(route,/process\.env\.FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE\s*=/);
});

test('photo prompt preserves customer identity and factual FEYA product details for each mood',()=>{
 const text=buildAiLookPreviewPrompt({
  title:'Holographic Alien Costume',configuration:'Full Set',
  color:'Holographic + White',scene:'festival',referenceCount:2,
 });
 assert.match(text,/CUSTOMER FRONT-FACING FULL BODY/);
 assert.match(text,/CUSTOMER FACE SELFIE/);
 assert.match(text,/Preserve the ORIGINAL wardrobe geometry/);
 assert.match(text,/bodysuit and underwear coverage/);
 assert.match(text,/without idealizing, thinning/);
 assert.match(text,/subtle, relaxed, confident natural smile/);
 assert.match(text,/Holographic \+ White/);
 assert.match(text,/defocused|depth of field/);
});

test('browser sends only two user photos; no invented previews, no real payments or live deployment by default',()=>{
 const ui=file('components/AiLookPreviewClient.tsx');
 assert.match(ui,/Face selfie/);
 assert.match(ui,/Front full-body photo/);
 assert.match(ui,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(ui,/form\.set\('selfie',face\.file\)/);
 assert.match(ui,/form\.set\('fullBody',body\.file\)/);
 assert.match(ui,/targetBytes=face\?750_000:1_550_000/);
 assert.match(ui,/canvas\.toBlob/);
 assert.match(ui,/form\.set\('manualReference',manualReference===null\?'auto'/);
 assert.match(ui,/result\.imageDataUrl/);
 assert.match(ui,/One-time connection/);
 assert.match(ui,/Math\.min\(3,count\+1\)/);
 assert.match(ui,/Paid previews unavailable until checkout activation/);
 assert.doesNotMatch(ui,/new OpenAI\(/);
 assert.doesNotMatch(ui,/NEXT_PUBLIC_OPENAI_API_KEY|sk-proj-[A-Za-z0-9_-]{30,}/);
 const css=file('app/experiments/ai-look-preview/preview.css');
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/max-width:760px/);
 assert.match(css,/\.tryon-preview-image/);
});
