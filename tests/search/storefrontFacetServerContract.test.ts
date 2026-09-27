import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('storefront facet server reads exact immutable membership snapshots through the server-only service boundary', async () => {
  const source = await readFile(new URL('../../lib/storefrontFacetsServer.ts', import.meta.url), 'utf8');

  assert.match(source, /getSupabaseServiceRoleClient/);
  assert.match(source, /feya_search_membership_snapshots_v1/);
  assert.match(source, /feya_search_membership_items_v1/);
  assert.match(source, /feya-review-207-20260924\|approved-seo-pack-current\|phase-d-20260926/);
  assert.doesNotMatch(source, /feya_search_v_candidate_membership_current_v1/);
  assert.match(source, /eligibility_status', 'eligible'/);
  assert.match(source, /orderability_status', 'confirmed'/);
});

test('storefront facet projection selects only the product fields needed for shopper facets', async () => {
  const source = await readFile(new URL('../../lib/storefrontFacetsServer.ts', import.meta.url), 'utf8');

  assert.match(source, /canonical_product_id,parent_components_json,child_components_json,canonical_color_label/);
  assert.doesNotMatch(source, /seo_title,meta_description/);
  assert.doesNotMatch(source, /productSearchText/);
});
