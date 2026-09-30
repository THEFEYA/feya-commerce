import 'server-only';

import { randomUUID } from 'node:crypto';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import type { StorefrontInvalidationPlan } from '@/lib/storefrontCacheInvalidation';

export type StorefrontInvalidationSource = 'internal_api' | 'admin_server_action';
export type StorefrontInvalidationMode = 'revalidate_tag_max' | 'update_tag';

function service() {
  const client=getSupabaseServiceRoleClient();
  if(!client) throw new Error('STOREFRONT_INVALIDATION_AUDIT_UNAVAILABLE');
  return client;
}

export function newStorefrontInvalidationId() {
  return randomUUID();
}

export function newStorefrontInvalidationRequestKey(prefix='storefront') {
  return `${prefix}:${randomUUID()}`;
}

export function validateStorefrontInvalidationRequestKey(value: string | null | undefined) {
  if (!value || value.length<8 || value.length>160 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error('STOREFRONT_INVALIDATION_REQUEST_KEY_REQUIRED');
  }
  return value;
}

export async function readStorefrontInvalidationByRequestKey(requestKey: string) {
  const {data,error}=await service()
    .from('feya_storefront_cache_invalidations_v1')
    .select('invalidation_id,request_key,event_type,entity_type,entity_id,tags_json,paths_json,source_type,source_ref,delivery_mode,delivery_status,error_code,requested_at,delivered_at')
    .eq('request_key',requestKey)
    .maybeSingle();
  if(error) throw new Error('STOREFRONT_INVALIDATION_AUDIT_READ_FAILED');
  return data;
}

export async function recordStorefrontInvalidationAccepted(args:{
  invalidationId:string;
  requestKey:string;
  plan:StorefrontInvalidationPlan;
  sourceType:StorefrontInvalidationSource;
  mode:StorefrontInvalidationMode;
}) {
  const {error}=await service().from('feya_storefront_cache_invalidations_v1').insert({
    invalidation_id:args.invalidationId,
    request_key:args.requestKey,
    event_type:args.plan.event_type,
    entity_type:args.plan.entity_type,
    entity_id:args.plan.entity_id,
    tags_json:args.plan.tags,
    paths_json:args.plan.paths,
    source_type:args.sourceType,
    source_ref:args.plan.source_ref,
    delivery_mode:args.mode,
    delivery_status:'accepted',
  });
  if(error) {
    if(error.code==='23505') throw new Error('STOREFRONT_INVALIDATION_REQUEST_KEY_CONFLICT');
    throw new Error('STOREFRONT_INVALIDATION_AUDIT_INSERT_FAILED');
  }
}

export async function markStorefrontInvalidationDelivered(invalidationId:string) {
  const {error}=await service()
    .from('feya_storefront_cache_invalidations_v1')
    .update({delivery_status:'delivered',delivered_at:new Date().toISOString(),error_code:null})
    .eq('invalidation_id',invalidationId)
    .eq('delivery_status','accepted');
  if(error) throw new Error('STOREFRONT_INVALIDATION_AUDIT_DELIVERY_UPDATE_FAILED');
}

export async function markStorefrontInvalidationFailed(invalidationId:string,errorCode:string) {
  const {error}=await service()
    .from('feya_storefront_cache_invalidations_v1')
    .update({delivery_status:'failed',delivered_at:new Date().toISOString(),error_code:errorCode.slice(0,120)})
    .eq('invalidation_id',invalidationId);
  if(error) console.warn('storefront_invalidation_audit_failure_update_failed');
}
