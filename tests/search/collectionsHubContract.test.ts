import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {COLLECTION_DIRECTORY_GROUPS,EVENTS_PERFORMANCE_HUB_TILES,STYLE_HUB_TILES} from '../../config/discoveryHubs.ts';

test('Phase 8 gives Events & Performance and Style dedicated product-led hubs',async()=>{
  const events=await readFile(new URL('../../app/events-performance/page.tsx',import.meta.url),'utf8');
  const style=await readFile(new URL('../../app/style/page.tsx',import.meta.url),'utf8');
  for(const source of [events,style]){
    assert.match(source,/export const instant = true/);
    assert.match(source,/DiscoveryTileRow/);
    assert.match(source,/DiscoveryHubProducts/);
    assert.match(source,/releaseRobotsForPath/);
  }
  assert.match(events,/EVENTS_PERFORMANCE_HUB_TILES/);
  assert.match(style,/STYLE_HUB_TILES/);
  assert.equal(EVENTS_PERFORMANCE_HUB_TILES.every((tile)=>tile.role==='owner'),true);
  assert.equal(STYLE_HUB_TILES.every((tile)=>tile.role==='filter'),true);
});

test('public Collections is a curated owner directory, not a registry tree',async()=>{
  const page=await readFile(new URL('../../app/collections/page.tsx',import.meta.url),'utf8');
  const owners=COLLECTION_DIRECTORY_GROUPS.flatMap((group)=>group.tiles);
  assert.equal(owners.length,10);
  assert.equal(new Set(owners.map((tile)=>tile.href)).size,10);
  assert.equal(owners.every((tile)=>tile.role==='owner'),true);
  assert.match(page,/COLLECTION_DIRECTORY_GROUPS/);
  assert.doesNotMatch(page,/STOREFRONT_NAVIGATION_PANELS|Product DNA|search-owner|registry/i);
  assert.match(page,/href="\/events-performance"/);
  assert.match(page,/href="\/style"/);
});

test('all ten approved owners have crawlable directory links and Event hub covers its five owners',()=>{
  const directoryHrefs=new Set(COLLECTION_DIRECTORY_GROUPS.flatMap((group)=>group.tiles.map((tile)=>tile.href)));
  for(const href of [
    '/collections/shoulder-armor',
    '/collections/bodysuits',
    '/collections/costume-masks',
    '/collections/costume-headpieces',
    '/collections/costume-belts',
    '/collections/festival-outfits',
    '/collections/rave-outfits',
    '/collections/burning-man-looks',
    '/collections/stage-outfits',
    '/collections/festival-skirts',
  ]) assert.equal(directoryHrefs.has(href),true,href);
  assert.deepEqual(
    EVENTS_PERFORMANCE_HUB_TILES.map((tile)=>tile.href),
    [
      '/collections/festival-outfits',
      '/collections/rave-outfits',
      '/collections/burning-man-looks',
      '/collections/stage-outfits',
      '/collections/festival-skirts',
    ],
  );
});
