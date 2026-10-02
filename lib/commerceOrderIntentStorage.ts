export const COMMERCE_ORDER_INTENT_CONTRACT='commerce_order_intent_v1' as const;
export const COMMERCE_ORDER_INTENT_HEALTH_RPC='feya_commerce_order_intent_health_v1';
export const COMMERCE_ORDER_INTENT_CREATE_RPC='feya_commerce_create_order_intent_v1';

export type CommerceOrderIntentRequest={
  contract_version:'commerce_order_intent_v1';
  request_id:string;
  quote_receipt_ids:string[];
  contact:{
    email:string;
    full_name:string;
    phone:string|null;
    shipping_address:string;
    note:string|null;
  };
  shipping_method:'standard'|'express';
};

export type CommerceOrderIntentReceipt={
  contract_version:'commerce_order_intent_v1';
  order_intent_id:string;
  request_id:string;
  quote_receipt_ids:string[];
  items_count:number;
  source_release_ref:string;
  currency:string;
  merchandise_subtotal_minor:number;
  shipping_method:'standard'|'express';
  shipping_amount_minor:null;
  total_amount_minor:null;
  intent_status:'quote_bound_shipping_pending';
  shipping_authority_ready:false;
  order_creation_enabled:false;
  payment_enabled:false;
  provider_session_enabled:false;
  replayed:boolean;
};

export type OrderIntentRPCClient={
  rpc(name:string,args?:Record<string,unknown>):PromiseLike<{
    data:unknown;
    error:{message?:string;code?:string}|null;
  }>;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));

export class CommerceOrderIntentError extends Error{
  status:number;
  outcome:'not_written'|'unknown';
  constructor(code:string,status:number,outcome:'not_written'|'unknown'='not_written'){
    super(code);this.status=status;this.outcome=outcome;
  }
}

export function parseCommerceOrderIntentRequest(input:unknown):CommerceOrderIntentRequest{
  if(!isRecord(input))throw new CommerceOrderIntentError('order_intent_request_invalid',400);
  const keys=Object.keys(input).sort();
  const expected=['contact','contract_version','quote_receipt_ids','request_id','shipping_method'];
  if(JSON.stringify(keys)!==JSON.stringify(expected)
    || input.contract_version!==COMMERCE_ORDER_INTENT_CONTRACT
    || typeof input.request_id!=='string'||!UUID.test(input.request_id)
    || !Array.isArray(input.quote_receipt_ids)
    || input.quote_receipt_ids.length<1||input.quote_receipt_ids.length>20
    || new Set(input.quote_receipt_ids).size!==input.quote_receipt_ids.length
    || input.quote_receipt_ids.some(id=>typeof id!=='string'||!UUID.test(id))
    || !isRecord(input.contact)
    || !['standard','express'].includes(String(input.shipping_method)))
    throw new CommerceOrderIntentError('order_intent_request_invalid',400);

  const contactKeys=Object.keys(input.contact).sort();
  const expectedContact=['email','full_name','note','phone','shipping_address'];
  if(JSON.stringify(contactKeys)!==JSON.stringify(expectedContact))throw new CommerceOrderIntentError('order_intent_request_invalid',400);
  const {email,full_name,phone,shipping_address,note}=input.contact;
  if(typeof email!=='string'||email.trim().length<3||email.length>320||!email.includes('@')
    ||typeof full_name!=='string'||!full_name.trim()||full_name.length>200
    ||typeof shipping_address!=='string'||shipping_address.trim().length<3||shipping_address.length>1000
    ||(phone!==null&&(typeof phone!=='string'||phone.length>100))
    ||(note!==null&&(typeof note!=='string'||note.length>4000)))
    throw new CommerceOrderIntentError('order_intent_request_invalid',400);

  return input as unknown as CommerceOrderIntentRequest;
}

function rpcError(error:{message?:string;code?:string}):never{
  const message=error.message||'';
  if(error.code==='P0001'&&/^order_intent_[a-z_]+$/.test(message)){
    const status=/not_current|conflict/.test(message)?409:/contract_not_ready/.test(message)?503:422;
    throw new CommerceOrderIntentError(message,status);
  }
  if(['23503','23505','23514','42501'].includes(error.code||''))
    throw new CommerceOrderIntentError('order_intent_database_constraint_rejected',409);
  throw new CommerceOrderIntentError('order_intent_storage_outcome_unknown',503,'unknown');
}

export async function verifyCommerceOrderIntentBoundary(client:OrderIntentRPCClient):Promise<void>{
  const {data,error}=await client.rpc(COMMERCE_ORDER_INTENT_HEALTH_RPC);
  if(error||!isRecord(data)
    ||data.contract_version!==COMMERCE_ORDER_INTENT_CONTRACT
    ||data.ready!==true
    ||data.client_amounts_accepted!==false
    ||data.quote_receipt_binding_required!==true
    ||data.current_offer_revalidation_required!==true
    ||data.shipping_authority_ready!==false
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false)
    throw new CommerceOrderIntentError('order_intent_contract_not_ready',503);
}

export function parseCommerceOrderIntentReceipt(data:unknown,request:CommerceOrderIntentRequest):CommerceOrderIntentReceipt{
  if(!isRecord(data)
    ||data.contract_version!==COMMERCE_ORDER_INTENT_CONTRACT
    ||typeof data.order_intent_id!=='string'||!UUID.test(data.order_intent_id)
    ||data.request_id!==request.request_id
    ||!Array.isArray(data.quote_receipt_ids)
    ||JSON.stringify(data.quote_receipt_ids)!==JSON.stringify(request.quote_receipt_ids)
    ||data.items_count!==request.quote_receipt_ids.length
    ||typeof data.source_release_ref!=='string'||!data.source_release_ref.trim()
    ||typeof data.currency!=='string'||!/^[A-Z]{3}$/.test(data.currency)
    ||!Number.isSafeInteger(data.merchandise_subtotal_minor)||(data.merchandise_subtotal_minor as number)<=0
    ||data.shipping_method!==request.shipping_method
    ||data.shipping_amount_minor!==null||data.total_amount_minor!==null
    ||data.intent_status!=='quote_bound_shipping_pending'
    ||data.shipping_authority_ready!==false
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false
    ||typeof data.replayed!=='boolean')
    throw new CommerceOrderIntentError('order_intent_receipt_invalid',503,'unknown');
  return data as unknown as CommerceOrderIntentReceipt;
}

export async function createCommerceOrderIntent(client:OrderIntentRPCClient,input:unknown){
  const request=parseCommerceOrderIntentRequest(input);
  await verifyCommerceOrderIntentBoundary(client);
  let result;
  try{result=await client.rpc(COMMERCE_ORDER_INTENT_CREATE_RPC,{p_payload:request});}
  catch{throw new CommerceOrderIntentError('order_intent_storage_outcome_unknown',503,'unknown');}
  if(result.error)rpcError(result.error);
  return parseCommerceOrderIntentReceipt(result.data,request);
}
