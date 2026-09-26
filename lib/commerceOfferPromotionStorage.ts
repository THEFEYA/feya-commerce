export const OFFER_PROMOTION_CONTRACT='commerce_offer_promotion_v1';
export const OFFER_PROMOTION_HEALTH_RPC='feya_commerce_offer_promotion_health_v1';
export const OFFER_PROMOTION_RPC='feya_commerce_promote_offer_v1';

export type OfferPromotionRequest={
  contract_version:'commerce_offer_promotion_v1';
  request_id:string;
  canonical_product_id:string;
  expected_variant_revision:number;
  expected_offer_revision:number;
  release_ref:string;
  max_quantity_per_line:number;
  variant_ids:string[];
};

export type OfferPromotionReceipt={
  contract_version:'commerce_offer_promotion_v1';
  request_id:string;
  canonical_product_id:string;
  variant_revision:number;
  offer_revision_id:string;
  offer_revision:number;
  release_ref:string;
  variant_count:number;
  execution_request_id:string;
  change_event_id:string;
  request_hash:string;
  quote_ready:true;
  order_creation_enabled:false;
  payment_enabled:false;
  indexing_enabled:false;
  replayed:boolean;
};

export type PromotionRPCClient={rpc(name:string,args?:Record<string,unknown>):PromiseLike<{data:unknown;error:{message?:string;code?:string}|null}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rec=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const keys=['canonical_product_id','contract_version','expected_offer_revision','expected_variant_revision','max_quantity_per_line','release_ref','request_id','variant_ids'];

export class OfferPromotionStorageError extends Error{
  status:number;outcome:'not_written'|'unknown';
  constructor(code:string,status:number,outcome:'not_written'|'unknown'='not_written'){super(code);this.status=status;this.outcome=outcome;}
}
export function parseOfferPromotionRequest(input:unknown,productId?:string):OfferPromotionRequest{
  if(!rec(input)||JSON.stringify(Object.keys(input).sort())!==JSON.stringify(keys))throw new Error('offer_promotion_request_invalid');
  const v=input as Record<string,unknown>;
  if(v.contract_version!==OFFER_PROMOTION_CONTRACT
    ||typeof v.request_id!=='string'||!UUID.test(v.request_id)
    ||typeof v.canonical_product_id!=='string'||!UUID.test(v.canonical_product_id)
    ||(productId!==undefined&&v.canonical_product_id!==productId)
    ||typeof v.expected_variant_revision!=='number'||!Number.isSafeInteger(v.expected_variant_revision)||v.expected_variant_revision<1
    ||typeof v.expected_offer_revision!=='number'||!Number.isSafeInteger(v.expected_offer_revision)||v.expected_offer_revision<0
    ||typeof v.release_ref!=='string'||!v.release_ref.trim()||v.release_ref.length>200
    ||typeof v.max_quantity_per_line!=='number'||!Number.isSafeInteger(v.max_quantity_per_line)||v.max_quantity_per_line<1||v.max_quantity_per_line>1000
    ||!Array.isArray(v.variant_ids)||v.variant_ids.length<1||v.variant_ids.length>512
    ||v.variant_ids.some(x=>typeof x!=='string'||!UUID.test(x))
    ||new Set(v.variant_ids).size!==v.variant_ids.length)throw new Error('offer_promotion_request_invalid');
  return input as OfferPromotionRequest;
}
function rpcError(error:{message?:string;code?:string}):never{
  const message=error.message||'';
  if(error.code==='P0001'&&/^offer_promotion_[a-z_]+$/.test(message)){
    const status=/not_found/.test(message)?404:/conflict|held|not_promotable|not_orderable/.test(message)?409:/contract_not_ready/.test(message)?503:422;
    throw new OfferPromotionStorageError(message,status);
  }
  if(['23503','23505','23514','42501'].includes(error.code||''))throw new OfferPromotionStorageError('offer_promotion_database_constraint_rejected',409);
  throw new OfferPromotionStorageError('offer_promotion_outcome_unknown',503,'unknown');
}
export async function verifyOfferPromotionBoundary(client:PromotionRPCClient){
  const {data,error}=await client.rpc(OFFER_PROMOTION_HEALTH_RPC);
  if(error||!rec(data)||data.contract_version!==OFFER_PROMOTION_CONTRACT||data.ready!==true
    ||data.direct_offer_table_write_enabled!==false||data.promotion_rpc_enabled!==true
    ||data.order_creation_enabled!==false||data.payment_enabled!==false||data.indexing_enabled!==false)
    throw new OfferPromotionStorageError('offer_promotion_contract_not_ready',503);
}
export function parseOfferPromotionReceipt(data:unknown,request:OfferPromotionRequest):OfferPromotionReceipt{
  if(!rec(data)||data.contract_version!==OFFER_PROMOTION_CONTRACT||data.request_id!==request.request_id
    ||data.canonical_product_id!==request.canonical_product_id||data.variant_revision!==request.expected_variant_revision
    ||typeof data.offer_revision_id!=='string'||!UUID.test(data.offer_revision_id)
    ||!Number.isSafeInteger(data.offer_revision)||data.offer_revision!==request.expected_offer_revision+1
    ||data.release_ref!==request.release_ref||data.variant_count!==request.variant_ids.length
    ||typeof data.execution_request_id!=='string'||!UUID.test(data.execution_request_id)
    ||typeof data.change_event_id!=='string'||!UUID.test(data.change_event_id)
    ||typeof data.request_hash!=='string'||!/^[0-9a-f]{64}$/.test(data.request_hash)
    ||data.quote_ready!==true||data.order_creation_enabled!==false||data.payment_enabled!==false||data.indexing_enabled!==false
    ||typeof data.replayed!=='boolean')throw new OfferPromotionStorageError('offer_promotion_receipt_invalid',503,'unknown');
  return data as unknown as OfferPromotionReceipt;
}
export async function promoteOffer(client:PromotionRPCClient,actorUserId:string,raw:unknown,productId?:string){
  if(!UUID.test(actorUserId))throw new OfferPromotionStorageError('offer_promotion_actor_invalid',403);
  const request=parseOfferPromotionRequest(raw,productId);
  await verifyOfferPromotionBoundary(client);
  let result;
  try{result=await client.rpc(OFFER_PROMOTION_RPC,{p_actor_user_id:actorUserId,p_payload:request});}
  catch{throw new OfferPromotionStorageError('offer_promotion_outcome_unknown',503,'unknown');}
  if(result.error)rpcError(result.error);
  return parseOfferPromotionReceipt(result.data,request);
}
