import 'server-only';
import manifest from '@/config/approved-content-review-bindings.json';
import { getAdminServiceClient } from '@/lib/adminServerData';
import { approvedContentReviewMode, selectApprovedStorefrontCopy } from './seoApprovedStorefrontPolicy';
import { prepareApprovedContentProjection, type ApprovedCopyPayload } from './seoApprovedContentProjection';
import { isHybridVisualPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import type { ApprovedOfferSnapshot } from '@/lib/storefrontApprovedOfferProjection';

type Result =
  | { status: 'disabled' | 'blocked'; copy: null; offerSnapshot: null }
  | { status: 'review'; copy: ApprovedCopyPayload; offerSnapshot: ApprovedOfferSnapshot | null };
const DRAFT_SELECT = 'id,canonical_product_id,status,review_status,archived_at,updated_at,source_decision_id,seo_title,h1,meta_description,intro,manual_focus_snapshot,product_truth_snapshot,agent_output_snapshot';
const blocked = (): Result => ({ status: 'blocked', copy: null, offerSnapshot: null });

function approvedOfferSnapshot(draft: Record<string, any>): ApprovedOfferSnapshot | null {
  if (draft.status !== 'approved_draft' || draft.review_status !== 'approved' || draft.archived_at) return null;
  const manual = draft.manual_focus_snapshot && typeof draft.manual_focus_snapshot === 'object'
    ? draft.manual_focus_snapshot
    : {};
  const truth = draft.product_truth_snapshot && typeof draft.product_truth_snapshot === 'object'
    ? draft.product_truth_snapshot
    : {};
  const signature = typeof manual.sellable_offer_signature === 'string'
    ? manual.sellable_offer_signature
    : typeof truth.sellable_offer_signature === 'string'
      ? truth.sellable_offer_signature
      : null;
  const optional = Array.isArray(truth.optional_configurations) ? truth.optional_configurations : null;
  if (!signature && !optional?.length) return null;
  return {
    draft_id: String(draft.id || '') || null,
    source_decision_id: String(draft.source_decision_id || '') || null,
    sellable_offer_signature: signature,
    optional_configurations: optional,
  };
}

/** Caller memoizes the complete product presentation within this RSC request.
 * getAdminServiceClient authorizes EVERY fetch using current claims + owner allowlist.
 * There is no public service-role reader or shared cross-user data cache. */
export async function readApprovedStorefrontCopy(product: { canonical_product_id?: string | null; product_slug?: string | null }): Promise<Result> {
  const mode = approvedContentReviewMode(process.env, manifest.version);
  if (mode === 'disabled') return { status: 'disabled', copy: null, offerSnapshot: null };
  if (mode === 'blocked') return blocked();
  const matches = manifest.entries.filter(row => row.canonical_product_id === product.canonical_product_id
    && row.url_path === `/shop/${product.product_slug}`);
  if (matches.length !== 1) return blocked();
  const client = getAdminServiceClient();
  if (!client) return blocked();
  try {
    const hybridVisualPreview = isHybridVisualPreviewDeployment(process.env);
    const draftQuery = hybridVisualPreview
      ? client.from('feya_commerce_seo_pack_drafts_v1').select(DRAFT_SELECT)
          .eq('id', matches[0].draft_id)
          .eq('canonical_product_id', product.canonical_product_id!).maybeSingle()
      : client.from('feya_commerce_v_seo_pack_drafts_latest_v1').select(DRAFT_SELECT)
          .eq('canonical_product_id', product.canonical_product_id!).maybeSingle();
    const [draft, page] = await Promise.all([
      draftQuery,
      client.from('feya_commerce_seo_pages_v1').select('seo_page_id,canonical_product_id,url_path')
        .eq('canonical_product_id', product.canonical_product_id!).eq('page_type', 'product').maybeSingle(),
    ]);
    if (draft.error || page.error || !draft.data || !page.data) return blocked();
    const copy = selectApprovedStorefrontCopy({ product, draft: draft.data, page: page.data }, matches[0]);
    const offerSnapshot = approvedOfferSnapshot(draft.data);
    if (copy) return { status: 'review', copy, offerSnapshot };

    // The protected hybrid branch is an owner-review surface, not a release surface.
    // If an owner-approved draft was re-saved after the frozen manifest was cut,
    // project that latest approved snapshot here instead of silently falling back
    // to the legacy product description. Approval/status/path/shape checks still
    // come from prepareApprovedContentProjection; production remains manifest-pinned.
    if (!hybridVisualPreview) {
      const projection = prepareApprovedContentProjection({ product, draft: draft.data, page: page.data });
      if (projection.status === 'prepared' && projection.payload) {
        return { status: 'review', copy: projection.payload, offerSnapshot };
      }
    }
    return blocked();
  } catch { return blocked(); }
}
