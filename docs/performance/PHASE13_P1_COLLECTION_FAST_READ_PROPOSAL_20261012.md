# TheFEYA — Phase 13 P1 — bounded collection read-model candidate

**Status:** Additive model PR only; no public route switched. Owner-approved V13 and ACTIVE Search Release v12 remain immutable.

## Verified before this migration
- Live Vercel reported collection SQL timeouts; the legacy `feya_commerce_v_step7_storefront_products_api_v4` depends on v3 image and configuration recomputation.
- Read-only PostgreSQL `EXPLAIN ANALYZE` for one ID through v4: **5,637.69 ms** execution and 70 plan nodes. The v2 source for one ID: **348.926 ms**. A prototype full 207-row candidate using pinned snapshots, v2, and a narrowly-scoped Full Set price aggregator: **291.715 ms** execution (separate warmed query; not a guaranteed production p75).
- v2 core title, H1, SEO title, description, part, material, color, profile, min/max price and currency: **207/207 exact matches** to v4 for the approved corpus.
- Pinned snapshot primary/secondary/hover images, alt, media count/video, category, world and color fields: **207/207 exact matches** to v4.
- The focused Full Set regex over current `feya_commerce_configuration_prices` and original source option labels returned **207/207 exact matches** to v4 `full_set_display_price_amount`, including 12 NULL Full Set rows and 4 genuinely different effective prices from the historical pinned card display-price snapshot. Price changes must never be inferred from the old snapshot.
- All these are read-only evidence; none indicates that paid checkout/merchant identity is ready.

## Data policy
The new `feya_storefront_collection_cards_fast_v1` view retains the exact approved binding identity, approval date/source hash, active Page and unpublished flags. It reads v2 original product metadata and the original option-price rows; returns only *presentation* fields, not purchaser information or an offer quote.

Use of `security_invoker=true` plus SELECT grant to service_role only prevents anonymous/authenticated public reads. No old migration, Product Truth, payment quote, API credentials, shipping or indexing flags are edited.

## Pre-release gate
1. CI 19/19 with native PostgreSQL 17 running all migrations, strict exact 207 count and service-role-only access test.
2. Install the additive view on the correct Supabase project only after CI (verify no unrelated schema/source changes).
3. One read-only full-field parity comparison between the new view and currently served v4 for **207/207 rows**, plus source hashing, NULL price fallback and relevant approved collection memberships. Both missing and duplicate identities are hard stops.
4. Read model `EXPLAIN ANALYZE` once using bounded 207 row query; confirm improvement without increased Vercel remote-cache costs.
5. **Separate PR** to select this view only for public collection cards with the exact needed field list, keep the existing immutable membership sequence and facet snapshots; after CI validate original ten collections, 18-URL sitemap, 207 PDP noindex, price, titles, responsive card crops, Shipping/Contact and checkout OFF.
6. If any check fails, leave the legacy v4 reader running and investigate. Do not promote the view as a new payable quote or public Google indexed landing.

## Tracked issue
[Phase13 P1 #119](https://github.com/THEFEYA/feya-commerce/issues/119). The Home/Shop shared cache and null-title protection are independently shipped via PR #121/#122.
