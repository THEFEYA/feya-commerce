import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('collection route reads immutable membership instead of matching product copy',async()=>{
  const page=await readFile(new URL('../../app/collections/[slug]/page.tsx',import.meta.url),'utf8');
  const helper=await readFile(new URL('../../lib/searchLandingMembership.ts',import.meta.url),'utf8');

  assert.match(page,/readSearchLandingMembership/);
  assert.doesNotMatch(page,/candidateMatchesProduct|matchTerms/);

  assert.match(helper,/feya_search_membership_snapshots_v1/);
  assert.match(helper,/feya_search_membership_items_v1/);
  assert.match(helper,/SEARCH_MEMBERSHIP_SOURCE_REVISION/);
  assert.match(helper,/eligibility_status', 'eligible'/);
  assert.match(helper,/orderability_status', 'confirmed'/);
  assert.match(helper,/SEARCH_LANDING_MEMBERSHIP_COUNT_MISMATCH/);
  assert.match(helper,/SEARCH_LANDING_STOREFRONT_PARITY_FAILED/);
});
