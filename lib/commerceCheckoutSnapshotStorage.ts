export const COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT='commerce_checkout_snapshot_v1' as const;
export const COMMERCE_CHECKOUT_SNAPSHOT_HEALTH_RPC='feya_commerce_checkout_snapshot_health_v1';
export const COMMERCE_CHECKOUT_SNAPSHOT_CREATE_RPC='feya_commerce_create_checkout_snapshot_v1';

export type CommerceCheckoutSnapshotRequest={
  contract_version:'commerce_checkout_snapshot_v1';
  request_id:string;
  order_intent_id:string;
  shipping_quote_receipt_id:string;
};

export type CommerceCheckoutSnapshotReceipt={
  contract_version:'commerce_checkout_snapshot_v1';
  checkout_snapshot_id:string;
  request_id:string;
  order_intent_id:string;
  shipping_quote_receipt_id:string;
  policy_bundle_sha256:string;
  source_release_ref:string;
  currency:string;
  line_count:number;
  merchandise_subtotal_minor:number;
  shipping_amount_minor:number;
  total_amount_minor:number;
  checkout_status:'provider_pending';
  transaction_party_bound:false;
  order_creation_enabled:false;
  payment_enabled:false;
  provider_session_enabled:false;
  replayed:boolean;
};

export type CheckoutSnapshotRPCClient={
  rpc(name:string,args?:Record<string,unknown>):PromiseLike<{
    data:unknown;
    error:{message?:string;code?:string}|null;
  }>;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));

export class CommerceCheckoutSnapshotError extends Error{
  status:number;
  outcome:'not_written'|'unknown';
  constructor(code:string,status:number,outcome:'not_written'|'unknown'='not_written'){
    super(code);this.status=status;this.outcome=outcome;
  }
}

export function parseCommerceCheckoutSnapshotRequest(input:unknown):CommerceCheckoutSnapshotRequest{
  if(!isRecord(input))throw new CommerceCheckoutSnapshotError('checkout_snapshot_request_invalid',400);
  const keys=Object.keys(input).sort();
  const expected=['contract_version','order_intent_id','request_id','shipping_quote_receipt_id'];
  if(JSON.stringify(keys)!==JSON.stringify(expected)
    ||input.contract_version!==COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT
    ||typeof input.request_id!=='string'||!UUID.test(input.request_id)
    ||typeof input.order_intent_id!=='string'||!UUID.test(input.order_intent_id)
    ||typeof input.shipping_quote_receipt_id!=='string'||!UUID.test(input.shipping_quote_receipt_id))
    throw new CommerceCheckoutSnapshotError('checkout_snapshot_request_invalid',400);
  return input as unknown as CommerceCheckoutSnapshotRequest;
}

function rpcError(error:{message?:string;code?:string}):never{
  const message=error.message||'';
  if(error.code==='P0001'&&/^checkout_snapshot_[a-z_]+$/.test(message)){
    const status=
      /not_found/.test(message)?404:
      /conflict|state_invalid|expired|not_current|version_conflict/.test(message)?409:
      /contract_not_ready/.test(message)?503:422;
    throw new CommerceCheckoutSnapshotError(message,status);
  }
  if(['23503','23505','23514','42501'].includes(error.code||''))
    throw new CommerceCheckoutSnapshotError('checkout_snapshot_database_constraint_rejected',409);
  throw new CommerceCheckoutSnapshotError('checkout_snapshot_storage_outcome_unknown',503,'unknown');
}

export async function verifyCommerceCheckoutSnapshotBoundary(client:CheckoutSnapshotRPCClient):Promise<void>{
  const {data,error}=await client.rpc(COMMERCE_CHECKOUT_SNAPSHOT_HEALTH_RPC);
  if(error||!isRecord(data)
    ||data.contract_version!==COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT
    ||data.ready!==true
    ||data.client_amounts_accepted!==false
    ||data.quote_receipt_revalidation_required!==true
    ||data.policy_bundle_current_required!==true
    ||data.shipping_quote_required!==true
    ||data.transaction_party_bound!==false
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false)
    throw new CommerceCheckoutSnapshotError('checkout_snapshot_contract_not_ready',503);
}

export function parseCommerceCheckoutSnapshotReceipt(data:unknown,request:CommerceCheckoutSnapshotRequest):CommerceCheckoutSnapshotReceipt{
  if(!isRecord(data)
    ||data.contract_version!==COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT
    ||typeof data.checkout_snapshot_id!=='string'||!UUID.test(data.checkout_snapshot_id)
    ||data.request_id!==request.request_id
    ||data.order_intent_id!==request.order_intent_id
    ||data.shipping_quote_receipt_id!==request.shipping_quote_receipt_id
    ||typeof data.policy_bundle_sha256!=='string'||!SHA.test(data.policy_bundle_sha256)
    ||typeof data.source_release_ref!=='string'||!data.source_release_ref.trim()
    ||typeof data.currency!=='string'||!/^[A-Z]{3}$/.test(data.currency)
    ||!Number.isSafeInteger(data.line_count)||(data.line_count as number)<1
    ||!Number.isSafeInteger(data.merchandise_subtotal_minor)||(data.merchandise_subtotal_minor as number)<=0
    ||!Number.isSafeInteger(data.shipping_amount_minor)||(data.shipping_amount_minor as number)<0
    ||!Number.isSafeInteger(data.total_amount_minor)||(data.total_amount_minor as number)!==(data.merchandise_subtotal_minor as number)+(data.shipping_amount_minor as number)
    ||data.checkout_status!=='provider_pending'
    ||data.transaction_party_bound!==false
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false
    ||typeof data.replayed!=='boolean')
    throw new CommerceCheckoutSnapshotError('checkout_snapshot_receipt_invalid',503,'unknown');
  return data as unknown as CommerceCheckoutSnapshotReceipt;
}

export async function createCommerceCheckoutSnapshot(client:CheckoutSnapshotRPCClient,input:unknown){
  const request=parseCommerceCheckoutSnapshotRequest(input);
  await verifyCommerceCheckoutSnapshotBoundary(client);
  let result;
  try{result=await client.rpc(COMMERCE_CHECKOUT_SNAPSHOT_CREATE_RPC,{p_payload:request});}
  catch{throw new CommerceCheckoutSnapshotError('checkout_snapshot_storage_outcome_unknown',503,'unknown');}
  if(result.error)rpcError(result.error);
  return parseCommerceCheckoutSnapshotReceipt(result.data,request);
}
