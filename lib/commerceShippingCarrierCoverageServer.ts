import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';
import {readShippingCarrierCoverage} from './commerceShippingCarrierCoverage.ts';

/** Review-only coverage, not a buyer-facing rate/availability route.
 * Production default OFF until actual human-reviewed parcel envelopes and
 * independently authenticated country/product carrier observations exist.
 */
export const isShippingCarrierCoverageReviewEnabled=()=>
  process.env.FEYA_COMMERCE_CARRIER_COVERAGE_REVIEW_ENABLED==='true';

export async function getShippingCarrierCoverageReviewServer(raw:unknown){
  if(!isShippingCarrierCoverageReviewEnabled())
    return {ok:false as const,status:423,code:'carrier_coverage_review_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return {ok:false as const,status:503,code:'carrier_coverage_storage_unavailable'};
  return {ok:true as const,coverage:await readShippingCarrierCoverage(client,raw)};
}
