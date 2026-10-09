/** M2 Owner decision 2026-10-09: €5 per ADDITIONAL DISTINCT listing.
 *
 * A listing is identified by immutable canonical_product_id, NOT variant,
 * configuration, piece, quantity, or shipping parcel. This pure calculator
 * is only to prepare a review-only subtotal from trusted CURRENT server
 * merchandise receipts. The actual payable checkout needs the later v2
 * atomic order snapshot + tax/service/legal provider authority.
 */
export const DISTINCT_LISTING_HANDLING_CONTRACT='commerce_distinct_listing_handling_eur_v1' as const;
export const EXTRA_DISTINCT_LISTING_EUR_MINOR=500 as const;
export const EXTRA_DISTINCT_LISTING_POLICY_REF='thefeya-owner-2026-10-09-per-extra-listing' as const;

export type ServerMerchandiseHandlingLine={
  quote_receipt_id:string;
  canonical_product_id:string;
  configuration_price_id:string;
  quantity:number;
  currency:string;
};
export type ExtraListingHandlingDraft={
  contract_version:typeof DISTINCT_LISTING_HANDLING_CONTRACT;
  policy_ref:typeof EXTRA_DISTINCT_LISTING_POLICY_REF;
  currency:'EUR';
  first_listing_fee_minor:0;
  extra_distinct_listing_fee_minor:500;
  distinct_listing_count:number;
  additional_listing_count:number;
  amount_minor:number;
  scope:'once_per_order';
  payable:false;
  payment_enabled:false;
  provider_session_enabled:false;
  taxes_confirmed:false;
};
const uuid=(v:unknown):v is string=>typeof v==='string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

export function calculateExtraListingHandlingDraft(
  exactCurrentServerReceipts:ServerMerchandiseHandlingLine[],
):ExtraListingHandlingDraft{
  if(!Array.isArray(exactCurrentServerReceipts) || exactCurrentServerReceipts.length<1
    || exactCurrentServerReceipts.length>20)
    throw new Error('extra_listing_merchandise_invalid');
  const receiptIds=new Set<string>();
  const productIds=new Set<string>();
  for(const row of exactCurrentServerReceipts){
    if(!row || !uuid(row.quote_receipt_id) || !uuid(row.canonical_product_id)
      || !uuid(row.configuration_price_id)
      || !Number.isSafeInteger(row.quantity) || row.quantity<1 || row.quantity>1000)
      throw new Error('extra_listing_merchandise_invalid');
    if(row.currency!=='EUR') throw new Error('extra_listing_currency_mismatch');
    if(receiptIds.has(row.quote_receipt_id)) throw new Error('extra_listing_receipt_duplicate');
    receiptIds.add(row.quote_receipt_id);
    productIds.add(row.canonical_product_id);
  }
  const additional_listing_count=Math.max(0,productIds.size-1);
  return {
    contract_version:DISTINCT_LISTING_HANDLING_CONTRACT,
    policy_ref:EXTRA_DISTINCT_LISTING_POLICY_REF,
    currency:'EUR',
    first_listing_fee_minor:0,
    extra_distinct_listing_fee_minor:EXTRA_DISTINCT_LISTING_EUR_MINOR,
    distinct_listing_count:productIds.size,
    additional_listing_count,
    amount_minor:additional_listing_count*EXTRA_DISTINCT_LISTING_EUR_MINOR,
    scope:'once_per_order',
    payable:false,
    payment_enabled:false,
    provider_session_enabled:false,
    taxes_confirmed:false,
  };
}
