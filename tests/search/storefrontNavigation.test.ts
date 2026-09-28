import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STOREFRONT_NAVIGATION_PANELS,
  publicPrimaryNavigation,
} from '../../config/storefrontNavigation.ts';

test('global navigation stays compact while Shop contains the complete product tree', () => {
  assert.deepEqual(publicPrimaryNavigation().map((item) => item.code), ['shop','events','performance','style','about']);

  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  assert.deepEqual(groups.map((group) => group.label), [
    'Shop','Full Body','Upper Body','Arms','Lower Body','Legs','Head & Face','Special',
  ]);

  const shopSerialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS.shop);
  assert.doesNotMatch(shopSerialized,/Size Guide|Shipping|Returns|Contact/);
});

test('Upper Body and Arms preserve owner-approved distinct product concepts', () => {
  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  const upper = groups.find((group) => group.code === 'upper_body');
  const arms = groups.find((group) => group.code === 'arms');

  assert.deepEqual(
    upper?.items.map(({label,href})=>({label,href})),
    [
      {label:'Tops',href:'/shop?piece=Top'},
      {label:'Bra Tops',href:'/shop?piece=Bra'},
      {label:'Corsets',href:'/shop?piece=Corset'},
      {label:'Harnesses',href:'/shop?piece=Harness'},
    ],
  );

  assert.deepEqual(
    arms?.items.map(({label,href})=>({label,href})),
    [
      {label:'Shoulders',href:'/collections/shoulder-armor'},
      {label:'Bracelets & Cuffs',href:'/shop?piece=Bracelet%20%2F%20Cuff'},
      {label:'Gloves',href:'/shop?piece=Glove'},
    ],
  );
});

test('Head & Face and Special contain every current non-empty agreed branch', () => {
  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  const head = groups.find((group) => group.code === 'head_face');
  const special = groups.find((group) => group.code === 'special');

  assert.deepEqual(
    head?.items.map((item)=>item.label),
    ['Masks','Headpieces','Horns','Crowns','Chokers'],
  );
  assert.deepEqual(
    special?.items.map((item)=>item.label),
    ['Wings','Tail','Spine'],
  );

  const serialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS);
  assert.doesNotMatch(serialized,/Backpiece|Back Piece|Cape\s*\/\s*Tunic|Tunic/i);
});

test('Festival branches through Rave to EDM EDC and Coachella while Burning Man remains distinct', () => {
  const festival = STOREFRONT_NAVIGATION_PANELS.events.groups.find((group) => group.code === 'festival');
  const rave = festival?.items.find((item) => item.code === 'rave');

  assert.equal(festival?.href,'/collections/festival-outfits');
  assert.equal(rave?.href,'/collections/rave-outfits');
  assert.deepEqual(rave?.children?.map(({label,href})=>({label,href})),[
    {label:'EDM',href:'/shop?event=EDM'},
    {label:'EDC',href:'/shop?event=EDC'},
    {label:'Coachella',href:'/shop?event=Coachella'},
  ]);
  assert.equal(festival?.items.find((item) => item.code === 'burning_man')?.href,'/collections/burning-man-looks');
});

test('Other Events, Performance and Dance restore every current agreed shopper path', () => {
  const other = STOREFRONT_NAVIGATION_PANELS.events.groups.find((group) => group.code === 'other_events');
  assert.deepEqual(other?.items.map((item)=>item.label),['Halloween','Pride','Cosplay']);

  const performance = STOREFRONT_NAVIGATION_PANELS.performance;
  assert.deepEqual(performance.groups.map((group)=>group.label),['Performance','Dance']);
  assert.deepEqual(performance.groups[0].items.map((item)=>item.label),['Stage','Showgirl','Drag']);
  assert.deepEqual(performance.groups[1].items.map((item)=>item.label),['Go-Go','Pole']);
});

test('Style menu restores the full catalog style vocabulary and keeps personas separate', () => {
  const style = STOREFRONT_NAVIGATION_PANELS.style;
  assert.deepEqual(style.groups.map((group)=>group.label),['Styles','Personas']);
  assert.deepEqual(style.groups[0].items.map((item)=>item.label),[
    'Glam','Futuristic','Sci-Fi','Cyberpunk','Post-Apocalyptic','Fantasy','Goth','Punk','Burlesque','Classic',
  ]);
  assert.deepEqual(style.groups[1].items.map((item)=>item.label),[
    'Warrior','Queen','Robot','Witch','Alien','Demon','Goddess','Angel','Cleopatra','Bunny',
  ]);
});

test('search-owner collection routes remain separate from shopper filter URLs', () => {
  const allItems = Object.values(STOREFRONT_NAVIGATION_PANELS)
    .flatMap((panel)=>panel.groups)
    .flatMap((group)=>group.items);

  const shoulders = allItems.find((item)=>item.code==='shoulders');
  const stage = allItems.find((item)=>item.code==='stage');
  const punk = allItems.find((item)=>item.code==='punk');
  const warrior = allItems.find((item)=>item.code==='warrior');

  assert.equal(shoulders?.role,'owner');
  assert.equal(shoulders?.href,'/collections/shoulder-armor');
  assert.equal(stage?.role,'owner');
  assert.equal(stage?.href,'/collections/stage-outfits');
  assert.equal(punk?.role,'filter');
  assert.equal(punk?.href,'/shop?style=Punk');
  assert.equal(warrior?.role,'filter');
  assert.equal(warrior?.href,'/shop?persona=Warrior');
});
