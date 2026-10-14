# TheFEYA Phase13 P1 — pinned card reader V3 proposal, 2026-10-14

**Status:** additive SQL migration CANDIDATE, no live reader cutover. Safeguards: owner-approved V13 + exact original 207 Product Truth/pins and prices, 18 active Search v12 indexed owners / PDP noindex, no Seller Online/checkout enablement.

## Production evidence
- Vercel lhr1 13 October `/shop`: burst of SQLSTATE `57014`; Postgres `event_message='canceling statement due to statement timeout'`, PostgREST query to `feya_storefront_product_cards_fast_v2`; no loss of stored products.
- Current Fast v2 PostgREST `pg_stat_statements`: 312 successful recorded executions / mean 453.06 ms / max 3983.49 ms (historical point-in-time; excludes unknown canceled executions). One observed `EXPLAIN ANALYZE`: 272 ms, 16,801 shared buffer hits, 207 rows.
- `EXPLAIN` identifies a **41,238-row intermediate aggregation** from `feya_commerce_v_step7_storefront_cards` embedded under `feya_storefront_collection_cards_fast_v1`; Fast v2 needs only existence and slug from that source.
- Read-only 14 October SQL derived exact candidate `storefront_candidate_flag` semantics from original underlying view: readiness='ready_candidate', publish='draft', do_not_publish=false, publicly approved primary image, current non-sampler configuration and priced row, no missing-price row; original dynamic slug generated from current English content/card/legacy fallback. Original collection fast view returns 207 approved products; lightweight *eligible key* set returns 243 with all 207 original rows present and 36 additional candidates which are excluded by the unchanged **approved binding/SEO page** checks.
- A **full to_jsonb exact parity** in both directions between the candidate SELECT and Fast v2 returned **207 = 207, 0 differences**, retaining source metadata, product price, media, all facets and membership codes. Proposed same-output SELECT EXPLAIN ANALYZE **100.57 ms / 9,943 shared hits** vs 272 ms; these are **isolated SQL samples, not confirmed field CWV, total TTFB or a sustained throughput gain**.

## Execution gates
1. New `feya_storefront_product_cards_fast_v3` uses same approved Fast v2 SELECT with only expensive `JOIN feya_storefront_collection_cards_fast_v1 live` replaced by `live_identity` calculated from indexed EXISTS/NOT EXISTS and the same slug function. No full configuration JSON assembly or 41k-row fanout for existence.
2. Additive `CREATE VIEW` with `security_invoker=true`, SELECT `service_role` only, `anon`/`authenticated`/PUBLIC rejected. Existing Fast v2 continues public Home/Shop unchanged.
3. Migration fails transaction if not exactly **207** cards, missing required fields/hash or any to_jsonb row difference vs approved Fast v2, or unsafe privileges. Never materialize stale prices, never bypass human approval, account/measurement/payment or previous cache invalidation.
4. CI 19/19 exact branch, Preview READY. Independently install reviewed SQL to real Supabase, then postflight 207/canonical/hash/ACL, bounded measured new view time; **do not immediately switch frontend in same PR**.
5. Separate data-only storefront reader cutover PR changing `STOREFRONT_CARD_READ_MODEL_V1` to V3, plus tests, API source access, real HTML Shop/Home/collections parity, Search v12 active crawl, no URL/query/filter/noindex or V13/CSS changes, before/after logs. Retain V2 rollback path.
6. Keep existing `feya_catalog_source_read_v1` duration/error instrumentation. Confirm reduction in 57014 errors and source latency under real traffic **before** closing Issue #119; otherwise investigate concurrent cache-miss/hot/cold per-region and PostgREST pool settings before adding infrastructure cost.

No payments, legal page edits, SEO text regeneration, new page indexation or remote cache purchase in this candidate.
