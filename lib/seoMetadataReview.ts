/** Scoped editorial proposals. Never mutates an approved draft or grants release. */
import { approvedCopyHash, type ApprovedCopyPayload } from './seoApprovedContentProjection.ts';

export type MetadataReview = {
  canonical_product_id: string; seo_page_id: string; draft_id: string;
  source_content_sha256: string; url_path: string; status: string;
  current: { seo_title: string; h1: string }; proposed: Record<string, string>;
};
export function previewMetadataReview(payload: ApprovedCopyPayload, identity: {
  canonical_product_id: string; seo_page_id: string; draft_id: string;
}, review: MetadataReview): ApprovedCopyPayload {
  if (review.status !== 'proposed' || !Object.keys(review.proposed).length
    || Object.keys(review.proposed).some(k => !['seo_title', 'h1'].includes(k))
    || Object.values(review.proposed).some(v => typeof v !== 'string' || !v.trim())
    || review.canonical_product_id !== identity.canonical_product_id || review.seo_page_id !== identity.seo_page_id
    || review.draft_id !== identity.draft_id || review.url_path !== payload.metadata.canonical_path
    || review.source_content_sha256 !== approvedCopyHash(payload)
    || review.current.seo_title !== payload.metadata.title || review.current.h1 !== payload.draft.h1) {
    throw new Error('metadata_review_source_or_scope_mismatch');
  }
  return { metadata: { ...payload.metadata, title: review.proposed.seo_title ?? payload.metadata.title },
    draft: { ...structuredClone(payload.draft), h1: review.proposed.h1 ?? payload.draft.h1 } };
}
