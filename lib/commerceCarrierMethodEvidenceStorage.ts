import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';
import { assessCurrentCarrierMethod, type BuyerShippingMethod,
  type ParcelClass, type VerifiedCarrierMethodObservation,
  type CarrierName } from './commerceCarrierVerifiedMethod.ts';

export const PRIVATE_CARRIER_PROOF_CONTEXT='commerce_carrier_method_context_v1' as const;
export type CarrierLookupRequest={
  country:string; postal_code:string; shipping_method:BuyerShippingMethod;
  parcel_class:ParcelClass;
};
export type CarrierLookupResult={
  contract_version:typeof PRIVATE_CARRIER_PROOF_CONTEXT;
  country:string;shipping_method:BuyerShippingMethod;parcel_class:ParcelClass;
  status:'available'|'unavailable'|'not_verified';
  carrier_options:CarrierName[];
  evidence_capture_ids:string[];
  checked_at:string;
  payable:false;public_rates_enabled:false;payment_enabled:false;
  provider_session_enabled:false;
};
export type CarrierProofRPC={
  rpc:(name:string,args:Record<string,unknown>)=>Promise<{
    data:unknown;error:{message?:string;code?:string}|null
  }>;
};

const ISO=new Set(DELIVERY_COUNTRIES);
const keys=['country','parcel_class','postal_code','shipping_method'];
const record=(v:unknown):v is Record<string,unknown>=>
  Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const failure=(code:string):never=>{throw new Error(code);};
function parseInput(raw:unknown):CarrierLookupRequest{
  if(!record(raw)||Object.keys(raw).sort().join(',')!==keys.join(',')
    ||typeof raw.country!=='string'||!ISO.has(raw.country)
    ||typeof raw.postal_code!=='string'||raw.postal_code.length>32
    ||!/^[A-Za-z0-9 -]*$/.test(raw.postal_code)
    ||!['standard','express'].includes(String(raw.shipping_method))
    ||!['ordinary','oversize'].includes(String(raw.parcel_class)))
    return failure('carrier_method_lookup_request_invalid');
  return {
    country:raw.country,postal_code:raw.postal_code,
    shipping_method:raw.shipping_method as BuyerShippingMethod,
    parcel_class:raw.parcel_class as ParcelClass,
  };
}

/** Only an authenticated server-side Supabase service-role client may perform
 * this RPC. No public route or key is shipped. The DB clock supplies time to
 * the approved pure proof evaluator; browser time and browser-provided API
 * observations are never accepted. No public payments can use this result yet.
 */
export async function lookupPrivateCarrierMethod(
  client:CarrierProofRPC,
  rawRequest:unknown,
):Promise<CarrierLookupResult>{
  const input=parseInput(rawRequest);
  // Fail closed without even looking up blocked recipient destinations.
  if(isFeyaBlockedExportDestination(input.country))return {
    contract_version:PRIVATE_CARRIER_PROOF_CONTEXT,
    country:input.country,shipping_method:input.shipping_method,
    parcel_class:input.parcel_class,status:'unavailable',
    carrier_options:[],evidence_capture_ids:[],checked_at:'',
    payable:false,public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
  };
  let response;
  try {
    response=await client.rpc('feya_commerce_carrier_method_context_v1',{
      p_country:input.country,p_postal_code:input.postal_code,
      p_shipping_method:input.shipping_method,p_parcel_class:input.parcel_class,
    });
  }catch {return failure('carrier_method_lookup_storage_unavailable');}
  if(response.error||!record(response.data))return failure('carrier_method_lookup_storage_unavailable');
  const data=response.data;
  if(data.contract_version!==PRIVATE_CARRIER_PROOF_CONTEXT
    ||data.public_rates_enabled!==false||data.payable!==false
    ||data.payment_enabled!==false||data.provider_session_enabled!==false
    ||typeof data.checked_at!=='string'||!Number.isFinite(Date.parse(data.checked_at))
    ||typeof data.blocked!=='boolean'
    ||!Number.isSafeInteger(data.evidence_count)||Number(data.evidence_count)<0
    ||!Array.isArray(data.evidence)||data.evidence.length>200
    ||data.evidence_count!==data.evidence.length && data.blocked!==true)
    return failure('carrier_method_lookup_response_invalid');
  if(data.blocked)return {
    contract_version:PRIVATE_CARRIER_PROOF_CONTEXT,
    country:input.country,shipping_method:input.shipping_method,
    parcel_class:input.parcel_class,status:'unavailable',
    carrier_options:[],evidence_capture_ids:[],checked_at:data.checked_at,
    payable:false,public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
  };
  const normalized=input.postal_code.toUpperCase().replace(/[ -]/g,'');
  const result=assessCurrentCarrierMethod(input.country,normalized,input.shipping_method,
    input.parcel_class,data.evidence as VerifiedCarrierMethodObservation[],data.checked_at);
  return {
    contract_version:PRIVATE_CARRIER_PROOF_CONTEXT,
    country:input.country,shipping_method:input.shipping_method,parcel_class:input.parcel_class,
    status:result.status==='available'?'available':data.evidence.length?'unavailable':'not_verified',
    carrier_options:result.carrier_options,evidence_capture_ids:result.evidence_capture_ids,
    checked_at:data.checked_at,
    payable:false,public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
  };
}
