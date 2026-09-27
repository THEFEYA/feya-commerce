import 'server-only';
import { getSupabaseAuthServerClient, isAdminAuthRequired } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';
import { getSupabaseServiceClient } from '@/lib/supabase';

/** Fresh Auth lookup and existing allowlist; no actor/approval field is accepted from request JSON. */
export function isVariantDraftEnabled() {
  return isAdminAuthRequired() && process.env.FEYA_PRODUCT_VARIANT_DRAFT_ENABLED === 'true';
}
export async function requireVariantDraftActor() {
  if (!isVariantDraftEnabled())
    return { ok: false as const, status: 423, code: 'variant_draft_disabled' };
  const auth = await getSupabaseAuthServerClient();
  if (!auth) return { ok: false as const, status: 503, code: 'variant_auth_unavailable' };
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return { ok: false as const, status: 401, code: 'authentication_required' };
  if (!adminAccessDecision({ id: data.user.id, email: data.user.email }, process.env).allowed)
    return { ok: false as const, status: 403, code: 'admin_not_allowed' };
  const client = getSupabaseServiceClient();
  if (!client) return { ok: false as const, status: 503, code: 'variant_storage_unavailable' };
  return { ok: true as const, actorId: data.user.id, client };
}
