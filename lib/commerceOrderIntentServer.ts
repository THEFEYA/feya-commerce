import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';

export function isCommerceOrderIntentEnabled(){
  return process.env.FEYA_COMMERCE_ORDER_INTENT_ENABLED==='true';
}

export function getCommerceOrderIntentServerClient(){
  if(!isCommerceOrderIntentEnabled())return{ok:false as const,status:423,code:'commerce_order_intent_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return{ok:false as const,status:503,code:'order_intent_storage_unavailable'};
  return{ok:true as const,client};
}
