import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/admin/launch-readiness/page.tsx', 'utf8');

test('owner launch page reads one live ACTIVE Search Release, never an old indexation gate as authority', () => {
  assert.match(page, /await connection\(\)/);
  assert.match(page, /\.from\('feya_search_releases_v1'\)/);
  assert.match(page, /\.eq\('release_status', 'ACTIVE'\)/);
  assert.match(page, /releases\.data\.length !== 1/);
  assert.match(page, /release\.target_origin !== 'https:\/\/thefeya\.com'/);
  assert.match(page, /\.from\('feya_search_release_items_v1'\)/);
  assert.match(page, /\.eq\('intended_index_state', 'index'\)/);
  assert.match(page, /\.eq\('intended_index_state', 'noindex'\)/);
  assert.match(page, /\.from\('feya_storefront_approved_product_bindings_v1'\)/);
  assert.match(page, /index\.count == null \|\| noindex\.count == null \|\| products\.count == null/);
});

test('legacy readiness is explicitly quarantined, Search counts are not hard-coded', () => {
  assert.match(page, /Исторические условия readiness v2/);
  assert.match(page, /Актуальные данные из ACTIVE release/);
  assert.match(page, /Реальное количество проиндексированных Google страниц/);
  assert.match(page, /Публикация оригинальных текстов 207 PDP имеет отдельный owner-controlled gate/);
  assert.doesNotMatch(page, /<strong>18<\/strong>|<strong>210<\/strong>|<strong>207<\/strong>/);
  assert.ok(page.indexOf('Текущий Search Release — отдельно') < page.indexOf('Исторические условия readiness v2'));
});

test('Phase13 management provenance is read-only and does not touch the public site or payment', () => {
  assert.doesNotMatch(page, /\.insert\(|\.upsert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(page, /process\.env\.FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE|process\.env\.FEYA_PAYMENTS_ENABLED/);
});
