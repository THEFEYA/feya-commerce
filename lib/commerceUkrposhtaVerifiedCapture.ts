import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';
import {
  UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION,
  type UkrposhtaProbe, type UkrposhtaAvailabilityProbeResult,
} from './commerceUkrposhtaAvailabilityAdapter.ts';

/** Only an actual trusted server-only Ukrposhta probe can reach this helper.
 * The RPC independently requires an existing immutable owner-reviewed mapping.
 * This is country/product/transport evidence ONLY, not postcode/parcel-size
 * serviceability, a Standard/Express promise, a published rate, or checkout.
 */
export const UKRPOSHTA_CAPTURE_CONTRACT = 'commerce_ukrposhta_source_capture_v1' as const;
export const UKRPOSHTA_CAPTURE_RECEIPT_CONTRACT = 'commerce_ukrposhta_source_receipt_v1' as const;
const ISO = new Set(DELIVERY_COUNTRIES);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const isRecord = (x:unknown):x is Record<string,unknown> =>
  Boolean(x && typeof x === 'object' && !Array.isArray(x));
const fail = (code:string):never => { throw new Error(code); };

export type UkrposhtaCaptureRequest = {
  source_request_id:string;
  mapping_revision_id:string;
  country:string;
  carrier_product:UkrposhtaProbe['carrier_product'];
  transport_type:UkrposhtaProbe['transport_type'];
};
export type UkrposhtaSourceReceipt = {
  contract_version:typeof UKRPOSHTA_CAPTURE_RECEIPT_CONTRACT;
  capture_id:string; source_request_id:string; mapping_revision_id:string;
  country:string; carrier_service_code:string;
  carrier_api_result:'available'|'unavailable';
  replayed:boolean; expired:boolean; method_mapping_owner_approved:true;
  payable:false; public_rates_enabled:false; payment_enabled:false;
  provider_session_enabled:false;
};
export type UkrposhtaCaptureRPC = {
  rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{
    data:unknown; error:{message?:string;code?:string}|null
  }>;
};
export type UkrposhtaCaptureResult =
  | {ok:false;code:'carrier_destination_blocked'|'carrier_source_unverified'|'carrier_credentials_not_configured';
      payable:false;payment_enabled:false}
  | {ok:true;receipt:UkrposhtaSourceReceipt;payable:false;payment_enabled:false};

export function parseUkrposhtaCaptureRequest(raw:unknown):UkrposhtaCaptureRequest{
  if (!isRecord(raw)
    || Object.keys(raw).sort().join(',') !==
      'carrier_product,country,mapping_revision_id,source_request_id,transport_type'
    || !UUID.test(String(raw.source_request_id)) || !UUID.test(String(raw.mapping_revision_id))
    || typeof raw.country !== 'string' || !ISO.has(raw.country)
    || !['SMALL_BAG','PARCEL','EMS'].includes(String(raw.carrier_product))
    || !['AVIA','GROUND'].includes(String(raw.transport_type))
  ) return fail('ukrposhta_capture_request_invalid');
  return raw as UkrposhtaCaptureRequest;
}

function validProbeResult(
  proof:UkrposhtaAvailabilityProbeResult,
  input:UkrposhtaCaptureRequest,
  now:number,
):boolean{
  if (!isRecord(proof)
    || proof.contract_version !== 'commerce_ukrposhta_availability_probe_v1'
    || proof.source_adapter_version !== UKRPOSHTA_AVAILABILITY_ADAPTER_VERSION
    || proof.country !== input.country
    || proof.carrier_product !== input.carrier_product
    || proof.transport_type !== input.transport_type
    || !['available','unavailable'].includes(String(proof.outcome))
    || !SHA.test(String(proof.source_digest_sha256))
    || proof.shipping_method_mapping_owner_approved !== false
    || proof.standard_verified !== false || proof.express_verified !== false
    || proof.payable !== false || proof.payment_enabled !== false
    || proof.provider_session_enabled !== false
    || typeof proof.captured_at !== 'string' || typeof proof.expires_at !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T/.test(proof.captured_at)
    || !/^\d{4}-\d{2}-\d{2}T/.test(proof.expires_at)
  ) return false;
  const start = Date.parse(proof.captured_at), end = Date.parse(proof.expires_at);
  return Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end)
    && start <= now + 10_000 && start >= now - 5 * 60_000
    && end > now && end > start && end - start <= 60 * 60_000;
}

function parseReceipt(raw:unknown,input:UkrposhtaCaptureRequest,
  proof:UkrposhtaAvailabilityProbeResult):UkrposhtaSourceReceipt{
  if(!isRecord(raw)
    || raw.contract_version !== UKRPOSHTA_CAPTURE_RECEIPT_CONTRACT
    || !UUID.test(String(raw.capture_id))
    || raw.source_request_id !== input.source_request_id
    || raw.mapping_revision_id !== input.mapping_revision_id
    || raw.country !== input.country
    || raw.carrier_service_code !== `${input.carrier_product}_${input.transport_type}`
    || raw.carrier_api_result !== proof.outcome
    || typeof raw.replayed !== 'boolean' || typeof raw.expired !== 'boolean'
    || raw.expired !== false
    || raw.method_mapping_owner_approved !== true
    || raw.payable !== false || raw.public_rates_enabled !== false
    || raw.payment_enabled !== false || raw.provider_session_enabled !== false
  ) return fail('ukrposhta_capture_response_invalid');
  return raw as UkrposhtaSourceReceipt;
}

/** This function NEVER obtains a mapping from the carrier API. A real owner
 * must first approve a specific mapping revision in protected FEYA admin.
 * It does not expose an HTTP route. Credentials remain inside the caller's
 * server-only probe; no token, URL, raw response or address reaches SQL.
 */
export async function captureUkrposhtaVerifiedSource(
  raw:unknown,
  trustedProbe:(input:UkrposhtaProbe)=>Promise<UkrposhtaAvailabilityProbeResult>,
  client:UkrposhtaCaptureRPC,
  nowMs:()=>number=Date.now,
):Promise<UkrposhtaCaptureResult>{
  const input=parseUkrposhtaCaptureRequest(raw);
  if (input.country==='UA' || isFeyaBlockedExportDestination(input.country))
    return {ok:false,code:'carrier_destination_blocked',payable:false,payment_enabled:false};
  let proof:UkrposhtaAvailabilityProbeResult;
  try{
    proof=await trustedProbe({country:input.country,carrier_product:input.carrier_product,
      transport_type:input.transport_type});
  }catch{
    return {ok:false,code:'carrier_source_unverified',payable:false,payment_enabled:false};
  }
  if(proof?.outcome==='not_configured')
    return {ok:false,code:'carrier_credentials_not_configured',payable:false,payment_enabled:false};
  if(!validProbeResult(proof,input,nowMs()))
    return {ok:false,code:'carrier_source_unverified',payable:false,payment_enabled:false};
  const capture={
    contract_version:UKRPOSHTA_CAPTURE_CONTRACT,
    source_request_id:input.source_request_id,
    mapping_revision_id:input.mapping_revision_id,
    country:input.country,carrier_product:input.carrier_product,
    transport_type:input.transport_type,carrier_api_result:proof.outcome,
    source_digest_sha256:proof.source_digest_sha256,
    source_adapter_version:proof.source_adapter_version,
    captured_at:proof.captured_at,expires_at:proof.expires_at,
  };
  let response:{data:unknown;error:{message?:string;code?:string}|null};
  try{
    response=await client.rpc('feya_commerce_record_ukrposhta_availability_v1',{p_capture:capture});
  }catch{return fail('ukrposhta_capture_storage_unavailable');}
  if(response.error){
    const code=response.error.message||'';
    if(response.error.code==='P0001'
      && /^ukrposhta_capture_(mapping_not_reviewed|destination_blocked|replay_conflict|stale_or_future|invalid)$/.test(code))
      return fail(code);
    return fail('ukrposhta_capture_storage_unavailable');
  }
  return {ok:true,receipt:parseReceipt(response.data,input,proof),payable:false,payment_enabled:false};
}
