import { parseOrderQuoteRequest, type OrderQuoteRequest } from './commerceOrderQuoteContract.ts';

export const COMMERCE_QUOTE_CONTRACT = 'commerce_quote_receipt_v1';
export const COMMERCE_QUOTE_HEALTH_RPC = 'feya_commerce_quote_health_v1';
export const COMMERCE_QUOTE_CREATE_RPC = 'feya_commerce_create_quote_v1';

export type CommerceQuoteReceipt = {
  contract_version: 'commerce_quote_receipt_v1';
  quote_receipt_id: string;
  request_id: string;
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
  release_ref: string;
  expires_at: string | null;
  order_creation_enabled: false;
  payment_enabled: false;
  replayed: boolean;
};

export type QuoteRPCClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message?: string; code?: string } | null;
  }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));

export class CommerceQuoteStorageError extends Error {
  status: number;
  outcome: 'not_written' | 'unknown';
  constructor(code: string, status: number, outcome: 'not_written' | 'unknown' = 'not_written') {
    super(code); this.status = status; this.outcome = outcome;
  }
}

function rpcError(error: { message?: string; code?: string }): never {
  const message = error.message || '';
  if (error.code === 'P0001' && /^quote_[a-z_]+$/.test(message)) {
    const status =
      /not_found/.test(message) ? 404 :
      /conflict|not_orderable|exceeds/.test(message) ? 409 :
      /contract_not_ready/.test(message) ? 503 : 422;
    throw new CommerceQuoteStorageError(message, status);
  }
  if (['23503','23505','23514','42501'].includes(error.code || ''))
    throw new CommerceQuoteStorageError('quote_database_constraint_rejected', 409);
  throw new CommerceQuoteStorageError('quote_storage_outcome_unknown', 503, 'unknown');
}

export async function verifyCommerceQuoteBoundary(client: QuoteRPCClient): Promise<void> {
  const { data, error } = await client.rpc(COMMERCE_QUOTE_HEALTH_RPC);
  if (error || !isRecord(data)
    || data.contract_version !== COMMERCE_QUOTE_CONTRACT
    || data.ready !== true
    || data.offer_projection_write_enabled !== false
    || data.quote_receipt_write_enabled !== true
    || data.order_creation_enabled !== false
    || data.payment_enabled !== false
    || data.indexing_enabled !== false)
    throw new CommerceQuoteStorageError('quote_contract_not_ready', 503);
}

export function parseCommerceQuoteReceipt(data: unknown, request: OrderQuoteRequest): CommerceQuoteReceipt {
  if (!isRecord(data) || data.contract_version !== COMMERCE_QUOTE_CONTRACT
    || typeof data.quote_receipt_id !== 'string' || !UUID.test(data.quote_receipt_id)
    || data.request_id !== request.request_id
    || typeof data.offer_revision_id !== 'string' || !UUID.test(data.offer_revision_id)
    || data.canonical_product_id !== request.canonical_product_id
    || data.variant_id !== request.variant_id
    || data.configuration_price_id !== request.configuration_price_id
    || data.color_id !== request.color_id || data.size_id !== request.size_id
    || data.quantity !== request.quantity
    || !Number.isSafeInteger(data.offer_revision) || data.offer_revision !== request.expected_offer_revision
    || !Number.isSafeInteger(data.product_revision) || data.product_revision !== request.expected_product_revision
    || !Number.isSafeInteger(data.unit_amount_minor) || (data.unit_amount_minor as number) <= 0
    || !Number.isSafeInteger(data.line_amount_minor) || (data.line_amount_minor as number) !== (data.unit_amount_minor as number) * request.quantity
    || typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)
    || typeof data.price_quote_id !== 'string' || !UUID.test(data.price_quote_id)
    || !Number.isSafeInteger(data.price_revision) || (data.price_revision as number) < 1
    || !['configuration_base','exception_override'].includes(String(data.price_source))
    || typeof data.release_ref !== 'string' || !data.release_ref.trim()
    || data.expires_at !== null
    || data.order_creation_enabled !== false || data.payment_enabled !== false
    || typeof data.replayed !== 'boolean')
    throw new CommerceQuoteStorageError('quote_receipt_invalid', 503, 'unknown');
  return data as unknown as CommerceQuoteReceipt;
}

export async function createCommerceQuote(client: QuoteRPCClient, rawRequest: unknown) {
  const request = parseOrderQuoteRequest(rawRequest);
  await verifyCommerceQuoteBoundary(client);
  let result;
  try { result = await client.rpc(COMMERCE_QUOTE_CREATE_RPC, { p_payload: request }); }
  catch { throw new CommerceQuoteStorageError('quote_storage_outcome_unknown', 503, 'unknown'); }
  if (result.error) rpcError(result.error);
  return parseCommerceQuoteReceipt(result.data, request);
}
