import {
  APPROVED_DELIVERY_CONTEXT_RPC, APPROVED_DELIVERY_RESOLUTION,
  parseApprovedDeliveryRequest, resolveApprovedDelivery,
  type ApprovedDeliveryRequest, type ApprovedDeliveryResolution,
  type DeliveryMerchandiseLine,
} from './commerceApprovedDeliveryResolution.ts';
import {
  calculateExtraListingHandlingDraft,
  EXTRA_DISTINCT_LISTING_POLICY_REF,
} from './commerceExtraListingHandlingEur.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

/**
 * M2 Issue #81: one cart-wide nonpayable financial breakdown under exact
 * current merchandise+owner delivery authority. The server reads the
 * merchandise in the SAME delivery context response used to derive shipping;
 * client amounts, fees, tax exemptions and coupon claims are not accepted.
 *
 * This is a review-only subtotal, NOT an order, binding price, checkout,
 * payable receipt or tax quote. Caller must never show it as amount due.
 */
export const CART_COST_BREAKDOWN_CONTRACT = 'commerce_cart_cost_breakdown_v1' as const;

export type CartCostBreakdownRequest = {
  contract_version: typeof CART_COST_BREAKDOWN_CONTRACT;
  quote_receipt_ids: string[];
  country: string;
  postal_code: string;
  shipping_method: 'standard' | 'express';
};
export type CartCostBreakdown = {
  contract_version: typeof CART_COST_BREAKDOWN_CONTRACT;
  currency: 'EUR';
  quote_receipt_ids: string[];
  country: string;
  postal_code: string;
  shipping_method: 'standard' | 'express';
  approval_id: string;
  approval_revision: number;
  workspace_version_id: string;
  workspace_revision: number;
  basket_sha256: string;
  destination_sha256: string;
  merchandise_subtotal_minor: number;
  shipping_amount_minor: number;
  handling_amount_minor: number;
  handling_policy_ref: typeof EXTRA_DISTINCT_LISTING_POLICY_REF;
  distinct_listing_count: number;
  additional_listing_count: number;
  estimate_before_tax_minor: number;
  estimated_arrival: { from: string; to: string };
  event_deadline_guaranteed: false;
  taxes_minor: null;
  discount_minor: null;
  provider_fees_minor: null;
  amount_due_minor: null;
  tax_status: 'unresolved';
  discount_status: 'not_applied';
  fees_status: 'unresolved';
  shipping_serviceability: 'awaiting_live_carrier_proof';
  estimate_only: true;
  payable: false;
  public_rates_enabled: false;
  payment_enabled: false;
  provider_session_enabled: false;
};

const fail=(code:string):never=>{throw new Error(code);};
const record=(v:unknown):v is Record<string,unknown> =>
  Boolean(v && typeof v === 'object' && !Array.isArray(v));

export function parseCartCostBreakdownRequest(raw:unknown):CartCostBreakdownRequest {
  if (!record(raw) || Object.keys(raw).sort().join(',') !==
      'contract_version,country,postal_code,quote_receipt_ids,shipping_method'
    || raw.contract_version !== CART_COST_BREAKDOWN_CONTRACT
  ) return fail('cart_cost_breakdown_request_invalid');
  let parsed:ApprovedDeliveryRequest;
  try{
    parsed=parseApprovedDeliveryRequest({
      contract_version:APPROVED_DELIVERY_RESOLUTION,
      quote_receipt_ids:raw.quote_receipt_ids,
      country:raw.country,
      postal_code:raw.postal_code,
      shipping_method:raw.shipping_method,
    });
  }catch{return fail('cart_cost_breakdown_request_invalid');}
  return {...parsed,contract_version:CART_COST_BREAKDOWN_CONTRACT} as CartCostBreakdownRequest;
}

export async function resolveCartCostBreakdown(
  client:QuoteRPCClient,
  rawRequest:unknown,
):Promise<CartCostBreakdown>{
  const request=parseCartCostBreakdownRequest(rawRequest);
  // Capture the already-validated authoritative context from the SINGLE RPC
  // issued by resolveApprovedDelivery, rather than reading old/different
  // prices after the shipping calculation.
  let context:unknown;
  let contextReads=0;
  const mirrored:QuoteRPCClient={
    rpc:async (name,args)=>{
      const result=await client.rpc(name,args);
      if(name===APPROVED_DELIVERY_CONTEXT_RPC){
        contextReads++;
        if(contextReads!==1) return fail('cart_cost_breakdown_context_changed');
        if(result.error===null)context=result.data;
      }
      return result;
    },
  };
  const delivery:ApprovedDeliveryResolution=await resolveApprovedDelivery(mirrored,{
    contract_version:APPROVED_DELIVERY_RESOLUTION,
    quote_receipt_ids:request.quote_receipt_ids,
    country:request.country,postal_code:request.postal_code,
    shipping_method:request.shipping_method,
  });
  if(contextReads!==1 || !record(context) || !Array.isArray(context.merchandise)
    || context.merchandise.length!==request.quote_receipt_ids.length
    || !record(context.approval)
    || context.approval.approval_id!==delivery.approval_id
    || context.approval.revision!==delivery.approval_revision
    || context.catalog_sha256!==delivery.catalog_sha256
    || context.calculated_at===null || typeof context.calculated_at!=='string'
    || !Number.isFinite(Date.parse(context.calculated_at))
    || new Date(context.calculated_at).toISOString()!==delivery.calculated_at
    || delivery.country!==request.country
    || delivery.postal_code!==request.postal_code
    || delivery.shipping_method!==request.shipping_method
    || delivery.quote_receipt_ids.join(',')!==request.quote_receipt_ids.join(',')
    || delivery.currency!=='EUR'
    || delivery.public_rates_enabled!==false || delivery.payable!==false
    || delivery.payment_enabled!==false || delivery.provider_session_enabled!==false
    || delivery.persisted!==false
    || !Number.isSafeInteger(delivery.shipping_amount_minor) || delivery.shipping_amount_minor<0
  ) return fail('cart_cost_breakdown_authority_changed');
  // These rows have already passed the strict parseContext server validation,
  // including the exact quote receipt set, current offer heads and currency.
  const lines=context.merchandise as DeliveryMerchandiseLine[];
  const handling=calculateExtraListingHandlingDraft(lines.map(x=>({
    quote_receipt_id:x.quote_receipt_id,
    canonical_product_id:x.canonical_product_id,
    configuration_price_id:x.configuration_price_id,
    quantity:x.quantity,
    currency:x.currency,
  })));
  let merchandise=0;
  for(const row of lines){
    if(row.currency!=='EUR'
      || !Number.isSafeInteger(row.line_amount_minor) || row.line_amount_minor<=0
      || !Number.isSafeInteger(merchandise+row.line_amount_minor))
      return fail('cart_cost_breakdown_amount_invalid');
    merchandise+=row.line_amount_minor;
  }
  const beforeTax=merchandise+delivery.shipping_amount_minor+handling.amount_minor;
  if(!Number.isSafeInteger(beforeTax) || beforeTax<=0)
    return fail('cart_cost_breakdown_amount_invalid');
  return {
    contract_version:CART_COST_BREAKDOWN_CONTRACT,currency:'EUR',
    quote_receipt_ids:request.quote_receipt_ids,
    country:request.country,postal_code:request.postal_code,
    shipping_method:request.shipping_method,
    approval_id:delivery.approval_id,
    approval_revision:delivery.approval_revision,
    workspace_version_id:delivery.workspace_version_id,
    workspace_revision:delivery.workspace_revision,
    basket_sha256:delivery.basket_sha256,destination_sha256:delivery.destination_sha256,
    merchandise_subtotal_minor:merchandise,
    shipping_amount_minor:delivery.shipping_amount_minor,
    handling_amount_minor:handling.amount_minor,
    handling_policy_ref:EXTRA_DISTINCT_LISTING_POLICY_REF,
    distinct_listing_count:handling.distinct_listing_count,
    additional_listing_count:handling.additional_listing_count,
    estimate_before_tax_minor:beforeTax,
    estimated_arrival:delivery.estimated_arrival,
    event_deadline_guaranteed:false,
    taxes_minor:null,discount_minor:null,provider_fees_minor:null,amount_due_minor:null,
    tax_status:'unresolved',discount_status:'not_applied',fees_status:'unresolved',
    shipping_serviceability:'awaiting_live_carrier_proof',
    estimate_only:true,payable:false,public_rates_enabled:false,
    payment_enabled:false,provider_session_enabled:false,
  };
}
