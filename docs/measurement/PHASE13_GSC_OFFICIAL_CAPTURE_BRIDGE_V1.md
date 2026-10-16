# TheFEYA Phase 13 — Direct Official GSC Capture Bridge v1

Status: DORMANT implementation; owner OAuth and capture authorization NOT completed.
Authority: MASTER, GDAE, Growth OS Core and GMEL canonical passports. Never infer business uplift from this component.

## What changed from PR #155 / #156
The verified GSC source probe from PR #155 now validates and exposes the **actual date rows** (clicks, impressions, average position), checks the Google Pacific calendar, rejects malformed/duplicate/out-of-window values, and never fabricates zero rows for missing dates. The immutable receipt registry from PR #156 now accepts **two distinct channels**, keeping all historical HYPD manual evidence unchanged:
- `HYPD_MCP_READONLY_MANUAL`: manual operator-verified snapshot (2026-10-01 .. 2026-10-13 already stored)
- `GOOGLE_GSC_OFFICIAL_READONLY`: future token-authenticated direct Google API capture

A new protected `POST /api/internal/gsc-official-capture` reads **only** the actual `sc-domain:thefeya.com` Search Console property (scope `webmasters.readonly`), validates bounded FINAL date rows, and calls existing private service-role RPC `feya_fn_stage_gsc_daily_observation_v1`. Its result includes a receipt ID and SHA-256 digest, *never raw OAuth secrets*. Repeated identical data reuses the old receipt; late corrected Google data produces an additional immutable receipt. One operator-triggered request only.

## Hard availability / security gates
- `FEYA_GSC_READ_ENABLED=true` AND independently `FEYA_GSC_CAPTURE_ENABLED=true` are both required. All config defaults are OFF.
- `FEYA_GSC_OAUTH_CLIENT_ID`, `FEYA_GSC_OAUTH_CLIENT_SECRET`, `FEYA_GSC_OAUTH_REFRESH_TOKEN` must be **GSC-specific**, authorized to the verified domain, stored server-side directly in Vercel after owner permission. Do not assume an existing Google Ads token has Search Console scope or forward tokens through ChatGPT.
- Server also requires existing `FEYA_INTERNAL_API_TOKEN`, Supabase service client and installed additive migration `growth_gsc_official_channel_v1`.
- Zero schedule/Cron, no token-refresh job, no second SaaS subscription. An explicit authenticated internal POST is mandatory; unauthorized callers fail before Google or Supabase calls.
- No promotion of `feya_growth_data_source_health_v1` to `HEALTHY`: source-health remains `UNAVAILABLE/UNKNOWN` until a **separate** production source freshness/coverage acceptance and governed canonical metrics pipeline.
- No Google Ads/GA4 enablement, Owner/SEO/Price/Product Truth change, approved 207 PDP change, Search v12/V13 change, SellerOnline checkout/payment change or AI API invocation.
- No direct-to-browser credential exposure. Google and database error bodies are not surfaced to clients.

## Google final dates and metric semantics
Google Search Analytics dates are Pacific Time, not the server UTC date. Query FINAL-only, `type=web`, date-only dimension, bounded 14-day snapshot ending at least three Google calendar days ago. A missing Google date row means **not observed**, not zero. A provider-returned explicit date row containing zero impressions can be preserved with a zero average position. Aggregate position is an impression-weighted metric over the observed dates. Page/query rows can be privacy-truncated and must not replace site-level totals. This is *observational data*, not evidence of an SEO causality claim.

## Release acceptance and later actions
1. Native PostgreSQL 17 + isolated PGlite tests verify historical manual compatibility, additive schema, distinct OAuth provenance, duplicate replay, revisions, RLS/immutable rows and fail-closed invalid input.
2. Typecheck, React/Next build, authenticated Supabase browser and active Search Release crawler all pass at **exact PR head**. Do not merge or install SQL otherwise.
3. On merge, production remains OFF. Postflight verify Vercel, SQL grants, 1 previously saved HYPD manual receipt unchanged, zero official receipts, zero newly running GMEL or AI spend.
4. Only after owner permits Google Cloud GSC read-only OAuth and configures GSC-specific server secrets: explicitly test one bounded on-demand capture and audit same source before any daily scheduling.
5. **Future separate gate:** GDAE-validated immutable ingestion reconciliations, watermark/correction policy, Source Health threshold and small cadence. There are still no observed GA4 or reliable commerce order receipts for thefeya.com; GMEL paid semantic reasoning stays OFF until separate owner-approved priced model policy.

Important: the HYPD one-active-account free plan was used for diagnostic reading in ChatGPT. It does NOT automatically transfer tokens or server autonomy to TheFEYA. No need to purchase HYPD Pro or GSC Wizard for the official API design.

Tracker: https://github.com/THEFEYA/feya-commerce/issues/145
