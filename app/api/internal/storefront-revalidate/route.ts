import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { buildStorefrontInvalidationPlan, type StorefrontInvalidationInput } from '@/lib/storefrontCacheInvalidation';
import {
  markStorefrontInvalidationDelivered,
  markStorefrontInvalidationFailed,
  newStorefrontInvalidationId,
  readStorefrontInvalidationByRequestKey,
  recordStorefrontInvalidationAccepted,
  validateStorefrontInvalidationRequestKey,
} from '@/lib/storefrontCacheInvalidationAuditServer';
import { withStorefrontRevalidationAuth } from '@/lib/storefrontRevalidationAuth';

export const dynamic='force-dynamic';

async function handler(request:NextRequest) {
  let body:StorefrontInvalidationInput;
  try {
    body=await request.json();
  } catch {
    return Response.json({ok:false,code:'storefront_revalidation_invalid_json'},{status:400});
  }

  let requestKey:string;
  let plan;
  try {
    requestKey=validateStorefrontInvalidationRequestKey(request.headers.get('Idempotency-Key'));
    plan=buildStorefrontInvalidationPlan(body);
  } catch(error) {
    return Response.json({
      ok:false,
      code:error instanceof Error?error.message:'STOREFRONT_INVALIDATION_INVALID_INPUT',
    },{status:400});
  }

  try {
    const existing=await readStorefrontInvalidationByRequestKey(requestKey);
    if(existing?.delivery_status==='delivered') {
      return Response.json({
        ok:true,replayed:true,invalidation_id:existing.invalidation_id,
        event_type:existing.event_type,tags:existing.tags_json,paths:existing.paths_json,
      });
    }
    if(existing) {
      return Response.json({
        ok:false,code:'storefront_revalidation_request_in_progress_or_failed',
        invalidation_id:existing.invalidation_id,status:existing.delivery_status,
      },{status:409});
    }
  } catch(error) {
    return Response.json({ok:false,code:error instanceof Error?error.message:'storefront_revalidation_audit_unavailable'},{status:503});
  }

  const invalidationId=newStorefrontInvalidationId();
  try {
    await recordStorefrontInvalidationAccepted({
      invalidationId,requestKey,plan,sourceType:'internal_api',mode:'revalidate_tag_max',
    });
  } catch(error) {
    return Response.json({ok:false,code:error instanceof Error?error.message:'storefront_revalidation_audit_unavailable'},{status:503});
  }

  try {
    for(const tag of plan.tags) revalidateTag(tag,'max');
    for(const path of plan.paths) revalidatePath(path);
    await markStorefrontInvalidationDelivered(invalidationId);
    return Response.json({
      ok:true,replayed:false,invalidation_id:invalidationId,
      event_type:plan.event_type,tags:plan.tags,paths:plan.paths,
    },{status:202});
  } catch(error) {
    const code=error instanceof Error?error.message:'STOREFRONT_INVALIDATION_DELIVERY_FAILED';
    await markStorefrontInvalidationFailed(invalidationId,code);
    return Response.json({ok:false,code:'storefront_revalidation_delivery_failed',invalidation_id:invalidationId},{status:503});
  }
}

export const POST=withStorefrontRevalidationAuth(handler);
