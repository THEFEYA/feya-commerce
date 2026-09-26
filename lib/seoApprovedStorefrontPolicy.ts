import { prepareApprovedContentProjection, matchApprovedContentBinding } from './seoApprovedContentProjection.ts';

export type ApprovedReviewBinding = {
  canonical_product_id: string; seo_page_id: string; draft_id: string;
  draft_updated_at: string; content_sha256: string; url_path: string;
};
function versionTime(value: unknown) {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}(?::?\d{2})?)$/)?.[1] ?? '';
  if (!Number.isFinite(milliseconds) || fraction.length > 6) return null;
  return `${milliseconds}:${fraction.padEnd(6, '0').slice(3)}`;
}
export function approvedContentReviewMode(env: Record<string, string | undefined>, version: string) {
  const requested = env.FEYA_APPROVED_CONTENT_REVIEW;
  if (!requested || requested === 'off') return 'disabled' as const;
  if (requested !== version || !['preview', 'development'].includes(env.VERCEL_ENV ?? '')
    || env.FEYA_ADMIN_AUTH_REQUIRED !== 'true') return 'blocked' as const;
  return 'review' as const;
}

/** Only current approved text may enter the existing PDP props. Price/checkout/indexing
 * remain independent; the only supported active mode is authenticated review. */
export function selectApprovedStorefrontCopy(input: {
  product: Record<string, unknown>; page: Record<string, unknown>; draft: Record<string, unknown>;
}, binding: ApprovedReviewBinding) {
  const projection = prepareApprovedContentProjection(input);
  const observedTime = versionTime(input.draft.updated_at);
  const expectedTime = versionTime(binding.draft_updated_at);
  if (!expectedTime || observedTime !== expectedTime
    || !matchApprovedContentBinding(projection, binding)) return null;
  return projection.payload;
}
