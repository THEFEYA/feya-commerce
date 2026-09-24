import 'server-only';
import manifest from '@/config/approved-content-review-bindings.json';
import { getAdminServiceClient } from '@/lib/adminServerData';
import { approvedContentReviewMode, selectApprovedStorefrontCopy } from './seoApprovedStorefrontPolicy';
import type { ApprovedCopyPayload } from './seoApprovedContentProjection';

type Result = { status: 'disabled' | 'blocked'; copy: null } | { status: 'review'; copy: ApprovedCopyPayload };
const DRAFT_SELECT = 'id,canonical_product_id,status,review_status,archived_at,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot';
const blocked = (): Result => ({ status: 'blocked', copy: null });

/** Caller memoizes the complete product presentation within this RSC request.
 * getAdminServiceClient authorizes EVERY fetch using current claims + owner allowlist.
 * There is no public service-role reader or shared cross-user data cache. */
export async function readApprovedStorefrontCopy(product: { canonical_product_id?: string | null; product_slug?: string | null }): Promise<Result> {
  const mode = approvedContentReviewMode(process.env, manifest.version);
  if (mode === 'disabled') return { status: 'disabled', copy: null };
  if (mode === 'blocked') return blocked();
  const matches = manifest.entries.filter(row => row.canonical_product_id === product.canonical_product_id
    && row.url_path === `/shop/${product.product_slug}`);
  if (matches.length !== 1) return blocked();
  const client = getAdminServiceClient();
  if (!client) return blocked();
  try {
    const [draft, page] = await Promise.all([
      client.from('feya_commerce_v_seo_pack_drafts_latest_v1').select(DRAFT_SELECT)
        .eq('canonical_product_id', product.canonical_product_id!).maybeSingle(),
      client.from('feya_commerce_seo_pages_v1').select('seo_page_id,canonical_product_id,url_path')
        .eq('canonical_product_id', product.canonical_product_id!).eq('page_type', 'product').maybeSingle(),
    ]);
    if (draft.error || page.error || !draft.data || !page.data) return blocked();
    const copy = selectApprovedStorefrontCopy({ product, draft: draft.data, page: page.data }, matches[0]);
    return copy ? { status: 'review', copy } : blocked();
  } catch { return blocked(); }
}
