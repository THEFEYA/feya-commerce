import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('storefront facet server reads exact immutable shopper and SEO membership snapshots through the server-only boundary', async () => {
  const source = await readFile(new URL('../../lib/storefrontFacetsServer.ts', import.meta.url), 'utf8');

  assert.match(source, /getSupabaseServiceRoleClient/);
  assert.match(source, /feya_storefront_facet_snapshots_v1/);
  assert.match(source, /feya_storefront_facet_items_v1/);
  assert.match(source, /feya-n7-20260927-v1/);
  assert.match(source, /feya_search_membership_snapshots_v1/);
  assert.match(source, /feya_search_membership_items_v1/);
  assert.match(source, /feya-review-207-20260924\|approved-seo-pack-current\|phase-d-20260926/);
  assert.doesNotMatch(source, /feya_search_v_candidate_membership_current_v1/);
  assert.match(source, /eligibility_status', 'eligible'/);
  assert.match(source, /orderability_status', 'confirmed'/);
});

test('shopper facet projection reads structured snapshot fields and never falls back to title/meta inference', async () => {
  const source = await readFile(new URL('../../lib/storefrontFacetsServer.ts', import.meta.url), 'utf8');

  assert.match(source, /parent_components_json,child_components_json,component_groups_json,event_values_json,style_values_json,persona_values_json,canonical_color_label/);
  assert.match(source, /facet_contract_version/);
  assert.match(source, /product_count !== 207/);
  assert.doesNotMatch(source, /seo_title,meta_description/);
  assert.doesNotMatch(source, /productSearchText/);
  assert.doesNotMatch(source, /feya_commerce_v_seo_product_truth_v4/);
});
