import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STOREFRONT_NAVIGATION_PANELS,
  publicPrimaryNavigation,
} from '../../config/storefrontNavigation.ts';

test('Shop mega-menu is rooted in product categories while SEO owners remain separate', () => {
  const shop = STOREFRONT_NAVIGATION_PANELS.shop;
  const groups = shop.groups;
  const items = groups.flatMap((group) => group.items);

  assert.deepEqual(
    groups.map((group) => group.label),
    ['Shop','Full Body','Upper Body','Arms','Lower Body','Legs','Head & Face','Special'],
  );

  const arms = groups.find((group) => group.code === 'arms');
  assert.equal(arms?.href, '/shop?part=Arms');
  assert.deepEqual(
    arms?.items.map(({label,href}) => ({label,href})),
    [
      {label:'Shoulders',href:'/collections/shoulder-armor'},
      {label:'Bracelets & Cuffs',href:'/shop?piece=Bracelet%20%2F%20Cuff'},
      {label:'Gloves',href:'/shop?piece=Glove'},
    ],
  );

  const shoulders = items.find((item) => item.code === 'shoulders');
  assert.equal(shoulders?.role, 'owner');
  assert.equal(shoulders?.href, '/collections/shoulder-armor');

  const upper = groups.find((group) => group.code === 'upper_body');
  assert.deepEqual(
    upper?.items.map(({label,href}) => ({label,href})),
    [
      {label:'Tops',href:'/shop?piece=Top'},
      {label:'Corsets',href:'/shop?piece=Corset'},
      {label:'Harnesses',href:'/shop?piece=Harness'},
    ],
  );
});

test('global navigation stays concise and all detailed taxonomy is inside hover panels', () => {
  const publicCodes = publicPrimaryNavigation().map((item) => item.code);
  assert.deepEqual(publicCodes, ['shop','events','performance','style','about']);

  const shopSerialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS.shop);
  assert.doesNotMatch(shopSerialized,/Size Guide|Shipping|Returns|Contact/);
});

test('event hierarchy keeps Festival as the root with Rave and Burning Man underneath', () => {
  const events = STOREFRONT_NAVIGATION_PANELS.events;
  const festival = events.groups.find((group) => group.code === 'festival');
  const other = events.groups.find((group) => group.code === 'other_events');

  assert.equal(festival?.href,'/collections/festival-outfits');
  assert.deepEqual(
    festival?.items.map(({label,href})=>({label,href})),
    [
      {label:'Rave',href:'/collections/rave-outfits'},
      {label:'Burning Man',href:'/collections/burning-man-looks'},
    ],
  );
  assert.deepEqual(
    other?.items.map(({label,href})=>({label,href})),
    [
      {label:'Halloween',href:'/shop?event=Halloween'},
      {label:'Pride',href:'/shop?event=Pride'},
      {label:'Cosplay',href:'/shop?event=Cosplay'},
    ],
  );
});

test('Performance and Dance remain separate branches', () => {
  const performance = STOREFRONT_NAVIGATION_PANELS.performance;
  assert.deepEqual(
    performance.groups.map((group)=>group.label),
    ['Performance','Dance'],
  );
  assert.deepEqual(
    performance.groups[0].items.map(({label,href})=>({label,href})),
    [
      {label:'Stage',href:'/collections/stage-outfits'},
      {label:'Showgirl',href:'/shop?performance=Showgirl'},
      {label:'Drag',href:'/shop?performance=Drag'},
    ],
  );
  assert.deepEqual(
    performance.groups[1].items.map(({label,href})=>({label,href})),
    [
      {label:'Go-Go',href:'/shop?dance=Go-Go'},
      {label:'Pole',href:'/shop?dance=Pole'},
    ],
  );
});

test('launch Special branch contains only Wings, Tail and Spine', () => {
  const special = STOREFRONT_NAVIGATION_PANELS.shop.groups.find((group) => group.code === 'special');
  assert.equal(special?.label,'Special');
  assert.deepEqual(
    special?.items.map(({label,href})=>({label,href})),
    [
      {label:'Wings',href:'/shop?piece=Wings'},
      {label:'Tail',href:'/shop?piece=Tail'},
      {label:'Spine',href:'/shop?piece=Spine'},
    ],
  );

  const serialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS);
  assert.doesNotMatch(serialized,/Backpiece|Back Piece|Cape\s*\/\s*Tunic|Tunic/i);
});
