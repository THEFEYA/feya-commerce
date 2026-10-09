import {
  COMMERCE_CHECKOUT_DESTINATION_V2,
  normalizeCheckoutDestinationV2,
  type CheckoutDestinationV2,
} from './commerceCheckoutDestinationV2.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';

export const CHECKOUT_PREFLIGHT_V2='commerce_checkout_preflight_v2' as const;

export type CheckoutPreflightV2Request={
  contract_version:typeof CHECKOUT_PREFLIGHT_V2;
  request_id:string;
  shipping_quote_receipt_id:string;
  destination:CheckoutDestinationV2;
  policy_acknowledgement:{accepted:true;bundle_sha256:string};
};

export type CheckoutPreflightV2Receipt={
  contract_version:typeof CHECKOUT_PREFLIGHT_V2;
  preflight_id:string;request_id:string;shipping_quote_receipt_id:string;
  delivery_approval_id:string;delivery_approval_revision:number;workspace_version_id:string;
  basket_sha256:string;destination_sha256:string;policy_bundle_sha256:string;
  currency:'EUR';merchandise_subtotal_minor:number;shipping_amount_minor:number;
  handling_amount_minor:number;additional_distinct_listing_count:number;
  pre_tax_estimate_minor:number;
  taxes_minor:null;discount_minor:null;provider_fees_minor:null;
  amount_due_minor:null;tax_status:'unresolved';carrier_proof_complete:false;policy_accepted:true;
  created_at:string;expires_at:string;replayed:boolean;expired:boolean;
  payable:false;order_creation_enabled:false;public_rates_enabled:false;
  payment_enabled:false;provider_session_enabled:false;
};
export type CheckoutPreflightRPC={
  rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{
    data:unknown;error:{message?:string;code?:string}|null;
  }>;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA=/^[a-f0-9]{64}$/;
const record=(x:unknown):x is Record<string,unknown>=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const invalid=():never=>{throw new CheckoutPreflightError('checkout_preflight_request_invalid',400);};

export class CheckoutPreflightError extends Error {
  status:number;
  outcome:'not_written'|'unknown';
  constructor(code:string,status=409,outcome:'not_written'|'unknown'='not_written') {
    super(code);this.status=status;this.outcome=outcome;
  }
}

export function parseCheckoutPreflightV2Request(raw:unknown):CheckoutPreflightV2Request{
  if(!record(raw))return invalid();
  if(Object.keys(raw).sort().join(',')!==
      'contract_version,destination,policy_acknowledgement,request_id,shipping_quote_receipt_id'
    ||raw.contract_version!==CHECKOUT_PREFLIGHT_V2)return invalid();
  const requestId=raw.request_id,quoteId=raw.shipping_quote_receipt_id,ack=raw.policy_acknowledgement;
  if(typeof requestId!=='string'||!UUID.test(requestId)
    ||typeof quoteId!=='string'||!UUID.test(quoteId)
    ||!record(ack)
    ||Object.keys(ack).sort().join(',')!=='accepted,bundle_sha256'
  )return invalid();
  const accepted=ack.accepted,bundleHash=ack.bundle_sha256;
  if(accepted!==true||typeof bundleHash!=='string'||!SHA.test(bundleHash))return invalid();
  let destination:CheckoutDestinationV2;
  try{destination=normalizeCheckoutDestinationV2(raw.destination);}
  catch{return invalid();}
  if(destination.country==='UA'||isFeyaBlockedExportDestination(destination.country))
    throw new CheckoutPreflightError('checkout_preflight_destination_unserved',422);
  return {
    contract_version:CHECKOUT_PREFLIGHT_V2,
    request_id:requestId,
    shipping_quote_receipt_id:quoteId,
    destination,
    policy_acknowledgement:{accepted:true,bundle_sha256:bundleHash},
  };
}

function parseReceipt(raw:unknown,request:CheckoutPreflightV2Request):CheckoutPreflightV2Receipt{
  if(!record(raw)||raw.contract_version!==CHECKOUT_PREFLIGHT_V2
    ||typeof raw.preflight_id!=='string'||!UUID.test(raw.preflight_id)
    ||raw.request_id!==request.request_id
    ||raw.shipping_quote_receipt_id!==request.shipping_quote_receipt_id
    ||typeof raw.delivery_approval_id!=='string'||!UUID.test(raw.delivery_approval_id)
    ||!Number.isSafeInteger(raw.delivery_approval_revision)||Number(raw.delivery_approval_revision)<1
    ||typeof raw.workspace_version_id!=='string'||!UUID.test(raw.workspace_version_id)
    ||typeof raw.basket_sha256!=='string'||!SHA.test(raw.basket_sha256)
    ||typeof raw.destination_sha256!=='string'||!SHA.test(raw.destination_sha256)
    ||raw.policy_bundle_sha256!==request.policy_acknowledgement.bundle_sha256
    ||raw.currency!=='EUR'
    ||!Number.isSafeInteger(raw.merchandise_subtotal_minor)||Number(raw.merchandise_subtotal_minor)<1
    ||!Number.isSafeInteger(raw.shipping_amount_minor)||Number(raw.shipping_amount_minor)<0
    ||!Number.isSafeInteger(raw.handling_amount_minor)||Number(raw.handling_amount_minor)<0
    ||!Number.isSafeInteger(raw.additional_distinct_listing_count)
    ||Number(raw.additional_distinct_listing_count)<0||Number(raw.additional_distinct_listing_count)>19
    ||raw.handling_amount_minor!==500*Number(raw.additional_distinct_listing_count)
    ||!Number.isSafeInteger(raw.pre_tax_estimate_minor)
    ||raw.pre_tax_estimate_minor!==Number(raw.merchandise_subtotal_minor)+Number(raw.shipping_amount_minor)+Number(raw.handling_amount_minor)
    ||raw.taxes_minor!==null||raw.discount_minor!==null
    ||raw.provider_fees_minor!==null||raw.amount_due_minor!==null
    ||raw.tax_status!=='unresolved'||raw.carrier_proof_complete!==false
    ||raw.policy_accepted!==true||raw.payable!==false
    ||raw.order_creation_enabled!==false||raw.public_rates_enabled!==false
    ||raw.payment_enabled!==false||raw.provider_session_enabled!==false
    ||typeof raw.created_at!=='string'||typeof raw.expires_at!=='string'
    ||!Number.isFinite(Date.parse(raw.created_at))||!Number.isFinite(Date.parse(raw.expires_at))
    ||Date.parse(raw.expires_at)<=Date.parse(raw.created_at)
    ||typeof raw.replayed!=='boolean'||typeof raw.expired!=='boolean'
    ||'destination' in raw||'contact_email' in raw||'recipient_full_name' in raw
  )throw new CheckoutPreflightError('checkout_preflight_response_invalid',503,'unknown');
  return raw as CheckoutPreflightV2Receipt;
}

export async function createCheckoutPreflightV2(client:CheckoutPreflightRPC,raw:unknown):Promise<CheckoutPreflightV2Receipt>{
  const request=parseCheckoutPreflightV2Request(raw);
  let response:{data:unknown;error:{message?:string;code?:string}|null};
  try{
    response=await client.rpc('feya_commerce_create_checkout_preflight_v2',{p_request:request});
  }catch{
    throw new CheckoutPreflightError('checkout_preflight_storage_unavailable',503,'unknown');
  }
  if(response.error){
    const code=response.error.message||'';
    if(response.error.code==='P0001'&&/^checkout_preflight_[a-z_]+$/.test(code))
      throw new CheckoutPreflightError(code,
        /request_invalid|policy_or_address_invalid|address_invalid/.test(code)?422:
        /storage_unavailable/.test(code)?503:409);
    throw new CheckoutPreflightError('checkout_preflight_storage_outcome_unknown',503,'unknown');
  }
  return parseReceipt(response.data,request);
}
