export const STOREFRONT_FACET_CONTRACT_VERSION = 'feya-storefront-facets-v3';

export type StorefrontFacetSet = {
  parts: string[];
  subtypes: string[];
  events: string[];
  performance: string[];
  dance: string[];
  styles: string[];
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
  const audience = new Set<string>();
  const materials = new Set<string>();
  const effects = new Set<string>();
  const colors = new Set<string>();

  if (groups.has('bundle') && childValues.length >= 2) add(subtypes, 'Full Look');

  if (parents.has('Bodysuit') || children.has('bodysuit') || components.has('bodysuit') || memberships.has('COSTUME_BODYSUITS')) {
    add(parts, 'Full Body');
    add(subtypes, 'Bodysuit');
  }

  if (
    parents.has('Top') ||
    children.has('top') ||
    children.has('bra top') ||
    children.has('corset') ||
    components.has('top') ||
    components.has('corset') ||
    components.has('harness')
  ) add(parts, 'Upper Body');

  if (children.has('top') || components.has('top')) add(subtypes, 'Top');
  if (children.has('bra top')) add(subtypes, 'Bra');
  if (children.has('corset') || components.has('corset')) add(subtypes, 'Corset');
  if (components.has('harness')) add(subtypes, 'Harness');

  if (
    parents.has('Arms') ||
    parents.has('Shoulders') ||
    components.has('arms') ||
    components.has('shoulders') ||
    children.has('shoulder_piece') ||
    children.has('bracelet') ||
    children.has('arm cuff') ||
    children.has('glove') ||
    memberships.has('SHOULDER_ARMOR')
  ) add(parts, 'Arms');

  if (parents.has('Shoulders') || components.has('shoulders') || children.has('shoulder_piece') || memberships.has('SHOULDER_ARMOR')) add(subtypes, 'Shoulder');
  if (children.has('bracelet') || children.has('arm cuff')) add(subtypes, 'Bracelet / Cuff');
  if (children.has('glove')) add(subtypes, 'Glove');

  if (
    parents.has('Skirt') ||
    parents.has('Panties') ||
    parents.has('Waist / Belt') ||
    components.has('skirt') ||
    components.has('belt') ||
    components.has('panties') ||
    children.has('skirt') ||
    children.has('open skirt') ||
    children.has('panties') ||
    children.has('belt') ||
    memberships.has('COSTUME_BELTS') ||
    memberships.has('FESTIVAL_SKIRTS')
  ) add(parts, 'Lower Body');

  if (parents.has('Skirt') || components.has('skirt') || children.has('skirt') || children.has('open skirt') || memberships.has('FESTIVAL_SKIRTS')) add(subtypes, 'Skirt');
  if (parents.has('Waist / Belt') || components.has('belt') || children.has('belt') || memberships.has('COSTUME_BELTS')) add(subtypes, 'Belt');
  if (parents.has('Panties') || components.has('panties') || children.has('panties')) add(subtypes, 'Panties / Bottom');

  if (
    parents.has('Legs') ||
    components.has('legs') ||
    children.has('leg covers') ||
    children.has('leg armor') ||
    children.has('garters') ||
    children.has('leg straps / garters')
  ) add(parts, 'Legs');

  if (children.has('leg covers') || children.has('leg armor')) add(subtypes, 'Leg Covers');
  if (children.has('garters') || children.has('leg straps / garters')) add(subtypes, 'Garter');

  if (
    parents.has('Head / Headpiece') ||
    parents.has('Neck / Choker') ||
    components.has('mask') ||
    components.has('headpiece') ||
    components.has('choker') ||
    children.has('headpiece') ||
    children.has('horns') ||
    children.has('crown') ||
    children.has('choker') ||
    memberships.has('COSTUME_MASKS') ||
    memberships.has('COSTUME_HEADPIECES')
  ) add(parts, 'Head & Face');

  if (components.has('mask') || memberships.has('COSTUME_MASKS')) add(subtypes, 'Mask');
  if (parents.has('Head / Headpiece') || components.has('headpiece') || children.has('headpiece') || memberships.has('COSTUME_HEADPIECES')) add(subtypes, 'Headpiece');
  if (parents.has('Neck / Choker') || components.has('choker') || children.has('choker')) add(subtypes, 'Choker / Collar');
  if (children.has('horns')) add(subtypes, 'Horns');
  if (children.has('crown')) add(subtypes, 'Crown');

  if (
    parents.has('Wings') ||
    parents.has('Tail') ||
    parents.has('Spine') ||
    components.has('wings') ||
    components.has('tail') ||
    components.has('spine') ||
    children.has('wings') ||
    children.has('tail') ||
    children.has('spine')
  ) add(parts, 'Special');

  if (parents.has('Wings') || components.has('wings') || children.has('wings')) add(subtypes, 'Wings');
  if (parents.has('Tail') || components.has('tail') || children.has('tail')) add(subtypes, 'Tail');
  if (parents.has('Spine') || components.has('spine') || children.has('spine')) add(subtypes, 'Spine');

  if (focusEvents.has('festival') || memberships.has('FESTIVAL_OUTFITS')) add(events, 'Festival');
  if (focusEvents.has('rave') || memberships.has('RAVE_OUTFITS')) add(events, 'Rave');
  if (focusEvents.has('burning man') || memberships.has('BURNING_MAN_OUTFITS')) add(events, 'Burning Man');
  if (focusEvents.has('halloween')) add(events, 'Halloween');
  if (focusEvents.has('pride')) add(events, 'Pride');
  if (focusEvents.has('cosplay')) add(events, 'Cosplay');

  if (focusEvents.has('stage') || memberships.has('PERFORMANCE_COSTUMES')) add(performance, 'Stage');
  if (focusPersonas.has('showgirl')) add(performance, 'Showgirl');
  if (focusEvents.has('drag') || focusPersonas.has('drag queen')) add(performance, 'Drag');

  if (focusPersonas.has('go go dancer')) add(dance, 'Go-Go');
  if (focusPersonas.has('pole dancer')) add(dance, 'Pole');

  if (focusStyles.has('cyberpunk')) add(styles, 'Cyberpunk');
  if (focusStyles.has('futuristic')) add(styles, 'Futuristic');
  if (focusStyles.has('sci fi')) add(styles, 'Sci-Fi');
  if (focusStyles.has('goth')) add(styles, 'Goth');
  if (focusStyles.has('glam')) add(styles, 'Glam');
  if (focusPersonas.has('warrior') || focusPersonas.has('warrior princess')) add(styles, 'Warrior');
  if (focusPersonas.has('goddess')) add(styles, 'Goddess');

  if (focusAudience.has('women')) add(audience, 'Women');
  if (focusAudience.has('men')) add(audience, 'Men');
  if (focusAudience.has('unisex')) add(audience, 'Unisex');

  if (focusMaterials.has('vegan leather') || focusMaterials.has('faux leather')) add(materials, 'Vegan Leather');
  if (focusMaterials.has('natural leather') || focusMaterials.has('leather')) add(materials, 'Natural Leather');
  if (focusMaterials.has('acrylic') || focusMaterials.has('mirror acrylic') || focusMaterials.has('mirror plastic')) add(materials, 'Acrylic / Mirror Plastic');

  if (focusMaterials.has('holographic')) add(effects, 'Iridescent');
  if (focusMaterials.has('gold') || focusMaterials.has('silver')) {
    // Color-like legacy material tokens are kept out of Material; canonical color remains authoritative.
  }

  if (snapshot?.canonical_color_label) add(colors, snapshot.canonical_color_label.trim());

  return {
    parts: [...parts],
    subtypes: [...subtypes],
    events: [...events],
    performance: [...performance],
    dance: [...dance],
    styles: [...styles],
    audience: [...audience],
    materials: [...materials],
    effects: [...effects],
    colors: [...colors],
    mappingVersion: STOREFRONT_FACET_CONTRACT_VERSION,
  };
}
