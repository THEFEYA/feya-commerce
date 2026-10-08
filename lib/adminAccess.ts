/** One allowlist rule for middleware and login; never consumes editable user_metadata. */
export function adminAuthConfiguration(env:Record<string,string|undefined>) {
  const hasCsv=(name:string)=>Boolean(env[name]?.split(',').some(s=>s.trim()));
  return {
    required:env.FEYA_ADMIN_AUTH_REQUIRED==='true',
    loginEnabled:env.FEYA_ADMIN_AUTH_REQUIRED==='true'||env.FEYA_OWNER_ACTION_AUTH_REQUIRED==='true',
    supabaseUrlConfigured:Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    publicKeyConfigured:Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    allowlistConfigured:hasCsv('FEYA_ADMIN_ALLOWED_USER_IDS')||hasCsv('FEYA_ADMIN_ALLOWED_EMAILS'),
  };
}

export function adminLoginConfigurationReady(config:ReturnType<typeof adminAuthConfiguration>) {
  return config.loginEnabled&&config.supabaseUrlConfigured&&config.publicKeyConfigured&&config.allowlistConfigured;
}

export function adminAccessDecision(subject:{id?:unknown;email?:unknown},env:Record<string,string|undefined>) {
  const list=(name:string)=>new Set((env[name]||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  const ids=list('FEYA_ADMIN_ALLOWED_USER_IDS'),emails=list('FEYA_ADMIN_ALLOWED_EMAILS');
  const configured=ids.size>0||emails.size>0;
  const id=typeof subject.id==='string'?subject.id.toLowerCase():'';
  const email=typeof subject.email==='string'?subject.email.toLowerCase():'';
  return {configured,allowed:configured&&(ids.has(id)||emails.has(email))};
}
