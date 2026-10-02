export const COMMERCE_SHIPPING_QUOTE_CONTRACT='commerce_shipping_quote_v1' as const;
export const COMMERCE_SHIPPING_QUOTE_HEALTH_RPC='feya_commerce_shipping_quote_health_v1';
export const COMMERCE_SHIPPING_QUOTE_CREATE_RPC='feya_commerce_create_shipping_quote_v1';

export type CommerceShippingQuoteRequest={
  contract_version:'commerce_shipping_quote_v1';
  request_id:string;
  order_intent_id:string;
  shipping_method:'standard'|'express';
};

export type CommerceShippingQuoteReceipt={
  contract_version:'commerce_shipping_quote_v1';
  shipping_quote_receipt_id:string;
  request_id:string;
  order_intent_id:string;
  shipping_rate_version_id:string;
  shipping_method:'standard'|'express';
  currency:string;
  destination_scope:'GLOBAL';
  amount_minor:number;
  authority_type:'HUMAN_OWNER'|'PROVIDER';
  authority_ref:string;
  expires_at:null;
  order_creation_enabled:false;
  payment_enabled:false;
  provider_session_enabled:false;
  replayed:boolean;
};

export type CommerceShippingQuoteHealth={
  contract_version:'commerce_shipping_quote_v1';
  schema_ready:boolean;
  shipping_authority_ready:boolean;
  currency:'EUR';
  destination_scope:'GLOBAL';
  active_standard_rate_count:number;
  active_express_rate_count:number;
  client_amounts_accepted:false;
  order_creation_enabled:false;
  payment_enabled:false;
  provider_session_enabled:false;
};

export type ShippingQuoteRPCClient={
  rpc(name:string,args?:Record<string,unknown>):PromiseLike<{
    data:unknown;
    error:{message?:string;code?:string}|null;
  }>;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));

export class CommerceShippingQuoteError extends Error{
  status:number;
  outcome:'not_written'|'unknown';
  constructor(code:string,status:number,outcome:'not_written'|'unknown'='not_written'){
    super(code);this.status=status;this.outcome=outcome;
  }
}

export function parseCommerceShippingQuoteRequest(input:unknown):CommerceShippingQuoteRequest{
  if(!isRecord(input))throw new CommerceShippingQuoteError('shipping_quote_request_invalid',400);
  const keys=Object.keys(input).sort();
  const expected=['contract_version','order_intent_id','request_id','shipping_method'];
  if(JSON.stringify(keys)!==JSON.stringify(expected)
    ||input.contract_version!==COMMERCE_SHIPPING_QUOTE_CONTRACT
    ||typeof input.request_id!=='string'||!UUID.test(input.request_id)
    ||typeof input.order_intent_id!=='string'||!UUID.test(input.order_intent_id)
    ||!['standard','express'].includes(String(input.shipping_method)))
    throw new CommerceShippingQuoteError('shipping_quote_request_invalid',400);
  return input as unknown as CommerceShippingQuoteRequest;
}

function rpcError(error:{message?:string;code?:string}):never{
  const message=error.message||'';
  if(error.code==='P0001'&&/^shipping_quote_[a-z_]+$/.test(message)){
    const status=
      /not_found/.test(message)?404:
      /conflict|state_invalid/.test(message)?409:
      /rate_not_configured|contract_not_ready/.test(message)?503:422;
    throw new CommerceShippingQuoteError(message,status);
  }
  if(['23503','23505','23514','42501'].includes(error.code||''))
    throw new CommerceShippingQuoteError('shipping_quote_database_constraint_rejected',409);
  throw new CommerceShippingQuoteError('shipping_quote_storage_outcome_unknown',503,'unknown');
}

export async function getCommerceShippingQuoteHealth(client:ShippingQuoteRPCClient):Promise<CommerceShippingQuoteHealth>{
  const {data,error}=await client.rpc(COMMERCE_SHIPPING_QUOTE_HEALTH_RPC);
  if(error||!isRecord(data)
    ||data.contract_version!==COMMERCE_SHIPPING_QUOTE_CONTRACT
    ||typeof data.schema_ready!=='boolean'
    ||typeof data.shipping_authority_ready!=='boolean'
    ||data.currency!=='EUR'
    ||data.destination_scope!=='GLOBAL'
    ||!Number.isInteger(data.active_standard_rate_count)
    ||!Number.isInteger(data.active_express_rate_count)
    ||data.client_amounts_accepted!==false
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false)
    throw new CommerceShippingQuoteError('shipping_quote_contract_not_ready',503,'unknown');
  return data as unknown as CommerceShippingQuoteHealth;
}

export function parseCommerceShippingQuoteReceipt(data:unknown,request:CommerceShippingQuoteRequest):CommerceShippingQuoteReceipt{
  if(!isRecord(data)
    ||data.contract_version!==COMMERCE_SHIPPING_QUOTE_CONTRACT
    ||typeof data.shipping_quote_receipt_id!=='string'||!UUID.test(data.shipping_quote_receipt_id)
    ||data.request_id!==request.request_id
    ||data.order_intent_id!==request.order_intent_id
    ||typeof data.shipping_rate_version_id!=='string'||!UUID.test(data.shipping_rate_version_id)
    ||data.shipping_method!==request.shipping_method
    ||data.currency!=='EUR'
    ||data.destination_scope!=='GLOBAL'
    ||!Number.isSafeInteger(data.amount_minor)||(data.amount_minor as number)<0
    ||!['HUMAN_OWNER','PROVIDER'].includes(String(data.authority_type))
    ||typeof data.authority_ref!=='string'||!data.authority_ref.trim()
    ||data.expires_at!==null
    ||data.order_creation_enabled!==false
    ||data.payment_enabled!==false
    ||data.provider_session_enabled!==false
    ||typeof data.replayed!=='boolean')
    throw new CommerceShippingQuoteError('shipping_quote_receipt_invalid',503,'unknown');
  return data as unknown as CommerceShippingQuoteReceipt;
}

export async function createCommerceShippingQuote(client:ShippingQuoteRPCClient,input:unknown){
  const request=parseCommerceShippingQuoteRequest(input);
  const health=await getCommerceShippingQuoteHealth(client);
  if(!health.schema_ready)
    throw new CommerceShippingQuoteError('shipping_quote_contract_not_ready',503);
  if(!health.shipping_authority_ready)
    throw new CommerceShippingQuoteError('shipping_quote_rate_not_configured',503);
  let result;
  try{result=await client.rpc(COMMERCE_SHIPPING_QUOTE_CREATE_RPC,{p_payload:request});}
  catch{throw new CommerceShippingQuoteError('shipping_quote_storage_outcome_unknown',503,'unknown');}
  if(result.error)rpcError(result.error);
  return parseCommerceShippingQuoteReceipt(result.data,request);
}
