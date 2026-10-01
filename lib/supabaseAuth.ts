import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function isAdminAuthRequired() {
  return process.env.FEYA_ADMIN_AUTH_REQUIRED === 'true';
}

function hasCsvValues(value: string | undefined) {
  return Boolean(value?.split(',').map((item) => item.trim()).filter(Boolean).length);
}

export function getAdminAuthConfigStatus() {
  return {
    required: isAdminAuthRequired(),
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    publicKeyConfigured: Boolean(getSupabasePublicKey()),
    allowlistConfigured:
      hasCsvValues(process.env.FEYA_ADMIN_ALLOWED_USER_IDS) ||
      hasCsvValues(process.env.FEYA_ADMIN_ALLOWED_EMAILS),
  };
}

export async function getSupabaseAuthServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getSupabasePublicKey();

  if (!supabaseUrl || !publicKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies.
          // middleware.ts refreshes and persists the session on admin requests.
        }
      },
    },
  });
}

export function getMissingSupabaseAuthEnvMessage() {
  return 'Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY).';
}
