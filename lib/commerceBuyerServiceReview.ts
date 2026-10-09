import {
  FEYA_EUR_STANDARD_MINOR,
  FEYA_EUR_EXPRESS_MINOR,
  FEYA_REMOTE_ZONE_SURCHARGE_MINOR,
  FEYA_APPROVED_REMOTE_COUNTRY_CODES,
} from './commerceOwnerEurRatePreset.ts';
import {EXTRA_DISTINCT_LISTING_EUR_MINOR} from './commerceExtraListingHandlingEur.ts';

export const BUYER_SERVICE_REVIEW_CONTRACT='thefeya_buyer_service_review_v1' as const;
export type BuyerService='standard'|'express';
export type BuyerServiceReview={
  method:BuyerService;
  label:'Standard'|'Express';
  queue_priority:'regular'|'priority';
  carrier_selected_by:'thefeya_at_dispatch';
  delivery_estimate_basis:'owner_planning_estimate_not_guaranteed';
  transit_business_days:{min:number;max:number};
  amount_minor:number;
  currency:'EUR';
  payable:false;public_rates_enabled:false;payment_enabled:false;
};
/**
 * Customer options reflect the owner's commercial service promise, NOT
 * Ukrposhta EMS or Nova Post physical transport products.
 *
 * The actual carrier and service are selected during fulfillment. Priority
 * means processing/production/dispatch queue preference; it does not assert
 * that a different or faster transport product will be purchased.
 *
 * This is ONLY for an unlisted, preview-only visual design review. The actual
 * immutable payable quote must read approved workspace + current merchandise
 * and legal/tax/carrier availability from the server (M2 Issue #81).
 */
export const BUYER_SERVICES_REVIEW:readonly BuyerServiceReview[]=[
  {method:'standard',label:'Standard',queue_priority:'regular',
   carrier_selected_by:'thefeya_at_dispatch',
   delivery_estimate_basis:'owner_planning_estimate_not_guaranteed',
   transit_business_days:{min:10,max:14},
   amount_minor:FEYA_EUR_STANDARD_MINOR,currency:'EUR',
   payable:false,public_rates_enabled:false,payment_enabled:false},
  {method:'express',label:'Express',queue_priority:'priority',
   carrier_selected_by:'thefeya_at_dispatch',
   delivery_estimate_basis:'owner_planning_estimate_not_guaranteed',
   transit_business_days:{min:6,max:9},
   amount_minor:FEYA_EUR_EXPRESS_MINOR,currency:'EUR',
   payable:false,public_rates_enabled:false,payment_enabled:false},
] as const;

export function reviewServiceBreakdown(input:{
  method:BuyerService;
  country:string;
  canonical_product_ids:string[];
}):{
  contract_version:typeof BUYER_SERVICE_REVIEW_CONTRACT;
  currency:'EUR';
  shipping_minor:number;
  remote_example_minor:number;
  handling_minor:number;
  estimate_fees_minor:number;
  distinct_listing_count:number;
  pending_parcel_count_confirmation:true;
  carrier_eligibility_verified:false;
  delivery_date_guaranteed:false;
  amount_due_minor:null;
  payable:false;
}{
  if(!input || !['standard','express'].includes(input.method)
    ||typeof input.country!=='string'||!/^[A-Z]{2}$/.test(input.country)
    ||!Array.isArray(input.canonical_product_ids)
    ||input.canonical_product_ids.length<1
    ||input.canonical_product_ids.length>20
    ||input.canonical_product_ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)))
    throw new Error('buyer_service_review_invalid');
  const choice=BUYER_SERVICES_REVIEW.find(x=>x.method===input.method);
  if(!choice)throw new Error('buyer_service_review_invalid');
  const distinct=new Set(input.canonical_product_ids).size;
  const handling=Math.max(0,distinct-1)*EXTRA_DISTINCT_LISTING_EUR_MINOR;
  // Remote amount below is a ONE-PARCEL visual example, not a final payable
  // quote. Real parcel count and route must be verified after packing.
  const remote=(FEYA_APPROVED_REMOTE_COUNTRY_CODES as readonly string[]).includes(input.country)
    ?FEYA_REMOTE_ZONE_SURCHARGE_MINOR:0;
  return {
    contract_version:BUYER_SERVICE_REVIEW_CONTRACT,currency:'EUR',
    shipping_minor:choice.amount_minor,remote_example_minor:remote,
    handling_minor:handling,estimate_fees_minor:choice.amount_minor+remote+handling,
    distinct_listing_count:distinct,pending_parcel_count_confirmation:true,
    carrier_eligibility_verified:false,delivery_date_guaranteed:false,
    amount_due_minor:null,payable:false,
  };
}
