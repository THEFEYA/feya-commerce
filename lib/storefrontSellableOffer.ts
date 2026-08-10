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
  const product = isRecord(value) ? value : {};
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
    if (normalize(existing.label) !== normalize(row.label)) {
      blockers.push(`sellable_component_label_conflict:${row.code}`);
    }
  });

  const componentCodes = [...atomicByCode.keys()].sort();
  const componentFamilies = unique(
    atomicRows.map((row) => row.family).filter((value): value is string => Boolean(value)),
  ).sort();
  const componentLabels = componentCodes
    .map((code) => atomicByCode.get(code)?.label || '')
    .filter(Boolean);

  const atomicOptions = atomicRows.map((row) => asOfferOption(row, [], [], 'atomic'));
  const aggregateOptions = aggregateRows.map((row) => {
    let memberCodes = unique(row.bundle_component_codes.map(normalizeCode).filter(Boolean));
    let mappingSource: StorefrontSellableOfferOption['mapping_source'] = 'explicit_bundle_codes';

    // A single explicit Full Set alongside a complete atomic selector has one
    // deterministic meaning: all current atomic options. This is not an Etsy
    // variation inference; it is a closed mapping over the live selector.
    if (
      !memberCodes.length
      && row.is_full_set
      && aggregateRows.length === 1
      && componentCodes.length >= 2
    ) {
      memberCodes = [...componentCodes];
      mappingSource = 'complete_current_selector';
    }

    if (!memberCodes.length) {
      blockers.push(`aggregate_members_unknown:${row.code || FULL_SET_CODE}`);
    }

    const unknownMembers = memberCodes.filter((code) => !atomicByCode.has(code));
    unknownMembers.forEach((code) => {
      blockers.push(`aggregate_member_not_found_in_current_options:${code}`);
    });

    const memberLabels = memberCodes
      .map((code) => atomicByCode.get(code)?.label || '')
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
  if (offer.status !== 'ready' || !offer.aggregate_options.length || offer.component_labels.length < 2) {
    return '';
  }
  return 'Each piece can be ordered separately or as a full set.';
}

export function sellableOfferAllowsComponentFocus(
  offer: StorefrontSellableOfferTruth,
  value: unknown,
) {
  if (offer.status !== 'ready') return false;
  const candidate = normalize(value);
  if (!candidate) return false;

  return [
    ...offer.component_codes,
    ...offer.component_families,
    ...offer.component_labels,
  ].some((item) => {
    const component = normalize(item);
    const singular = singularize(component);
    return candidate === component
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
    members: membersByCode.get(row.code) || [],
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

function containsPhrase(value: string, phrase: string) {
  if (!phrase) return false;
  return ` ${value} `.includes(` ${phrase} `);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
