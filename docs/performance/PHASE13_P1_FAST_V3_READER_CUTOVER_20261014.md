# Phase13 P1 — Fast V3 approved 207-card public reader cutover
Date: 2026-10-14. Prerequisite SQL [Fast V3](./PHASE13_P1_PINNED_CARD_FAST_V3_20261014.md) was installed through the official Supabase migration tool **after** exact-head 19/19 CI; this PR only switches the service-only source to the preinstalled validated view.

## Live Supabase proof
- 207 rows in V3, 207 distinct product IDs, zero missing required fields, zero to_jsonb difference **both directions** versus the owner-approved V2, all 41 output columns/types identical.
- V3 PostgreSQL view `security_invoker=true`, SELECT permitted only to `service_role`; `anon`, `authenticated` and PUBLIC deny.
- ACTIVE Search v12 remains 18 intended-index / 210 intended-noindex; no SEO content, product-copy authorizations, merchant/price or checkout changes.
- Measured read-only SQL individual runs: original V2 272–370ms, proposed V3 97–101ms, one V3 run 325ms during other load. These are variable **database SQL** samples; no false claim of end-user LCP/p75 gain. Cached Home/Shop consumers still share existing Next `use cache` / same tags and invalidation.

## Scope
1. A **single** string constant in `lib/storefrontCardReadModelServer.ts` changes from `feya_storefront_product_cards_fast_v2` to `..._v3`; 207-row/hash/owner/slug/facet checks, source failure/slow telemetry, product cards, prices and UI props are unchanged.
2. Search contract tests updated. Local Auth/PostgREST runtime originally seeds synthetic 207 pinned cards without real assortment/price tables. It therefore creates a test-only service-role-restricted V3 view aliased to the same validated V2 fixture shape. This **does not mock or substitute production** V3; actual migration + live 207/207 to_jsonb proof and CI SQL static contract cover production view.
3. Add permanent **whole-stream HTML** Shop smoke to `Phase 12 production origin crawl`: independent full SSR checks for root, page 2, Gold and Skirt, real rendered `product-card` markup and hidden `NEXT_HTTP_ERROR_FALLBACK;404` detection. On PR this is advisory (Production is on old main), on post-merge main it is strict. Report archived with origin crawl evidence.
4. No visual/DNA/menu/collection/SEO landing/PDP text/variant/delivery/legal, offer or Seller Online changes. Read model V2 remains installed and is the one-line code rollback target.

## Quality gates
- FEYA validation **19/19** exact-head includes native PostgreSQL, browser/PostgREST + real site Search v12 origin crawl; Vercel Preview READY.
- No public direct real Shop release claim from Preview alone; after merge check exact Production SHA and `/shop` full streamed SSR on main CI, Vercel new `feya_catalog_source_read_v1` latency/error, and source notFound diagnostics.
- If any Shop valid URL returns hidden error, empty catalog, a pricing difference or source count mismatch, **immediately restore V2 constant in a new bounded rollback PR** and re-run full validation before promoting. Do not weaken protection flags or prices.
- Before calling P1 closed: compare several days of production SQL tail and field CWV p75; legitimate Shopify/GA4/GSC data not yet verified, no fabricated scores.
