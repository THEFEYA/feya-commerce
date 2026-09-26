type Environment = Record<string, string | undefined>;

export function inspectSearchEnvironment(env: Environment) {
  const reasons: string[] = [];
  if (env.FEYA_CLOSED_REVIEW_RELEASE && env.FEYA_CLOSED_REVIEW_RELEASE !== 'off') reasons.push('closed_review_release');
  if (env.FEYA_SEARCH_INDEXING_ENABLED !== 'true') reasons.push('global_switch_off');
  if (env.VERCEL_ENV !== 'production') reasons.push('not_production_deployment');
  if (env.FEYA_CANONICAL_ORIGIN_CONFIRMED !== 'true') reasons.push('canonical_origin_not_confirmed');
  let origin: string | null = null;
  try {
    if (!env.NEXT_PUBLIC_SITE_URL?.trim()) throw new Error('Missing origin');
    const url = new URL(env.NEXT_PUBLIC_SITE_URL.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') throw new Error('Not a canonical HTTPS origin');
    if (!url.hostname.includes('.') || url.hostname.endsWith('.vercel.app') || url.hostname === 'vercel.app' || url.hostname.endsWith('.localhost') || url.hostname === 'localhost' || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw new Error('Preview/local host');
    origin = url.origin;
  } catch {
    reasons.push('canonical_origin_invalid');
  }
  // Environment prerequisite only. Page/release gates remain separate.
  return { enabled: reasons.length === 0, origin, reason_codes: reasons };
}

