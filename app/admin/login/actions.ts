'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMissingSupabaseAuthEnvMessage, getSupabaseAuthServerClient, isAdminAuthRequired } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const requestedNext = String(formData.get('next') || '').trim();
  const nextPath = requestedNext.startsWith('/admin') && !requestedNext.startsWith('/admin/login') ? requestedNext : '/admin';

  if (!email || !password) {
    redirect('/admin/login?error=missing_credentials');
  }

  const supabase = await getSupabaseAuthServerClient();
  if (!supabase) {
    redirect(`/admin/login?error=${encodeURIComponent(getMissingSupabaseAuthEnvMessage())}`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect('/admin/login?error=invalid_credentials');
  }

  if (isAdminAuthRequired() && (!data.user || !adminAccessDecision(data.user, process.env).allowed)) {
    await supabase.auth.signOut({ scope: 'local' });
    redirect('/admin/login?error=not_authorized');
  }

  revalidatePath('/admin', 'layout');
  redirect(nextPath);
}

export async function logoutAdmin() {
  const supabase = await getSupabaseAuthServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath('/admin', 'layout');
  redirect('/admin/login');
}
