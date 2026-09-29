// Final owner visual QA contract — 2026-09-29
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('homepage uses the owner-approved smaller tall editorial display typography', () => {
  const source = readFileSync('app/page.tsx','utf8');
  assert.match(source,/font-tall m-0 max-w-\[680px\] text-\[clamp\(48px,6vw,86px\)\]/);
  assert.match(source,/font-tall text-\[clamp\(32px,3\.7vw,52px\)\]/);
  assert.doesNotMatch(source,/text-\[clamp\(36px,4\.6vw,64px\)\]/);
});

test('catalog uses outlined circular FEYA checks and scrolls with the page', () => {
  const source = readFileSync('components/ShopClient.tsx','utf8');
  assert.match(source,/rounded-full border transition-all/);
  assert.match(source,/border-\[#d8b56d\] bg-transparent text-\[#e6c886\]/);
  assert.doesNotMatch(source,/Not yet mapped/);
  assert.doesNotMatch(source,/sticky top-24 max-h-\[calc\(100vh-7rem\)\]/);
  assert.match(source,/title="Audience"/);
  assert.ok(source.indexOf('title="Audience"') < source.indexOf('title="Body Area"'));
  assert.ok(source.indexOf('title="Body Area"') < source.indexOf('title="Price"'));
  assert.ok(source.indexOf('title="Price"') < source.indexOf('title="Color"'));
});

test('hybrid shell keeps the fixed header above editorial content so mega-menus cannot be covered by hero media', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.match(css,/\.visual-commerce-shell > header \{\s*z-index: 60;/);
  assert.doesNotMatch(css,/\.visual-commerce-shell > \* \{\s*position: relative;\s*z-index: 1;/);
});

test('desktop mega menu reserves a right-side real-product preview for all discovery panels', () => {
  const source = readFileSync('components/Header.tsx','utf8');
  assert.match(source,/SHOP_MEGA_PREVIEWS/);
  assert.match(source,/EVENTS_PERFORMANCE_MEGA_PREVIEWS/);
  assert.match(source,/STYLE_MEGA_PREVIEWS/);
  assert.match(source,/grid-cols-\[minmax\(0,1fr\)_minmax\(280px,\.34fr\)\]/);
  assert.match(source,/Product preview/);
  assert.match(source,/Look preview/);
});


test('homepage Shop by Piece is a configurable real-image carousel with manual and automatic motion', () => {
  const home = readFileSync('app/page.tsx','utf8');
  const carousel = readFileSync('components/HomePieceCarousel.tsx','utf8');
  assert.match(home,/HomePieceCarousel/);
  assert.match(home,/HOME_PRESENTATION\.pieceTiles\.map/);
  assert.match(carousel,/setInterval/);
  assert.match(carousel,/scrollBy/);
  assert.match(carousel,/prefers-reduced-motion/);
  assert.match(carousel,/visual-tile-label-band/);
});

test('FEYA buttons keep dimensional gradients and use left-to-right shimmer instead of flat pulse', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.match(css,/\.visual-hero-cta::before/);
  assert.match(css,/@keyframes feyaCtaSweep/);
  assert.match(css,/\[data-testid='product-page'\] aside \.btn-gold\.w-full\.mt-2::before/);
  assert.match(css,/@keyframes feyaBuySweep/);
  assert.match(css,/linear-gradient\(180deg, #f2dda7 0%, #d4b26a 52%, #a87c31 100%\)/);
});

test('homepage sections have subtle depth bands and faded gold separators', () => {
  const css = readFileSync('app/globals.css','utf8');
  const home = readFileSync('app/page.tsx','utf8');
  assert.match(css,/\.visual-home-section::before/);
  assert.match(css,/\.visual-home-section--raised/);
  assert.match(css,/\.visual-home-section--deep/);
  assert.match(home,/tone="raised"/);
  assert.match(home,/tone="deep"/);
});


test('approved mood bands are full-width, centered and use plain secondary axis labels', () => {
  const home = readFileSync('app/page.tsx','utf8');
  const css = readFileSync('app/globals.css','utf8');
  assert.match(home,/visual-tile-label-band visual-mood-label-band absolute inset-x-0 bottom-0/);
  assert.match(home,/text-center/);
  assert.match(css,/\.visual-tile-label-band::before/);
  assert.match(css,/\.visual-axis-pill \{/);
  assert.match(css,/border: 0;/);
  assert.match(css,/background: transparent;/);
});

test('section dividers are single soft center-glow lines with stronger edge fade', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.match(css,/\.visual-section-divider \{/);
  assert.match(css,/transparent 14%/);
  assert.match(css,/rgba\(216,181,109,\.17\) 50%/);
  assert.match(css,/transparent 86%/);
});

test('Shop by Piece advances every three seconds and uses integrated full-width label bands', () => {
  const source = readFileSync('components/HomePieceCarousel.tsx','utf8');
  assert.match(source,/\}, 3000\);/);
  assert.match(source,/visual-piece-label-band absolute inset-x-0 bottom-0/);
});

test('Buy It Now shimmer cadence is five seconds and PDP thumbnail rail is wider and closer', () => {
  const css = readFileSync('app/globals.css','utf8');
  const pdp = readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(css,/animation: feyaBuySweep 5s ease-in-out infinite/);
  assert.match(pdp,/lg:flex lg:items-start lg:gap-2/);
  assert.match(pdp,/lg:w-\[132px\] lg:shrink-0/);
});


test('label bands stay at the bottom and never override absolute positioning', () => {
  const css = readFileSync('app/globals.css','utf8');
  const home = readFileSync('app/page.tsx','utf8');
  const carousel = readFileSync('components/HomePieceCarousel.tsx','utf8');
  const header = readFileSync('components/Header.tsx','utf8');

  assert.doesNotMatch(css,/\.visual-tile-label-band \{\s*position: relative;/);
  assert.match(home,/visual-mood-label-band absolute inset-x-0 bottom-0/);
  assert.match(carousel,/visual-piece-label-band absolute inset-x-0 bottom-0/);
  assert.match(header,/visual-mega-preview-band absolute inset-x-0 bottom-0/);
});

test('redundant Complete Looks homepage section is removed', () => {
  const home = readFileSync('app/page.tsx','utf8');
  assert.doesNotMatch(home,/Complete looks, every piece considered/);
  assert.doesNotMatch(home,/eyebrow="Shop the look"/);
});

test('desktop catalog filters no longer sit inside framed outer or Body Area panels', () => {
  const source = readFileSync('components/ShopClient.tsx','utf8');
  assert.doesNotMatch(source,/rounded-xl border border-white\/\[0\.08\] bg-\[linear-gradient\(180deg,rgba\(255,255,255,\.025\),rgba\(255,255,255,\.008\)\)\]/);
  assert.doesNotMatch(source,/divide-y divide-white\/\[0\.07\] rounded-lg border border-white\/\[0\.08\]/);
  assert.match(source,/grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(source,/grid-cols-2 gap-x-3 gap-y-3/);
});


test('product cards keep a visible idle border and brighten with shadow on hover', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.match(css,/border-color: rgba\(216,214,211,\.20\)/);
  assert.match(css,/border-color: rgba\(216,181,109,\.46\)/);
  assert.match(css,/0 30px 62px -22px rgba\(0,0,0,\.86\)/);
});

test('mega preview and mood bands stay compact and remove white edge treatment', () => {
  const css = readFileSync('app/globals.css','utf8');
  const header = readFileSync('components/Header.tsx','utf8');
  assert.match(css,/\.visual-mood-label-band \{[\s\S]*min-height: 82px/);
  assert.match(css,/\.visual-mega-preview-band \{[\s\S]*min-height: 86px/);
  assert.match(header,/border-\[rgba\(216,181,109,\.09\)\]/);
  assert.match(header,/visual-mega-preview-band absolute inset-x-0 bottom-0 px-5 py-4/);
});

test('hover media crop stays anchored higher instead of drifting down', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.match(css,/\.visual-commerce-shell \.product-card \.primary-media,[\s\S]*object-position: 50% 30%/);
  assert.match(css,/transform-origin: 50% 35%/);
});


test('PDP main image stays in the first media row beside the wider thumbnail rail', () => {
  const pdp = readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(pdp,/lg:flex lg:items-start lg:gap-2/);
  assert.match(pdp,/lg:w-\[132px\] lg:shrink-0/);
  assert.match(pdp,/col-span-12 lg:min-w-0 lg:flex-1 lg:self-start flex justify-center/);
});

test('homepage uses explicit soft gold-fade section dividers and compact trust strip', () => {
  const home = readFileSync('app/page.tsx','utf8');
  const css = readFileSync('app/globals.css','utf8');
  assert.match(home,/visual-section-divider/);
  assert.match(home,/container-feya py-7 lg:py-9/);
  assert.match(css,/\.visual-section-divider \{/);
});

test('footer is compact and PDP configuration selector uses layered modern surfaces', () => {
  const footer = readFileSync('components/Footer.tsx','utf8');
  const css = readFileSync('app/globals.css','utf8');
  assert.match(footer,/py-10 lg:py-12/);
  assert.match(css,/\.feya-config-trigger/);
  assert.match(css,/\.feya-config-menu/);
  assert.match(css,/\.feya-config-option-active/);
});
