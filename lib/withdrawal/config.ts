import 'server-only';

type Environment = Record<string, string | undefined>;

/** Public OAuth client ID printed by the owner's private Apps Script installation. */
export function withdrawalWorkerAudience(env: Environment = process.env): string | null {
  const audience = env.FEYA_WITHDRAWAL_GOOGLE_AUDIENCE;
  return audience && /^[a-z0-9][a-z0-9._-]{3,179}$/i.test(audience) ? audience : null;
}

/** An operator enables this only after a received mailbox test, a running timer and staffed review. */
export function withdrawalEnabled(env: Environment = process.env): boolean {
  return env.FEYA_WITHDRAWAL_LIVE === 'true' && Boolean(withdrawalWorkerAudience(env))
    && Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
