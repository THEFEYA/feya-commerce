/** Closed-review projection and live validity checks. No publication/commerce grant. */
import { assertReviewReleaseIntegrity, reviewHash, type ReviewRelease } from './searchReviewRelease.ts';
import { applyOwnerReviewedStorefrontCorrections } from './storefrontOwnerReviewedCorrections.ts';
import { selectApprovedStorefrontCopy } from './seoApprovedStorefrontPolicy.ts';
import { resolveThefeyaRightPdpPanel, THEFEYA_SEO_DOCTRINE_VERSION } from './thefeyaSeoDoctrine.ts';
import type { StorefrontProduct } from './types.ts';
import { isOwnerPreviewDeployment } from './ownerPreviewPolicy.ts';

type Row = Record<string, unknown>;
export type ReviewPresentation = ReturnType<typeof prepareReviewPresentation>;

export function closedReviewRequested(env: Record<string, string | undefined>) {
  return isOwnerPreviewDeployment(env) || Boolean(env.FEYA_CLOSED_REVIEW_RELEASE && env.FEYA_CLOSED_REVIEW_RELEASE !== 'off');
}

export function closedReviewMode(env: Record<string, string | undefined>, releaseId: string) {
  if (isOwnerPreviewDeployment(env)) {
    const requested = env.FEYA_CLOSED_REVIEW_RELEASE;
    return !requested || requested === 'off' || requested === releaseId ? 'review' as const : 'blocked' as const;
  }
  if (!closedReviewRequested(env)) return 'disabled' as const;
  if (env.FEYA_CLOSED_REVIEW_RELEASE !== releaseId || env.FEYA_ADMIN_AUTH_REQUIRED !== 'true'
    || !['preview', 'development'].includes(env.VERCEL_ENV ?? '')) return 'blocked' as const;
  return 'review' as const;
}

/** Same exact-ID corrections as the existing PDP. Approved prose is never regenerated. */
export function prepareReviewPresentation(source: ReviewRelease, trustedSourceHash: string) {
  assertReviewReleaseIntegrity(source, trustedSourceHash);
  const entries = source.entries.map(entry => {
    const product = applyOwnerReviewedStorefrontCorrections(structuredClone(entry.product));
    // Recorded owner-glossy-vegan-armor-20260924-03; historical substrates are not current options.
    if (product.canonical_product_id === 'a83b1b51-79be-4cae-a943-661060a34080') product.material = 'Glossy Vegan Leather';
    return {
      right_panel_sha256: reviewHash(resolveThefeyaRightPdpPanel({canonical_product_id: entry.identity.canonical_product_id})),
      identity: structuredClone(entry.identity), copy: structuredClone(entry.payload),
      product: { ...product, card_title: entry.payload.draft.h1, h1: entry.payload.draft.h1,
        seo_title: entry.payload.metadata.title, meta_description: entry.payload.metadata.description } as unknown as StorefrontProduct,
    };
  });
  const value = {
    contract_version: 'feya_closed_review_presentation_v1' as const,
    release_id: source.release_id, source_sha256: trustedSourceHash,
    correction_commit: source.correction_commit, doctrine_version: THEFEYA_SEO_DOCTRINE_VERSION, entries,
    can_publish: false as const, can_index: false as const, can_enable_checkout: false as const,
  };
  return { ...value, presentation_sha256: reviewHash(value) };
}

function uniqueRows(rows: Row[], key: string, expected: number) {
  if (rows.length !== expected) throw new Error('review_live_count_mismatch');
  const byId = new Map(rows.map(row => [row[key], row]));
  if (byId.size !== expected || byId.has(undefined) || byId.has(null)) throw new Error('review_live_identity_ambiguous');
  return byId;
}

/** Read exact draft IDs, never a "latest draft" view. New drafts do not replace a release.
 * Missing/archived/revoked/moved or directly edited source records close the entire release.
 * Live product contents do not overlay the snapshot; only identity/existence/hold is checked. */
export function assertReviewLiveSources(presentation: ReviewPresentation, live: {
  drafts: Row[]; pages: Row[]; products: Row[]; productHolds: Row[];
}) {
  const count = presentation.entries.length;
  const drafts = uniqueRows(live.drafts, 'id', count);
  const pages = uniqueRows(live.pages, 'seo_page_id', count);
  const products = uniqueRows(live.products, 'canonical_product_id', count);
  const holds = uniqueRows(live.productHolds, 'canonical_product_id', count);
  for (const entry of presentation.entries) {
    const { identity, product, copy } = entry;
    const draft = drafts.get(identity.draft_id), page = pages.get(identity.seo_page_id);
    const source = products.get(identity.canonical_product_id), hold = holds.get(identity.canonical_product_id);
    if (!draft || !page || !source || !hold || hold.do_not_publish_flag === true
      || source.product_slug !== product.product_slug || page.portfolio_status !== 'active'
      || page.page_type !== 'product' || ['retired','archived','deleted'].includes(String(page.lifecycle_state))) throw new Error('review_source_unavailable');
    const current = selectApprovedStorefrontCopy({ product: source, page, draft }, {
      ...identity, url_path: copy.metadata.canonical_path,
    });
    if (!current) throw new Error('review_pinned_approval_changed');
  }
  return true;
}
