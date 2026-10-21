import 'server-only';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

export const SELLER_SETUP_COOKIE='__Secure-feya-so-setup-v1';
export const SELLER_SETUP_BASE='/api/partner/seller-online' as const;
const PROJECT_ID='prj_ePIymo4sUG33wrRjHBxWrSlaxPID';

export function sellerSetupProductionEnabled(env:Record<string,string|undefined> = process.env){
  return env.VERCEL==='1' && env.VERCEL_ENV==='production'
    && env.VERCEL_PROJECT_ID===PROJECT_ID;
}
export function sellerSetupRequestAllowed(hostname:string,env:Record<string,string|undefined> = process.env){
  return sellerSetupProductionEnabled(env) && hostname.toLowerCase()==='thefeya.com';
}
export function validSellerSetupToken(raw:unknown):raw is string{
  return typeof raw==='string' && /^[A-Za-z0-9_-]{43}$/.test(raw);
}
export function sellerSetupTokenSha(raw:string){
  return createHash('sha256').update(raw,'utf8').digest('hex');
}
export type SellerSetupStatus={
  ok:boolean;
  code?:string;
  mode?:string;
  status?:string;
  paypal_email_set?:boolean;
  personal_key_set?:boolean;
  paypal_client_id_set?:boolean;
  paypal_client_secret_set?:boolean;
  seller_api_key_set?:boolean;
  seller_webhook_url_set?:boolean;
  live_payment_enabled?:false;
  updated_at?:string|null;
};
type RpcResult={data:unknown,error:{message:string}|null};
function client(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)return null;
  return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
function statusValue(v:unknown):SellerSetupStatus{
  if(!v||typeof v!=='object'||Array.isArray(v))return {ok:false,code:'setup_response_unavailable'};
  const data=v as Record<string,unknown>;
  if(data.ok!==true)return {ok:false,code:'invalid_or_expired_invitation'};
  return {
    ok:true,
    mode:String(data.mode||'unselected'),
    status:String(data.status||'awaiting_setup'),
    paypal_email_set:data.paypal_email_set===true,
    personal_key_set:data.personal_key_set===true,
    paypal_client_id_set:data.paypal_client_id_set===true,
    paypal_client_secret_set:data.paypal_client_secret_set===true,
    seller_api_key_set:data.seller_api_key_set===true,
    seller_webhook_url_set:data.seller_webhook_url_set===true,
    live_payment_enabled:false,
    updated_at:typeof data.updated_at==='string'?data.updated_at:null,
  };
}
export async function readSellerSetupStatus(raw:string):Promise<SellerSetupStatus>{
  if(!validSellerSetupToken(raw))return {ok:false,code:'invalid_or_expired_invitation'};
  const db=client();if(!db)return {ok:false,code:'setup_storage_unavailable'};
  const {data,error}:RpcResult=await db.rpc('feya_seller_online_setup_status_v1',{p_token_sha256:sellerSetupTokenSha(raw)});
  if(error)return {ok:false,code:'setup_storage_unavailable'};
  return statusValue(data);
}
const MODES=['paypal_standard','paypal_rest','seller_online_api_v2','hosted_redirect'] as const;
const FIELDS=['paypal_email','personal_key','paypal_client_id','paypal_client_secret','seller_api_key','seller_webhook_url'] as const;
export function parseSellerSetupPayload(input:unknown):Record<string,string>{
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_configuration');
  const obj=input as Record<string,unknown>;
  if(typeof obj.mode!=='string'||!MODES.includes(obj.mode as typeof MODES[number])
    ||Object.keys(obj).some(k=>!(['mode',...FIELDS] as string[]).includes(k)))throw Error('invalid_configuration');
  const clean:Record<string,string>={mode:obj.mode};
  for(const key of FIELDS){
    const value=obj[key];
    if(value===undefined||value===null)continue;
    if(typeof value!=='string'||value.length>600||/[\u0000-\u001f\u007f]/.test(value))throw Error('invalid_field');
    const trimmed=value.trim();
    if(trimmed)clean[key]=trimmed;
  }
  if(clean.paypal_email&&!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(clean.paypal_email))
    throw Error('invalid_paypal_email');
  if(clean.seller_webhook_url){
    let parsed:URL;
    try{parsed=new URL(clean.seller_webhook_url);}catch{throw Error('invalid_seller_webhook_url');}
    const host=parsed.hostname.toLowerCase();
    if(parsed.protocol!=='https:'||parsed.username||parsed.password
      ||!(host==='seller-online.com'||host.endsWith('.seller-online.com')))
      throw Error('invalid_seller_webhook_url');
  }
  return clean;
}
export async function saveSellerSetup(raw:string,input:unknown):Promise<SellerSetupStatus>{
  if(!validSellerSetupToken(raw))return {ok:false,code:'invalid_or_expired_invitation'};
  const db=client();if(!db)return {ok:false,code:'setup_storage_unavailable'};
  let payload:Record<string,string>;
  try{payload=parseSellerSetupPayload(input);}
  catch{return {ok:false,code:'invalid_configuration'};}
  const {data,error}:RpcResult=await db.rpc('feya_seller_online_setup_save_v1',{
    p_token_sha256:sellerSetupTokenSha(raw),p_payload:payload,
  });
  if(error)return {ok:false,code:'configuration_save_failed'};
  return statusValue(data);
}
