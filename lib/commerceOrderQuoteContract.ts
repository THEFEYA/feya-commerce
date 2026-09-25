import {
  resolveExactVariant,
  validateVariantSnapshot,
  type VariantSnapshot,
} from './commerceVariantContract.ts';

export type OrderableOfferSnapshot = {
  offer_revision_id: string;
  offer_revision: number;
  release_ref: string;
  approval_ref: string;
  status: 'active' | 'hold' | 'retired';
  max_quantity_per_line: number;
  variant_snapshot: VariantSnapshot;
};

export type OrderQuoteRequest = {
  request_id: string;
  canonical_product_id: string;
  variant_id: string;
  configuration_price_id: string;
  color_id: string | null;
  size_id: string | null;
  expected_product_revision: number;
  expected_offer_revision: number;
  quantity: number;
};

export type OrderQuoteBasis = {
  request_id: string;
  release_ref: string;
  offer_revision_id: string;
  offer_revision: number;
  canonical_product_id: string;
  product_revision: number;
  variant_id: string;
  configuration_price_id: string;
  color_id: string | null;
  size_id: string | null;
  quantity: number;
  unit_amount_minor: number;
  line_amount_minor: number;
  currency: string;
  price_quote_id: string;
  price_revision: number;
  price_source: 'configuration_base' | 'exception_override';
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_KEYS = [
  'request_id',
  'canonical_product_id',
  'variant_id',
  'configuration_price_id',
  'color_id',
  'size_id',
  'expected_product_revision',
  'expected_offer_revision',
  'quantity',
].sort();

function exactObjectKeys(value: Record<string, unknown>, keys: string[]) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys);
}

export function validateOrderableOfferSnapshot(offer: OrderableOfferSnapshot): void {
  if (!UUID.test(offer.offer_revision_id)
    || !Number.isSafeInteger(offer.offer_revision) || offer.offer_revision < 1
    || !offer.release_ref?.trim() || offer.release_ref.length > 200
    || !offer.approval_ref?.trim() || offer.approval_ref.length > 500
    || !['active', 'hold', 'retired'].includes(offer.status)
    || !Number.isSafeInteger(offer.max_quantity_per_line) || offer.max_quantity_per_line < 1)
    throw new Error('orderable_offer_invalid');
  validateVariantSnapshot(offer.variant_snapshot);
}

export function parseOrderQuoteRequest(input: unknown): OrderQuoteRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('order_quote_request_invalid');
  const value = input as Record<string, unknown>;
  if (!exactObjectKeys(value, REQUEST_KEYS))
    throw new Error('order_quote_request_invalid');
  for (const key of ['request_id', 'canonical_product_id', 'variant_id', 'configuration_price_id'] as const) {
    if (typeof value[key] !== 'string' || !UUID.test(value[key] as string))
      throw new Error('order_quote_request_invalid');
  }
  for (const key of ['color_id', 'size_id'] as const) {
    if (value[key] !== null && (typeof value[key] !== 'string' || !UUID.test(value[key] as string)))
      throw new Error('order_quote_request_invalid');
  }
  for (const key of ['expected_product_revision', 'expected_offer_revision', 'quantity'] as const) {
    if (typeof value[key] !== 'number' || !Number.isSafeInteger(value[key]) || (value[key] as number) < 1)
      throw new Error('order_quote_request_invalid');
  }
  return value as unknown as OrderQuoteRequest;
}

/**
 * Resolve the immutable monetary/orderability basis for a future persisted server quote.
 *
 * No amount/currency fields are accepted from the caller. The amount is always resolved
 * from the exact active tuple in the approved offer snapshot. This function does not
 * persist a quote, order, payment or cart state.
 */
export function resolveOrderQuoteBasis(
  offer: OrderableOfferSnapshot,
  rawRequest: unknown,
): OrderQuoteBasis {
  validateOrderableOfferSnapshot(offer);
  const request = parseOrderQuoteRequest(rawRequest);
  if (offer.status !== 'active') throw new Error('offer_not_orderable');
  if (request.expected_offer_revision !== offer.offer_revision)
    throw new Error('offer_revision_conflict');
  if (request.canonical_product_id !== offer.variant_snapshot.canonical_product_id)
    throw new Error('offer_product_conflict');
  if (request.quantity > offer.max_quantity_per_line)
    throw new Error('order_quantity_exceeds_offer_limit');

  const resolved = resolveExactVariant(offer.variant_snapshot, {
    configuration_price_id: request.configuration_price_id,
    color_id: request.color_id,
    size_id: request.size_id,
  }, request.expected_product_revision);

  if (resolved.variant_id !== request.variant_id)
    throw new Error('offer_variant_conflict');

  const line = resolved.amount_minor * request.quantity;
  if (!Number.isSafeInteger(line) || line <= 0)
    throw new Error('order_line_amount_overflow');

  return {
    request_id: request.request_id,
    release_ref: offer.release_ref,
    offer_revision_id: offer.offer_revision_id,
    offer_revision: offer.offer_revision,
    canonical_product_id: resolved.canonical_product_id,
    product_revision: resolved.product_revision,
    variant_id: resolved.variant_id,
    configuration_price_id: resolved.configuration_price_id,
    color_id: resolved.color_id,
    size_id: resolved.size_id,
    quantity: request.quantity,
    unit_amount_minor: resolved.amount_minor,
    line_amount_minor: line,
    currency: resolved.currency,
    price_quote_id: resolved.quote_id,
    price_revision: resolved.price_revision,
    price_source: resolved.price_source,
  };
}
