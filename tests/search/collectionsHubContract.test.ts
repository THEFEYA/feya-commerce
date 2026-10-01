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
  assert.match(style,/readStyleTileAvailability/);
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


test('Style hub uses one desktop shortcut row, hides zero-state shortcuts and opens the Style filter group',async()=>{
  const component=await readFile(new URL('../../components/DiscoveryHubPage.tsx',import.meta.url),'utf8');
  const style=await readFile(new URL('../../app/style/page.tsx',import.meta.url),'utf8');
  const server=await readFile(new URL('../../lib/discoveryHubServer.ts',import.meta.url),'utf8');
  assert.match(component,/tiles\.length>5\?'lg:grid-cols-8':'lg:grid-cols-5'/);
  assert.match(style,/readStyleTileAvailability/);
  assert.match(style,/availability\.map\(\(entry\)=>entry\.tile\)/);
  assert.match(style,/defaultOpenFilterSections=\{\['Style'\]\}/);
  assert.match(server,/filter\(\(entry\)=>entry\.count>0\)/);
});

test('discovery hub product data keeps closed-review auth outside the shared catalog cache',async()=>{
  const server=await readFile(new URL('../../lib/discoveryHubServer.ts',import.meta.url),'utf8');
  assert.match(server,/readClosedReviewPresentation/);
  assert.match(server,/if\(review\.status==='blocked'\)return null/);
  assert.match(server,/readCachedApprovedStorefrontCatalogV1/);
  assert.match(server,/review\.release\.entries/);
  assert.doesNotMatch(server,/'use cache'/);
});


test('curated directory exposes governed membership count evidence without inventing live metrics',()=>{
  const owners=COLLECTION_DIRECTORY_GROUPS.flatMap((group)=>group.tiles);
  assert.equal(owners.every((tile)=>'pieceCount' in tile&&Number(tile.pieceCount)>0),true);
  assert.deepEqual(
    Object.fromEntries(owners.map((tile)=>[tile.href,tile.pieceCount])),
    {
      '/collections/shoulder-armor':80,
      '/collections/bodysuits':30,
      '/collections/costume-masks':11,
      '/collections/costume-headpieces':34,
      '/collections/costume-belts':13,
      '/collections/festival-outfits':111,
      '/collections/rave-outfits':40,
      '/collections/burning-man-looks':45,
      '/collections/stage-outfits':96,
      '/collections/festival-skirts':56,
    },
  );
});
