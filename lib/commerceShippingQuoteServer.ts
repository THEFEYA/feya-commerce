import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';

export function isCommerceShippingQuoteEnabled(){
  return process.env.FEYA_COMMERCE_SHIPPING_QUOTE_ENABLED==='true';
}

export function getCommerceShippingQuoteServerClient(){
  if(!isCommerceShippingQuoteEnabled())return{ok:false as const,status:423,code:'commerce_shipping_quote_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return{ok:false as const,status:503,code:'shipping_quote_storage_unavailable'};
  return{ok:true as const,client};
}
