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
