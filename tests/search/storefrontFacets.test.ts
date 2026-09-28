import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStorefrontFacets } from '../../lib/storefrontFacets.ts';

test('arm-region aliases normalize into compact owner-approved DNA facets', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p1',
    parent_components_json: ['Arms', 'Shoulders'],
    child_components_json: ['shoulder_piece', 'bracelet', 'arm cuff', 'glove'],
    component_groups_json: ['arms','upper_body'],
    sellable_component_values_json: ['arms','shoulders'],
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
    sellable_component_values_json: ['legs'],
    canonical_color_label: 'Silver',
  });

  assert.deepEqual(facets.parts, ['Legs']);
  assert.ok(facets.subtypes.includes('Leg Covers'));
  assert.ok(facets.subtypes.includes('Garter'));
  assert.ok(!facets.subtypes.includes('Leg Armor'));
});

test('legacy Backpiece and Cape/Tunic never become launch special facets', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p3',
    parent_components_json: ['Backpiece', 'Cape / Tunic', 'Wings', 'Spine', 'Tail'],
    child_components_json: ['wings', 'spine', 'tail'],
    component_groups_json: ['back'],
    sellable_component_values_json: ['wings','spine','tail'],
    canonical_color_label: null,
  });

  assert.ok(facets.parts.includes('Special'));
  assert.ok(facets.subtypes.includes('Wings'));
  assert.ok(facets.subtypes.includes('Spine'));
  assert.ok(facets.subtypes.includes('Tail'));
  assert.ok(!facets.subtypes.includes('Backpiece'));
  assert.ok(!facets.subtypes.includes('Cape / Tunic'));
});

test('search-only component aliases do not create sellable shopper categories', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p4',
    parent_components_json: ['Top','Skirt'],
    child_components_json: ['top','skirt'],
    component_groups_json: ['bundle','upper_body','lower_body'],
    component_values_json: ['top','skirt','harness'],
    sellable_component_values_json: ['top','skirt'],
  });

  assert.ok(facets.parts.includes('Upper Body'));
  assert.ok(facets.parts.includes('Lower Body'));
  assert.ok(facets.subtypes.includes('Top'));
  assert.ok(facets.subtypes.includes('Skirt'));
  assert.ok(facets.subtypes.includes('Full Look'));
  assert.ok(!facets.subtypes.includes('Harness'));
});

test('sellable component axes restore the complete public product family tree', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p5',
    child_components_json: ['bracelet','glove','leg covers','garters','horns','crown'],
    sellable_component_values_json: ['bodysuit','top','bra','corset','harness','shoulders','arms','skirt','belt','panties','legs','mask','headpiece','choker','wings','tail','spine'],
  });

  for (const part of ['Full Body','Upper Body','Arms','Lower Body','Legs','Head & Face','Special']) {
    assert.ok(facets.parts.includes(part), part);
  }

  for (const subtype of [
    'Bodysuit','Top','Bra','Corset','Harness','Shoulder','Bracelet / Cuff','Glove',
    'Skirt','Belt','Panties / Bottom','Leg Covers','Garter','Mask','Headpiece',
    'Horns','Crown','Choker / Collar','Wings','Tail','Spine',
  ]) {
    assert.ok(facets.subtypes.includes(subtype), subtype);
  }
});

test('approved event tree includes Rave children and excludes Stage from event axis', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p6',
    event_values_json: ['festival','rave','burning man','edm','edc','coachella','halloween','pride','cosplay','stage','drag'],
    persona_values_json: ['showgirl','drag queen','go go dancer','pole dancer'],
  });

  assert.deepEqual(facets.events, ['Festival','Rave','Burning Man','Halloween','Pride','Cosplay']);
  assert.deepEqual(facets.performance, ['Stage','Showgirl','Drag Queen']);
  assert.deepEqual(facets.dance, ['Go-Go','Pole Dancer']);
  assert.ok(!facets.events.includes('Stage'));
});

test('Style and Persona remain distinct DNA axes and restore the full approved catalog vocabulary', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p7',
    style_values_json: ['glam','futuristic','cosmic','sci fi','cyberpunk','post apocalyptic','fantasy','goth','punk','burlesque','classic'],
    persona_values_json: ['warrior','warrior princess','queen','robot','witch','maleficent','alien','demon','goddess','angel','cleopatra','bunny'],
  });

  assert.deepEqual(
    facets.styles,
    ['Glam','Futuristic','Sci-Fi','Cyberpunk','Post-Apocalyptic','Fantasy','Goth','Punk','Burlesque','Classic'],
  );
  assert.deepEqual(
    facets.personas,
    ['Warrior','Queen','Robot','Witch','Maleficent','Alien','Demon','Goddess','Angel','Cleopatra','Bunny'],
  );
  assert.ok(!facets.styles.includes('Warrior'));
  assert.ok(!facets.styles.includes('Goddess'));
});

test('audience, material and visual-effect facets stay separate', () => {
  const facets = buildStorefrontFacets({
    canonical_product_id: 'p8',
    audience_values_json: ['women','men','couples','drag'],
    material_values_json: ['vegan leather','leather','fabric','acrylic','mirror','metallic','holographic','gold'],
    canonical_color_label: 'Gold',
  });

  assert.deepEqual(facets.audience, ['Women','Men','Couples']);
  assert.deepEqual(facets.materials, ['Vegan Leather','Natural Leather','Fabric / Textile','Acrylic / Mirror Plastic']);
  assert.deepEqual(facets.effects, ['Mirror','Metallic','Iridescent']);
  assert.deepEqual(facets.colors, ['Gold']);
});

test('SEO owner memberships remain a separate evidence layer from shopper labels', () => {
  const facets = buildStorefrontFacets(
    {
      canonical_product_id: 'p9',
      child_components_json: ['shoulder_piece'],
      sellable_component_values_json: ['shoulders'],
      canonical_color_label: 'Gold',
    },
    ['SHOULDER_ARMOR','FESTIVAL_OUTFITS','RAVE_OUTFITS','BURNING_MAN_OUTFITS','PERFORMANCE_COSTUMES'],
  );

  assert.deepEqual(facets.parts, ['Arms']);
  assert.ok(facets.subtypes.includes('Shoulder'));
  assert.deepEqual(facets.events, ['Festival','Rave','Burning Man']);
  assert.deepEqual(facets.performance, ['Stage']);
});
