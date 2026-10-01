# TheFEYA Storefront Performance — Live Snapshot Reconciliation

Status: READ-ONLY BASELINE / NO INDEXATION CHANGE  
Captured: 2026-09-30  
Implementation base: `design/hybrid-visual-integration-20260928` @ `b2495893e02c4d72118ed7a3023a3cb572ceed18`

## Purpose

This checkpoint reconciles the live GitHub/Vercel/Supabase state before storefront performance work. It does not change Product Truth, Product DNA, public taxonomy, visual design, SEO ownership, indexation, checkout, or payment state.

## Canonical storefront scope

- Raw storefront API v4 rows: **243**
- Raw storefront API v5 rows: **243**
- Raw storefront API v6 rows: **243**
- Raw fast-media rows: **243**
- Latest approved facet snapshot: `feya-n7-20260928-v3`
- Facet snapshot source release: `feya-review-207-20260924`
- Approved visible product count: **207**
- Closed-review source count: **208**
- Suppressed duplicate: `d42dd678-7b11-4f38-890e-411de686f418`
- Latest Organic Wave A product dependencies: **207**
- Active Search Release count: **0**

### Why 243 must not become the public performance cache

The 243-row storefront views are a broader live candidate surface, not the approved release corpus.

The 36 raw products outside the 207-product release break down as:

- 19: no SEO pack draft;
- 16: generated draft, not reviewed;
- 1: approved draft but deliberately suppressed as the known duplicate above.

Therefore the performance read model must preserve the approved release/snapshot boundary and must not silently expose all rows from the raw storefront view.

## Search release state

Latest release: `organic-wave-a-20260926` v9.

- K08 PASS: 10 commercial landing owners retain validated ownership.
- K12 PASS: routes remain fail-closed to noindex unless an ACTIVE release permits indexation.
- K13 PASS: sitemap is sourced only from ACTIVE release items.
- K02 FAIL: `thefeya.com` is not yet bound to the current Vercel project.
- K14 FAIL: anonymous production-origin crawl is blocked by that domain state.
- K19 FAIL: Search Console Domain property is not yet verified/connected.
- K20 FAIL: exact release hash has not received Human Owner activation approval.

No performance task may bypass these gates.

## Confirmed current performance baseline

### Rendering/data

- `app/page.tsx`: `dynamic='force-dynamic'`, `revalidate=0`.
- `app/shop/page.tsx`: `dynamic='force-dynamic'`, `revalidate=0`.
- `app/collections/[slug]/page.tsx`: `dynamic='force-dynamic'`, `revalidate=0`.
- `app/shop/[slug]/page.tsx`: `dynamic='force-dynamic'`, `revalidate=0`.
- `/shop` may read up to 500 product rows.
- Card media is fetched in slug chunks of 35 and merged in application code.
- The complete product objects are passed into `ShopClient`.
- React `cache()` in the current shop loader is request-scoped and does not provide a persistent cross-request storefront cache.

### Images

- `next.config.ts` has `images.unoptimized = true`.
- Public product imagery currently uses remote Etsy image URLs.
- The current HTML can preload multiple full-size product images.
- Image optimization changes must preserve the frozen crops, dimensions and visual result.

### Runtime/platform

- Current relevant Vercel preview deployment executes in `iad1`.
- Supabase project region is `eu-west-1` (Ireland).
- The preview `/shop` request is serverless and observed as a cache MISS.
- The current public response is explicitly non-cacheable/private in preview.

## First reversible platform correction

This performance branch pins Vercel Functions to `dub1`, the Vercel Dublin region, so database-bound cache misses execute near Supabase `eu-west-1`.

This is a transport-only change. It must be validated on the preview deployment before any caching or data-layer swap.

## Next gates

1. Confirm preview build/CI remains green and visual contracts remain unchanged.
2. Confirm the preview deployment actually reports `dub1`.
3. Build an additive slim approved-corpus product-card read model; do not switch runtime reads yet.
4. Compare its 207 IDs and rendered-card fields against the sealed review presentation.
5. Only after parity passes, prepare invalidation plumbing.
6. Do not enable persistent public caching until invalidation is proven.
