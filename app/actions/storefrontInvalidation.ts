'use server';

import { updateTag, revalidatePath } from 'next/cache';
import { getSupabaseAuthServerClient, isAdminAuthRequired } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';
import { buildStorefrontInvalidationPlan, type StorefrontInvalidationInput } from '@/lib/storefrontCacheInvalidation';
import {
  markStorefrontInvalidationDelivered,
  markStorefrontInvalidationFailed,
  newStorefrontInvalidationId,
  newStorefrontInvalidationRequestKey,
  recordStorefrontInvalidationAccepted,
} from '@/lib/storefrontCacheInvalidationAuditServer';

async function requireOwner() {
  if(!isAdminAuthRequired())throw new Error('STOREFRONT_INVALIDATION_ADMIN_AUTH_UNAVAILABLE');
  const auth=await getSupabaseAuthServerClient();
  if(!auth)throw new Error('STOREFRONT_INVALIDATION_ADMIN_AUTH_UNAVAILABLE');
  const {data,error}=await auth.auth.getClaims();
  if(error||!data?.claims||typeof data.claims.sub!=='string')throw new Error('STOREFRONT_INVALIDATION_AUTHENTICATION_REQUIRED');
  const actor={id:data.claims.sub,email:typeof data.claims.email==='string'?data.claims.email:undefined};
  if(!adminAccessDecision(actor,process.env).allowed)throw new Error('STOREFRONT_INVALIDATION_ADMIN_NOT_ALLOWED');
  return actor.id;
}

/**
 * For an authenticated Server Action that has just committed a storefront mutation.
 * updateTag is intentionally used only here for read-your-own-writes semantics.
 */
export async function invalidateStorefrontAfterOwnerMutation(input:StorefrontInvalidationInput) {
  const actorId=await requireOwner();
  const plan=buildStorefrontInvalidationPlan({...input,source_ref:input.source_ref||`owner:${actorId}`});
  const invalidationId=newStorefrontInvalidationId();
  const requestKey=newStorefrontInvalidationRequestKey('owner');

  await recordStorefrontInvalidationAccepted({
    invalidationId,requestKey,plan,sourceType:'admin_server_action',mode:'update_tag',
  });

  try {
    for(const tag of plan.tags) updateTag(tag);
    for(const path of plan.paths) revalidatePath(path);
    await markStorefrontInvalidationDelivered(invalidationId);
    return {ok:true,invalidation_id:invalidationId,tags:plan.tags,paths:plan.paths};
  } catch(error) {
    const code=error instanceof Error?error.message:'STOREFRONT_INVALIDATION_DELIVERY_FAILED';
    await markStorefrontInvalidationFailed(invalidationId,code);
    throw error;
  }
}
