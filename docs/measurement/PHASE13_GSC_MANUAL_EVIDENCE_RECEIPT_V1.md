# TheFEYA — Phase 13 GDAE: immutable GSC observation receipts v1

Status: IMPLEMENTATION CANDIDATE. Strictly subordinate to MASTER, GDAE and GMEL canonical passports and Growth OS Core. This does not activate Google credentials, scheduled collection, Google indexing or AI spending.

## Why this is needed
On 2026-10-16 the owner connected Google Search Console through the existing HYPD Free plan: `sc-domain:thefeya.com` with `siteOwner` permission. The former legacy GA4 account was deselected to free the one account slot. Official first-party GSC API access can be used free of new subscriptions, but the production server has not yet received its own separate `webmasters.readonly` OAuth grant. Consequently, the active Growth OS `ORGANIC_SEARCH_PERFORMANCE` source-health authority is still `UNAVAILABLE/UNKNOWN` and must not be automatically raised.

## Verified live evidence, not inferred ROI
- Source: HYPD Search Console read-only live result, web search, `dataState=final`, 2026-10-01 to 2026-10-13.
- Google property aggregate: **5 clicks, 92 impressions, CTR 5.4348%, average position 9.771739**. Page report: all 5 clicks reported on homepage. Query breakdown anonymizes low-frequency terms and **does not** sum to the property total. No revenue/causal inference.
- Wave A inspection checked exactly the 18 canonical Search v12 index candidates: 2 indexed (`/`, `/care`), 6 discovered but not indexed, 6 unknown to Google, 4 with *historical pre-release* `noindex` crawl from September 27. This is Google's observed state, not today's HTML state.
- The sitemap was submitted 2026-10-01, last downloaded 2026-10-02; **0 indexed in that dated sitemap report** is not the current count. Warnings/errors 0.
- Independent 2026-10-16 GitHub CI origin job `117085199263` reports 18/18 active index URLs correctly indexable, 24/24 PDP noindex HTTP sample, redirects/utility/filter checks PASS, no errors. Do not rewrite approved 207 PDP, V13, Search v12 or collection content from outdated Google crawl state.

## Narrow ledger contract
- One private `feya_growth_gsc_observation_receipts_v1` table: immutable, no client/anon/auth grants, `service_role` SELECT only.
- One service-role-only function `feya_fn_stage_gsc_daily_observation_v1`: validates exact `sc-domain:thefeya.com`, HYPD MCP manual read provenance, web/final day grouping, date bounds, duplicate days, nonnegative integer clicks/impressions, realistic position, aggregate exact totals and weighted position reconciliation.
- Missing provider rows stay missing. An empty result is recorded with `NULL` totals, never a manufactured zero.
- Payload SHA-256 prevents duplicate receipts/replays even when row ordering differs. A later Google data revision becomes a NEW immutable receipt, not a silent rewrite.
- `source_health_promoted=false` is enforced. There is no direct or indirect write to GDAE source-health registry, no claims of a daily automated pipeline or canonical business-metric readiness.
- PostgreSQL 17 and isolated PGlite regressions cover access privileges, no mutation, replay, revisions, null semantics, date/metric validation and absent side effects.

## Next independent release gates
1. Merge ONLY after exact-head CI and review of source provenance and RLS. Apply additive migration with controlled rollback-only smoke; no source-health activation.
2. Ingest the verified 13-day HYPD manual observation in a single bounded operator transaction, preserving source, extraction clock and historical raw daily figures. Re-read immutable receipt and prove totals/versions.
3. Next phase: reuse the already shipped official GSC direct read-only probe (PR #155) after owner-approved Google OAuth (no extra paid subscription) to create durable direct-source imports and freshness/coverage evidence.
4. Separate GDAE acceptance rules for data-source `HEALTHY/FRESH`, versioned canonical mart, no fabricated missing days, late Google corrections, consent, and owner-controlled GMEL admission. NO AI budget activation without Human Owner approval.

Tracker: https://github.com/THEFEYA/feya-commerce/issues/145
