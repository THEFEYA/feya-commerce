/**
 * C4.3-A fail-closed readiness classifier for authoritative configuration quotes.
 *
 * This does not create a quote, activate a variant, approve a price, or enable checkout.
 * It only answers whether the existing configuration/price evidence is strong enough to
 * enter the next server-quote stage without inventing data or borrowing fallback amounts.
 */
export type ConfigurationQuoteEvidence = {
  configuration_price_id: string;
  canonical_product_id: string;
  sellable_configuration_id: string | null;
  configuration_review_status: string | null;
  configuration_is_public_candidate: boolean | null;
  configuration_is_sampler: boolean | null;
  price_status: string | null;
  price_review_status: string | null;
  fallback_flag: boolean | null;
  public_price_amount: number | string | null;
  source_currency: string | null;
};

export type ConfigurationQuoteReadiness = {
  ready: boolean;
  reason_codes: string[];
  canonical_product_id: string;
  configuration_price_id: string;
  sellable_configuration_id: string | null;
  approved_major_amount: string | null;
  currency: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXACT_PRICE_STATUSES = new Set(['approved', 'owner_reviewed']);

function normalizePositiveDecimal(value: number | string | null): string | null {
  if (value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return String(value);
  }
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  if (Number(trimmed) <= 0) return null;
  return trimmed;
}

/**
 * Gate order is deterministic so audits and CI can compare exact reason codes.
 *
 * The public storefront amount is required explicitly. We never synthesize it from
 * source_amount/manual_override_amount here; those fields may describe provenance,
 * not necessarily the final chargeable amount.
 */
export function classifyConfigurationQuoteReadiness(
  row: ConfigurationQuoteEvidence,
): ConfigurationQuoteReadiness {
  const reasons: string[] = [];
  if (!UUID.test(row.canonical_product_id) || !UUID.test(row.configuration_price_id))
    reasons.push('QUOTE_IDENTITY_INVALID');
  if (!row.sellable_configuration_id || !UUID.test(row.sellable_configuration_id))
    reasons.push('SELLABLE_CONFIGURATION_MISSING');
  if (row.configuration_review_status !== 'approved')
    reasons.push('CONFIGURATION_NOT_APPROVED');
  if (row.configuration_is_public_candidate !== true)
    reasons.push('CONFIGURATION_NOT_PUBLIC');
  if (row.configuration_is_sampler === true)
    reasons.push('SAMPLER_NOT_ORDERABLE');
  if (row.price_review_status !== 'approved')
    reasons.push('PRICE_REVIEW_NOT_APPROVED');
  if (!row.price_status || !EXACT_PRICE_STATUSES.has(row.price_status))
    reasons.push('PRICE_STATUS_NOT_EXACT');
  if (row.fallback_flag !== false)
    reasons.push('FALLBACK_PRICE_FORBIDDEN');

  const amount = normalizePositiveDecimal(row.public_price_amount);
  if (!amount) reasons.push('PUBLIC_PRICE_INVALID');
  const currency = row.source_currency && /^[A-Z]{3}$/.test(row.source_currency)
    ? row.source_currency : null;
  if (!currency) reasons.push('CURRENCY_INVALID');

  return {
    ready: reasons.length === 0,
    reason_codes: reasons,
    canonical_product_id: row.canonical_product_id,
    configuration_price_id: row.configuration_price_id,
    sellable_configuration_id: row.sellable_configuration_id,
    approved_major_amount: reasons.length === 0 ? amount : null,
    currency: reasons.length === 0 ? currency : null,
  };
}

export function requireConfigurationQuoteReady(row: ConfigurationQuoteEvidence) {
  const result = classifyConfigurationQuoteReadiness(row);
  if (!result.ready) throw new Error(`configuration_quote_not_ready:${result.reason_codes.join(',')}`);
  return result;
}
