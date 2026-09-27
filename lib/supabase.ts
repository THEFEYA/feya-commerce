import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getAdminServiceClient } from '@/lib/adminServerData';

export function getSupabaseReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getMissingSupabaseEnvMessage() {
  return 'Supabase env vars are not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.';
}


export function getSupabaseServiceClient() {
  return getAdminServiceClient();
}

export function getMissingSupabaseServiceEnvMessage() {
  return 'Supabase service env vars are not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server env.';
}
