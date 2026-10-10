# TheFEYA — ONE owner visual review origin, 10 October 2026

## Purpose

Owner asked to review all visual/checkout changes before Seller Online online payments. Prior merged, fully tested PRs #109–#113 created separately protected feature-preview branches for exact SEO copy, larger collections and the actual PDP-selected bag. Browser shopping-bag localStorage is origin-specific, so moving between different Vercel preview URLs silently loses the owner's selected basket — bad UX and a false checkout test. This PR puts **the existing approved preview features on ONE exact SSO-protected branch** without opening any customer-facing purchase path.

## Source re-use; NO rewrites

- `/owner-review`: small private checklist, links to five real pinned example product URLs (not sample images/prices), integrated `/cart`, owner-approved "before/after" PDP source, `/collections-review`, `/shipping-review`, `/contact-review`, optional already-built static `/checkout-review`. All on SAME owner Preview hostname.
- Existing product `/shop/[slug]` on this **specific Preview** loads exact 207 original SEO drafts by immutable product, draft, status, timestamp and SHA. One suppressed duplicate remains forbidden. Frozen original `ProductDetailClient`, right-hand price/configuration/gallery/photos/buttons and noindex keep original production behavior. Owner's physical-piece list uses the reviewed purely presentational marker, not a SKU/offer edit. Real PDP Add to bag persists `feya_visual_cart_v1` only in the owner's own browser; same-origin `/cart` sees the variants and quantity.
- `/cart`: reuse the genuine variant/color/size/qty/order-level FEYA €19 Standard, €35 Express and €5 for each DISTINCT extra listing. Same-product size/color variants produce NO €5 handling or visible line; 2 different canonical product IDs show €5, 3 show €10. Address/name/email/phone/notes are owner visualization only and **not transmitted/stored** in browser persistent storage. Independent terms checkbox + unchecked newsletter; order/pay button remains DISABLED. This is NOT server-validated price, tax, courier route, Seller Online authorization, invoice or a legal consumer payment.
- `/collections-review`: existing 10 owner-approved destinations/images/counts in a 4-column larger-card design. Original live `/collections` and active Search v12 remain frozen.
- `/contact-review`, `/shipping-review`: already merged safe owner proposals. Original indexed `/contact` and `/shipping` remain unchanged.
- `/pdp-copy-review`: original five fixed approved texts (before/after); existing immutable SHA gate remains. Only owner review uses original + grouped-members physical checklist.

## Security release gating

- New pure `isOwnerUnifiedStorefrontPreview` requires `VERCEL=1`, `VERCEL_ENV=preview`, exact FEYA Vercel project, exact Git branch `work/owner-unified-storefront-review-20261010`, `FEYA_OWNER_PREVIEW_DISABLED!==true`. Vercel project currently has **SSO Protection enabled for ALL deployments except custom domains**. This new branch preview uses Vercel's protected `.vercel.app` hostname, never the public custom domain.
- Every previously owner-branch-only module accepts precisely its original reviewed SSO branch OR the additional unified branch, keeping every previous test; no generic preview wildcard can enable real cart or approved-copy public access.
- `PHASE13_PRODUCTION_PUBLISH_AUTHORIZED=false` stays Git-owned false. Both production environment release keys remain OFF by default. **NO new production SEO copy activation** and no change to Product Truth, public indexability, current Shop gallery/selection/price, M2 payments/merchant logic.
- Homepage/nav/Cart public route remains byte-identical and the new `/owner-review` returns 404 everywhere outside one exact SSO Preview.
- CI requires **exact-head 19/19** native PG, Next TypeScript/build, origin crawler and Supabase Auth/browser. Vercel Preview must be READY. Do not merge to production unless default gates are demonstrably OFF. No publication of visually modified public `/collections`, `/shipping`, `/contact` before owner sign-off.

## Owner action for sign-off

1. Open this branch's protected `/owner-review` while signed into Vercel. Test two genuinely different products in same hostname and their variants, update qty, confirm conditional €5 and €19/€35; no money is payable and illustrative prices are not authoritative.
2. Inspect original approved 4-block PDP descriptions and their separate physical included pieces; check left-only presentation.
3. Check collections 4-up cards, H1 font size, contact support and muted payment partner, and shipping explanations.
4. Approve visible adjustments one grouped release at a time. Only then separately publish visual changes to public site with existing Search v12 versioning. Seller Online API v2 requires provider activation/KYC/real contracting trader, tax and actual destination proof before order payment.

## Main MASTER after this slice

- First working *guest paid checkout*: capture validated owner-approved real shopping bag, server money/destination/tax, policy acceptance, payment API session + verified idempotent webhook and receipt. Current owner Preview is not the real server checkout.
- Public original 207 approved product texts: separate gated Phase13 activation after exact current SHA checks and real preview/TTFB measurement; not altered by this PR.
- Public collection/contact/shipping typography and content only after owner approves one integrated preview; no broad SEO re-generation.
- Optional social account URLs, Google Maps, measured parcel/ETA analytics and upsells deferred if they would block first order.
