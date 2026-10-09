import { APPROVED_DELIVERY_RESOLUTION, ApprovedDeliveryResolutionError,
  parseApprovedDeliveryRequest, resolveApprovedDelivery,
  type ApprovedDeliveryResolution } from './commerceApprovedDeliveryResolution.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

/**
 * M2 internal buyer cart shipping selector groundwork.
 * The only request fields identify immutable merchandise receipts and destination.
 * Standard / Express prices and ETA must be calculated from current approved
 * owner workspace server-side. NOT a public quote, tax, payable total, checkout,
 * provider session or order creation; no route imports this module yet.
 */
export const CART_SHIPPING_OPTIONS_CONTRACT = 'commerce_cart_shipping_options_v1' as const;
export type CartShippingOptionsRequest = {
  contract_version: typeof CART_SHIPPING_OPTIONS_CONTRACT;
  quote_receipt_ids: string[];
  country: string;
  postal_code: string;
};
export type CartShippingMethodOption = {
  shipping_method: 'standard' | 'express';
  amount_minor: number;
  currency: 'EUR';
  estimated_arrival: { from: string; to: string };
  parcel_count: number;
  event_date_guaranteed: false;
};
export type CartShippingOptionsPreview = {
  contract_version: typeof CART_SHIPPING_OPTIONS_CONTRACT;
  country: string; postal_code: string;
  currency: 'EUR';
  approval_id: string; approval_revision: number; workspace_version_id: string;
  basket_sha256: string; destination_sha256: string;
  options: CartShippingMethodOption[];
  draft_only: true; payable: false; public_rates_enabled: false;
  payment_enabled: false; provider_session_enabled: false;
};
const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v && typeof v === 'object' && !Array.isArray(v));
const fail = (code: string): never => { throw new Error(code); };

export function parseCartShippingOptionsRequest(input: unknown): CartShippingOptionsRequest {
  const keys = ['contract_version', 'country', 'postal_code', 'quote_receipt_ids'];
  if (!isObject(input) || JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(keys)
    || input.contract_version !== CART_SHIPPING_OPTIONS_CONTRACT) return fail('cart_shipping_options_request_invalid');
  let standard;
  try {
    standard = parseApprovedDeliveryRequest({
      contract_version: APPROVED_DELIVERY_RESOLUTION,
      quote_receipt_ids: input.quote_receipt_ids,
      country: input.country, postal_code: input.postal_code, shipping_method: 'standard',
    });
  } catch { return fail('cart_shipping_options_request_invalid'); }
  return { contract_version: CART_SHIPPING_OPTIONS_CONTRACT,
    quote_receipt_ids: standard.quote_receipt_ids, country: standard.country, postal_code: standard.postal_code };
}

function sameAuthority(a: ApprovedDeliveryResolution, b: ApprovedDeliveryResolution): boolean {
  return a.approval_id === b.approval_id && a.approval_revision === b.approval_revision
    && a.workspace_version_id === b.workspace_version_id
    && a.workspace_revision === b.workspace_revision
    && a.snapshot_sha256 === b.snapshot_sha256
    && a.catalog_sha256 === b.catalog_sha256
    && a.basket_sha256 === b.basket_sha256
    && a.destination_sha256 === b.destination_sha256
    && a.country === b.country && a.postal_code === b.postal_code
    && a.currency === b.currency;
}

const safeOption = (r: ApprovedDeliveryResolution): CartShippingMethodOption => {
  if (r.currency !== 'EUR' || r.payable !== false || r.persisted !== false
    || r.public_rates_enabled !== false || r.payment_enabled !== false || r.provider_session_enabled !== false
    || !Number.isSafeInteger(r.shipping_amount_minor) || r.shipping_amount_minor < 0
    || !Number.isInteger(r.parcel_count) || r.parcel_count < 1) fail('cart_shipping_options_authority_invalid');
  return { shipping_method: r.shipping_method, amount_minor: r.shipping_amount_minor, currency: 'EUR',
    parcel_count: r.parcel_count, estimated_arrival: r.estimated_arrival, event_date_guaranteed: false };
};

export async function resolveCartShippingOptions(
  client: QuoteRPCClient,
  rawRequest: unknown,
): Promise<CartShippingOptionsPreview> {
  const request = parseCartShippingOptionsRequest(rawRequest);
  const valid: ApprovedDeliveryResolution[] = [];
  for (const method of ['standard', 'express'] as const) {
    try {
      const resolved = await resolveApprovedDelivery(client, {
        contract_version: APPROVED_DELIVERY_RESOLUTION,
        quote_receipt_ids: request.quote_receipt_ids, country: request.country,
        postal_code: request.postal_code, shipping_method: method,
      });
      valid.push(resolved);
    } catch (e) {
      // Per-country exclusion can hide exactly that unavailable method.
      // Never convert a stale quote, missing owner approval, currency mismatch,
      // owner configuration drift or an arbitrary error into a "method absent".
      if (!(e instanceof ApprovedDeliveryResolutionError)
        || e.message !== 'delivery_method_unavailable') throw e;
    }
  }
  if (!valid.length) return fail('cart_shipping_options_unavailable');
  const first = valid[0], oldest = Date.parse(first.calculated_at);
  if (valid.some(r => !sameAuthority(first, r) || !Number.isFinite(Date.parse(r.calculated_at))
    || Math.abs(Date.parse(r.calculated_at) - oldest) > 30_000)) {
    return fail('cart_shipping_options_approval_or_quote_changed');
  }
  const options = valid.map(safeOption);
  return {
    contract_version: CART_SHIPPING_OPTIONS_CONTRACT, country: first.country, postal_code: first.postal_code,
    currency: 'EUR', approval_id: first.approval_id, approval_revision: first.approval_revision,
    workspace_version_id: first.workspace_version_id, basket_sha256: first.basket_sha256,
    destination_sha256: first.destination_sha256,
    options, draft_only: true, payable: false, public_rates_enabled: false,
    payment_enabled: false, provider_session_enabled: false,
  };
}
