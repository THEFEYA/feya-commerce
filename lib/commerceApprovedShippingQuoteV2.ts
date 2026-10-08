import { APPROVED_DELIVERY_RESOLUTION, parseApprovedDeliveryRequest, resolveApprovedDelivery,
  type ApprovedDeliveryRequest } from './commerceApprovedDeliveryResolution.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

export const APPROVED_SHIPPING_QUOTE_V2 = 'commerce_approved_shipping_quote_v2' as const;
export type ApprovedShippingQuoteV2Request = {
  contract_version: typeof APPROVED_SHIPPING_QUOTE_V2;
  request_id: string;
  quote_receipt_ids: string[];
  country: string;
  postal_code: string;
  shipping_method: 'standard' | 'express';
};
export type ApprovedShippingQuoteV2Receipt = {
  contract_version: typeof APPROVED_SHIPPING_QUOTE_V2;
  shipping_quote_receipt_id: string; request_id: string;
  approval_id: string; approval_revision: number; workspace_version_id: string;
  workspace_revision: number; catalog_sha256: string; basket_sha256: string; destination_sha256: string;
  country: string; shipping_method: 'standard' | 'express'; currency: 'EUR';
  amount_minor: number; parcel_count: number;
  estimated_arrival: { from: string; to: string };
  created_at: string; expires_at: string; start_basis: 'preview_ready_now';
  persisted: true; payable: false; public_rates_enabled: false;
  payment_enabled: false; provider_session_enabled: false;
  replayed: boolean; expired: boolean;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
export class ApprovedShippingQuoteV2Error extends Error {
  status: number;
  outcome: 'not_written' | 'unknown';
  constructor(code: string, status: number, outcome: 'not_written' | 'unknown' = 'not_written') {
    super(code); this.status = status; this.outcome = outcome;
  }
}

export function parseApprovedShippingQuoteV2Request(raw: unknown): ApprovedShippingQuoteV2Request {
  const expected = ['contract_version','country','postal_code','quote_receipt_ids','request_id','shipping_method'];
  if (!record(raw) || JSON.stringify(Object.keys(raw).sort()) !== JSON.stringify(expected)
    || raw.contract_version !== APPROVED_SHIPPING_QUOTE_V2
    || typeof raw.request_id !== 'string' || !UUID.test(raw.request_id)) {
    throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_request_invalid', 400);
  }
  let delivery: ApprovedDeliveryRequest;
  try {
    delivery = parseApprovedDeliveryRequest({
      contract_version: APPROVED_DELIVERY_RESOLUTION,
      quote_receipt_ids: raw.quote_receipt_ids,
      country: raw.country, postal_code: raw.postal_code, shipping_method: raw.shipping_method,
    });
  } catch { throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_request_invalid', 400); }
  return { contract_version: APPROVED_SHIPPING_QUOTE_V2, request_id: raw.request_id, quote_receipt_ids: delivery.quote_receipt_ids,
    country: delivery.country, postal_code: delivery.postal_code, shipping_method: delivery.shipping_method };
}
function storageError(err: { message?: string; code?: string } | null | undefined): never {
  const code = err?.message || '';
  if (err?.code === 'P0001' && /^approved_shipping_quote_[a-z_]+$/.test(code)) {
    const status = /request_invalid|resolution_invalid|amount_invalid/.test(code) ? 422
      : /boundary_not_ready|storage_unavailable/.test(code) ? 503 : 409;
    throw new ApprovedShippingQuoteV2Error(code, status);
  }
  throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_storage_outcome_unknown', 503, 'unknown');
}
function parseReceipt(raw: unknown, req: ApprovedShippingQuoteV2Request): ApprovedShippingQuoteV2Receipt {
  if (!record(raw)
    || raw.contract_version !== APPROVED_SHIPPING_QUOTE_V2
    || typeof raw.shipping_quote_receipt_id !== 'string' || !UUID.test(raw.shipping_quote_receipt_id)
    || raw.request_id !== req.request_id
    || typeof raw.approval_id !== 'string' || !UUID.test(raw.approval_id)
    || !Number.isSafeInteger(raw.approval_revision) || Number(raw.approval_revision) < 1
    || typeof raw.workspace_version_id !== 'string' || !UUID.test(raw.workspace_version_id)
    || !Number.isSafeInteger(raw.workspace_revision) || Number(raw.workspace_revision) < 1
    || typeof raw.catalog_sha256 !== 'string' || !SHA.test(raw.catalog_sha256)
    || typeof raw.basket_sha256 !== 'string' || !SHA.test(raw.basket_sha256)
    || typeof raw.destination_sha256 !== 'string' || !SHA.test(raw.destination_sha256)
    || raw.country !== req.country || raw.shipping_method !== req.shipping_method
    || raw.currency !== 'EUR' || !Number.isSafeInteger(raw.amount_minor) || Number(raw.amount_minor) < 0
    || !Number.isSafeInteger(raw.parcel_count) || Number(raw.parcel_count) < 1
    || !record(raw.estimated_arrival)
    || typeof raw.estimated_arrival.from !== 'string' || typeof raw.estimated_arrival.to !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(raw.estimated_arrival.from)
    || !/^\d{4}-\d{2}-\d{2}$/.test(raw.estimated_arrival.to)
    || raw.estimated_arrival.from > raw.estimated_arrival.to
    || typeof raw.created_at !== 'string' || typeof raw.expires_at !== 'string'
    || !Number.isFinite(Date.parse(raw.created_at)) || !Number.isFinite(Date.parse(raw.expires_at))
    || Date.parse(raw.created_at) >= Date.parse(raw.expires_at)
    || raw.start_basis !== 'preview_ready_now'
    || raw.persisted !== true || raw.payable !== false || raw.public_rates_enabled !== false
    || raw.payment_enabled !== false || raw.provider_session_enabled !== false
    || typeof raw.replayed !== 'boolean' || typeof raw.expired !== 'boolean') {
    throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_response_invalid', 503, 'unknown');
  }
  return raw as ApprovedShippingQuoteV2Receipt;
}

/** Internal-only; the request contains no price, currency, quantity, or readiness claims.
 * Replay returns the immutable original even after an owner approval changes.
 * Expiry is evaluated server-side and never treated as an active payment authorization. */
export async function issueApprovedShippingQuoteV2(client: QuoteRPCClient, rawRequest: unknown): Promise<ApprovedShippingQuoteV2Receipt> {
  const request = parseApprovedShippingQuoteV2Request(rawRequest);
  let lookup;
  try { lookup = await client.rpc('feya_commerce_lookup_approved_shipping_quote_v2', { p_request: request }); }
  catch { throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_storage_unavailable', 503, 'unknown'); }
  if (lookup.error) storageError(lookup.error);
  if (lookup.data != null) return parseReceipt(lookup.data, request);
  const resolution = await resolveApprovedDelivery(client, {
    contract_version: APPROVED_DELIVERY_RESOLUTION,
    quote_receipt_ids: request.quote_receipt_ids,
    country: request.country, postal_code: request.postal_code, shipping_method: request.shipping_method,
  });
  if (resolution.currency !== 'EUR' || resolution.payment_enabled !== false || resolution.payable !== false) {
    throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_resolution_invalid', 409);
  }
  let saved;
  try {
    saved = await client.rpc('feya_commerce_create_approved_shipping_quote_v2',
      { p_request: request, p_resolution: resolution });
  } catch { throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_storage_outcome_unknown', 503, 'unknown'); }
  if (saved.error) storageError(saved.error);
  const receipt = parseReceipt(saved.data, request);
  if (!receipt.replayed && (receipt.amount_minor !== resolution.shipping_amount_minor
    || receipt.approval_id !== resolution.approval_id
    || receipt.workspace_version_id !== resolution.workspace_version_id
    || receipt.basket_sha256 !== resolution.basket_sha256
    || receipt.destination_sha256 !== resolution.destination_sha256)) {
    throw new ApprovedShippingQuoteV2Error('approved_shipping_quote_response_invalid', 503, 'unknown');
  }
  return receipt;
}
