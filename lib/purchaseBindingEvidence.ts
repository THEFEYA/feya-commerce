/** Offline evidence compiler for the existing Product OS review workflow.
 * Imported prices are observations, not approved quotes or availability.
 * No production reader imports this module; no DB or UI mutation occurs. */
export type PriceRow = {
  canonical_product_id: string; configuration_price_id: string; sellable_configuration_id: string;
  option_mapping_id: string; source_price_row_id: string; source_amount: string;
  source_currency: string; public_price_amount: string | null; manual_override_amount: string | null;
  review_status: string; price_status: string; fallback_flag: boolean;
};
export type MappingRow = {
  canonical_product_id: string; option_mapping_id: string; source_price_row_id: string;
  source_listing_id: string; detected_canonical_axis: string; raw_option_name: string;
  raw_option_value: string; review_status: string;
};
export type ConfigurationRow = {
  canonical_product_id: string; sellable_configuration_id: string; option_mapping_id: string;
  configuration_name: string; normalized_key: string; review_status: string;
};
export type SourcePriceRow = {
  source_price_row_id: string; source_listing_id: string; raw_option_name: string;
  raw_option_value: string; raw_option_text: string; parsed_price_amount: string;
  price_text: string; currency: string; review_status: string; fallback_flag: boolean;
  raw_payload?: { raw_option?: string };
};
export type ProductScope = {
  canonical_product_id: string; source_listing_id: string;
  declared_sizes: string[]; declared_colors: string[];
};
export type BindingCapture = {
  prices: PriceRow[]; mappings: MappingRow[]; configurations: ConfigurationRow[]; source_prices: SourcePriceRow[];
};

// This bounded parser supports the observed EUR source format. Ambiguous
// grouping, additional currencies and unknown formats require separate review.
function decimal(value: string): string | null {
  const match = /^(\d{1,9})(?:[.,](\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  return `${BigInt(match[1])}.${match[2] || '00'}`;
}
const cents = (value: string) => BigInt(value.replace('.', ''));
export function parseSourcePriceEvidence(source: Pick<SourcePriceRow, 'raw_option_name' | 'raw_option_value' | 'raw_option_text' | 'parsed_price_amount' | 'currency' | 'raw_payload'>) {
  const blockers: string[] = [];
  const unresolved = () => ({ kind: 'unresolved' as const, minimum: null, maximum: null, currency: source.currency, blockers });
  if (source.currency !== 'EUR') { blockers.push('unsupported_source_currency'); return unresolved(); }
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(source.raw_option_text); }
  catch { blockers.push('invalid_raw_option_json'); return unresolved(); }
  if (!payload || Array.isArray(payload) || Object.keys(payload).length !== 1 || typeof payload[source.raw_option_name] !== 'string') {
    blockers.push('raw_option_axis_mismatch'); return unresolved();
  }
  // Prefer the original option string. price_text / variant_price_text may
  // already be a lossy projection of the lower bound.
  const raw = payload[source.raw_option_name] as string;
  const match = /\((\d{1,9}(?:[.,]\d{2})?)\s*(?:€|EUR)(?:\s*[-–]\s*(\d{1,9}(?:[.,]\d{2})?)\s*(?:€|EUR))?\)\s*$/.exec(raw);
  if (!match) { blockers.push('unresolved_original_price_expression'); return unresolved(); }
  if (raw.slice(0, match.index).trim() !== source.raw_option_value.trim()) {
    blockers.push('original_option_value_disagrees'); return unresolved();
  }
  if (source.raw_payload?.raw_option && source.raw_payload.raw_option !== source.raw_option_text) {
    blockers.push('original_raw_payload_disagrees'); return unresolved();
  }
  const minimum = decimal(match[1])!, maximum = decimal(match[2] || match[1])!;
  if (cents(maximum) < cents(minimum)) { blockers.push('reversed_source_range'); return unresolved(); }
  if (decimal(source.parsed_price_amount) !== minimum) {
    blockers.push('imported_amount_disagrees_with_original'); return unresolved();
  }
  // Even equal endpoints preserve the original range semantics.
  return { kind: match[2] ? 'range_observation' as const : 'exact_observation' as const, minimum, maximum, currency: source.currency, blockers };
}

const sizeAxis = /^(?:Размер рубашки унисекс|Размер|Unisex shirt size|Size)$/i;
const configurationAxis = /^(?:Выберите свой набор|Choose Your Set|Choose a set|MAKE YOUR CHOICE)$/i;
function sizeValue(raw: string) {
  // 1X/2X are retained literally. Their equivalence to XL/XXL is not asserted.
  return /^(XXS|XS|S|M|L|XL|[1-5]X)(?: US, (?:женский )?буквенный)?$/i.exec(raw.trim())?.[1].toUpperCase() || null;
}
function keyed<T>(rows: T[], key: (r: T) => string, name: string) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const id = key(row);
    if (!id || map.has(id)) throw new Error(`Missing or duplicate ${name} identity`);
    map.set(id, row);
  }
  return map;
}

export function compilePurchaseBindingEvidence(capture: BindingCapture, scopes: ProductScope[]) {
  const products = keyed(scopes, p => p.canonical_product_id, 'product');
  const prices = keyed(capture.prices, p => p.configuration_price_id, 'price');
  const mappings = keyed(capture.mappings, p => p.option_mapping_id, 'mapping');
  const configurations = keyed(capture.configurations, p => p.sellable_configuration_id, 'configuration');
  const sources = keyed(capture.source_prices, p => p.source_price_row_id, 'source-price');
  const usedSources = new Set<string>(), usedMappings = new Set<string>(), usedConfigurations = new Set<string>();
  const rows = [...prices.values()].sort((a, b) => a.configuration_price_id.localeCompare(b.configuration_price_id)).map(price => {
    const product = products.get(price.canonical_product_id), mapping = mappings.get(price.option_mapping_id);
    const configuration = configurations.get(price.sellable_configuration_id), source = sources.get(price.source_price_row_id);
    if (!product || !mapping || !configuration || !source) throw new Error('Incomplete binding lineage');
    if (mapping.canonical_product_id !== product.canonical_product_id || configuration.canonical_product_id !== product.canonical_product_id
      || mapping.source_price_row_id !== source.source_price_row_id || mapping.source_listing_id !== product.source_listing_id
      || source.source_listing_id !== product.source_listing_id) throw new Error('Cross-product or wrong source-price lineage');
    if (usedSources.has(source.source_price_row_id) || usedMappings.has(mapping.option_mapping_id)) throw new Error('Ambiguous source-price binding');
    usedSources.add(source.source_price_row_id); usedMappings.add(mapping.option_mapping_id); usedConfigurations.add(configuration.sellable_configuration_id);
    const blockers: string[] = [];
    if (mapping.raw_option_name !== source.raw_option_name || mapping.raw_option_value !== source.raw_option_value) blockers.push('mapping_source_text_disagrees');
    const axis = mapping.detected_canonical_axis === 'size' && sizeAxis.test(source.raw_option_name) ? 'size'
      : mapping.detected_canonical_axis === 'configuration' && configurationAxis.test(source.raw_option_name) ? 'configuration' : 'unknown';
    const size = axis === 'size' ? sizeValue(source.raw_option_value) : null;
    if (axis === 'unknown' || (axis === 'size' && !size)) blockers.push('unresolved_option_axis_or_value');
    if (size && !product.declared_sizes.includes(size)) blockers.push('priced_size_not_in_declared_axis');
    if (axis === 'size') blockers.push('size_row_is_not_a_sellable_component');
    if (configuration.option_mapping_id !== mapping.option_mapping_id) blockers.push('configuration_parent_points_to_different_mapping');
    const observation = parseSourcePriceEvidence(source);
    blockers.push(...observation.blockers);
    if (observation.kind === 'range_observation') blockers.push('range_is_not_exact_variant_price');
    if (decimal(price.source_amount) !== decimal(source.parsed_price_amount) || price.source_currency !== source.currency) blockers.push('price_source_amount_or_currency_disagrees');
    if (price.fallback_flag || source.fallback_flag) blockers.push('fallback_price_requires_review');
    if ([price.review_status, mapping.review_status, configuration.review_status, source.review_status].some(s => s !== 'approved')) blockers.push('binding_review_not_approved');
    if (price.price_status !== 'approved') blockers.push('price_activation_not_confirmed');
    // A single-axis dropdown observation never supplies a complete tuple or
    // current availability, even when its observed amount is exact.
    blockers.push('complete_selection_price_unverified', 'current_availability_unverified');
    return { proposal_key: `price-binding:${price.canonical_product_id}:${price.configuration_price_id}`,
      canonical_product_id: price.canonical_product_id, configuration_price_id: price.configuration_price_id,
      storefront_configuration_id: price.configuration_price_id, sellable_configuration_id: price.sellable_configuration_id,
      option_mapping_id: price.option_mapping_id, source_price_row_id: price.source_price_row_id,
      source_listing_id: source.source_listing_id, axis, source_value: source.raw_option_value, proposed_size_value: size,
      purchase_option_ref: axis === 'configuration' ? price.option_mapping_id : null,
      coordinate_scope: 'single_axis_observation', complete_variant_coordinates: null,
      price_observation: observation, preserved_price: { source_amount: price.source_amount, source_currency: price.source_currency,
        public_price_amount: price.public_price_amount, manual_override_amount: price.manual_override_amount },
      review_status: { price: price.review_status, mapping: mapping.review_status, configuration: configuration.review_status, source: source.review_status },
      blockers: [...new Set(blockers)].sort(), availability: 'unknown', owner: 'CPIM',
      charge_amount: null, can_apply: false, can_add_to_cart: false, can_publish: false, can_index: false,
    };
  });
  if (usedSources.size !== sources.size || usedMappings.size !== mappings.size || usedConfigurations.size !== configurations.size
    || scopes.some(s => !rows.some(r => r.canonical_product_id === s.canonical_product_id))) throw new Error('Unaccounted rows or incomplete product coverage');
  const collisions = [...configurations.values()].flatMap(c => {
    const linked = rows.filter(r => r.sellable_configuration_id === c.sellable_configuration_id);
    return linked.length > 1 ? [{ canonical_product_id: c.canonical_product_id, sellable_configuration_id: c.sellable_configuration_id,
      configuration_name: c.configuration_name, normalized_key: c.normalized_key,
      configuration_price_ids: linked.map(r => r.configuration_price_id), option_mapping_ids: linked.map(r => r.option_mapping_id),
      action: 'Keep each original price/mapping ID. Shared legacy parent is not proof of identical purchase contents.', can_merge: false }] : [];
  }).sort((a, b) => a.sellable_configuration_id.localeCompare(b.sellable_configuration_id));
  return { contract_version: 'purchase_binding_evidence_v1', rows, configuration_parent_collisions: collisions,
    coverage: scopes.map(s => {
      const own = rows.filter(r => r.canonical_product_id === s.canonical_product_id);
      const observed = [...new Set(own.map(r => r.proposed_size_value).filter((v): v is string => v !== null))];
      return { ...s, observed_size_values: observed.sort(), declared_sizes_without_price_rows: s.declared_sizes.filter(v => !observed.includes(v)),
        interpretation: 'Missing price observations do not prove unavailability. Declared colors do not establish equal pricing or available combinations.',
        generated_variant_combinations: 0, confirmed_orderable_variant_count: null, can_index: false };
    }), can_apply: false, can_publish: false, can_index: false };
}

/** Rehearse a selection for CPIM review without turning it into a quote. */
export function inspectPurchaseSelection(proposal: ReturnType<typeof compilePurchaseBindingEvidence>, selection: {
  canonical_product_id: string; size?: string; color?: string; configuration_price_id?: string;
}) {
  const scope = proposal.coverage.find(s => s.canonical_product_id === selection.canonical_product_id);
  if (!scope) throw new Error('Unknown product selection');
  const own = proposal.rows.filter(r => r.canonical_product_id === selection.canonical_product_id);
  const blockers = ['complete_selection_price_unverified', 'current_availability_unverified'];
  if (selection.size && !scope.declared_sizes.includes(selection.size)) blockers.push('size_not_declared');
  if (selection.color && !scope.declared_colors.includes(selection.color)) blockers.push('color_not_declared');
  const chosen = selection.configuration_price_id ? own.find(r => r.configuration_price_id === selection.configuration_price_id) : null;
  if (selection.configuration_price_id && !chosen) blockers.push('price_id_not_owned_by_product');
  if (chosen?.axis === 'size' && chosen.proposed_size_value !== selection.size) blockers.push('selected_size_price_row_mismatch');
  const observations = own.filter(r => r.axis === 'size' && r.proposed_size_value === selection.size);
  if (selection.size && !observations.length) blockers.push('size_price_not_observed');
  if (chosen?.price_observation.kind === 'range_observation' || observations.some(r => r.price_observation.kind === 'range_observation')) blockers.push('range_is_not_exact_variant_price');
  return { selection, size_price_observations: observations.map(r => ({ configuration_price_id: r.configuration_price_id, ...r.price_observation })),
    chosen_price_observation: chosen?.price_observation || null, blockers: [...new Set(blockers)].sort(),
    charge_amount: null, can_add_to_cart: false, can_publish: false };
}
