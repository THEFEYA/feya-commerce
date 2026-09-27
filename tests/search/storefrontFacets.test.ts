import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStorefrontFacets } from '../../lib/storefrontFacets.ts';

test('arm-region aliases normalize into compact owner-approved DNA facets', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p1',
    parent_components_json: ['Arms', 'Shoulders'],
    child_components_json: ['shoulder_piece', 'bracelet', 'arm cuff', 'glove'],
    canonical_color_label: 'Gold',
  });

  assert.deepEqual(facets.parts, ['Arms']);
  assert.ok(facets.subtypes.includes('Shoulder'));
  assert.ok(facets.subtypes.includes('Bracelet / Cuff'));
  assert.ok(facets.subtypes.includes('Glove'));
  assert.ok(!facets.subtypes.includes('Shoulder Armor'));
  assert.ok(!facets.subtypes.includes('Forearm Piece'));
  assert.deepEqual(facets.colors, ['Gold']);
});

test('leg armor and leg cover wording collapse into Leg Covers while garter stays distinct', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p2',
    parent_components_json: ['Legs'],
    child_components_json: ['leg armor', 'leg covers', 'garters'],
    canonical_color_label: 'Silver',
  });

  assert.deepEqual(facets.parts, ['Legs']);
  assert.ok(facets.subtypes.includes('Leg Covers'));
  assert.ok(facets.subtypes.includes('Garter'));
  assert.ok(!facets.subtypes.includes('Leg Armor'));
});

test('legacy Backpiece and Cape/Tunic never become launch special-structure facets', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p3',
    parent_components_json: ['Backpiece', 'Cape / Tunic', 'Wings', 'Spine', 'Tail'],
    child_components_json: ['wings', 'spine', 'tail'],
    canonical_color_label: null,
  });

  assert.ok(facets.parts.includes('Special Structures'));
  assert.ok(facets.subtypes.includes('Wings'));
  assert.ok(facets.subtypes.includes('Spine'));
  assert.ok(facets.subtypes.includes('Tail'));
  assert.ok(!facets.subtypes.includes('Backpiece'));
  assert.ok(!facets.subtypes.includes('Cape / Tunic'));
});

test('search memberships project event/performance facets without rewriting physical ontology', () => {
  const facets = buildStorefrontFacets(
    {
      canonical_product_id: 'p4',
      parent_components_json: ['Shoulders'],
      child_components_json: ['shoulder_piece'],
      canonical_color_label: 'Gold',
    },
    ['SHOULDER_ARMOR', 'FESTIVAL_OUTFITS', 'RAVE_OUTFITS', 'BURNING_MAN_OUTFITS', 'PERFORMANCE_COSTUMES'],
  );

  assert.deepEqual(facets.parts, ['Arms']);
  assert.ok(facets.subtypes.includes('Shoulder'));
  assert.deepEqual(facets.events, ['Festival', 'Rave', 'Burning Man']);
  assert.deepEqual(facets.performance, ['Stage']);
});
