import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('homepage uses the owner-approved smaller tall editorial display typography', () => {
  const source = readFileSync('app/page.tsx','utf8');
  assert.match(source,/font-tall m-0 max-w-\[680px\] text-\[clamp\(48px,6vw,86px\)\]/);
  assert.match(source,/font-tall text-\[clamp\(32px,3\.7vw,52px\)\]/);
  assert.doesNotMatch(source,/text-\[clamp\(36px,4\.6vw,64px\)\]/);
});

test('catalog uses FEYA circular check controls and no noisy unmapped label copy', () => {
  const source = readFileSync('components/ShopClient.tsx','utf8');
  assert.match(source,/rounded-full border transition-all/);
  assert.doesNotMatch(source,/Not yet mapped/);
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
