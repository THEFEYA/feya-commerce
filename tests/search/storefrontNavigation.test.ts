import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STOREFRONT_NAVIGATION_PANELS,
  publicPrimaryNavigation,
} from '../../config/storefrontNavigation.ts';

test('public navigation keeps SEO owners separate from shopper filters', () => {
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

  const fullLooks = items.find((item) => item.code === 'full_looks');
  assert.equal(fullLooks?.href, '/shop?piece=Full%20Look');
  assert.equal(fullLooks?.role, 'filter');
});

test('all N7 primary discovery groups are publicly reachable without creating new SEO-owner URLs', () => {
  const publicCodes = publicPrimaryNavigation().map((item) => item.code);
  assert.deepEqual(publicCodes, ['shop','events','performance','style','about']);

  const styleItems = STOREFRONT_NAVIGATION_PANELS.style.groups.flatMap((group) => group.items);
  assert.deepEqual(
    styleItems.filter((item) => item.enabled).map(({label,href,role}) => ({label,href,role})),
    [
      {label:'Cyberpunk',href:'/shop?style=Cyberpunk',role:'filter'},
      {label:'Futuristic',href:'/shop?style=Futuristic',role:'filter'},
      {label:'Sci-Fi',href:'/shop?style=Sci-Fi',role:'filter'},
      {label:'Goth',href:'/shop?style=Goth',role:'filter'},
      {label:'Glam',href:'/shop?style=Glam',role:'filter'},
      {label:'Warrior',href:'/shop?style=Warrior',role:'filter'},
      {label:'Goddess',href:'/shop?style=Goddess',role:'filter'},
    ],
  );
  assert.ok(styleItems.every((item) => item.href?.startsWith('/shop?style=')));
});

test('event and performance navigation includes the target shopper refinements', () => {
  const eventItems = STOREFRONT_NAVIGATION_PANELS.events.groups.flatMap((group) => group.items);
  assert.deepEqual(
    eventItems.filter((item) => item.enabled).map(({ label, href }) => ({ label, href })),
    [
      { label: 'Festival', href: '/collections/festival-outfits' },
      { label: 'Rave', href: '/collections/rave-outfits' },
      { label: 'Burning Man', href: '/collections/burning-man-looks' },
      { label: 'Halloween', href: '/shop?event=Halloween' },
      { label: 'Pride', href: '/shop?event=Pride' },
      { label: 'Cosplay', href: '/shop?event=Cosplay' },
    ],
  );

  const performanceItems = STOREFRONT_NAVIGATION_PANELS.performance.groups.flatMap((group) => group.items);
  assert.deepEqual(
    performanceItems.filter((item) => item.enabled).map(({ label, href }) => ({ label, href })),
    [
      { label: 'Stage', href: '/collections/stage-outfits' },
      { label: 'Showgirl', href: '/shop?performance=Showgirl' },
      { label: 'Drag', href: '/shop?performance=Drag' },
      { label: 'Go-Go', href: '/shop?dance=Go-Go' },
      { label: 'Pole', href: '/shop?dance=Pole' },
    ],
  );
});

test('launch special structures are only Wings, Tail and Spine', () => {
  const shopItems = STOREFRONT_NAVIGATION_PANELS.shop.groups.flatMap((group) => group.items);
  const special = shopItems.filter((item) => ['wings','tail','spine'].includes(item.code));
  assert.deepEqual(
    special.map(({label,href}) => ({label,href})),
    [
      {label:'Wings',href:'/shop?piece=Wings'},
      {label:'Tail',href:'/shop?piece=Tail'},
      {label:'Spine',href:'/shop?piece=Spine'},
    ],
  );

  const serialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS);
  assert.doesNotMatch(serialized,/Backpiece|Back Piece|Cape\s*\/\s*Tunic|Tunic/i);
});
