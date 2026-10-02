import 'server-only';
import {getSupabaseServiceClient} from '@/lib/supabase';

export function isCommerceCheckoutSnapshotEnabled(){
  return process.env.FEYA_COMMERCE_CHECKOUT_SNAPSHOT_ENABLED==='true';
}

export function getCommerceCheckoutSnapshotServerClient(){
  if(!isCommerceCheckoutSnapshotEnabled())return{ok:false as const,status:423,code:'commerce_checkout_snapshot_disabled'};
  const client=getSupabaseServiceClient();
  if(!client)return{ok:false as const,status:503,code:'checkout_snapshot_storage_unavailable'};
  return{ok:true as const,client};
}
