export const STOREFRONT_FACET_CONTRACT_VERSION = 'feya-storefront-facets-v4';

export type StorefrontFacetSet = {
  parts: string[];
  subtypes: string[];
  events: string[];
  performance: string[];
  dance: string[];
  styles: string[];
  personas: string[];
  audience: string[];
  materials: string[];
  effects: string[];
  colors: string[];
  mappingVersion: string;
};

export type StorefrontFacetSnapshotRow = {
  canonical_product_id: string;
  parent_components_json?: unknown;
  child_components_json?: unknown;
  component_groups_json?: unknown;
  component_values_json?: unknown;
  sellable_component_values_json?: unknown;
  event_values_json?: unknown;
  style_values_json?: unknown;
  persona_values_json?: unknown;
  audience_values_json?: unknown;
  material_values_json?: unknown;
  canonical_color_label?: string | null;
};

function asStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function lowerSet(value: unknown) {
  return new Set(asStrings(value).map((item) => item.toLowerCase()));
}

function add(target: Set<string>, value: string) {
  if (value) target.add(value);
}

export function buildStorefrontFacets(
  snapshot: StorefrontFacetSnapshotRow | null | undefined,
  membershipCodes: Iterable<string> = [],
): StorefrontFacetSet {
  const parents = new Set(asStrings(snapshot?.parent_components_json));
  const childValues = asStrings(snapshot?.child_components_json);
  const children = new Set(childValues.map((value) => value.toLowerCase()));
  const groups = lowerSet(snapshot?.component_groups_json);
  const components = lowerSet(snapshot?.component_values_json);
  const sellable = lowerSet(snapshot?.sellable_component_values_json);
  const focusEvents = lowerSet(snapshot?.event_values_json);
  const focusStyles = lowerSet(snapshot?.style_values_json);
  const focusPersonas = lowerSet(snapshot?.persona_values_json);
  const focusAudience = lowerSet(snapshot?.audience_values_json);
  const focusMaterials = lowerSet(snapshot?.material_values_json);
  const memberships = new Set(Array.from(membershipCodes));

  const parts = new Set<string>();
  const subtypes = new Set<string>();
  const events = new Set<string>();
  const performance = new Set<string>();
  const dance = new Set<string>();
  const styles = new Set<string>();
  const personas = new Set<string>();
  const audience = new Set<string>();
  const materials = new Set<string>();
  const effects = new Set<string>();
  const colors = new Set<string>();

  if (groups.has('bundle') && childValues.length >= 2) add(subtypes, 'Full Look');

  if (sellable.has('bodysuit') || memberships.has('COSTUME_BODYSUITS')) {
    add(parts, 'Full Body');
    add(subtypes, 'Bodysuit');
  }

  if (sellable.has('top') || sellable.has('bra') || sellable.has('corset') || sellable.has('harness')) {
    add(parts, 'Upper Body');
  }
  if (sellable.has('top')) add(subtypes, 'Top');
  if (sellable.has('bra')) add(subtypes, 'Bra');
  if (sellable.has('corset')) add(subtypes, 'Corset');
  if (sellable.has('harness')) add(subtypes, 'Harness');

  if (
    sellable.has('arms') ||
    sellable.has('shoulders') ||
    children.has('shoulder_piece') ||
    children.has('bracelet') ||
    children.has('arm cuff') ||
    children.has('glove') ||
    memberships.has('SHOULDER_ARMOR')
  ) add(parts, 'Arms');

  if (sellable.has('shoulders') || children.has('shoulder_piece') || memberships.has('SHOULDER_ARMOR')) add(subtypes, 'Shoulder');
  if (children.has('bracelet') || children.has('arm cuff')) add(subtypes, 'Bracelet / Cuff');
  if (children.has('glove')) add(subtypes, 'Glove');

  if (
    sellable.has('skirt') ||
    sellable.has('belt') ||
    sellable.has('panties') ||
    memberships.has('COSTUME_BELTS') ||
    memberships.has('FESTIVAL_SKIRTS')
  ) add(parts, 'Lower Body');

  if (sellable.has('skirt') || memberships.has('FESTIVAL_SKIRTS')) add(subtypes, 'Skirt');
  if (sellable.has('belt') || memberships.has('COSTUME_BELTS')) add(subtypes, 'Belt');
  if (sellable.has('panties')) add(subtypes, 'Panties / Bottom');

  if (
    sellable.has('legs') ||
    children.has('leg covers') ||
    children.has('leg armor') ||
    children.has('garters') ||
    children.has('leg straps / garters')
  ) add(parts, 'Legs');

  if (children.has('leg covers') || children.has('leg armor')) add(subtypes, 'Leg Covers');
  if (children.has('garters') || children.has('leg straps / garters')) add(subtypes, 'Garter');

  if (
    sellable.has('mask') ||
    sellable.has('headpiece') ||
    sellable.has('choker') ||
    children.has('horns') ||
    children.has('crown') ||
    memberships.has('COSTUME_MASKS') ||
    memberships.has('COSTUME_HEADPIECES')
  ) add(parts, 'Head & Face');

  if (sellable.has('mask') || memberships.has('COSTUME_MASKS')) add(subtypes, 'Mask');
  if (sellable.has('headpiece') || memberships.has('COSTUME_HEADPIECES')) add(subtypes, 'Headpiece');
  if (sellable.has('choker')) add(subtypes, 'Choker / Collar');
  if (children.has('horns')) add(subtypes, 'Horns');
  if (children.has('crown')) add(subtypes, 'Crown');

  if (sellable.has('wings') || sellable.has('tail') || sellable.has('spine')) add(parts, 'Special');
  if (sellable.has('wings')) add(subtypes, 'Wings');
  if (sellable.has('tail')) add(subtypes, 'Tail');
  if (sellable.has('spine')) add(subtypes, 'Spine');

  if (focusEvents.has('festival') || memberships.has('FESTIVAL_OUTFITS')) add(events, 'Festival');
  if (
    focusEvents.has('rave') ||
    focusEvents.has('edm') ||
    focusEvents.has('edc') ||
    focusEvents.has('coachella') ||
    memberships.has('RAVE_OUTFITS')
  ) add(events, 'Rave');
  if (focusEvents.has('burning man') || memberships.has('BURNING_MAN_OUTFITS')) add(events, 'Burning Man');
  if (focusEvents.has('halloween')) add(events, 'Halloween');
  if (focusEvents.has('pride')) add(events, 'Pride');
  if (focusEvents.has('cosplay')) add(events, 'Cosplay');

  if (focusEvents.has('stage') || memberships.has('PERFORMANCE_COSTUMES')) add(performance, 'Stage & Fashion');
  if (focusPersonas.has('showgirl')) add(performance, 'Showgirl');
  if (focusEvents.has('drag') || focusPersonas.has('drag queen')) add(performance, 'Drag Queen');

  if (focusPersonas.has('go go dancer')) add(dance, 'Go-Go Dancer');
  if (focusPersonas.has('pole dancer')) add(dance, 'Pole Dancer');

  if (focusStyles.has('glam')) add(styles, 'Glam');
  if (focusStyles.has('futuristic')) add(styles, 'Futuristic');
  if (focusStyles.has('cosmic') || focusStyles.has('sci fi')) add(styles, 'Sci-Fi');
  if (focusStyles.has('cyberpunk')) add(styles, 'Cyberpunk');
  if (focusStyles.has('post apocalyptic')) add(styles, 'Post-Apocalyptic');
  if (focusStyles.has('fantasy')) add(styles, 'Fantasy');
  if (focusStyles.has('goth')) add(styles, 'Goth');
  if (focusStyles.has('punk')) add(styles, 'Punk');
  if (focusStyles.has('burlesque')) add(styles, 'Burlesque');
  if (focusStyles.has('classic')) add(styles, 'Classic');

  if (focusPersonas.has('warrior') || focusPersonas.has('warrior princess')) add(personas, 'Warrior');
  if (focusPersonas.has('queen')) add(personas, 'Queen');
  if (focusPersonas.has('robot')) add(personas, 'Robot');
  if (focusPersonas.has('witch')) add(personas, 'Witch');
  if (focusPersonas.has('maleficent')) add(personas, 'Maleficent');
  if (focusPersonas.has('alien')) add(personas, 'Alien');
  if (focusPersonas.has('demon')) add(personas, 'Demon');
  if (focusPersonas.has('goddess')) add(personas, 'Goddess');
  if (focusPersonas.has('angel')) add(personas, 'Angel');
  if (focusPersonas.has('cleopatra')) add(personas, 'Cleopatra');
  if (focusPersonas.has('bunny')) add(personas, 'Bunny');

  if (focusAudience.has('women')) add(audience, 'Women');
  if (focusAudience.has('men')) add(audience, 'Men');
  if (focusAudience.has('unisex')) add(audience, 'Unisex');
  if (focusAudience.has('couples')) add(audience, 'Couples');

  if (focusMaterials.has('vegan leather') || focusMaterials.has('faux leather')) add(materials, 'Vegan Leather');
  if (focusMaterials.has('leather') || focusMaterials.has('natural leather')) add(materials, 'Natural Leather');
  if (focusMaterials.has('fabric')) add(materials, 'Fabric / Textile');
  if (focusMaterials.has('acrylic') || focusMaterials.has('mirror acrylic') || focusMaterials.has('mirror plastic')) add(materials, 'Acrylic / Mirror Plastic');

  if (focusMaterials.has('mirror')) add(effects, 'Mirror');
  if (focusMaterials.has('metallic')) add(effects, 'Metallic');
  if (focusMaterials.has('holographic')) add(effects, 'Iridescent');

  if (snapshot?.canonical_color_label) add(colors, snapshot.canonical_color_label.trim());

  return {
    parts: [...parts],
    subtypes: [...subtypes],
    events: [...events],
    performance: [...performance],
    dance: [...dance],
    styles: [...styles],
    personas: [...personas],
    audience: [...audience],
    materials: [...materials],
    effects: [...effects],
    colors: [...colors],
    mappingVersion: STOREFRONT_FACET_CONTRACT_VERSION,
  };
}
