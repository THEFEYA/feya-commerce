# TheFEYA — Phase13 P1 Home/Shop fast source cutover

**Owner approved V13 styling and 207 products are frozen.** This narrow code change only switches the server-side approved card VIEW constant, after additive PR #125.

## Source evidence (2026-10-12)
- SQL definitions of old `feya_storefront_product_cards_v1` and new `feya_storefront_product_cards_fast_v2` were compared bytewise after normalizing the single join relation name; **the sole difference is the existence/slug JOIN**: legacy v4 -> `feya_storefront_collection_cards_fast_v1`.
- Both yield **207 unique, complete cards**, with exact pinned `card_title`, `card_display_price_amount`, images, colors, membership, facet and owner source SHA; no Product Truth or amounts rewritten.
- The installed view uses `security_invoker=true`, SELECT allowed only for `service_role`, denied for `anon` and `authenticated`.
- New 207-row read `EXPLAIN ANALYZE`: **276.869 ms** on production database. This is an isolated SQL sample, not a certified Core Web Vitals or total site speed improvement.
- Collections already read from the separately validated fast collection source (PR #124); Home and Shop continue to share one persisted approved 207-row cache (PR #122).

## Deploy gates
1. Exact-head CI **19/19**, Vercel READY.
2. Public / and /shop still show approved 207-card corpus and responsive V13 style; unchanged pinned product identity/titles/prices and selected-card images.
3. /shipping Seller-Online LLC only there; public /contact and global Footer unchanged; payment stays OFF.
4. Exactly 18 active Search v12 sitemap URLs, canonical/indexable collections, 207 PDPs noindex; no new SEO owners.
5. The separate future release for full owner-approved 4-block SEO descriptions and PDP left/right arrangement remains independent. This P1 change does not alter `ProductDetailClient`, the pinned draft manifest or the public content publication gate.

If any gate fails, leave production on old source until fixed. P1 can only be closed after postflight Vercel DB timeouts and p75 measurements.
