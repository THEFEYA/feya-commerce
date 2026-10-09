import {assessCurrentCarrierMethod,
  CARRIER_METHOD_EVIDENCE_CONTRACT,
  type ParcelClass,type BuyerShippingMethod,type CarrierName,
  type VerifiedCarrierMethodObservation,
} from './commerceCarrierVerifiedMethod.ts';
import {isFeyaBlockedExportDestination} from './commerceShippingBlockedDestinations.ts';
import {DELIVERY_COUNTRIES} from './commerceDeliveryWorkspace.ts';

export const SHIPPING_CARRIER_COVERAGE='commerce_shipping_carrier_coverage_v1' as const;
type ParcelStatus='country_product_source_check'|'parcel_review_missing'|
  'parcel_capacity_exceeded'|'mixed_or_invalid_parcel'|'destination_blocked';
type CarrierContext={
  contract_version:'commerce_carrier_method_context_v1';
  evidence:VerifiedCarrierMethodObservation[];
  evidence_count:number;checked_at:string;blocked:boolean;
  payable:false;public_rates_enabled:false;payment_enabled:false;provider_session_enabled:false;
};
type ParcelRecord={
  index:number;status:ParcelStatus;parcel_class:ParcelClass|null;
  method_context:CarrierContext|null;
};
export type ShippingCarrierCoverageResult={
  contract_version:typeof SHIPPING_CARRIER_COVERAGE;
  shipping_quote_receipt_id:string;
  country:string;shipping_method:BuyerShippingMethod;
  parcel_count:number;
  checked_at:string;quote_expires_at:string;
  coverage_scope:'country_product_transport_only';
  country_source_status:'country_product_source_positive'|'incomplete';
  parcels:Array<{
    index:number;parcel_class:ParcelClass|null;
    status:'source_positive_country_only'|'carrier_not_verified'|
      Exclude<ParcelStatus,'country_product_source_check'>;
    carrier_options:CarrierName[];
    evidence_capture_ids:string[];
  }>;
  parcel_dimensions_provider_verified:false;
  postal_route_provider_verified:false;
  payable:false;public_rates_enabled:false;payment_enabled:false;provider_session_enabled:false;
};
export type ShippingCarrierCoverageRPC={
  rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{
    data:unknown;error:{message?:string;code?:string}|null
  }>;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const countries=new Set(DELIVERY_COUNTRIES);
const record=(x:unknown):x is Record<string,unknown>=>
  Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const fail=(code:string):never=>{throw new Error(code);};

export function parseShippingCarrierCoverageRequest(raw:unknown):{shipping_quote_receipt_id:string}{
  if(!record(raw)||Object.keys(raw).join(',')!=='shipping_quote_receipt_id'
    ||typeof raw.shipping_quote_receipt_id!=='string'
    ||!UUID.test(raw.shipping_quote_receipt_id))
    return fail('carrier_coverage_request_invalid');
  return {shipping_quote_receipt_id:raw.shipping_quote_receipt_id};
}

function validContext(raw:unknown,at:string){
  if(!record(raw)||raw.contract_version!=='commerce_carrier_method_context_v1'
    ||raw.checked_at!==at
    ||raw.blocked!==false
    ||!Array.isArray(raw.evidence)||raw.evidence.length>200
    ||!Number.isSafeInteger(raw.evidence_count)
    ||raw.evidence_count!==raw.evidence.length
    ||raw.payable!==false||raw.public_rates_enabled!==false
    ||raw.payment_enabled!==false||raw.provider_session_enabled!==false)
    return fail('carrier_coverage_response_invalid');
  return raw as CarrierContext;
}

/** DB source is one privileged STABLE snapshot. An 'available' country/product
 * response NEVER equals an accepted postcode/size shipment or payable service.
 * Every parcel needs a separate immutable owner parcel-class review. */
export async function readShippingCarrierCoverage(
  client:ShippingCarrierCoverageRPC,rawRequest:unknown,
):Promise<ShippingCarrierCoverageResult>{
  const req=parseShippingCarrierCoverageRequest(rawRequest);
  let result:{data:unknown;error:{message?:string;code?:string}|null};
  try{result=await client.rpc('feya_commerce_shipping_carrier_coverage_v1',{
    p_quote_id:req.shipping_quote_receipt_id,
  });}catch{return fail('carrier_coverage_storage_unavailable');}
  if(result.error)return fail('carrier_coverage_storage_unavailable');
  const d=result.data;
  if(!record(d)||d.contract_version!==SHIPPING_CARRIER_COVERAGE
    ||d.shipping_quote_receipt_id!==req.shipping_quote_receipt_id
    ||typeof d.workspace_version_id!=='string'||!UUID.test(d.workspace_version_id)
    ||!Number.isSafeInteger(d.workspace_revision)||d.workspace_revision<1
    ||typeof d.country!=='string'||!countries.has(d.country)
    ||!['standard','express'].includes(String(d.shipping_method))
    ||typeof d.checked_at!=='string'||!Number.isFinite(Date.parse(d.checked_at))
    ||typeof d.quote_expires_at!=='string'||!Number.isFinite(Date.parse(d.quote_expires_at))
    ||Date.parse(d.quote_expires_at)<=Date.parse(d.checked_at)
    ||!Number.isSafeInteger(d.parcel_count)||d.parcel_count<1||d.parcel_count>100
    ||!Array.isArray(d.parcels)||d.parcels.length!==d.parcel_count
    ||typeof d.globally_blocked!=='boolean'
    ||d.coverage_scope!=='country_product_transport_only'
    ||d.parcel_dimensions_provider_verified!==false
    ||d.postal_route_provider_verified!==false
    ||d.payable!==false||d.public_rates_enabled!==false
    ||d.payment_enabled!==false||d.provider_session_enabled!==false
  )return fail('carrier_coverage_response_invalid');
  const country=d.country;
  const method=d.shipping_method as BuyerShippingMethod;
  const checkedAt=d.checked_at;
  const shouldBlock=country==='UA'||isFeyaBlockedExportDestination(country);
  if(d.globally_blocked!==shouldBlock)return fail('carrier_coverage_response_invalid');
  const rows:Array<ShippingCarrierCoverageResult['parcels'][number]>=[];
  for(const [i,item] of d.parcels.entries()){
    if(!record(item)||item.index!==i+1
      ||!['country_product_source_check','parcel_review_missing','parcel_capacity_exceeded',
        'mixed_or_invalid_parcel','destination_blocked'].includes(String(item.status))
      ||(item.parcel_class!==null&&!['ordinary','oversize'].includes(String(item.parcel_class)))
      ||(item.status!=='country_product_source_check'&&
        (item.parcel_class!==null||item.method_context!==null))
      ||(item.status==='country_product_source_check'&&
        (!['ordinary','oversize'].includes(String(item.parcel_class))||!record(item.method_context)))
      ||(shouldBlock&&item.status!=='destination_blocked'&&item.status!=='mixed_or_invalid_parcel')
    )return fail('carrier_coverage_response_invalid');
    const status=item.status as ParcelStatus;
    if(status!=='country_product_source_check'){
      rows.push({index:i+1,parcel_class:null,status,carrier_options:[],evidence_capture_ids:[]});
      continue;
    }
    const c=validContext(item.method_context,checkedAt);
    const evidence=c.evidence as VerifiedCarrierMethodObservation[];
    // Carrier context already came from privileged exact country/method/class
    // DB query. Pure evaluator independently revalidates every source row.
    const proof=assessCurrentCarrierMethod(country,'',method,
      item.parcel_class as ParcelClass,evidence,checkedAt);
    rows.push({
      index:i+1,parcel_class:item.parcel_class as ParcelClass,
      status:proof.status==='available'?'source_positive_country_only':'carrier_not_verified',
      carrier_options:proof.carrier_options,evidence_capture_ids:proof.evidence_capture_ids,
    });
  }
  return {
    contract_version:SHIPPING_CARRIER_COVERAGE,
    shipping_quote_receipt_id:req.shipping_quote_receipt_id,
    country,shipping_method:method,parcel_count:d.parcel_count,
    checked_at:checkedAt,quote_expires_at:d.quote_expires_at,
    coverage_scope:'country_product_transport_only',
    country_source_status:rows.every(x=>x.status==='source_positive_country_only')
      ?'country_product_source_positive':'incomplete',
    parcels:rows,
    parcel_dimensions_provider_verified:false,postal_route_provider_verified:false,
    payable:false,public_rates_enabled:false,payment_enabled:false,provider_session_enabled:false,
  };
}
