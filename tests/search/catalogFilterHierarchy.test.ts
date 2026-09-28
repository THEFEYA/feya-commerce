import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  AUDIENCES,
  BODY_AREA_TREE,
  FILTER_SECTION_ORDER,
  MATERIALS,
  defaultShopFilters,
  parseShopNavigation,
  shopPageHref,
} from '../../lib/shopCatalogNavigation.ts';

test('catalog filter order follows the owner-approved shopper sequence', () => {
  assert.deepEqual(FILTER_SECTION_ORDER, [
    'Audience',
    'Body Area',
    'Price',
    'Color',
    'Event',
    'Performance',
    'Style',
    'Persona',
    'Material',
    'Visual Effect',
  ]);
});

test('body-area filter is progressive and keeps product children under their physical parent', () => {
  assert.deepEqual(BODY_AREA_TREE, [
    { part: 'Full Body', pieces: ['Bodysuit', 'Dress', 'Full Body Harness'] },
    { part: 'Upper Body', pieces: ['Tops & Bras', 'Corset', 'Harness'] },
    { part: 'Arms', pieces: ['Shoulder', 'Bracelet / Cuff', 'Glove', 'Full Arm'] },
    { part: 'Lower Body', pieces: ['Skirt', 'Belt', 'Panties / Bottom'] },
    { part: 'Head & Face', pieces: ['Mask', 'Headpiece', 'Horns', 'Crown', 'Choker / Collar'] },
    { part: 'Legs', pieces: ['Leg Covers', 'Garter', 'Full Leg'] },
    { part: 'Special', pieces: ['Wings', 'Tail', 'Spine'] },
  ]);
  assert.deepEqual(AUDIENCES, ['Women','Men','Unisex','Couples']);
  assert.ok(MATERIALS.includes('Fabric / Textile'));
});

test('part and piece filters support multi-select URLs without changing owner routes', () => {
  const filters = {
    ...defaultShopFilters(),
    audience: ['Women','Couples'],
    part: ['Upper Body','Arms'],
    piece: ['Tops & Bras','Shoulder'],
    event: ['Festival'],
  };
  const href = shopPageHref(2, filters);
  const parsed = parseShopNavigation(Object.fromEntries(new URL(href,'https://example.test').searchParams));
  assert.deepEqual(parsed, { page: 2, filters });
});

test('desktop and mobile catalogs render one shared hierarchical filter panel and no flat Piece section', () => {
  const source = readFileSync('components/ShopClient.tsx','utf8');
  assert.match(source,/function CatalogFilterPanel/);
  assert.match(source,/function BodyAreaTree/);
  assert.equal((source.match(/<CatalogFilterPanel \{\.\.\.panelProps\} \/>/g)||[]).length,2);
  assert.doesNotMatch(source,/>Piece<\/div>/);
  assert.ok(source.indexOf('title="Audience"') < source.indexOf('title="Body Area"'));
  assert.ok(source.indexOf('title="Body Area"') < source.indexOf('title="Price"'));
  assert.ok(source.indexOf('title="Price"') < source.indexOf('title="Color"'));
  assert.ok(source.indexOf('title="Color"') < source.indexOf('title="Event"'));
  assert.ok(source.indexOf('title="Event"') < source.indexOf('title="Performance"'));
  assert.ok(source.indexOf('title="Performance"') < source.indexOf('title="Style"'));
  assert.ok(source.indexOf('title="Style"') < source.indexOf('title="Persona"'));
  assert.ok(source.indexOf('title="Persona"') < source.indexOf('title="Material"'));
  assert.ok(source.indexOf('title="Material"') < source.indexOf('title="Visual Effect"'));
});
