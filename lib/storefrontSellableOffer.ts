import { applyOwnerReviewedStorefrontCorrections } from './storefrontOwnerReviewedCorrections.ts';

type RecordValue = Record<string, unknown>;

export type StorefrontSellableOfferOption = {
  configuration_id: string | null;
  code: string;
  family: string | null;
  label: string;
  sort_order: number;
  is_aggregate: boolean;
  member_codes: string[];
  member_labels: string[];
  mapping_source: 'atomic' | 'explicit_bundle_codes' | 'complete_current_selector';
};

export type StorefrontSellableOfferTruth = {
  contract_version: 'storefront_sellable_offer_v1';
  status: 'ready' | 'hold';
  source: 'storefront_v4_configurations' | 'unavailable';
  source_available: boolean;
  atomic_options: StorefrontSellableOfferOption[];
  aggregate_options: StorefrontSellableOfferOption[];
  component_codes: string[];
  component_families: string[];
  component_labels: string[];
  default_configuration_code: string | null;
  default_included_components: string[];
  blockers: string[];
  signature: string | null;
};

const CYRILLIC = /[\u0400-\u04ff]/;
const FULL_SET_CODE = 'full_set';

/**
 * Resolves the exact offer a shopper can select from the same v4
 * `configurations` payload used by the PDP selector.
 *
 * Legacy Etsy variations, titles, Product DNA, images and keyword text are
 * deliberately absent from this resolver. They may remain provenance, but
 * they cannot add a sellable component.
 */
export function resolveStorefrontSellableOffer(
  value: unknown,
): StorefrontSellableOfferTruth {
  const product = applyOwnerReviewedStorefrontCorrections(isRecord(value) ? value : {});
  const configurations = recordArray(product.configurations);
  if (!configurations.length) return unavailableOffer();

  const blockers: string[] = [];
  const rows = configurations
    .map((configuration, index) => normalizeConfiguration(configuration, index, blockers))
    .filter((row): row is NormalizedConfiguration => Boolean(row))
    .sort((left, right) => (
      left.sort_order - right.sort_order
      || left.label.localeCompare(right.label)
      || left.code.localeCompare(right.code)
    ));

  const atomicRows = rows.filter((row) => !row.is_aggregate);
  const aggregateRows = rows.filter((row) => row.is_aggregate);
  if (!atomicRows.length) blockers.push('sellable_offer_missing_atomic_options');

  const atomicByCode = new Map<string, NormalizedConfiguration>();
  atomicRows.forEach((row) => {
    const existing = atomicByCode.get(row.code);
    if (!existing) {
      atomicByCode.set(row.code, row);
      return;
    }
    // Multiple purchasable variants may share one SEO axis. For example,
    // "Single Leg Cover" and "Pair of Leg Covers" are distinct selector
    // choices, but both are the canonical `legs` component. Their exact
    // labels stay on atomic_options and in the signature; a label difference
    // must not split or block the axis.
    if (normalize(existing.family) !== normalize(row.family)) {
      blockers.push(`sellable_component_family_conflict:${row.code}`);
    }
  });

  const nestedComponentLabels = new Map<string, string>();
  aggregateRows
    .filter((row) => !row.is_full_set)
    .forEach((row) => {
      const memberCodes = unique(row.bundle_component_codes.map(normalizeCode).filter(Boolean));
      const explicitMemberLabels = row.bundle_component_labels
        .map((label) => firstString(label))
        .filter(Boolean);
      if (explicitMemberLabels.length && explicitMemberLabels.length !== memberCodes.length) {
        blockers.push(`aggregate_member_label_count_mismatch:${row.code}`);
      }
      memberCodes.forEach((code, index) => {
        const label = explicitMemberLabels.length === memberCodes.length
          ? explicitMemberLabels[index]
          : humanizeComponentCode(code);
        const existing = nestedComponentLabels.get(code);
        if (existing && normalize(existing) !== normalize(label)) {
          blockers.push(`sellable_component_label_conflict:${code}`);
          return;
        }
        nestedComponentLabels.set(code, label);
      });
    });

  // A grouped selector choice such as "Top + Shoulders" proves those current
  // components even when neither part is sold as its own atomic option. Keep
  // the grouped choice intact while exposing its declared members to Product
  // Truth, keyword focus and a deterministic Full Set expansion.
  const componentCodes = unique([
    ...atomicByCode.keys(),
    ...nestedComponentLabels.keys(),
  ]).sort();
  const componentFamilies = unique(
    [
      ...atomicRows.map((row) => row.family).filter((value): value is string => Boolean(value)),
      ...nestedComponentLabels.keys(),
    ],
  ).sort();
  const componentLabels = componentCodes
    .map((code) => atomicByCode.get(code)?.label || nestedComponentLabels.get(code) || '')
    .filter(Boolean);

  const atomicOptions = atomicRows.map((row) => asOfferOption(row, [], [], 'atomic'));
  const fullSetRows = aggregateRows.filter((row) => row.is_full_set);
  const aggregateOptions = aggregateRows.map((row) => {
    let memberCodes = unique(row.bundle_component_codes.map(normalizeCode).filter(Boolean));
    const explicitMemberLabels = row.bundle_component_labels
      .map((label) => firstString(label))
      .filter(Boolean);
    let mappingSource: StorefrontSellableOfferOption['mapping_source'] = 'explicit_bundle_codes';

    // A single explicit Full Set has one deterministic meaning: every current
    // atomic option plus the declared members of current grouped options. This
    // is not an Etsy variation inference; it is a closed mapping over the live
    // selector and it does not manufacture extra purchasable choices.
    if (row.is_full_set && fullSetRows.length === 1 && componentCodes.length >= 2) {
      const hasOnlyCurrentMembers = memberCodes.every((code) => componentCodes.includes(code));
      if (!memberCodes.length || (hasOnlyCurrentMembers && memberCodes.length < componentCodes.length)) {
        memberCodes = unique([...memberCodes, ...componentCodes]);
        mappingSource = 'complete_current_selector';
      }
    }

    if (!memberCodes.length) {
      blockers.push(`aggregate_members_unknown:${row.code || FULL_SET_CODE}`);
    }

    const unknownMembers = memberCodes.filter((code) => !componentCodes.includes(code));
    unknownMembers.forEach((code) => {
      blockers.push(`aggregate_member_not_found_in_current_options:${code}`);
    });

    if (
      mappingSource !== 'complete_current_selector'
      && explicitMemberLabels.length
      && explicitMemberLabels.length !== memberCodes.length
    ) {
      blockers.push(`aggregate_member_label_count_mismatch:${row.code || FULL_SET_CODE}`);
    }

    const memberLabels = mappingSource !== 'complete_current_selector'
      && explicitMemberLabels.length === memberCodes.length
      ? explicitMemberLabels
      : memberCodes
        .map((code) => (
          atomicByCode.get(code)?.label
          || nestedComponentLabels.get(code)
          || humanizeComponentCode(code)
        ))
        .filter(Boolean);

    return asOfferOption(row, memberCodes, memberLabels, mappingSource);
  });

  const uniqueBlockers = unique(blockers);
  const status = uniqueBlockers.length ? 'hold' : 'ready';
  const defaultAggregate = aggregateOptions.find((option) => option.code === FULL_SET_CODE)
    || aggregateOptions[0]
    || null;
  const defaultAtomic = atomicOptions.length === 1 ? atomicOptions[0] : null;
  const defaultOption = defaultAggregate || defaultAtomic;
  const defaultIncluded = defaultOption?.is_aggregate
    ? defaultOption.member_labels
    : defaultOption ? [defaultOption.label] : [];

  return {
    contract_version: 'storefront_sellable_offer_v1',
    status,
    source: 'storefront_v4_configurations',
    source_available: true,
    atomic_options: atomicOptions,
    aggregate_options: aggregateOptions,
    component_codes: componentCodes,
    component_families: componentFamilies,
    component_labels: componentLabels,
    default_configuration_code: defaultOption?.code || null,
    default_included_components: status === 'ready' ? defaultIncluded : [],
    blockers: uniqueBlockers,
    signature: buildSignature(rows, aggregateOptions),
  };
}

export function sellableOfferIncludedLabels(
  offer: StorefrontSellableOfferTruth,
  activeConfiguration?: Record<string, unknown> | null,
) {
  if (offer.status !== 'ready') return [];

  const selected = findSelectedOption(offer, activeConfiguration);
  if (!selected) return [];
  return selected.is_aggregate ? selected.member_labels : [selected.label];
}

export function sellableOfferAvailabilitySentence(
  offer: StorefrontSellableOfferTruth,
) {
  if (offer.status !== 'ready' || offer.component_labels.length < 2) {
    return '';
  }
  const hasFullSet = offer.aggregate_options.some((option) => option.code === FULL_SET_CODE);
  if (!hasFullSet) return '';
  const hasGroupedOption = offer.aggregate_options.some((option) => option.code !== FULL_SET_CODE);
  if (hasGroupedOption) return 'Choose from individual pieces, grouped options, or the full set.';
  return 'Each piece can be ordered separately or as a full set.';
}

export function sellableOfferAllowsComponentFocus(
  offer: StorefrontSellableOfferTruth,
  value: unknown,
) {
  if (offer.status !== 'ready') return false;
  const candidate = normalize(value);
  if (!candidate) return false;
  const candidateAxis = canonicalLimbAxis(candidate);

  return [
    ...offer.component_codes,
    ...offer.component_families,
    ...offer.component_labels,
  ].some((item) => {
    const component = normalize(item);
    const singular = singularize(component);
    const componentAxis = canonicalLimbAxis(component);
    return (candidateAxis && candidateAxis === componentAxis)
      || candidate === component
      || candidate === singular
      || containsPhrase(candidate, component)
      || containsPhrase(candidate, singular);
  });
}

type NormalizedConfiguration = {
  configuration_id: string | null;
  code: string;
  family: string | null;
  label: string;
  sort_order: number;
  is_aggregate: boolean;
  is_full_set: boolean;
  bundle_component_codes: string[];
  bundle_component_labels: string[];
};

function normalizeConfiguration(
  row: RecordValue,
  index: number,
  blockers: string[],
): NormalizedConfiguration | null {
  const label = firstString(
    row.public_label,
    row.configuration_label,
    row.configuration_name,
    row.option_value,
    row.label,
  );
  const labelCode = normalizeCode(label);
  const isFullSet = row.is_full_set === true
    || normalizeCode(row.component_code) === FULL_SET_CODE
    || labelCode === FULL_SET_CODE;
  const isAggregate = isFullSet || row.is_bundle === true;
  let code = normalizeCode(row.component_code);

  // Storefront v4 may expose an unresolved imported variation as `Option`.
  // That placeholder can represent a colour, size or another non-component
  // axis, so deriving a component code from it would manufacture a sellable
  // piece and could leak `What's included: Option` into the PDP. Keep useful
  // English labels such as `Skirt` eligible for the existing fallback, but
  // fail closed on the anonymous placeholder until its component identity is
  // reviewed or an explicit component code/family is attached.
  if (
    !code
    && !firstString(row.component_family)
    && /^option(?:\s+\d+)?$/i.test(label)
  ) {
    blockers.push(`sellable_option_unresolved_component_identity:${index}`);
    return null;
  }
  if (!code && isFullSet) code = FULL_SET_CODE;
  if (!code) code = labelCode;

  if (!label) blockers.push(`sellable_option_missing_public_label:${index}`);
  if (label && CYRILLIC.test(label)) blockers.push(`sellable_option_non_english_public_label:${index}`);
  if (!code) blockers.push(`sellable_option_missing_component_code:${index}`);
  if (!label || !code) return null;

  return {
    configuration_id: firstString(
      row.configuration_id,
      row.configuration_price_id,
      row.source_price_row_id,
      row.sellable_configuration_id,
    ) || null,
    code,
    family: firstString(row.component_family)
      ? normalizeCode(row.component_family)
      : null,
    label,
    sort_order: finiteNumber(row.sort_order) ?? index + 1,
    is_aggregate: isAggregate,
    is_full_set: isFullSet,
    bundle_component_codes: Array.isArray(row.bundle_component_codes)
      ? row.bundle_component_codes.map(String)
      : [],
    bundle_component_labels: Array.isArray(row.bundle_component_labels)
      ? row.bundle_component_labels.map(String)
      : [],
  };
}

function asOfferOption(
  row: NormalizedConfiguration,
  memberCodes: string[],
  memberLabels: string[],
  mappingSource: StorefrontSellableOfferOption['mapping_source'],
): StorefrontSellableOfferOption {
  return {
    configuration_id: row.configuration_id,
    code: row.code,
    family: row.family,
    label: row.label,
    sort_order: row.sort_order,
    is_aggregate: row.is_aggregate,
    member_codes: memberCodes,
    member_labels: memberLabels,
    mapping_source: mappingSource,
  };
}

function findSelectedOption(
  offer: StorefrontSellableOfferTruth,
  activeConfiguration?: Record<string, unknown> | null,
) {
  const options = [...offer.atomic_options, ...offer.aggregate_options];
  if (!activeConfiguration) {
    return offer.aggregate_options.find((option) => option.code === FULL_SET_CODE)
      || (offer.atomic_options.length === 1 ? offer.atomic_options[0] : null);
  }

  if (activeConfiguration.is_full_set === true) {
    return offer.aggregate_options.find((option) => option.code === FULL_SET_CODE)
      || offer.aggregate_options[0]
      || null;
  }

  const activeId = firstString(
    activeConfiguration.configuration_id,
    activeConfiguration.configuration_price_id,
    activeConfiguration.source_price_row_id,
    activeConfiguration.sellable_configuration_id,
  );
  if (activeId) {
    const exactId = options.find((option) => option.configuration_id === activeId);
    if (exactId) return exactId;
  }

  const activeCode = normalizeCode(activeConfiguration.component_code);
  if (activeCode) {
    const exactCode = options.find((option) => option.code === activeCode);
    if (exactCode) return exactCode;
  }

  const activeLabel = firstString(
    activeConfiguration.public_label,
    activeConfiguration.configuration_label,
    activeConfiguration.configuration_name,
    activeConfiguration.option_value,
    activeConfiguration.raw_option_value,
  );
  return activeLabel
    ? options.find((option) => normalize(option.label) === normalize(activeLabel)) || null
    : null;
}

function buildSignature(
  rows: NormalizedConfiguration[],
  aggregateOptions: StorefrontSellableOfferOption[],
) {
  const membersByCode = new Map(
    aggregateOptions.map((option) => [option.code, option.member_codes]),
  );
  const snapshot = rows.map((row) => ({
    id: row.configuration_id,
    code: row.code,
    family: row.family,
    label: row.label,
    aggregate: row.is_aggregate,
    full_set: row.is_full_set,
    // Aggregate membership is a set. SQL plans and source imports may return
    // the same exact components in a different order; that must not
    // invalidate an otherwise identical human-confirmed keyword decision.
    members: [...(membersByCode.get(row.code) || [])].sort(),
  }));
  return `storefront-sellable-offer-v1:${JSON.stringify(snapshot)}`;
}

function unavailableOffer(): StorefrontSellableOfferTruth {
  return {
    contract_version: 'storefront_sellable_offer_v1',
    status: 'hold',
    source: 'unavailable',
    source_available: false,
    atomic_options: [],
    aggregate_options: [],
    component_codes: [],
    component_families: [],
    component_labels: [],
    default_configuration_code: null,
    default_included_components: [],
    blockers: ['current_sellable_options_unavailable'],
    signature: null,
  };
}

function recordArray(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.replace(/\s+/g, ' ').trim()) {
      return value.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

function finiteNumber(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeCode(value: unknown) {
  return normalize(value).replace(/\s+/g, '_');
}

function humanizeComponentCode(value: unknown) {
  return normalizeCode(value)
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(value: string) {
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith('es') && value.length > 4) return value.slice(0, -2);
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1);
  return value;
}

function canonicalLimbAxis(value: string): 'arms' | 'legs' | null {
  const normalized = normalize(value);
  if (!normalized) return null;

  const armTerms = [
    'arm', 'arms', 'arm set', 'arm piece', 'arm pieces', 'arm cover', 'arm covers',
    'arm armor', 'arm armour', 'arm cuff', 'arm cuffs', 'armlet', 'armlets',
    'bicep', 'biceps', 'bracelet', 'bracelets', 'bracer', 'bracers', 'cuff', 'cuffs',
    'forearm', 'forearms', 'forearm cover', 'forearm covers', 'glove', 'gloves',
  ];
  if (armTerms.some((term) => containsPhrase(normalized, term))) return 'arms';

  const legTerms = [
    'leg', 'legs', 'leg cover', 'leg covers', 'leg armor', 'leg armour',
    'leg harness', 'leg harnesses', 'garter', 'garters', 'shin', 'shins',
    'thigh', 'thighs', 'thigh cover', 'thigh covers',
  ];
  if (legTerms.some((term) => containsPhrase(normalized, term))) return 'legs';

  return null;
}

function containsPhrase(value: string, phrase: string) {
  if (!phrase) return false;
  return ` ${value} `.includes(` ${phrase} `);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
