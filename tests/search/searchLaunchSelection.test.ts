import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { selectLaunchSources } from '../../lib/searchLaunchSelection.ts';
const read = (name: string) => JSON.parse(readFileSync(`docs/search/${name}-20260924.json`, 'utf8'));
const sources = read('approved-catalog-content-bindings').entries;
const decisions = read('owner-product-decisions').launch_selections;

test('owner duplicate decision preserves 208 sources and yields 207 future entries, keeping both witch listings', () => {
  const before = JSON.stringify(sources), result = selectLaunchSources(sources, decisions);
  assert.equal(result.visible.length, 207); assert.equal(result.suppressed.length, 1);
  assert.equal(result.suppressed[0].identity.canonical_product_id, 'd42dd678-7b11-4f38-890e-411de686f418');
  for (const id of ['453ffb2e-2ed9-4e8d-b74c-e891604f9644', '340b160f-93e3-4389-866f-df79cc14dea8', '83ea907b-a523-47cf-834f-5a1b16b80339'])
    assert.ok(result.visible.some(s => s.identity.canonical_product_id === id));
  assert.equal(result.can_publish, false); assert.equal(result.can_index, false);
  assert.equal(result.redirect_candidates[0].activation_authorized, false);
  assert.equal(JSON.stringify(sources), before);
});

test('suppression fails closed when retained content or suppressed page identity changes', () => {
  for (const side of ['source', 'retained']) {
    for (const key of ['canonical_product_id', 'seo_page_id', 'draft_id', 'content_sha256']) {
      const changed = structuredClone(decisions); changed[0][side][key] = 'different';
      assert.throws(() => selectLaunchSources(sources, changed), /scope_mismatch/);
    }
  }
  assert.throws(() => selectLaunchSources(sources, [...decisions, ...decisions]), /scope_mismatch/);
});

test('suppression cannot hide its own destination, chain redirects or collapse colliding source identities', () => {
  const reverse = { ...decisions[0], decision_id: 'reverse', source: decisions[0].retained, retained: decisions[0].source };
  assert.throws(() => selectLaunchSources(sources, [...decisions, reverse]), /destination_not_visible/);
  assert.throws(() => selectLaunchSources([...sources, sources[0]], decisions), /identity_collision/);
  const changed = structuredClone(sources); changed[1].payload.metadata.canonical_path = changed[0].payload.metadata.canonical_path;
  assert.throws(() => selectLaunchSources(changed, decisions), /identity_collision/);
});
