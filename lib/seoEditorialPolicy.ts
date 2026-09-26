/** Versioned editorial rules; an old stored approval is not silently reissued. */
export const CURRENT_SEO_EDITORIAL_POLICY = 'brand_mission_v2' as const;
export const LEGACY_SEO_EDITORIAL_POLICY = 'legacy_v1' as const;
export type SeoEditorialPolicyVersion = typeof CURRENT_SEO_EDITORIAL_POLICY | typeof LEGACY_SEO_EDITORIAL_POLICY;

export function resolveSeoEditorialPolicy(draft: unknown, requested?: unknown) {
  const record = draft && typeof draft === 'object' ? draft as Record<string, unknown> : {};
  const stored = record.editorial_policy_version;
  const known = (value: unknown): value is SeoEditorialPolicyVersion => value === CURRENT_SEO_EDITORIAL_POLICY || value === LEGACY_SEO_EDITORIAL_POLICY;
  const invalid = (stored != null && !known(stored)) || (requested != null && !known(requested));
  // A caller cannot downgrade a draft stamped by the current generation path.
  const version = requested === CURRENT_SEO_EDITORIAL_POLICY || stored === CURRENT_SEO_EDITORIAL_POLICY
    ? CURRENT_SEO_EDITORIAL_POLICY : LEGACY_SEO_EDITORIAL_POLICY;
  return { version, valid: !invalid };
}

export function stampCurrentSeoEditorialPolicy<T extends object>(draft: T): T & { editorial_policy_version: typeof CURRENT_SEO_EDITORIAL_POLICY } {
  return { ...draft, editorial_policy_version: CURRENT_SEO_EDITORIAL_POLICY };
}
