import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEARCH_DISCOVERY_GROUPS,
  SEARCH_OWNER_DISCOVERY_ITEMS,
  SEARCH_FILTER_DISCOVERY_ITEMS,
  HOME_COLLECTION_GATEWAYS,
  discoveryItemForPath,
} from '../../config/searchDiscoveryArchitecture.ts';
import {getBusinessCaseLandingCandidates} from '../../config/searchLandingCandidates.ts';

test('G-half discovery owners exactly match the 10 business-case collection routes',()=>{
  const expected=new Set(getBusinessCaseLandingCandidates().map(c=>`/collections/${c.slug}`));
  const observed=new Set(SEARCH_OWNER_DISCOVERY_ITEMS.map(item=>item.href));
  assert.deepEqual([...observed].sort(),[...expected].sort());
});

test('filter discovery entries never masquerade as collection owners',()=>{
  assert.ok(SEARCH_FILTER_DISCOVERY_ITEMS.length>0);
  for(const item of SEARCH_FILTER_DISCOVERY_ITEMS){
    assert.equal(item.role,'FILTER');
    assert.match(item.href,/^\/shop\?/);
  }
});

test('owner discovery entries are unique and remain collection paths',()=>{
  const hrefs=SEARCH_OWNER_DISCOVERY_ITEMS.map(item=>item.href);
  assert.equal(new Set(hrefs).size,hrefs.length);
  for(const item of SEARCH_OWNER_DISCOVERY_ITEMS){
    assert.match(item.href,/^\/collections\/[a-z0-9-]+$/);
    assert.ok(item.role==='OWNER'||item.role==='INTERSECTION_OWNER');
  }
});

test('homepage uses a bounded subset of evidence-backed owners',()=>{
  assert.ok(HOME_COLLECTION_GATEWAYS.length<=6);
  for(const href of HOME_COLLECTION_GATEWAYS){
    const item=discoveryItemForPath(href);
    assert.ok(item);
    assert.notEqual(item?.role,'FILTER');
  }
});

test('discovery groups stay orthogonal and named',()=>{
  assert.deepEqual(
    SEARCH_DISCOVERY_GROUPS.map(group=>group.code),
    ['product_types','events','performance','styles']
  );
});
