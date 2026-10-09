import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';
import {resolveCartCostBreakdown} from './commerceCartCostBreakdown.ts';

/**
 * Internal review-only cart total. No buyer/public route, no payment,
 * and no implicit zero-tax assumption. Enabled separately only after
 * exact-head CI and owner shipping profile/merchandise authority checks.
 */
export const isCartCostBreakdownReviewEnabled=()=>
  process.env.FEYA_COMMERCE_CART_COST_REVIEW_ENABLED==='true';

export async function reviewCartCostBreakdownServer(request:unknown){
  if(!isCartCostBreakdownReviewEnabled())
    return {ok:false as const,status:423,code:'cart_cost_review_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return {ok:false as const,status:503,code:'cart_cost_review_storage_unavailable'};
  return {ok:true as const,preview:await resolveCartCostBreakdown(client,request)};
}
