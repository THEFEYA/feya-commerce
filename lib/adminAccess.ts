/** One allowlist rule for middleware and login; never consumes editable user_metadata. */
export function adminAccessDecision(subject:{id?:unknown;email?:unknown},env:Record<string,string|undefined>) {
  const list=(name:string)=>new Set((env[name]||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  const ids=list('FEYA_ADMIN_ALLOWED_USER_IDS'),emails=list('FEYA_ADMIN_ALLOWED_EMAILS');
  const configured=ids.size>0||emails.size>0;
  const id=typeof subject.id==='string'?subject.id.toLowerCase():'';
  const email=typeof subject.email==='string'?subject.email.toLowerCase():'';
  return {configured,allowed:configured&&(ids.has(id)||emails.has(email))};
}
