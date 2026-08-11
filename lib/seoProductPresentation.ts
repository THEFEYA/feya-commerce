export type SeoProductPresentationMode = 'unknown' | 'single_component' | 'compact_set' | 'large_set';

export type SeoProductPresentation = {
  mode: SeoProductPresentationMode;
  components: string[];
  component_count: number;
  requires_whole_product_entity: boolean;
  requires_compact_composition: boolean;
};

const WHOLE_PRODUCT_ENTITY = /\b(outfits?|sets?|costumes?|ensembles?|attire)\b/i;

export function classifySeoProductPresentation(value: unknown): SeoProductPresentation {
  const components = confirmedProductComponents(value);
  const componentCount = components.length;
  const mode: SeoProductPresentationMode = componentCount === 0
    ? 'unknown'
    : componentCount === 1
      ? 'single_component'
      : componentCount <= 3
        ? 'compact_set'
        : 'large_set';

  return {
    mode,
    components,
    component_count: componentCount,
    requires_whole_product_entity: componentCount >= 2,
    // Every multi-component product keeps its inventory in the deterministic
    // selector/What's Included UI. A large set is not an exception.
    requires_compact_composition: componentCount >= 2,
  };
}

export function confirmedProductComponents(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const sellableOffer = isRecord(value.sellable_offer)
    ? componentLabels(value.sellable_offer.component_labels)
    : [];
  const sellable = componentLabels(value.sellable_offer_components);
  const included = componentLabels(value.included_components);
  const known = componentLabels(value.known_components);
  return uniqueLabels(
    sellableOffer.length
      ? sellableOffer
      : sellable.length
        ? sellable
        : included.length
          ? included
          : known,
  );
}

export function hasWholeProductEntity(value: unknown) {
  return WHOLE_PRODUCT_ENTITY.test(String(value || ''));
}

/**
 * A whole-product noun is necessary but not sufficient for a multi-piece
 * product. "Shoulder armor costume", for example, is still a component-led
 * query with a generic costume suffix. A safe whole-product query either does
 * not narrow to one confirmed component or names at least two of them.
 */
export function hasWholeProductScope(value: unknown, components: string[]) {
  if (!hasWholeProductEntity(value)) return false;
  if (components.length < 2) return true;
  const mentioned = mentionedConfirmedComponents(value, components);
  return mentioned.length === 0
    || mentioned.length >= 2
    || hasWholeEntityWithConfirmedComponent(value, components);
}

/**
 * A whole-product noun can safely lead into one confirmed component when the
 * syntax keeps the whole product as the query head: "rave outfit with skirt".
 * This is intentionally narrower than accepting every phrase that happens to
 * contain both words; component-led phrases such as "skirt outfit" or
 * "shoulder armor costume" remain partial-scope queries for multi-piece PDPs.
 */
function hasWholeEntityWithConfirmedComponent(value: unknown, components: string[]) {
  const normalized = normalize(value);
  const match = /\b(?:outfits?|sets?|costumes?|ensembles?|attire)\s+(?:with|including|featuring)\b/.exec(normalized);
  if (!match || match.index == null) return false;
  const componentClause = normalized.slice(match.index + match[0].length);
  return mentionedConfirmedComponents(componentClause, components).length > 0;
}

export function mentionedConfirmedComponents(text: unknown, components: string[]) {
  const normalizedText = normalize(text);
  return components.filter((component) => {
    const tokens = contentTokens(component);
    if (!tokens.length) return false;
    const textTokens = contentTokens(normalizedText);
    return tokens.every((token) => textTokens.includes(token));
  });
}

function componentLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') return [String(item).trim()];
    if (!isRecord(item)) return [];
    const label = item.public_label
      || item.canonical_label
      || item.component_label
      || item.component
      || item.label
      || item.name
      || item.value;
    return typeof label === 'string' || typeof label === 'number' ? [String(label).trim()] : [];
  }).filter(Boolean);
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function contentTokens(value: unknown) {
  return normalize(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => {
      if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
      if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
      if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
      return token;
    });
}

function normalize(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
