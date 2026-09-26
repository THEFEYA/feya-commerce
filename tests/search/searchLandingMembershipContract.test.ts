import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('collection route reads one immutable page version + matching membership snapshot',async()=>{
  const page=await readFile(new URL('../../app/collections/[slug]/page.tsx',import.meta.url),'utf8');
  const helper=await readFile(new URL('../../lib/searchLandingPageServer.ts',import.meta.url),'utf8');

  assert.match(page,/readSearchLandingRelease/);
  assert.doesNotMatch(page,/candidateMatchesProduct|matchTerms/);

  assert.match(helper,/feya_search_page_versions_v1/);
  assert.match(helper,/membership_snapshot_id/);
  assert.match(helper,/feya_search_membership_snapshots_v1/);
  assert.match(helper,/feya_search_membership_items_v1/);
  assert.match(helper,/eligibility_status','eligible'/);
  assert.match(helper,/orderability_status','confirmed'/);
  assert.match(helper,/SEARCH_LANDING_MEMBERSHIP_COUNT_MISMATCH/);
  assert.match(helper,/SEARCH_LANDING_STOREFRONT_PARITY_FAILED/);
  assert.match(helper,/SEARCH_LANDING_PRIMARY_CLUSTER_MISMATCH/);
  assert.match(helper,/SEARCH_LANDING_RELATED_LINK_NOT_IN_GRAPH/);
});

test('collection route keeps every preview noindex and renders visible breadcrumbs + structured data',async()=>{
  const page=await readFile(new URL('../../app/collections/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(page,/robots:\{index:false,follow:true\}/);
  assert.match(page,/aria-label="Breadcrumb"/);
  assert.match(page,/BreadcrumbList/);
  assert.match(page,/CollectionPage/);
  assert.match(page,/Search release status:/);
});
