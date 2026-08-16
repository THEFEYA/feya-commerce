// @ts-nocheck
import { normalizeSeoEditorialCandidate } from '@/lib/seoEditorialCandidateSelection';

function focusValues(value: unknown): string[] {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

/**
 * Reapply the zero-token editorial pipeline to a generated review draft using
 * the current SEO decision and Product Truth. Both the save route and the
 * explicit saved-draft resave preview must use this helper so the operator
 * sees exactly the copy that will be validated and stored.
 */
export function normalizeReviewDraftForSeoPack<T>(output: T, seoPackDraft: Record<string, any>): T {
  const primary = seoPackDraft?.keyword_roles?.primary?.[0]?.keyword
    || seoPackDraft?.keyword_roles?.primary?.[0]?.keyword_norm
    || null;

  return normalizeSeoEditorialCandidate(output, {
    primary_keyword: primary,
    selected_events: focusValues(seoPackDraft?.manual_focus?.event),
    selected_styles: focusValues(seoPackDraft?.manual_focus?.style),
    selected_materials: focusValues(seoPackDraft?.manual_focus?.material),
    included_components: seoPackDraft?.product_truth?.included_components,
    product_color: seoPackDraft?.product_truth?.color,
  });
}
