import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STOREFRONT_NAVIGATION_PANELS,
  publicPrimaryNavigation,
} from '../../config/storefrontNavigation.ts';

test('public navigation keeps owner routes separate from shopper labels', () => {
  const shop = STOREFRONT_NAVIGATION_PANELS.shop;
  const items = shop.groups.flatMap((group) => group.items);

  const shoulders = items.find((item) => item.code === 'shoulders');
  assert.equal(shoulders?.label, 'Shoulders');
  assert.equal(shoulders?.href, '/collections/shoulder-armor');
  assert.equal(shoulders?.role, 'owner');

  const arms = items.find((item) => item.code === 'arms');
  assert.equal(arms?.label, 'Arms');
  assert.equal(arms?.href, '/shop?part=Arms');
  assert.equal(arms?.role, 'filter');
});

test('unready style candidates stay in the internal target contract but do not enter public top navigation', () => {
  const publicCodes = publicPrimaryNavigation().map((item) => item.code);
  assert.ok(publicCodes.includes('shop'));
  assert.ok(publicCodes.includes('events'));
  assert.ok(publicCodes.includes('performance'));
  assert.ok(publicCodes.includes('about'));
  assert.ok(!publicCodes.includes('style'));

  const styleItems = STOREFRONT_NAVIGATION_PANELS.style.groups.flatMap((group) => group.items);
  assert.ok(styleItems.some((item) => item.code === 'cyberpunk' && item.enabled === false));
  assert.ok(styleItems.some((item) => item.code === 'futuristic' && item.enabled === false));
  assert.ok(styleItems.some((item) => item.code === 'sci_fi' && item.label === 'Sci-Fi' && item.enabled === false));
});

test('event public labels stay short while proven owner routes remain intact', () => {
  const items = STOREFRONT_NAVIGATION_PANELS.events.groups.flatMap((group) => group.items);
  assert.deepEqual(
    items.filter((item) => item.enabled).map(({ label, href }) => ({ label, href })),
    [
      { label: 'Festival', href: '/collections/festival-outfits' },
      { label: 'Rave', href: '/collections/rave-outfits' },
      { label: 'Burning Man', href: '/collections/burning-man-looks' },
    ],
  );
});
