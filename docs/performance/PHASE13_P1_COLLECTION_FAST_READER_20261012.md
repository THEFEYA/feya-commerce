# TheFEYA — Phase13 P1 collection-only fast read — release review

Depends on merged PR #123 and installed, service-only Supabase
`feya_storefront_collection_cards_fast_v1` in project `ysnizcgzhdwdfdkjkhud`.

## Production source proof
- Exactly **207** unique records, zero invalid required fields.
- `anon` SELECT false; `authenticated` SELECT false; `service_role` SELECT true; `security_invoker=true`.
- Source vs pinned approved media/facet snapshot: **207/207 exact**. Source title, H1, description, product types, existing live price bands and production facts vs v2: **207/207 exact**.
- Focused Full Set expression vs legacy v4: **207/207** in separately scoped read-only checks; 12 missing Full Set prices and the four historical snapshot differences are preserved. No price was invented, edited or derived from a past pinned amount.
- Read-only fresh 207-row SQL `EXPLAIN ANALYZE` on the installed view: **427.386 ms**, vs earlier measured old v4 single-product **5637.69 ms**. Different query scopes; final route p75 / SQL 5s timeout reduction needs production measurement.
- Direct live join of old v4 + fast source timed out in the database, so compare actual approved collection card HTML in protected Preview against current Production to detect any visible copy/price/media/order drift.

## Code scope
Switch the internal product row source in `lib/searchLandingPageServer.ts` to an explicit service-only fast view and select only public card fields. All release/membership/hash/active-page/locale checks and sorting remain unchanged. The existing `attachStorefrontFacets` still resolves exactly pinned facets. No changes to Product Truth, 207 PDP noindex, homepage/Shop pinned card model, right-side purchase options, V13 CSS, Seller Online notice, shipping, M2 or GA4.

## Required CI and owner release
1. Exact-head FEYA 19/19 + Vercel READY.
2. Anonymous Preview 200 for representative collections and correct canonical/robots in Production.
3. Compare visible product-card slugs, titles, prices and media for multiple nonempty owner collections in protected preview vs current origin; fail on any unexpected difference.
4. After approval/merge, verify 18 sitemap URLs, all original collection counts, 207 PDP noindex, Cart payment OFF, Seller Online address only Shipping and zero 403 data leaks.
5. Check fresh Vercel grouped runtime errors after release. A lower execution time observed on an isolated SQL query is not a guarantee of end-user conversion/CWV improvement.
