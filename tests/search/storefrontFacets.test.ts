import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStorefrontFacets } from '../../lib/storefrontFacets.ts';

test('arm-region aliases normalize into compact owner-approved DNA facets', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p1',
    parent_components_json: ['Arms', 'Shoulders'],
    child_components_json: ['shoulder_piece', 'bracelet', 'arm cuff', 'glove'],
    component_groups_json: ['arms','upper_body'],
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
    component_groups_json: ['legs'],
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
    component_groups_json: ['back'],
    canonical_color_label: null,
  });

  assert.ok(facets.parts.includes('Special Structures'));
  assert.ok(facets.subtypes.includes('Wings'));
  assert.ok(facets.subtypes.includes('Spine'));
  assert.ok(facets.subtypes.includes('Tail'));
  assert.ok(!facets.subtypes.includes('Backpiece'));
  assert.ok(!facets.subtypes.includes('Cape / Tunic'));
});

test('bundle with multiple confirmed children becomes a Full Look shopper facet', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p4',
    parent_components_json: ['Top','Skirt'],
    child_components_json: ['top','skirt'],
    component_groups_json: ['bundle','upper_body','lower_body'],
  });
  assert.ok(facets.subtypes.includes('Full Look'));
});

test('approved event, performance, dance and style focus values map into the full N7 browse model', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p5',
    parent_components_json: ['Shoulders'],
    child_components_json: ['shoulder_piece'],
    component_groups_json: ['upper_body'],
    event_values_json: ['festival','rave','burning man','halloween','pride','cosplay','stage','drag'],
    style_values_json: ['cyberpunk','futuristic','sci fi','goth','glam'],
    persona_values_json: ['showgirl','drag queen','go go dancer','pole dancer','warrior','goddess'],
    canonical_color_label: 'Gold',
  });

  assert.deepEqual(facets.events, ['Festival','Rave','Burning Man','Halloween','Pride','Cosplay']);
  assert.deepEqual(facets.performance, ['Stage','Showgirl','Drag']);
  assert.deepEqual(facets.dance, ['Go-Go','Pole']);
  assert.deepEqual(facets.styles, ['Cyberpunk','Futuristic','Sci-Fi','Goth','Glam','Warrior','Goddess']);
});

test('SEO owner memberships remain a separate evidence layer from shopper labels', () => {
  const facets = buildStorefrontFacets(
    {
      canonical_product_id: 'p6',
      parent_components_json: ['Shoulders'],
      child_components_json: ['shoulder_piece'],
      component_groups_json: ['upper_body'],
      event_values_json: [],
      style_values_json: [],
      persona_values_json: [],
      canonical_color_label: 'Gold',
    },
    ['SHOULDER_ARMOR','FESTIVAL_OUTFITS','RAVE_OUTFITS','BURNING_MAN_OUTFITS','PERFORMANCE_COSTUMES'],
  );

  assert.deepEqual(facets.parts, ['Arms']);
  assert.ok(facets.subtypes.includes('Shoulder'));
  assert.deepEqual(facets.events, ['Festival','Rave','Burning Man']);
  assert.deepEqual(facets.performance, ['Stage']);
});
