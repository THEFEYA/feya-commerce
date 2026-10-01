import 'server-only';
import { getSupabaseAuthServerClient, isAdminAuthRequired } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';
import { getSupabaseServiceClient } from '@/lib/supabase';

export function isOfferPromotionEnabled(){
  return isAdminAuthRequired()&&process.env.FEYA_COMMERCE_OFFER_PROMOTION_ENABLED==='true';
}
export async function requireOfferPromotionActor(){
  if(!isOfferPromotionEnabled())return{ok:false as const,status:423,code:'offer_promotion_disabled'};
  const auth=await getSupabaseAuthServerClient();
  if(!auth)return{ok:false as const,status:503,code:'offer_promotion_auth_unavailable'};
  const {data,error}=await auth.auth.getUser();
  if(error||!data.user||data.user.is_anonymous)return{ok:false as const,status:401,code:'authentication_required'};
  if(!adminAccessDecision({id:data.user.id,email:data.user.email},process.env).allowed)
    return{ok:false as const,status:403,code:'admin_not_allowed'};
  const client=getSupabaseServiceClient();
  if(!client)return{ok:false as const,status:503,code:'offer_promotion_storage_unavailable'};
  return{ok:true as const,actorId:data.user.id,client};
}
