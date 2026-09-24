import 'server-only';
import { cache } from 'react';
import sourceJson from '@/docs/search/closed-review-source-manifest-20260924.json';
import binding from '@/config/closed-review-presentation-binding.json';
import { getAdminServiceClient } from '@/lib/adminServerData';
import { getSupabaseAuthServerClient } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';
import { isOwnerPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import { STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import type { ReviewRelease } from './searchReviewRelease';
import { assertReviewLiveSources, closedReviewMode, prepareReviewPresentation, type ReviewPresentation } from './searchReviewPresentation';

type Result = { status: 'disabled' | 'blocked'; release: null } | { status: 'review'; release: ReviewPresentation };
const blocked = (): Result => ({ status: 'blocked', release: null });
const DRAFT_SELECT = 'id,canonical_product_id,status,review_status,archived_at,updated_at,seo_title,h1,meta_description,intro,agent_output_snapshot';

/** React cache is request-scoped. No cross-user cache, public service reader or fallback.
 * Validate the actor before reading snapshots or issuing privileged catalog requests. */
export const readClosedReviewPresentation = cache(async (): Promise<Result> => {
  const mode = closedReviewMode(process.env, binding.release_id);
  if (mode === 'disabled') return { status: 'disabled', release: null };
  if (mode === 'blocked') return blocked();
  try {
    if (!isOwnerPreviewDeployment(process.env)) {
      const auth = await getSupabaseAuthServerClient();
      if (!auth) return blocked();
      const { data, error } = await auth.auth.getUser();
      if (error || !data.user || !adminAccessDecision(data.user, process.env).allowed) return blocked();
    }
    const client = getAdminServiceClient();
    if (!client) return blocked();
    const release = prepareReviewPresentation(sourceJson as unknown as ReviewRelease, binding.source_sha256);
    if (release.presentation_sha256 !== binding.presentation_sha256) return blocked();
    const drafts: Record<string, unknown>[] = [], pages: Record<string, unknown>[] = [];
    const products: Record<string, unknown>[] = [], productHolds: Record<string, unknown>[] = [];
    // Explicit bounded chunks avoid URL/server row limits and reject partial responses.
    for (let start = 0; start < release.entries.length; start += 70) {
      const chunk = release.entries.slice(start, start + 70);
      const productIds = chunk.map(e => e.identity.canonical_product_id);
      const results = await Promise.all([
        client.from('feya_commerce_seo_pack_drafts_v1').select(DRAFT_SELECT).in('id', chunk.map(e => e.identity.draft_id)),
        client.from('feya_commerce_seo_pages_v1').select('seo_page_id,canonical_product_id,url_path,page_type,portfolio_status,lifecycle_state').in('seo_page_id', chunk.map(e => e.identity.seo_page_id)),
        client.from(STOREFRONT_VIEW_V4).select('canonical_product_id,product_slug').in('canonical_product_id', productIds),
        client.from('feya_commerce_product_drafts').select('canonical_product_id,do_not_publish_flag').in('canonical_product_id', productIds),
      ]);
      if (results.some(r => r.error || !r.data || r.data.length !== chunk.length)) return blocked();
      drafts.push(...results[0].data!); pages.push(...results[1].data!);
      products.push(...results[2].data!); productHolds.push(...results[3].data!);
    }
    assertReviewLiveSources(release, { drafts, pages, products, productHolds });
    return { status: 'review', release };
  } catch { return blocked(); }
});
