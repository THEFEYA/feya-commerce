import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('Phase 10 card media uses the Next image pipeline and intent-only hover delivery',async()=>{
  const [card,nextConfig]=await Promise.all([
    readFile(new URL('../../components/ProductCard.tsx',import.meta.url),'utf8'),
    readFile(new URL('../../next.config.ts',import.meta.url),'utf8'),
  ]);

  assert.match(nextConfig,/hostname:\s*'i\.etsystatic\.com'/);
  assert.doesNotMatch(nextConfig,/unoptimized:\s*true/);
  assert.match(nextConfig,/minimumCacheTTL:\s*60 \* 60 \* 24 \* 7/);

  assert.match(card,/import Image from 'next\/image'/);
  assert.match(card,/prefetch=\{false\}/);
  assert.match(card,/router\.prefetch\(href\)/);
  assert.match(card,/onPointerEnter=\{requestIntent\}/);
  assert.match(card,/onFocus=\{requestIntent\}/);
  assert.match(card,/onTouchStart=\{requestIntent\}/);
  assert.match(card,/hoverRequested && cleanSwap/);
  assert.match(card,/hoverRequested && video/);
  assert.match(card,/onLoad=\{\(\) => setHoverReady\(true\)\}/);
  assert.match(card,/hasHoverMedia && hoverReady/);
  assert.doesNotMatch(card,/index < 24 \? 'eager'/);
  assert.match(card,/sizes=\{cardSizes\}/);
});

test('Phase 10 keeps the approved product-card geometry contract',async()=>{
  const card=await readFile(new URL('../../components/ProductCard.tsx',import.meta.url),'utf8');
  const css=await readFile(new URL('../../app/globals.css',import.meta.url),'utf8');

  assert.match(card,/className="img-wrap relative overflow-hidden"/);
  assert.match(css,/\.product-card \.img-wrap \{[^}]*aspect-ratio:\s*4 \/ 5/);
  assert.match(css,/\.product-card \.img-wrap img,[^\n]*object-fit:\s*cover/);
});

test('Phase 10 optimizes all initial public storefront media while preserving one PDP lightbox source image',async()=>{
  const paths=[
    '../../app/page.tsx',
    '../../components/HomePieceCarousel.tsx',
    '../../components/DiscoveryHubPage.tsx',
    '../../app/collections/page.tsx',
    '../../components/Header.tsx',
    '../../components/ProductDetailClient.tsx',
  ];
  const [home,carousel,discovery,collections,header,pdp]=await Promise.all(
    paths.map((path)=>readFile(new URL(path,import.meta.url),'utf8')),
  );

  for(const source of [home,carousel,discovery,collections,header,pdp]){
    assert.match(source,/import Image from 'next\/image'/);
  }
  for(const source of [home,carousel,discovery,collections,header]){
    assert.doesNotMatch(source,/<img\b/);
  }

  assert.match(home,/sizes="100vw" priority/);
  assert.equal((home.match(/\bpriority \/>/g)||[]).length,1,'Homepage must expose exactly one explicit LCP-priority TileMedia');
  assert.match(home,/fetchPriority=\{priority \? 'high' : 'auto'\}/);

  assert.match(pdp,/sizes="132px"/);
  assert.match(pdp,/sizes="\(max-width: 1023px\) calc\(100vw - 48px\), 520px"/);
  assert.match(pdp,/fetchPriority=\{idx === 0 \? 'high' : 'auto'\}/);
  assert.equal((pdp.match(/<img\b/g)||[]).length,1,'Only the interaction-gated lightbox may keep a raw source image');
});

test('Phase 10 self-hosts the approved font set without a browser Google Fonts request',async()=>{
  const [layout,css,mark]=await Promise.all([
    readFile(new URL('../../app/layout.tsx',import.meta.url),'utf8'),
    readFile(new URL('../../app/globals.css',import.meta.url),'utf8'),
    readFile(new URL('../../components/FeyaMark.tsx',import.meta.url),'utf8'),
  ]);

  assert.match(layout,/from 'next\/font\/google'/);
  assert.match(layout,/Manrope\(/);
  assert.match(layout,/Cormorant_Garamond\(/);
  assert.match(layout,/Italiana\(/);
  assert.match(layout,/variable:'--font-manrope'/);
  assert.match(layout,/variable:'--font-cormorant'/);
  assert.match(layout,/variable:'--font-italiana'/);
  assert.match(layout,/style:'normal'/);
  assert.match(layout,/manrope\.variable/);
  assert.match(layout,/cormorant\.variable/);
  assert.match(layout,/italiana\.variable/);

  assert.doesNotMatch(css,/fonts\.googleapis\.com/);
  assert.doesNotMatch(css,/@import\s+url\(/);
  assert.match(css,/font-family:\s*var\(--font-manrope\)/);
  assert.match(css,/font-family:\s*var\(--font-italiana\),\s*var\(--font-cormorant\)/);
  assert.match(mark,/var\(--font-italiana\), var\(--font-cormorant\), serif/);
});
