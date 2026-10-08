import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('Product OS and Company Control preserve distinct shells and canonical owner routes', () => {
  const root = read('app/admin/page.tsx'), shell = read('components/admin/AdminLegacyShell.tsx');
  const owner = read('components/admin/OwnerShell.tsx'), nav = read('components/AdminNav.tsx');
  const delivery = read('app/admin/company/delivery/page.tsx');
  assert.match(shell, /pathname\.startsWith\('\/admin\/company'\)/);
  assert.match(shell, /return <OwnerShell>\{children\}<\/OwnerShell>/);
  assert.match(nav, /href="\/admin\/company"/);
  assert.match(nav, /href="\/admin\/company\/delivery"/);
  assert.match(root, /href="\/admin\/company\/delivery"/);
  assert.match(owner, /href: '\/admin\/products'/);
  assert.match(delivery, /DeliveryWorkspaceClient/);
});

test('Product OS v4 failures cannot present a false 0-product readiness score', () => {
  const root = read('app/admin/page.tsx');
  assert.match(root, /\.from\(STOREFRONT_VIEW_V4\)/);
  assert.match(root, /\.abortSignal\(AbortSignal\.timeout\(8000\)\)/);
  assert.match(root, /const error = productsError \|\| eventsResult\.error/);
  assert.match(root, /\{!error \? <><AdminReadinessOverviewClient/);
  assert.match(root, /Нули не означают отсутствие товаров/);
  assert.match(root, /role="alert"/);
  assert.match(root, /Сводка Product OS временно недоступна/);
});
