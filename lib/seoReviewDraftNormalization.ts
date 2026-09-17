// @ts-nocheck
import { normalizeSeoEditorialCandidate } from './seoEditorialCandidateSelection.ts';

// Photograph-reviewed differences keep these two new pages distinguishable
// from existing color + Primary titles. Never transfer a reviewed title to
// another product or a later keyword decision with a different Primary.
const REVIEWED_DISTINCT_IDENTITIES = {
  '82d2dc58-e635-4bc1-8571-2587641e627f': {
    primary: 'stage outfit', event: 'stage', color: 'red',
    title: 'Red Stage Outfit with Studded Details',
  },
  '6a885710-fbee-4790-ba09-d56530f641f6': {
    primary: 'silver outfit', event: 'festival', color: 'silver',
    title: 'Silver Outfit with Spine and Tail for Festivals',
  },
};

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

  const normalized = normalizeSeoEditorialCandidate(output, {
    primary_keyword: primary,
    selected_events: focusValues(seoPackDraft?.manual_focus?.event),
    selected_styles: focusValues(seoPackDraft?.manual_focus?.style),
    selected_materials: focusValues(seoPackDraft?.manual_focus?.material),
    included_components: seoPackDraft?.product_truth?.included_components,
    product_color: seoPackDraft?.product_truth?.color,
  });
  const identity = REVIEWED_DISTINCT_IDENTITIES[seoPackDraft?.product_truth?.canonical_product_id];
  if (!identity || !normalized || typeof normalized !== 'object'
    || String(primary || '').toLowerCase() !== identity.primary
    || String(seoPackDraft?.product_truth?.color || '').toLowerCase() !== identity.color
    || !focusValues(seoPackDraft?.manual_focus?.event).includes(identity.event)) return normalized;
  const note = 'Reviewed product identity retains a photograph-verified distinguishing detail alongside the current Primary. Standard truth, keyword and commercial validators still apply.';
  return {
    ...normalized,
    seo_title: identity.title,
    h1: identity.title,
    generation_notes: [
      ...(Array.isArray(normalized.generation_notes) ? normalized.generation_notes : [])
        .filter((value) => value !== note && !String(value).startsWith('Deterministic identity normalization used')),
      note,
    ],
  };
}
