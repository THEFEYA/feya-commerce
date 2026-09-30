import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STOREFRONT_NAVIGATION_PANELS,
  publicPrimaryNavigation,
} from '../../config/storefrontNavigation.ts';

test('global navigation merges events and performance while keeping Shop and Style distinct', () => {
  assert.deepEqual(publicPrimaryNavigation().map((item) => item.code), ['shop','events_performance','style','about','shipping_payment','contact']);
  assert.deepEqual(publicPrimaryNavigation().map((item) => item.label), ['Shop','Events & Performance','Style','About','Shipping & Payment','Contact']);
  assert.equal(publicPrimaryNavigation().find((item)=>item.code==='events_performance')?.href,'/events-performance');
  assert.equal(publicPrimaryNavigation().find((item)=>item.code==='style')?.href,'/style');

  const shopSerialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS.shop);
  assert.doesNotMatch(shopSerialized,/Size Guide|Shipping|Returns|Contact/);

  const shopRoot = STOREFRONT_NAVIGATION_PANELS.shop.groups.find((group)=>group.code==='shop_all');
  assert.deepEqual(
    shopRoot?.items.map(({label,href,role})=>({label,href,role})),
    [
      {label:'Shop All',href:'/shop',role:'support'},
      {label:'Full Looks',href:'/shop?piece=Full%20Look',role:'filter'},
      {label:'Sale',href:undefined,role:'hold'},
      {label:'New Arrivals',href:undefined,role:'hold'},
      {label:'Best Sellers',href:undefined,role:'hold'},
    ],
  );
});

test('Shop contains the complete product tree plus audience browsing', () => {
  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  assert.deepEqual(groups.map((group) => group.label), [
    'Shop','Shop For','Full Body','Upper Body','Arms','Lower Body','Head & Face','Legs','Special',
  ]);

  const fullBody = groups.find((group) => group.code === 'full_body');
  assert.deepEqual(
    fullBody?.items.map(({label,href,role})=>({label,href,role})),
    [
      {label:'Bodysuits',href:'/collections/bodysuits',role:'owner'},
      {label:'Dresses',href:undefined,role:'hold'},
      {label:'Full Body Harnesses',href:undefined,role:'hold'},
    ],
  );

  const shopFor = groups.find((group) => group.code === 'shop_for');
  assert.deepEqual(
    shopFor?.items.map(({label,href,role})=>({label,href,role})),
    [
      {label:'Women',href:'/shop?audience=Women',role:'filter'},
      {label:'Men',href:'/shop?audience=Men',role:'filter'},
      {label:'Unisex',href:undefined,role:'hold'},
      {label:'Couples',href:'/shop?audience=Couples',role:'filter'},
    ],
  );
});

test('Upper Body and Arms preserve owner-approved distinct product concepts', () => {
  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  const upper = groups.find((group) => group.code === 'upper_body');
  const arms = groups.find((group) => group.code === 'arms');

  assert.deepEqual(
    upper?.items.map(({label,href})=>({label,href})),
    [
      {label:'Tops & Bras',href:'/shop?piece=Tops%20%26%20Bras'},
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
      {label:'Full Arms',href:undefined},
    ],
  );
});

test('Head & Face and Special retain the agreed launch branches only', () => {
  const groups = STOREFRONT_NAVIGATION_PANELS.shop.groups;
  const head = groups.find((group) => group.code === 'head_face');
  const special = groups.find((group) => group.code === 'special');

  assert.deepEqual(head?.items.map((item)=>item.label),['Masks','Headpieces','Horns','Crowns','Chokers']);
  assert.deepEqual(special?.items.map((item)=>item.label),['Wings','Tail','Spine']);

  const legs = groups.find((group)=>group.code==='legs');
  assert.deepEqual(legs?.items.map((item)=>item.label),['Leg Covers','Garters','Full Legs']);

  const serialized = JSON.stringify(STOREFRONT_NAVIGATION_PANELS);
  assert.doesNotMatch(serialized,/Backpiece|Back Piece|Cape\s*\/\s*Tunic|Tunic/i);
});

test('combined Events & Performance panel keeps events and one unified Performance branch', () => {
  const panel = STOREFRONT_NAVIGATION_PANELS.events_performance;
  assert.deepEqual(panel.groups.map((group)=>group.label),['Festival','Other Events','Performance']);

  const festival = panel.groups.find((group) => group.code === 'festival');
  const rave = festival?.items.find((item) => item.code === 'rave');

  assert.equal(festival?.href,'/collections/festival-outfits');
  assert.equal(rave?.href,'/collections/rave-outfits');
  assert.equal(rave?.children,undefined);
  assert.equal(festival?.items.find((item) => item.code === 'burning_man')?.href,'/collections/burning-man-looks');

  const other = panel.groups.find((group) => group.code === 'other_events');
  assert.deepEqual(other?.items.map((item)=>item.label),['Halloween','Pride','Cosplay']);

  const performance = panel.groups.find((group) => group.code === 'performance_roles');
  assert.deepEqual(performance?.items.map((item)=>item.label),[
    'Stage & Fashion','Showgirl','Drag Queen','Go-Go Dancer','Pole Dancer'
  ]);
});

test('Style menu restores the full catalog style vocabulary and keeps personas separate', () => {
  const style = STOREFRONT_NAVIGATION_PANELS.style;
  assert.deepEqual(style.groups.map((group)=>group.label),['Styles','Personas']);
  assert.deepEqual(style.groups[0].items.map((item)=>item.label),[
    'Glam','Futuristic','Sci-Fi','Cyberpunk','Post-Apocalyptic','Fantasy','Goth','Punk','Burlesque','Classic',
  ]);
  assert.deepEqual(style.groups[1].items.map((item)=>item.label),[
    'Warrior','Queen','Robot','Witch','Maleficent','Alien','Demon','Goddess','Angel','Cleopatra','Bunny',
  ]);
});

test('search-owner collection routes remain separate from shopper filter URLs', () => {
  const allItems = Object.values(STOREFRONT_NAVIGATION_PANELS)
    .flatMap((panel)=>panel.groups)
    .flatMap((group)=>group.items);

  const shoulders = allItems.find((item)=>item.code==='shoulders');
  const stage = allItems.find((item)=>item.code==='stage_fashion');
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
