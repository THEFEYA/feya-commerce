import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reader = readFileSync('lib/owner-ui/activeSearchReleaseEvidenceServer.ts', 'utf8');
const launch = readFileSync('app/admin/launch-readiness/page.tsx', 'utf8');
const today = readFileSync('app/admin/company/page.tsx', 'utf8');
const system = readFileSync('app/admin/company/system/page.tsx', 'utf8');

test('owner-facing reports reuse exactly one server-only and fail-closed ACTIVE Search source', () => {
  assert.match(reader, /import 'server-only'/);
  assert.match(reader, /\.eq\('release_status', 'ACTIVE'\)/);
  assert.match(reader, /releases\.data\.length !== 1/);
  assert.match(reader, /release\.target_origin !== 'https:\/\/thefeya\.com'/);
  assert.match(reader, /\.eq\('intended_index_state', 'index'\)/);
  assert.match(reader, /\.eq\('intended_index_state', 'noindex'\)/);
  assert.match(reader, /index\.count == null \|\| noindex\.count == null \|\| products\.count == null/);
  for (const page of [launch, today, system]) {
    assert.match(page, /getActiveSearchEvidence/);
    assert.doesNotMatch(page, /\.from\('feya_search_releases_v1'\)/);
  }
});

test('Director Today prioritizes live search approval over legacy blocked status', () => {
  assert.match(today, /Поисковый релиз/);
  assert.match(today, /activeSearch\.value\.intendedIndex/);
  assert.match(today, /activeSearch\.value\.intendedNoindex/);
  assert.match(today, /activeSearch\.value\.approvedProducts/);
  assert.match(today, /Исторические проверки readiness v2/);
  assert.match(today, /Это не данные о фактической индексации Google, оплате или конверсии/);
  assert.ok(today.indexOf('ACTIVE Search Release') < today.indexOf('Исторические проверки readiness v2'));
});

test('system retains operational source-health and clearly separates legacy readiness from release truth', () => {
  assert.match(system, /Search Release и источники готовности/);
  assert.match(system, /activeSearch\.value\.intendedIndex/);
  assert.match(system, /activeSearch\.value\.intendedNoindex/);
  assert.match(system, /Историческая диагностика readiness v2/);
  assert.match(system, /это не число проиндексированных/i);
  assert.ok(system.indexOf('activeSearch.value ?') < system.indexOf('Историческая диагностика readiness v2'));
  assert.match(system, /feya_commerce_v_data_source_health_effective_safe_v2/);
});

test('reporting change does not write release, purchase or owner signoff state', () => {
  for (const file of [reader,launch,today,system]) {
    assert.doesNotMatch(file, /\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
    assert.doesNotMatch(file, /FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE\s*=/);
    assert.doesNotMatch(file, /PHASE13_PRODUCTION_PUBLISH_AUTHORIZED\s*=/);
  }
});
