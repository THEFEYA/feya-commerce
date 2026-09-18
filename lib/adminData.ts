import { getSupabaseReadClient } from '@/lib/supabase';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

export function getAdminReadClient() {
  if (isAdminAuthRequired()) {
    return getSupabaseServiceRoleClient();
  }

  return getSupabaseReadClient();
}

export function getMissingAdminDataEnvMessage() {
  if (isAdminAuthRequired()) {
    return 'FEYA Admin auth is enabled, but SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing for protected server-side admin reads.';
  }

  return 'Supabase read-only environment variables are missing for the current admin preview.';
}
