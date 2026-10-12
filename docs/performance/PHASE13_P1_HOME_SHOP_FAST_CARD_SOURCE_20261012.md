# Phase13 P1 — exact Home/Shop approved card read model candidate
Date 2026-10-12. Derived from the existing production SQL definition via pg_get_viewdef.

The approved source for Home/Shop is NOT the collection legacy v4 storefront:
- Existing Home/Shop `feya_storefront_product_cards_v1` shows owner-approved PINNED snapshot card title and display amount, facets, linked category membership, photo. v4 live serves different titles on 207 products and four effective prices differ from the historic pinned display amount; those must not be substituted in Home/Shop.
- Existing view uses legacy v4 only to check that an approved product is still present with the matching current slug. It forces ~5 second v4 cost during cold cache refresh.
- This additive candidate copies the existing view SELECT verbatim and swaps ONLY the v4 existence join for service-only `feya_storefront_collection_cards_fast_v1`, whose 207 identities, current approved draft bindings and the original slug are already validated.
- This view retains the source approval, content hashes, product visibility checks, facet/meta/membership, the original pinned titles, pinned euro display amounts, images and classifications byte-for-byte. It does not touch Product Truth, buyer variant prices, original SEO PDP blocks or individual product options.
- No frontend/source switch in this PR. After green native CI, install candidate separately with Supabase migration action, check 207 count + ACL + field-by-field legacy v1 parity including title, price, thumbnail, facet mapping and member codes. Benchmark bounded query; only then create a separate exact reader cutover PR with Search v12 18 URLs, 207 PDP noindex and V13 visual gates.
- The current collection fast view cutover (PR #124) remains separate. It serves legacy-v4-equivalent collection titles/prices, while Home/Shop retain the sealed pinned approved presentation.
No paid Vercel remote-cache, Seller Online, M2, GSC, or SEO-copy release flags changed.
