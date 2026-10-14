# Phase13 P1 — approved Shop/Home catalog source latency observability
Date: 2026-10-14
Status: PREVIEW-CANDIDATE, NO production publication approval.

## Live evidence, not a guessed new bug
- Main GitHub source: `4b69d04f4f5a16baabb6f42c21c23e91b8d7804a`; public Shop query parameter fix #131 is in Production.
- The exact Production deployment `dpl_6jfwqxgrPoXFbR4z5k2wayNJ1fNM` has successful `catalog_ready` events with `items=207`.
- Vercel runtime 2026-10-13 22:02 UTC /shop in `lhr1` also shows simultaneous 0-card `hasError=true` events and actual PostgREST-backed `STOREFRONT_CARD_READ_MODEL_READ_FAILED:57014` exceptions. PostgreSQL SQLSTATE 57014 is query canceled, **not proof that all requests were slow due to SQL alone**. Source remained 207 / 207 unique.
- Direct read-only `pg_stat_statements` on current fast_v2 PostgREST query: 305 successful recorded invocations, mean **452.79ms**, max **3983.5ms**. These are DB execution observations, NOT end-user p75 LCP or Vercel TTFB, and canceled statements may be absent. Older non-fast view mean was over five seconds across the dominant historical group.
- Database Fast v2 approved view is `security_invoker=true`; actual original pinned product title/amount/hash/slug/facets remain unchanged.
- One source-reader SQL/error logging deficiency: the outer public Shop `getProducts()` receives only a generic redacted React error digest, obscuring failure type and cold-source duration. No safe SQLSTATE or source read duration was emitted at the source boundary.

## Bounded candidate fix — instrumentation only
- In `lib/storefrontCardReadModelServer.ts`, measure time **only** around the existing Supabase read (PostgREST network + SQL + response). When source read fails, log only `outcome=error`, sanitized five-character SQLSTATE or `unknown`, and integer `elapsed_ms`.
- On a successfully completed **slow** source read (>=1500ms), log only `outcome=slow`, integer `elapsed_ms`, and number of rows. Do NOT log customer data, product IDs, raw SQL, query strings, email, API secrets, browser state, or source JSON. No per-request high-volume successful info logging from this new boundary.
- Keep exact existing 207-row approval/hash/facet/ID verification, code-path cache tags, Next Cache Components `use cache`, all behavior on success and existing fail-closed behavior on error. No retries, timeout increases, region changes, fallback stale snapshots, unverified persistent caches or unauthorized public content mutation.
- Do not touch V13 visuals, Search v12 18 index-allowed / 207 PDP noindex, original four blocks, Product Truth, right-side PDP options, currency/price or Seller Online payment gates.

## Controlled deployment and follow-up proof
1. PR exact-head FEYA validation 19/19 and Vercel Preview READY. No partial test evidence treated as green.
2. After reviewed Production release, **correlate** new source-read slow/error labels against old Shop `catalog_ready`/404 reasons. Verify intended `/shop`, page 2 and Gold/Skirt filters still show 20/real cards (no streamed 404), while deliberately malformed filters remain rejected. Direct independent browser/source check required: Vercel READY alone does not prove origin health.
3. Distinguish a single concurrency burst from continuous failures. Investigate query cancellation by concurrent cache misses/load, database wait events/SQL plan, the Supabase/PostgREST timeout at the actual effective role and Vercel region; do not claim cause until proven.
4. Only then choose a separate scoped remediation: validated efficient approved projection, approved cache-warming/stale policy or other performance fix with exact data/visual parity, replayability, cost and rollback. Benchmark p75 LCP/INP/CLS with true field data once connected.
5. Remove temporary verbose `feya_shop_trace_v1` per-request INFO logs in a **later** independent PR once valid-path 404 diagnostic evidence is complete. Keep error-only source telemetry with appropriate retention/cost limit.

No Supabase schema migration, UI redesign, Vercel env switch, active Search release or payment state is authorized by this document.
