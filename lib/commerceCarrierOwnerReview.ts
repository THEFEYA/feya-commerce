export const CARRIER_OWNER_CONTEXT_V1='commerce_carrier_owner_review_context_v1' as const;
export const CARRIER_OWNER_RECEIPT_V1='commerce_carrier_owner_review_receipt_v1' as const;

export type OwnerParcelReview={
  review_id:string;parcel_class:'ordinary'|'oversize';
  max_units_per_parcel:number;envelope_weight_grams:number;
  envelope_length_mm:number;envelope_width_mm:number;envelope_height_mm:number;
  packaging_reference:string;reviewed_at:string;
};
export type CarrierOwnerProfile={
  shipping_profile_id:string;name:string;currency:string;
  max_units_per_parcel:number|null;owner_review:OwnerParcelReview|null;
};
export type CarrierOwnerContext={
  contract_version:typeof CARRIER_OWNER_CONTEXT_V1;
  status:'awaiting_delivery_approval'|'approved_workspace';
  saved_draft_revision:number;approved_workspace_version_id:string|null;
  approved_workspace_revision:number|null;
  profiles:CarrierOwnerProfile[];
  mapping_review_count:number;source_observation_count:number;
  payable:false;public_rates_enabled:false;payment_enabled:false;provider_session_enabled:false;
};
export type CarrierOwnerParcelRequest={
  request_id:string;workspace_version_id:string;workspace_revision:number;
  shipping_profile_id:string;parcel_class:'ordinary'|'oversize';
  max_units_per_parcel:number;envelope_weight_grams:number;
  envelope_length_mm:number;envelope_width_mm:number;envelope_height_mm:number;
  packaging_reference:string;business_review_confirmed:true;
};
export type CarrierOwnerReceipt={
  contract_version:typeof CARRIER_OWNER_RECEIPT_V1;
  review_id:string;shipping_profile_id:string;workspace_version_id:string;
  workspace_revision:number;parcel_class:'ordinary'|'oversize';
  reviewed_at:string;replayed:boolean;carrier_route_verified:false;
  payable:false;public_rates_enabled:false;payment_enabled:false;provider_session_enabled:false;
};
type RPCResult={data:unknown;error:{message?:string;code?:string}|null};
export type CarrierOwnerRPC={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<RPCResult>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const validId=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
const safeClock=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const disallowed=(v:Record<string,unknown>)=>v.payable!==false||v.public_rates_enabled!==false||
  v.payment_enabled!==false||v.provider_session_enabled!==false;
const err=(name:string):never=>{throw new CarrierOwnerReviewError(name)};
export class CarrierOwnerReviewError extends Error{
  readonly status:number;
  constructor(code:string,status=409){super(code);this.status=status;}
}
const keys='business_review_confirmed,envelope_height_mm,envelope_length_mm,envelope_weight_grams,envelope_width_mm,max_units_per_parcel,packaging_reference,parcel_class,request_id,shipping_profile_id,workspace_revision,workspace_version_id';
export function parseCarrierOwnerParcelRequest(raw:unknown):CarrierOwnerParcelRequest{
  if(!record(raw)||Object.keys(raw).sort().join(',')!==keys
    ||!validId(raw.request_id)||!validId(raw.shipping_profile_id)
    ||!validId(raw.workspace_version_id)||!integer(raw.workspace_revision,1)
    ||!['ordinary','oversize'].includes(String(raw.parcel_class))
    ||!integer(raw.max_units_per_parcel,1,100)
    ||!integer(raw.envelope_weight_grams,1,500000)
    ||!integer(raw.envelope_length_mm,1,5000)
    ||!integer(raw.envelope_width_mm,1,5000)
    ||!integer(raw.envelope_height_mm,1,5000)
    ||raw.business_review_confirmed!==true
    ||typeof raw.packaging_reference!=='string'
    ||raw.packaging_reference.trim().length<12
    ||raw.packaging_reference.trim().length>200
    ||/[\u0000-\u001f\u007f]/.test(raw.packaging_reference))
    throw new CarrierOwnerReviewError('carrier_owner_review_request_invalid',400);
  return {...raw,packaging_reference:raw.packaging_reference.trim()} as CarrierOwnerParcelRequest;
}
function validReview(raw:unknown):raw is OwnerParcelReview{
  return record(raw)&&validId(raw.review_id)
    &&['ordinary','oversize'].includes(String(raw.parcel_class))
    &&integer(raw.max_units_per_parcel,1,100)
    &&integer(raw.envelope_weight_grams,1,500000)
    &&integer(raw.envelope_length_mm,1,5000)
    &&integer(raw.envelope_width_mm,1,5000)
    &&integer(raw.envelope_height_mm,1,5000)
    &&typeof raw.packaging_reference==='string'
    &&raw.packaging_reference.length>=12&&raw.packaging_reference.length<=200
    &&safeClock(raw.reviewed_at);
}
export function parseCarrierOwnerContext(raw:unknown):CarrierOwnerContext{
  if(!record(raw)||raw.contract_version!==CARRIER_OWNER_CONTEXT_V1
    ||!['awaiting_delivery_approval','approved_workspace'].includes(String(raw.status))
    ||!integer(raw.saved_draft_revision,0)
    ||!integer(raw.mapping_review_count,0)
    ||!integer(raw.source_observation_count,0)
    ||!Array.isArray(raw.profiles)||raw.profiles.length>300
    ||disallowed(raw))return err('carrier_owner_review_response_invalid');
  const approved=raw.status==='approved_workspace';
  if(approved
    ? !validId(raw.approved_workspace_version_id)||!integer(raw.approved_workspace_revision,1)
    : raw.approved_workspace_version_id!==null||raw.approved_workspace_revision!==null||raw.profiles.length!==0)
    return err('carrier_owner_review_response_invalid');
  const names=new Set<string>();
  for(const p of raw.profiles){
    if(!record(p)||!validId(p.shipping_profile_id)
      ||typeof p.name!=='string'||p.name.length<1||p.name.length>120
      ||!['EUR','USD'].includes(String(p.currency))
      ||!(p.max_units_per_parcel===null||integer(p.max_units_per_parcel,1,1000))
      ||!(p.owner_review===null||validReview(p.owner_review))
      ||(record(p.owner_review)&&p.owner_review.max_units_per_parcel!==p.max_units_per_parcel)
      ||names.has(p.shipping_profile_id))
      return err('carrier_owner_review_response_invalid');
    names.add(p.shipping_profile_id);
  }
  return raw as unknown as CarrierOwnerContext;
}
export async function readCarrierOwnerContext(client:CarrierOwnerRPC):Promise<CarrierOwnerContext>{
  let response:RPCResult;
  try{response=await client.rpc('feya_commerce_owner_carrier_review_context_v1');}
  catch{return err('carrier_owner_review_storage_unavailable');}
  if(response.error)return err('carrier_owner_review_storage_unavailable');
  return parseCarrierOwnerContext(response.data);
}
export async function confirmOwnerParcelReview(
  client:CarrierOwnerRPC,raw:unknown,actorId:string,
):Promise<CarrierOwnerReceipt>{
  const input=parseCarrierOwnerParcelRequest(raw);
  if(!validId(actorId))throw new CarrierOwnerReviewError('carrier_owner_review_actor_invalid',403);
  let response:RPCResult;
  try{response=await client.rpc('feya_commerce_confirm_owner_parcel_review_v1',{
    p_payload:input,p_actor_id:actorId,
  });}catch{return err('carrier_owner_review_outcome_unknown');}
  if(response.error){
    const message=response.error.message||'';
    if(response.error.code==='P0001'&&/^carrier_owner_review_[a-z_]+$/.test(message))
      throw new CarrierOwnerReviewError(message,
        /request_invalid/.test(message)?400:/boundary_unavailable/.test(message)?503:409);
    return err('carrier_owner_review_outcome_unknown');
  }
  const r=response.data;
  if(!record(r)||r.contract_version!==CARRIER_OWNER_RECEIPT_V1
    ||r.review_id!==input.request_id||r.shipping_profile_id!==input.shipping_profile_id
    ||r.workspace_version_id!==input.workspace_version_id
    ||r.workspace_revision!==input.workspace_revision
    ||r.parcel_class!==input.parcel_class
    ||!safeClock(r.reviewed_at)||typeof r.replayed!=='boolean'
    ||r.carrier_route_verified!==false||disallowed(r))
    return err('carrier_owner_review_response_invalid');
  return r as unknown as CarrierOwnerReceipt;
}
