import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('owner-approved public storefront visual freeze is explicit and bounded', () => {
  const policy = readFileSync('docs/PUBLIC_STOREFRONT_VISUAL_FREEZE_V1.md','utf8');
  assert.ok(policy.includes('Status: OWNER APPROVED / FROZEN'));
  assert.ok(policy.includes('Baseline commit: `a8df15776b3fe9fe51e1b707a32c9818dc3a7a37`'));
  assert.ok(policy.includes('Do not combine an SEO/performance/data task with opportunistic visual redesign.'));
  assert.ok(policy.includes('A filter state does not become an indexable SEO page merely because it exists visually.'));
  assert.ok(policy.includes('data fetching, caching, ISR/static/SSR strategy'));
});

test('frozen storefront visual hooks remain present', () => {
  const css = readFileSync('app/globals.css','utf8');
  const home = readFileSync('app/page.tsx','utf8');
  const header = readFileSync('components/Header.tsx','utf8');
  const pdpTest = readFileSync('tests/search/pdpVisualContract.test.ts','utf8');

  for (const hook of [
    '.product-card .img-wrap::before',
    '.visual-hover-sheen::after',
    '.visual-section-divider',
    '.feya-config-trigger',
    '.feya-config-menu',
    "[data-testid='product-page'] aside .btn-gold.w-full.mt-2::before",
  ]) assert.ok(css.includes(hook), `missing frozen visual hook: ${hook}`);

  assert.ok(home.includes('<HomePieceCarousel'));
  assert.ok(home.includes('visual-hover-sheen group relative aspect-[3/4]'));
  assert.ok(header.includes('visual-mega-preview-band'));
  assert.ok(pdpTest.includes('PDP keeps the approved SEO description contract and code-owned support column'));
});
