import { createHash } from 'node:crypto';
import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';
import { parseUkrposhtaCountryAvailability } from './commerceCarrierVerifiedMethod.ts';

/** Official Ukrposhta international API, 2026-03-09, section 9:
 * https://dev.ukrposhta.ua/uploads/International_documentation_09032026.pdf
 *
 * This adapter is to be used ONLY on the backend. The official API requires
 * BOTH a bearer authorization and user token query param. The token-bearing
 * URL must never be logged, sent to the browser, saved into observations,
 * analytics or copied into diagnostic errors. The source check is not
 * an owner-approved Standard/Express mapping or an order payment authorization.
 */
export const UKRPOSHTA_INTERNATIONAL_AVAILABILITY_CONTRACT =
  'commerce_ukrposhta_availability_probe_v1' as const;
export const UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION =
  'ukrposhta_international_20260309_v1' as const;
export const UKRPOSHTA_AVAILABILITY_TTL_MINUTES = 60 as const;
export type UkrposhtaProduct = 'SMALL_BAG' | 'PARCEL' | 'EMS';
export type UkrposhtaTransport = 'AVIA' | 'GROUND';
export type UkrposhtaProbe = {
  country:string;
  carrier_product:UkrposhtaProduct;
  transport_type:UkrposhtaTransport;
};
export type UkrposhtaCredentials = {
  bearer:string; userToken:string;
};
export type UkrposhtaAvailabilityProbeResult = {
  contract_version:typeof UKRPOSHTA_INTERNATIONAL_AVAILABILITY_CONTRACT;
  source_adapter_version:typeof UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION;
  country:string;carrier_product:UkrposhtaProduct;
  transport_type:UkrposhtaTransport;
  outcome:'available'|'unavailable'|'unknown'|'not_configured';
  source_digest_sha256:string|null;
  captured_at:string|null;
  expires_at:string|null;
  shipping_method_mapping_owner_approved:false;
  standard_verified:false;
  express_verified:false;
  payable:false;
  payment_enabled:false;
  provider_session_enabled:false;
};
const knownCountries=new Set(DELIVERY_COUNTRIES);
const origin='https://www.ukrposhta.ua/ecom/0.0.1/';
const validSecret=(value:unknown):value is string=>
  typeof value==='string' && value.length>=10 && value.length<=512 && !/\s/.test(value);
const makeResult=(request:UkrposhtaProbe,outcome:UkrposhtaAvailabilityProbeResult['outcome'],
  source_digest_sha256:string|null=null,captured_at:string|null=null,expires_at:string|null=null
):UkrposhtaAvailabilityProbeResult=>({
  contract_version:UKRPOSHTA_INTERNATIONAL_AVAILABILITY_CONTRACT,
  source_adapter_version:UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION,
  country:request.country,carrier_product:request.carrier_product,transport_type:request.transport_type,
  outcome,source_digest_sha256,captured_at,expires_at,
  shipping_method_mapping_owner_approved:false,
  standard_verified:false,express_verified:false,
  payable:false,payment_enabled:false,provider_session_enabled:false,
});

/** Returns UNKNOWN on network/auth/provider errors. The only authoritative
 * positive is a matching 200 JSON response from the official fixed-origin
 * endpoint and that positive STILL requires a separate owner-reviewed mapping
 * plus parcel/weight/route source before any buyer checkout may use it. */
export async function probeUkrposhtaAvailability(
  request:UkrposhtaProbe,
  credentials:UkrposhtaCredentials|null,
  fetcher:typeof fetch=fetch,
  nowMs:()=>number=Date.now,
):Promise<UkrposhtaAvailabilityProbeResult>{
  if(!request || !knownCountries.has(request.country)
    || !['SMALL_BAG','PARCEL','EMS'].includes(request.carrier_product)
    || !['AVIA','GROUND'].includes(request.transport_type))
    throw new Error('ukrposhta_probe_input_invalid');
  if(isFeyaBlockedExportDestination(request.country))
    return makeResult(request,'unavailable');
  if(!credentials || !validSecret(credentials.bearer) || !validSecret(credentials.userToken))
    return makeResult(request,'not_configured');

  const endpoint=new URL('countries/delivery-availability',origin);
  endpoint.searchParams.set('country',request.country);
  endpoint.searchParams.set('product',request.carrier_product);
  endpoint.searchParams.set('type',request.transport_type);
  endpoint.searchParams.set('token',credentials.userToken);

  try{
    const response=await fetcher(endpoint.toString(),{
      method:'GET',
      headers:{Authorization:`Bearer ${credentials.bearer}`,Accept:'application/json'},
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(response.status!==200) return makeResult(request,'unknown');
    const txt=await response.text();
    if(txt.length>4096) return makeResult(request,'unknown');
    let decoded:unknown;
    try { decoded=JSON.parse(txt); } catch { return makeResult(request,'unknown'); }
    let validated;
    try { validated=parseUkrposhtaCountryAvailability(decoded,request.country,request.carrier_product); }
    catch { return makeResult(request,'unknown'); }
    if(validated.transportType!==request.transport_type)return makeResult(request,'unknown');
    const observed=nowMs();
    if(!Number.isFinite(observed))return makeResult(request,'unknown');
    const captured_at=new Date(observed).toISOString();
    const expires_at=new Date(observed+UKRPOSHTA_AVAILABILITY_TTL_MINUTES*60*1000).toISOString();
    const source_digest_sha256=createHash('sha256')
      .update(JSON.stringify({
        country:validated.country,
        packageType:validated.packageType,
        transportType:validated.transportType,
        available:validated.available,
      }))
      .digest('hex');
    return makeResult(request,validated.available?'available':'unavailable',
      source_digest_sha256,captured_at,expires_at);
  }catch{
    // No response body / URL / credential is ever returned or logged.
    return makeResult(request,'unknown');
  }
}
