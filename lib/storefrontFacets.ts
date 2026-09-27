export const STOREFRONT_FACET_CONTRACT_VERSION = 'feya-storefront-facets-v2';

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
  event_values_json?: unknown;
  style_values_json?: unknown;
  persona_values_json?: unknown;
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
  const focusEvents = lowerSet(snapshot?.event_values_json);
  const focusStyles = lowerSet(snapshot?.style_values_json);
  const focusPersonas = lowerSet(snapshot?.persona_values_json);
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

  if (parents.has('Bodysuit') || children.has('bodysuit') || memberships.has('COSTUME_BODYSUITS')) {
    add(parts, 'Full Body');
    add(subtypes, 'Bodysuit');
  }

  if (parents.has('Top') || children.has('top') || children.has('bra top') || children.has('corset')) {
    add(parts, 'Upper Body');
  }
  if (children.has('top')) add(subtypes, 'Top');
  if (children.has('bra top')) add(subtypes, 'Bra');
  if (children.has('corset')) add(subtypes, 'Corset');

  if (
    parents.has('Arms') ||
    parents.has('Shoulders') ||
    children.has('shoulder_piece') ||
    children.has('bracelet') ||
    children.has('arm cuff') ||
    children.has('glove') ||
    memberships.has('SHOULDER_ARMOR')
  ) add(parts, 'Arms');

  if (parents.has('Shoulders') || children.has('shoulder_piece') || memberships.has('SHOULDER_ARMOR')) add(subtypes, 'Shoulder');
  if (children.has('bracelet') || children.has('arm cuff')) add(subtypes, 'Bracelet / Cuff');
  if (children.has('glove')) add(subtypes, 'Glove');

  if (
    parents.has('Skirt') ||
    parents.has('Panties') ||
    parents.has('Waist / Belt') ||
    children.has('skirt') ||
    children.has('open skirt') ||
    children.has('panties') ||
    children.has('belt') ||
    memberships.has('COSTUME_BELTS') ||
    memberships.has('FESTIVAL_SKIRTS')
  ) add(parts, 'Lower Body');

  if (parents.has('Skirt') || children.has('skirt') || children.has('open skirt') || memberships.has('FESTIVAL_SKIRTS')) add(subtypes, 'Skirt');
  if (parents.has('Waist / Belt') || children.has('belt') || memberships.has('COSTUME_BELTS')) add(subtypes, 'Belt');
  if (parents.has('Panties') || children.has('panties')) add(subtypes, 'Panties / Bottom');

  if (
    parents.has('Legs') ||
    children.has('leg covers') ||
    children.has('leg armor') ||
    children.has('garters') ||
    children.has('leg straps / garters')
  ) add(parts, 'Legs');

  if (children.has('leg covers') || children.has('leg armor')) add(subtypes, 'Leg Covers');
  if (children.has('garters') || children.has('leg straps / garters')) add(subtypes, 'Garter');

  if (
    parents.has('Head / Headpiece') ||
    children.has('headpiece') ||
    children.has('horns') ||
    children.has('crown') ||
    memberships.has('COSTUME_MASKS') ||
    memberships.has('COSTUME_HEADPIECES')
  ) add(parts, 'Head & Face');

  if (memberships.has('COSTUME_MASKS')) add(subtypes, 'Mask');
  if (parents.has('Head / Headpiece') || children.has('headpiece') || memberships.has('COSTUME_HEADPIECES')) add(subtypes, 'Headpiece');
  if (children.has('horns')) add(subtypes, 'Horns');
  if (children.has('crown')) add(subtypes, 'Crown');

  if (
    parents.has('Wings') ||
    parents.has('Tail') ||
    parents.has('Spine') ||
    children.has('wings') ||
    children.has('tail') ||
    children.has('spine')
  ) add(parts, 'Special Structures');

  if (parents.has('Wings') || children.has('wings')) add(subtypes, 'Wings');
  if (parents.has('Tail') || children.has('tail')) add(subtypes, 'Tail');
  if (parents.has('Spine') || children.has('spine')) add(subtypes, 'Spine');

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
