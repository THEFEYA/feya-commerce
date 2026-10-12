# TheFEYA — exact 207 approved PDP SEO descriptions on frozen V13 (STAGED)

Status: **DRAFT / NOT PUBLISHED** until a human-controlled Production env gate and CI/browser postflight are verified. All product text already exists in the approved source manifest; do not regenerate or rephrase it.

## Owner instruction
Preserve the four owner-approved English SEO text blocks in the **left PDP description**:
1. About this piece
2. Why you'll love it
3. Ideal for
4. Main description (as originally written and ordered).

The **right PDP information** (fit, materials, production, shipping, care/support) uses the existing `resolveThefeyaRightPdpPanel`. Do not modify its code, labels, visuals, prices, configuration options, variant selector or approved V13 desktop/mobile design. Separate components named individually in the left included-items list; the right configuration picker may group variants for convenience.

## Verified data contract (12 October 2026)
- Historical owner review manifest: 208 entries including one explicitly suppressed duplicate; exactly **207** active pins remain.
- Read-only production Supabase query: **207 approved drafts, 207 exact binding/draft_updated_at matches, 207 arrays with exactly FOUR pdp_blocks, 207 active product Pages**.
- Public production sample PDP was still showing a generic fallback string instead of the approved four-block original; protected V13 owner Preview of the same product showed the exact four-block text and approved H1. This is a publication-gate difference, **not a data loss**.
- Current `lib/seoPublishedPinnedPdpServer.ts` already checks the exact owner-reviewed SHA256, draft approval, current binding/page, URL and four blocks. `lib/seoApprovedStorefrontServer.ts` already injects its published copy into `ProductDetailClient`, and metadata uses the same pinned read. No body change necessary.
- Active Search Release v12 remains independently unchanged: 18 indexable URLs, all 207 PDPs continue **noindex** until their own future measured/indexation release.

## Owner-controlled release gate
The PR sets Git-side `PHASE13_PRODUCTION_PUBLISH_AUTHORIZED=true`, but **that is necessary, not sufficient**. `phase13PublicPdpCopyEnabled` additionally requires ALL:
- `VERCEL=1`, exact TheFEYA project ID, `VERCEL_ENV=production`;
- `FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE=phase13-owner-approved-pdp207-20261010-v1`;
- `FEYA_PUBLIC_APPROVED_PDP_OWNER_SIGNOFF=approved-2026-10-10`;
- exactly 207 current approved pins, 208 source rows and one suppressed duplicate, manifest version `approved-catalog-20260924-v1`.

**Operational permission blocker:** Vercel project env listing returned HTTP 403 for the connected account; not authorized to inspect/create the Production flags. Do not assume they are present. Owner/admin must confirm/create both on the precise project in Vercel Production and authorize redeploy. If absent, merging this PR alone leaves the fallback public text as before.

## Preview/release QA
- Exact protected Preview branch `work/phase13-pdp-public-copy-v13-20261012` displays pinned content without granting public indexation/payment; other Preview branches remain disabled.
- Confirm four approved text headings/bodies and included component list for sample single- and multi-part products (mobile 375/390/430 and desktop), approved H1 and the original right-panel blocks.
- Confirm prices/variants/colors unchanged, no payment activated, no shift in footer/Contact; Seller Online address only Shipping.
- Exact-head GitHub CI 19/19, Vercel READY, compare release metadata/canonicals/noindex and 18-indexable sitemap.
- Switch Git/owner env gates only at controlled release time; recheck site with no Vercel login. Rollback: remove Production flags or set Git authorization false; do not delete drafts or restore old copy generation.
