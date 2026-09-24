/** Server/offline preparation of exact approved copy for the existing PDP props.
 * This projection does not grant visibility, indexability or purchase rights. */
import { createHash } from 'node:crypto';
import { isCanonicalPagePath } from './searchPortfolioPolicy.ts';

type Row = Record<string, unknown>;
const record = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v : null;
const keys = ['about_this_piece', 'why_youll_love_it', 'ideal_for', 'main_description'];
export type ApprovedCopyPayload = {
  metadata: { title: string; description: string; canonical_path: string };
  draft: { h1: string; intro: string; meta_description: string;
    pdp_blocks: { block_key: string; placement: 'left_description'; heading: string; body: string }[] };
};
export const approvedCopyHash = (payload: ApprovedCopyPayload) => createHash('sha256').update(JSON.stringify(payload)).digest('hex');

export function prepareApprovedContentProjection(input: { product: Row; page: Row; draft: Row }) {
  const { product, page, draft } = input;
  const output = record(draft.agent_output_snapshot);
  const errors: string[] = [];
  const productId = text(product.canonical_product_id);
  if (!productId || draft.canonical_product_id !== productId || page.canonical_product_id !== productId) errors.push('product_identity_mismatch');
  if (!text(draft.id) || !text(page.seo_page_id)) errors.push('stable_identity_missing');
  if (draft.status !== 'approved_draft' || draft.review_status !== 'approved' || draft.archived_at) errors.push('current_copy_not_approved');
  if (!isCanonicalPagePath(page.url_path) || page.url_path !== `/shop/${product.product_slug}`) errors.push('canonical_path_mismatch');
  for (const field of ['seo_title', 'h1', 'meta_description', 'intro']) {
    if (!text(output[field])) errors.push(`missing_${field}`);
    if (draft[field] !== output[field]) errors.push(`stored_output_disagrees_${field}`);
  }
  const rawBlocks = Array.isArray(output.pdp_blocks) ? output.pdp_blocks.map(record) : [];
  if (rawBlocks.length !== keys.length || new Set(rawBlocks.map(b => b.block_key)).size !== keys.length
    || rawBlocks.some(b => !keys.includes(String(b.block_key)) || b.placement !== 'left_description' || !text(b.body) || !text(b.heading))) errors.push('description_shape_unsupported');
  // Retain original strings and order. The existing component controls visual order.
  const payload: ApprovedCopyPayload | null = errors.length ? null : {
    metadata: { title: output.seo_title as string, description: output.meta_description as string, canonical_path: page.url_path as string },
    draft: { h1: output.h1 as string, intro: output.intro as string, meta_description: output.meta_description as string,
      pdp_blocks: rawBlocks.map(b => ({ block_key: b.block_key as string, placement: 'left_description', heading: b.heading as string, body: b.body as string })) },
  };
  return {
    contract_version: 'approved_content_projection_v1' as const,
    status: payload ? 'prepared' as const : 'blocked' as const, errors,
    identity: { canonical_product_id: productId, seo_page_id: page.seo_page_id, draft_id: draft.id,
      draft_updated_at: draft.updated_at, content_sha256: payload ? approvedCopyHash(payload) : null },
    payload, can_publish: false as const, can_index: false as const, can_enable_checkout: false as const,
  };
}

/** Pins the payload used by metadata and PDP to the same immutable release entry.
 * Caller still needs the independent release/visibility/commerce authorization. */
export function matchApprovedContentBinding(projection: ReturnType<typeof prepareApprovedContentProjection>, expected: {
  canonical_product_id: string; seo_page_id: string; draft_id: string; content_sha256: string; url_path: string;
}) {
  const id = projection.identity;
  return projection.status === 'prepared' && projection.payload !== null
    && id.canonical_product_id === expected.canonical_product_id && id.seo_page_id === expected.seo_page_id
    && id.draft_id === expected.draft_id && id.content_sha256 === expected.content_sha256
    && approvedCopyHash(projection.payload) === expected.content_sha256
    && projection.payload.metadata.canonical_path === expected.url_path;
}
