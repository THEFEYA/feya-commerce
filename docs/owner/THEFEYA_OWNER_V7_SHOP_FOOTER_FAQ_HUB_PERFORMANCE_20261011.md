# TheFEYA — owner visual V7, 11 Oct 2026

Execution: draft PR #115, exact SSO-protected Vercel visual branch work/owner-visual-commercial-review-v2-20261010. NO public merge/index/payments.

## Seven owner screenshots and concrete corrections

1. /shop Show 20 More had no Footer. Approved shop page is hash-frozen, so Preview-only app/template.tsx now renders OwnerShopFooterPreview on EXACT /shop pathname, and not on PDP, where Footer already exists.
2. /collections/festival-outfits Questions showed fully expanded answers and a huge gap before Footer. On exact protected Preview branch the common collections route now uses native accessible SSR HTML details/summary via OwnerCollectionFaqAccordion for ALL ten SEO collections. The original approved question and answer text is unchanged and remains in HTML. FAQ bottom padding shrinks from 64/96px to 16/24px only in Preview; public static question-and-answer layout remains frozen. Chevron is unframed, keyboard accessible. Expanded section does not guarantee ranking improvements merely from dwell time.
3. Events & Performance and Style catalogue stalls: read-only Supabase pg_stat_statements shows 1,676 major 207-card view SELECTs on public.feya_storefront_product_cards_v1, mean 5,103.9ms and max 7,178.7ms; these are aggregate SQL times, NOT browser TTFB. EXPLAIN demonstrates expensive joins and aggregates. Owner-only experimental readOwnerRemoteCatalogPreviewV1 uses Next16 use cache remote, cacheLife max, SAME site+catalog invalidation tags, only after request-gated closed-review status disabled. Any authenticated closed review uses original request-scoped validation path. Raw returned payload is exactly the approved 207-card reader. Remote cache may incur Vercel charges. Do not enable publicly without owner approval and verified invalidation/207-card parity.
4. Both hubs now present approved visual tiles before any catalog retrieval and use shared visible OwnerHubCatalogSkeleton while SSR catalog finishes; no 500px blank placeholder. Per-request timings are emitted as owner_hub_catalog_timing with elapsed_ms and product_count for future cold/warm measurement. On the new Vercel Preview browse once cold and once warm, inspect logs and database hit rate; don't invent seconds.
5. Shipping: restored left-aligned 3–5 days / EUR19 / EUR35 / 10–14 and 6–9 working-day labels, preserving sizes/color and all approved service descriptions.
6. Contact: social icons Instagram, Facebook and Pinterest moved below contact instructions within left support panel, removed duplicate bottom band below newsletter. Profiles remain nonclickable until actual owner URLs confirmed.
7. Contact operator: subdued Seller Online legal info in unboxed text (#817b74) and muted heading (#89837b), with required contact identity and Privacy/Terms links visible. Do not remove legal obligations.

## Safety, follow-up and CI gate

Preview-only, no public main/source pinned SEO/PDP/contracting seller, prices, merchant activation, cookies, tax or indexation change. Exact-head Vercel READY + all 19 CI checks + manual screenshot review required to mark complete.

Current approved Public Search Release v12 and 207 noindex PDP are unchanged. For true sustained subsecond cold-store catalog, evaluate a verified denormalized/materialized card read model preserving 207 canonical IDs, title/price/media/SEO pin/facets, with atomic invalidation/promotion and rollback BEFORE release. Unverified old product snapshots are not a valid substitute.

Official Next.js cache docs: https://nextjs.org/docs/app/api-reference/directives/use-cache and https://nextjs.org/docs/app/api-reference/directives/use-cache-remote . Existing app catalog cache is max lifetime in-process and site/catalog invalidation tagged.
