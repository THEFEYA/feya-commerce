import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

async function source(path:string){
  return readFile(new URL(`../../${path}`,import.meta.url),'utf8');
}

test('Phase 10 bounds remote optimization to the observed Etsy media tenant',async()=>{
  const config=await source('next.config.ts');
  assert.match(config,/hostname:\s*'i\.etsystatic\.com'/);
  assert.match(config,/pathname:\s*'\/54033853\/\*\*'/);
  assert.doesNotMatch(config,/unoptimized:\s*true/);
});

test('Phase 10 product cards lazy-load primary media and defer hover media plus PDP prefetch to intent',async()=>{
  const card=await source('components/ProductCard.tsx');
  assert.match(card,/from 'next\/image'/);
  assert.match(card,/prefetch=\{false\}/);
  assert.match(card,/router\.prefetch\(href\)/);
  assert.match(card,/onPointerEnter=\{primeIntent\}/);
  assert.match(card,/onFocus=\{primeIntent\}/);
  assert.match(card,/onTouchStart=\{primeIntent\}/);
  assert.match(card,/cleanSwap && hoverIntent/);
  assert.match(card,/onLoad=\{\(\) => setHoverReady\(true\)\}/);
  assert.doesNotMatch(card,/loading=\{index < 24 \? 'eager'/);
  assert.match(card,/sizes=\{PRODUCT_CARD_IMAGE_SIZES\}/);
});

test('Phase 10 keeps exactly the homepage hero as an explicit homepage preload candidate',async()=>{
  const home=await source('app/page.tsx');
  assert.match(home,/from 'next\/image'/);
  assert.match(home,/preload=\{priority\}/);
  const priorityCalls=home.match(/<TileMedia[^>]*\bpriority\b[^>]*\/>/g) || [];
  assert.equal(priorityCalls.length,1,'Only the homepage hero may request TileMedia preload');
  assert.match(priorityCalls[0],/label="TheFEYA hero"/);
});

test('Phase 10 optimizes shared public tile, header and PDP media with responsive sizes',async()=>{
  const [carousel,hub,collections,header,pdp]=await Promise.all([
    source('components/HomePieceCarousel.tsx'),
    source('components/DiscoveryHubPage.tsx'),
    source('app/collections/page.tsx'),
    source('components/Header.tsx'),
    source('components/ProductDetailClient.tsx'),
  ]);
  for(const [name,value] of Object.entries({carousel,hub,collections,header,pdp})){
    assert.match(value,/from 'next\/image'/,name);
    assert.match(value,/\bsizes=/,name);
  }
  assert.match(pdp,/preload=\{idx === 0\}/);
  assert.match(pdp,/sizes="132px"/);
  assert.match(pdp,/sizes=\{PDP_MAIN_IMAGE_SIZES\}/);
});
