import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {SEARCH_OWNER_DISCOVERY_ITEMS} from '../../config/searchDiscoveryArchitecture.ts';

test('collections hub exposes every current owner through release-aware metadata and typed discovery roles',async()=>{
  const page=await readFile(new URL('../../app/collections/page.tsx',import.meta.url),'utf8');
  assert.match(page,/releaseRobotsForPath/);
  assert.match(page,/SEARCH_DISCOVERY_GROUPS/);
  assert.match(page,/data-discovery-role/);
  assert.equal(SEARCH_OWNER_DISCOVERY_ITEMS.length,10);
  assert.ok(SEARCH_OWNER_DISCOVERY_ITEMS.every(item=>item.href.startsWith('/collections/')));
});

test('homepage crawl path points Explore collections at the server-rendered collection hub',async()=>{
  const home=await readFile(new URL('../../app/page.tsx',import.meta.url),'utf8');
  assert.match(home,/href="\/collections" className="btn-ghost">Explore collections/);
});
