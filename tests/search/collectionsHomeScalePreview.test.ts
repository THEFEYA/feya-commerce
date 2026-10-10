import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COLLECTION_DIRECTORY_GROUPS} from '../../config/discoveryHubs.ts';

const source=readFileSync('app/collections-review/page.tsx','utf8');
const gitBlobSha=(input:Buffer)=>createHash('sha1')
 .update(Buffer.from(`blob ${input.length}\0`)).update(input).digest('hex');

test('owner collections review is a completely separate noindex exact-branch preview',()=>{
  assert.match(source,/robots:\{index:false,follow:false,noarchive:true/);
  assert.match(source,/process\.env\.VERCEL==='1'/);
  assert.match(source,/process\.env\.VERCEL_ENV==='preview'/);
  assert.match(source,/VERCEL_GIT_COMMIT_REF===BRANCH/);
  assert.match(source,/VERCEL_PROJECT_ID===PROJECT/);
  assert.match(source,/FEYA_OWNER_PREVIEW_DISABLED!=='true'/);
  assert.match(source,/if\(!enabled\(\)\)notFound\(\)/);
  assert.doesNotMatch(source,/releaseRobotsForPath|index:true|FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
});
test('all current owner-approved home/shop collection tiles retain exact count, href, photo and labels',()=>{
  assert.equal(COLLECTION_DIRECTORY_GROUPS.length,2);
  const tileList=COLLECTION_DIRECTORY_GROUPS.flatMap(g=>g.tiles);
  assert.equal(tileList.length,10);
  assert.equal(new Set(tileList.map(t=>t.code)).size,10);
  assert.equal(new Set(tileList.map(t=>t.href)).size,10);
  assert.equal(tileList.filter(t=>t.role==='owner').length,10);
  assert.ok(tileList.every(t=>t.href.startsWith('/collections/')));
  assert.ok(tileList.every(t=>typeof t.imageUrl==='string'&&t.imageUrl.length>20));
  assert.ok(tileList.every(t=>'pieceCount' in t && Number(t.pieceCount)>0));
  assert.match(source,/COLLECTION_DIRECTORY_GROUPS\.map/);
  assert.match(source,/group\.tiles\.map/);
  assert.match(source,/href=\{tile\.href\}/);
  assert.match(source,/alt=\{tile\.imageAlt\}/);
  assert.match(source,/tile\.pieceCount/);
});
test('revised cards match approved homepage dimensional tokens but move details OUT of picture',()=>{
  const approved=readFileSync('components/HomePieceCarousel.tsx','utf8');
  assert.match(approved,/aspect-\[4\/5\]/);
  assert.match(source,/aspect-\[4\/5\]/);
  for(const token of ['visual-hover-sheen','visual-tile-label-band','visual-piece-label-band','font-tall','object-cover','group-hover:scale-[1.035]']){
    assert.ok(source.includes(token),token);
    assert.ok(approved.includes(token),token);
  }
  assert.match(source,/grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4/);
  assert.doesNotMatch(source,/xl:grid-cols-5/);
  assert.match(source,/text-\[clamp\(38px,4\.5vw,60px\)\]/);
  assert.doesNotMatch(source,/text-\[clamp\(48px,6vw,86px\)\]/);
  assert.ok(source.indexOf('<p className="mt-2 text-[13px] leading-6') >
    source.indexOf('</div>\n              <div className="mt-4'));
});
test('the active /collections owner page and real Search v12 index URLs remain untouched',()=>{
  const live=readFileSync('app/collections/page.tsx');
  assert.equal(gitBlobSha(live),'56ef6b8ebf4cab67168a59456f878e372b4bb5cf');
  assert.doesNotMatch(source,/fetch\(|\.insert\(|\.update\(|\.upsert\(/);
  assert.match(source,/https:\/\/thefeya\.com\/collections/);
});
