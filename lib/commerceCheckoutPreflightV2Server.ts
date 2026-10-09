import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';
import {createCheckoutPreflightV2} from './commerceCheckoutPreflightV2.ts';

/** No public route or buyer PII ingestion until the confirmed privacy
 * controller, actual transaction party and policy/retention release.
 * A private pre-tax receipt can NEVER create a payable order or payment.
 */
export const isCheckoutPreflightV2Enabled=()=>
  process.env.FEYA_COMMERCE_CHECKOUT_PREFLIGHT_V2_ENABLED==='true'
  && process.env.FEYA_PRIVACY_CONTROLLER_CONFIRMED==='true';

export async function createCheckoutPreflightV2Server(request:unknown){
  if(!isCheckoutPreflightV2Enabled())
    return {ok:false as const,status:423,code:'checkout_preflight_v2_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return {ok:false as const,status:503,code:'checkout_preflight_storage_unavailable'};
  return {ok:true as const,receipt:await createCheckoutPreflightV2(client,request)};
}
