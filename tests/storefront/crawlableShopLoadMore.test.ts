import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shop = readFileSync('components/ShopClient.tsx', 'utf8');
const pagination = readFileSync('components/ShopPagination.tsx', 'utf8');

test('page-1 /shop "Show 20 more" is a real link to the next server page (crawlable)', () => {
  const branch = shop.slice(shop.indexOf(') : canLoadMore ? ('), shop.indexOf('</main>', shop.indexOf(') : canLoadMore ? (')));
  assert.match(branch, /<a\s+href=\{shopPageHref\(Math\.floor\(visibleCount \/ PAGE_SIZE\) \+ 1, filters\)\}/);
  assert.match(branch, /event\.preventDefault\(\); setVisibleCount\(\(count\) => Math\.min\(count \+ PAGE_SIZE, filtered\.length\)\)/);
  assert.match(branch, /className="btn-ghost"\s*>\s*Show 20 more\s*<\/a>/);
});

test('shopper UX is unchanged: same label, same btn-ghost class as the approved page>1 link', () => {
  assert.match(pagination, /<a className="btn-ghost" href=\{shopPageHref\(page \+ 1, filters\)\}>Show 20 more<\/a>/);
  assert.equal((shop.match(/Show 20 more/g) || []).length, 2);
});

test('embedded collection grids keep the original button (membership-scoped, no /shop href)', () => {
  const branch = shop.slice(shop.indexOf(') : canLoadMore ? ('));
  assert.match(branch, /\{embedded \? \(\s*<button onClick=\{\(\) => setVisibleCount\(\(count\) => Math\.min\(count \+ PAGE_SIZE, filtered\.length\)\)\} className="btn-ghost">/);
});
