export type ComponentFamily = {
  component_family_id: string;
  canonical_name: string;
  normalized_name?: string | null;
};

export type ComponentFamilyResolution = {
  selectedComponent: string;
  family: ComponentFamily | null;
  error: string | null;
};

export type ProductComponentAssertionScope = 'fixed_base' | 'canonical_listing';

const COMPONENT_FAMILY_CANDIDATES: Record<string, string[]> = {
  shoulders: ['shoulders', 'shoulder'],
  corset: ['corset'],
  top: ['top'],
  harness: ['harness top'],
  bodysuit: ['bodysuit'],
  skirt: ['skirt'],
  panties: ['panties'],
  arms: ['arm set', 'bracelet / cuff', 'glove'],
  legs: ['leg covers'],
  mask: ['mask'],
  headpiece: ['headpiece'],
  choker: ['choker'],
  wings: ['wings'],
  spine: ['spine'],
  tail: ['tail'],
};

// These aliases are not a title/tag normalizer. They only let an already
// mapped Product Truth leaf disambiguate its active canonical family. Matching
// stays exact and fail-closed: generic `Arms` evidence must never manufacture
// an Arm Set, Bracelet / Cuff, or Glove assertion.
const COMPONENT_FAMILY_EVIDENCE_ALIASES: Record<string, string[]> = {
  'bracelet / cuff': ['bracelet', 'bracelets', 'cuff', 'cuffs', 'arm cuff', 'arm cuffs'],
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function productComponentAssertionScope(
  optionalConfigurations: unknown,
  sourceVariations: unknown = [],
): ProductComponentAssertionScope {
  const hasCompositionAxis = Array.isArray(optionalConfigurations) && optionalConfigurations.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return normalize(row.detected_canonical_axis) === 'configuration'
      || Boolean(row.is_bundle)
      || Boolean(row.is_full_set);
  });
  if (hasCompositionAxis) return 'canonical_listing';

  const sourceShowsCompositionChoice = Array.isArray(sourceVariations) && sourceVariations.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    const variationName = normalize(row.raw_variation_name || row.name || row.label);
    const rawValues = Array.isArray(row.values)
      ? row.values.map(normalize)
      : normalize(row.raw_variation_values || row.values).split(',').map(normalize);
    const hasSetValue = rawValues.some((value) => (
      /\bfull set\b/.test(value)
      || /\bcomplete set\b/.test(value)
      || value.includes('полный комплект')
      || value.includes('&')
      || /\bset of\b/.test(value)
    ));
    const isCompositionLabel = (
      /\b(set|configuration|piece|item|component|option)\b/.test(variationName)
      || /(набор|комплект|конфигурац|вариант)/.test(variationName)
    );
    return hasSetValue && isCompositionLabel;
  });

  return sourceShowsCompositionChoice ? 'canonical_listing' : 'fixed_base';
}

export function resolveSelectedComponentFamilies(
  selectedComponents: string[],
  componentFamilies: ComponentFamily[],
  evidenceFamilyNames: string[] = [],
): ComponentFamilyResolution[] {
  const familiesByName = new Map<string, ComponentFamily>();
  componentFamilies.forEach((family) => {
    familiesByName.set(normalize(family.normalized_name || family.canonical_name), family);
  });
  const evidenceNames = new Set(evidenceFamilyNames.map(normalize).filter(Boolean));

  return [...new Set(selectedComponents.map(normalize).filter(Boolean))].map((selectedComponent) => {
    const candidateNames = COMPONENT_FAMILY_CANDIDATES[selectedComponent] || [selectedComponent];
    const candidates = candidateNames
      .map((name) => familiesByName.get(name))
      .filter((family): family is ComponentFamily => Boolean(family));

    if (!candidates.length) {
      return {
        selectedComponent,
        family: null,
        error: `Для «${selectedComponent}» нет однозначного активного семейства Product Truth.`,
      };
    }

    if (candidates.length === 1) {
      return { selectedComponent, family: candidates[0], error: null };
    }

    const evidenced = candidates.filter((family) => {
      const canonicalName = normalize(family.canonical_name);
      const normalizedName = normalize(family.normalized_name);
      const approvedLeafAliases = COMPONENT_FAMILY_EVIDENCE_ALIASES[normalizedName]
        || COMPONENT_FAMILY_EVIDENCE_ALIASES[canonicalName]
        || [];
      return evidenceNames.has(canonicalName)
        || evidenceNames.has(normalizedName)
        || approvedLeafAliases.some((alias) => evidenceNames.has(alias));
    });
    if (evidenced.length === 1) {
      return { selectedComponent, family: evidenced[0], error: null };
    }

    return {
      selectedComponent,
      family: null,
      error: `«${selectedComponent}» неоднозначен: ${candidates.map((family) => family.canonical_name).join(', ')}.`,
    };
  });
}
