import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isOwnerUnifiedStorefrontPreview,OWNER_VISUAL_V2_REVIEW_BRANCH} from '../../lib/ownerUnifiedStorefrontPreview.ts';

test('normal navigation URLs show review pages only on the exact protected preview branch',()=>{
  const cfg=readFileSync('next.config.ts','utf8');
  assert.match(cfg,/async rewrites\(\)/);
  assert.match(cfg,/beforeFiles: preview \?/);
  assert.match(cfg,/VERCEL_ENV === 'preview'/);
  assert.match(cfg,/VERCEL_GIT_COMMIT_REF === 'work\/owner-visual-commercial-review-v2-20261010'/);
  for(const [route,dest] of Object.entries({
    '/events-performance':'/events-performance-review',
    '/style':'/style-review',
    '/about':'/about-review',
    '/shipping':'/shipping-review',
    '/returns':'/returns-review',
    '/size-guide':'/size-guide-review',
    '/contact':'/contact-review',
  })){
    assert.ok(cfg.includes(`source: '${route}', destination: '${dest}'`),route);
  }
  const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',VERCEL_GIT_COMMIT_REF:OWNER_VISUAL_V2_REVIEW_BRANCH};
  assert.equal(isOwnerUnifiedStorefrontPreview(env),true);
  assert.equal(isOwnerUnifiedStorefrontPreview({...env,VERCEL_ENV:'production'}),false);
  assert.equal(isOwnerUnifiedStorefrontPreview({...env,VERCEL_GIT_COMMIT_REF:'main'}),false);
});

test('large category tiles have a small bottom band rather than text obscuring photography',()=>{
  const src=readFileSync('components/OwnerDiscoveryTileStrip.tsx','utf8');
  assert.match(src,/basis-\[calc\(\(100%-36px\)\/4\)\]/);
  assert.match(src,/min-h-\[68px\]/);
  assert.match(src,/\/events-performance-review|snap-mandatory/);
  assert.doesNotMatch(src,/line-clamp-2/);
});

test('owner preview caps product heading and removes unsupported global DHL claims without touching approved PDP/Header sources',()=>{
  const css=readFileSync('app/shop/[slug]/ownerPdpPolishV2.css','utf8');
  const global=readFileSync('app/ownerVisualPreviewV2.css','utf8');
  assert.match(css,/owner-pdp-polish-v2.*h1/);
  assert.match(global,/site-header/);
  assert.match(global,/display:none!important/);
  assert.match(readFileSync('app/template.tsx','utf8'),/isOwnerUnifiedStorefrontPreview\(process\.env\)/);
  assert.match(readFileSync('lib/thefeyaSeoDoctrine.ts','utf8'),/6–10 business days after dispatch/);
  assert.match(readFileSync('lib/thefeyaSeoDoctrine.ts','utf8'),/Express shipping usually takes 7–10 business days/);
  assert.match(readFileSync('next.config.ts','utf8'),/NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW: visualV2Preview \? '1' : '0'/);
});
