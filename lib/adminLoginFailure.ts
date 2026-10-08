/** Public login errors are intentionally non-sensitive, but distinguish an
 * unconfirmed email from a failed password and infrastructure/rate failures.
 * No details, emails, tokens, or raw Supabase messages go into URLs. */
export type AdminLoginFailure = 'email_not_confirmed' | 'invalid_credentials'
  | 'auth_rate_limited' | 'auth_temporarily_unavailable';

export function classifyAdminLoginFailure(error: { code?: string; status?: number }): AdminLoginFailure {
  if (error.code === 'email_not_confirmed') return 'email_not_confirmed';
  if (error.status === 429 || error.code === 'over_request_rate_limit'
    || error.code === 'too_many_requests') return 'auth_rate_limited';
  if (error.code === 'invalid_credentials') return 'invalid_credentials';
  return 'auth_temporarily_unavailable';
}
