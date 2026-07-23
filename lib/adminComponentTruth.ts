export const CANONICAL_PRODUCT_TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v1';

export const ADMIN_COMPONENT_TRUTH_SELECT = [
  'canonical_product_id',
  'included_components',
  'optional_configurations',
  'source_variations_json',
  'option_price_rows_json',
  'unresolved_component_facts',
  'component_review_blockers_json',
].join(',');

export type CanonicalComponentTruthRow = {
  canonical_product_id?: string | null;
  included_components?: unknown;
  optional_configurations?: unknown;
  source_variations_json?: unknown;
  option_price_rows_json?: unknown;
  unresolved_component_facts?: unknown;
  component_review_blockers_json?: unknown;
};

export type ComponentTruthDiagnostic = {
  available: boolean;
  blockers: string[];
  reviewBlockers: unknown[];
  unresolvedFacts: unknown[];
  includedComponents: unknown[];
  optionalConfigurations: unknown[];
  sourceVariations: unknown[];
  optionPriceRows: unknown[];
};

export function evidenceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function componentEvidenceLabel(value: unknown): string {
  if (typeof value === 'string') return value.trim() || 'unresolved_component_fact';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unresolved_component_fact';

  const row = value as Record<string, unknown>;
  const code = [
    row.blocker_code,
    row.code,
    row.blocker_type,
    row.reason,
    row.review_reason,
    row.mapping_status,
    row.fact_type,
  ].find((item) => typeof item === 'string' && item.trim());
  const raw = [
    row.raw_option_value,
    row.raw_value,
    row.raw_option_text,
    row.configuration_name,
    row.parallel_source_raw_value,
  ].find((item) => typeof item === 'string' && item.trim());

  if (code && raw) return `${String(code).trim()}: ${String(raw).trim()}`;
  if (code) return String(code).trim();
  if (raw) return String(raw).trim();
  return 'unresolved_component_fact';
}

export function getCanonicalComponentTruthDiagnostic(
  row: CanonicalComponentTruthRow | null | undefined,
): ComponentTruthDiagnostic {
  if (!row) {
    return {
      available: false,
      blockers: ['canonical_product_truth_unavailable'],
      reviewBlockers: [],
      unresolvedFacts: [],
      includedComponents: [],
      optionalConfigurations: [],
      sourceVariations: [],
      optionPriceRows: [],
    };
  }

  const reviewBlockers = evidenceArray(row.component_review_blockers_json);
  const unresolvedFacts = evidenceArray(row.unresolved_component_facts);
  const includedComponents = evidenceArray(row.included_components);
  const blockers: string[] = [];

  if (!includedComponents.length) blockers.push('composition_missing_confirmed_components');
  if (unresolvedFacts.length) blockers.push('composition_has_unresolved_facts');
  if (reviewBlockers.length) blockers.push('composition_has_review_blockers');

  return {
    available: true,
    blockers,
    reviewBlockers,
    unresolvedFacts,
    includedComponents,
    optionalConfigurations: evidenceArray(row.optional_configurations),
    sourceVariations: evidenceArray(row.source_variations_json),
    optionPriceRows: evidenceArray(row.option_price_rows_json),
  };
}

/**
 * Review events are an audit trail, not a Product Truth mutation layer.
 * An event may acknowledge a clean component contract, but it can never
 * override unresolved canonical component evidence.
 */
export function isReviewFieldResolved(
  field: 'label' | 'price' | 'component' | 'media',
  hasCanonicalBlocker: boolean,
  approvedEventRecorded: boolean,
): boolean {
  if (!hasCanonicalBlocker) return true;
  if (field === 'component') return false;
  return approvedEventRecorded;
}
