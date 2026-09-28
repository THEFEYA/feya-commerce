import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { STOREFRONT_NAVIGATION_PANELS } from '../../config/storefrontNavigation.ts';

test('collections hub is release-aware and projects the merged shopper discovery contract', async () => {
  const page = await readFile(new URL('../../app/collections/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /releaseRobotsForPath/);
  assert.match(page, /STOREFRONT_NAVIGATION_PANELS/);
  assert.match(page, /Shop by piece/);
  assert.match(page, /Events & performance/);
  assert.match(page, /Shop by style/);
  assert.match(page, /panelCode="events_performance"/);

  const panel = STOREFRONT_NAVIGATION_PANELS.events_performance;
  assert.equal(panel.groups[0].href, '/collections/festival-outfits');
  assert.equal(panel.groups[0].items.find((item) => item.code === 'rave')?.href, '/collections/rave-outfits');
  assert.equal(panel.groups[0].items.find((item) => item.code === 'burning_man')?.href, '/collections/burning-man-looks');
  assert.equal(panel.groups[2].items.find((item) => item.code === 'stage')?.href, '/collections/stage-outfits');
});

test('homepage crawl path points Explore collections at the server-rendered collection hub', async () => {
  const home = await readFile(new URL('../../app/page.tsx', import.meta.url), 'utf8');
  assert.match(home, /href="\/collections" className="btn-ghost">Explore collections/);
});
