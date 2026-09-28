import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { STOREFRONT_NAVIGATION_PANELS } from '../../config/storefrontNavigation.ts';

test('collections hub is release-aware and projects the typed storefront navigation contract', async () => {
  const page = await readFile(new URL('../../app/collections/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /releaseRobotsForPath/);
  assert.match(page, /STOREFRONT_NAVIGATION_PANELS/);
  assert.match(page, /Shop by piece/);
  assert.match(page, /Shop by event/);
  assert.match(page, /Performance & dance/);
  assert.match(page, /Shop by style/);

  assert.equal(STOREFRONT_NAVIGATION_PANELS.events.groups[0].href, '/collections/festival-outfits');
  assert.equal(STOREFRONT_NAVIGATION_PANELS.events.groups[0].items.find((item) => item.code === 'rave')?.href, '/collections/rave-outfits');
  assert.equal(STOREFRONT_NAVIGATION_PANELS.events.groups[0].items.find((item) => item.code === 'burning_man')?.href, '/collections/burning-man-looks');
});

test('homepage crawl path points Explore collections at the server-rendered collection hub', async () => {
  const home = await readFile(new URL('../../app/page.tsx', import.meta.url), 'utf8');
  assert.match(home, /href="\/collections" className="btn-ghost">Explore collections/);
});
