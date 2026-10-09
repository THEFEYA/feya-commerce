import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';

/** M2 internal carrier *method* proof, never inferred from a published ISO list.
 * A release adapter must fetch the actual outbound UA carrier API under private
 * service credentials, record signed immutable observations and the owner
 * mapping from the buyer's Standard/Express to actual carrier product.
 * Nothing here authorizes creating orders, published rates or payments.
 */
export const CARRIER_METHOD_EVIDENCE_CONTRACT='commerce_carrier_method_evidence_v1' as const;
export const CARRIER_METHOD_PROOF_MAX_AGE_MS=24*60*60*1000 as const;
export type CarrierName='ukrposhta'|'nova_post';
export type BuyerShippingMethod='standard'|'express';
export type ParcelClass='ordinary'|'oversize';
export type VerifiedCarrierMethodObservation={
  contract_version:typeof CARRIER_METHOD_EVIDENCE_CONTRACT;
  capture_id:string; source_digest_sha256:string;
  carrier:CarrierName; direction:'UA_EXPORT'; country:string;
  postal_prefix:string|null; method:BuyerShippingMethod;
  carrier_service_code:string;
  parcel_class:ParcelClass;
  carrier_api_result:'available'|'unavailable';
  mapping_revision_id:string;
  method_mapping_owner_approved:true;
  captured_at:string;
  expires_at:string;
};
export type CarrierMethodProof={
  contract_version:'commerce_carrier_method_proof_v1';
  country:string;
  method:BuyerShippingMethod;
  parcel_class:ParcelClass;
  status:'available'|'unavailable';
  carrier_options:CarrierName[];
  evidence_capture_ids:string[];
  payable:false;
  provider_session_enabled:false;
};
const isoCountries=new Set(DELIVERY_COUNTRIES);
const uuid=(value:unknown):value is string=>typeof value==='string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const hex=(value:unknown):value is string=>typeof value==='string' && /^[0-9a-f]{64}$/.test(value);
const validInstant=(value:string):number|null=>{
  const x=Date.parse(value);
  return Number.isFinite(x)&&/^\d{4}-\d{2}-\d{2}T/.test(value) ? x : null;
};

function safeEvidence(e:VerifiedCarrierMethodObservation,now:number):boolean{
  if(!e || e.contract_version!==CARRIER_METHOD_EVIDENCE_CONTRACT
    || !uuid(e.capture_id) || !hex(e.source_digest_sha256)
    || !uuid(e.mapping_revision_id) || e.method_mapping_owner_approved!==true
    || !['ukrposhta','nova_post'].includes(e.carrier) || e.direction!=='UA_EXPORT'
    || !isoCountries.has(e.country) || isFeyaBlockedExportDestination(e.country)
    || !['standard','express'].includes(e.method)
    || !['ordinary','oversize'].includes(e.parcel_class)
    || !['available','unavailable'].includes(e.carrier_api_result)
    || !/^[a-zA-Z0-9_\-]{2,64}$/.test(e.carrier_service_code)
    || (e.postal_prefix!==null && !/^[A-Z0-9]{1,12}$/.test(e.postal_prefix))
    || typeof e.captured_at!=='string' || typeof e.expires_at!=='string')return false;
  const captured=validInstant(e.captured_at),expires=validInstant(e.expires_at);
  return captured!==null&&expires!==null&&captured<=now
    &&expires>now&&expires>captured
    &&expires-captured<=CARRIER_METHOD_PROOF_MAX_AGE_MS
    &&now-captured<=CARRIER_METHOD_PROOF_MAX_AGE_MS;
}

/** Inputs observations MUST come from service-role-only DB/API source adapters,
 * never browser JSON. A no-go country always wins even over a positive carrier
 * observation. Provider A negative/unavailable does not mask a current positive
 * from Provider B for the same method and parcel category.
 */
export function assessCurrentCarrierMethod(
  country:string,
  postalCode:string,
  shippingMethod:BuyerShippingMethod,
  parcelClass:ParcelClass,
  trustedEvidence:VerifiedCarrierMethodObservation[],
  authoritativeServerNow:string,
):CarrierMethodProof{
  const normalizedCountry=country.toUpperCase();
  const postal=postalCode.toUpperCase().replace(/[ -]/g,'');
  const now=validInstant(authoritativeServerNow);
  if(now===null || !isoCountries.has(normalizedCountry)
    || !['standard','express'].includes(shippingMethod)
    || !['ordinary','oversize'].includes(parcelClass)
    || !/^[A-Z0-9]{0,32}$/.test(postal) || !Array.isArray(trustedEvidence))
    throw new Error('carrier_method_input_invalid');
  const base={contract_version:'commerce_carrier_method_proof_v1' as const,
    country:normalizedCountry,method:shippingMethod,parcel_class:parcelClass,
    payable:false as const,provider_session_enabled:false as const};
  if(isFeyaBlockedExportDestination(normalizedCountry))
    return {...base,status:'unavailable',carrier_options:[],evidence_capture_ids:[]};
  // A provider's particular postal exception can be more specific than its
  // country-wide result; never override an explicit denial with a broad yes
  // from the same carrier. Another actual carrier can still fulfill the route.
  const evidence=trustedEvidence.filter(e=>safeEvidence(e,now)
    &&e.country===normalizedCountry&&e.method===shippingMethod&&e.parcel_class===parcelClass
    &&(e.postal_prefix===null || postal.startsWith(e.postal_prefix)));
  const byCarrier=new Map<CarrierName,VerifiedCarrierMethodObservation[]>();
  for(const e of evidence)byCarrier.set(e.carrier,[...(byCarrier.get(e.carrier)||[]),e]);
  const accepted:VerifiedCarrierMethodObservation[]=[];
  for(const [, observations] of byCarrier){
    const longest=Math.max(...observations.map(e=>e.postal_prefix?.length||0));
    const specific=observations.filter(e=>(e.postal_prefix?.length||0)===longest);
    // Contradictory same-specificity proof fails closed for that carrier.
    if(specific.some(e=>e.carrier_api_result==='unavailable')
      ||specific.some(e=>e.mapping_revision_id!==specific[0].mapping_revision_id)
      ||specific.some(e=>e.carrier_service_code!==specific[0].carrier_service_code))continue;
    const available=specific.filter(e=>e.carrier_api_result==='available');
    if(available.length)accepted.push(available[0]);
  }
  return {...base,status:accepted.length?'available':'unavailable',
    carrier_options:accepted.map(x=>x.carrier).sort(),
    evidence_capture_ids:accepted.map(x=>x.capture_id).sort()};
}

/** Ukrposhta international API 2026-03-09, /countries/delivery-availability.
 * Country/product-specific available result only. Do NOT assume EMS support
 * for every country or that EMS == buyer Express without owner-approved map.
 * https://dev.ukrposhta.ua/uploads/International_documentation_09032026.pdf
 */
export function parseUkrposhtaCountryAvailability(
  input:unknown,
  expectedCountry:string,
  expectedCarrierProduct:string,
):{country:string;packageType:string;transportType:string;available:boolean}{
  if(!input || typeof input!=='object' || Array.isArray(input))
    throw new Error('ukrposhta_country_availability_invalid');
  const obj=input as Record<string,unknown>;
  if(Object.keys(obj).sort().join(',')!=='available,country,packageType,transportType'
    ||obj.country!==expectedCountry||obj.packageType!==expectedCarrierProduct
    ||typeof obj.available!=='boolean'
    ||typeof obj.transportType!=='string'
    ||!['AVIA','GROUND'].includes(obj.transportType))
    throw new Error('ukrposhta_country_availability_invalid');
  return {country:obj.country as string,packageType:obj.packageType as string,
    transportType:obj.transportType,available:obj.available};
}
