import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('PDP related collection links come from immutable Page Portfolio membership',async()=>{
  const pdp=await readFile(new URL('../../app/shop/[slug]/page.tsx',import.meta.url),'utf8');
  const helper=await readFile(new URL('../../lib/searchProductLandingLinks.ts',import.meta.url),'utf8');

  assert.match(pdp,/readProductLandingLinks/);
  assert.doesNotMatch(pdp,/collectionsForProduct/);
  assert.doesNotMatch(pdp,/\/shop\?collection=/);
  assert.match(pdp,/href=\{`\/collections\/\$\{collection\.slug\}`\}/);

  assert.match(helper,/feya_search_membership_items_v1/);
  assert.match(helper,/feya_search_membership_snapshots_v1/);
  assert.match(helper,/phase-d-20260926/);
  assert.match(helper,/eligibility_status','eligible'/);
  assert.match(helper,/orderability_status','confirmed'/);
  assert.match(helper,/business_case_noindex/);
  assert.match(helper,/slug,/);
});
