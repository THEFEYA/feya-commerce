import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { STOREFRONT_NAVIGATION_PANELS } from '../../config/storefrontNavigation.ts';
import { HOME_PRESENTATION } from '../../config/homePresentation.ts';

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
  assert.equal(panel.groups[2].items.find((item) => item.code === 'stage_fashion')?.href, '/collections/stage-outfits');
});

test('homepage presentation exposes governed commerce destinations that render as server links', async () => {
  const home = await readFile(new URL('../../app/page.tsx', import.meta.url), 'utf8');
  assert.match(home, /HOME_PRESENTATION/);
  assert.match(home, /href=\{tile\.href\}/);

  const allHrefs = [
    ...HOME_PRESENTATION.pieceTiles.map((item) => item.href),
    ...HOME_PRESENTATION.eventTiles.flatMap((item) => [
      item.href,
      ...('shortcuts' in item && item.shortcuts ? item.shortcuts.map((shortcut) => shortcut.href) : []),
    ]),
    ...HOME_PRESENTATION.findTiles.map((item) => item.href),
  ];

  for (const href of [
    '/shop',
    '/collections/festival-outfits',
    '/collections/stage-outfits',
    '/collections/shoulder-armor',
  ]) {
    if (href === '/shop') continue;
    assert.ok(allHrefs.includes(href), href);
  }
});
