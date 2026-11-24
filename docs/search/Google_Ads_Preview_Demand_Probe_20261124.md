# Google Ads demand probe — Preview only, 24 November 2026

Owner approval (chat, 24.11.2026 09:58 CET): "разрешаю" — deploy a read-only Google Ads probe to **Preview, not production**.

## What it is
- `POST /api/preview/google-ads-demand-probe` with body `{"set":"wave1"}` on branch `work/google-ads-demand-probe-20261124`.
- Reuses `lib/googleAdsProvider.ts` (OAuth → account context → `generateKeywordHistoricalMetrics`, v25). One provider request per call, 30 s cooldown, no retries.
- Fixed profile: US `geoTargetConstants/2840`, English `languageConstants/1000`, `GOOGLE_SEARCH`, 2025-11 … 2026-10.
- Predefined set only: wave 1 = 112 current PDP primaries + 53 cluster seeds (165). No free-form input.

## What it is not
- Not an import path: no Supabase client, no writes, no batch/keyword status changes. The atomic import (`/api/internal/google-ads-keyword-metrics`, migrations 20260923–20260924, flags `FEYA_METRIC_IMPORT_STORAGE_ENABLED` / `FEYA_GOOGLE_ADS_IMPORT_ENABLED`) stays untouched and OFF.
- Not available in production, on other branches, other projects or locally: `404` before the origin check or body parsing (server deployment metadata only).
- No campaigns, budgets, account settings or credentials are read back or returned.

## Access boundary
Vercel Deployment Protection (SSO, all deployments except custom domains) on this single Preview branch — the same boundary used for owner-approved preview branches in `lib/ownerPreviewPolicy.ts`. Admin routes are not opened in this preview (branch is not in `OWNER_PREVIEW_BRANCHES`). Same-origin `Origin` is required.

## Evidence and rollback
- Tests: `tests/search/googleAdsDemandProbe.test.ts` (deployment gate, set allowlist, fixed profile, account allowlist, null ≠ 0, single request, route boundary).
- Receipts are kept outside the database (owner handoff archive); importing them requires the separate reviewed import contract.
- Rollback: close the draft PR and delete the branch; the Preview deployment stops serving the route. Nothing to revert in production or Supabase.

## v2 — full demand research for the SEO core (owner request 24.11.2026, 12:28)

Wave 1 succeeded at 12:09 (`request_id V1vj8vd01xcfO6ey9c7xAA`, 165 → 164 rows). The owner asked to measure all phrases needed for the SEO core (axes, groups, families, audiences, 207 products), so the same Preview-only probe gains bounded, still read-only jobs:

| Body | What it measures | Source of phrases |
|---|---|---|
| `{set:'bank', market, page}` | `generateKeywordHistoricalMetrics`, ≤200 phrases | `seo_keyword_bank_v1`, `review_status in (approved_draft, hold)`, ordered by `keyword_norm, id`; read-only SELECT per page (8 308 rows → 42 pages) |
| `{set:'master', market, page}` | same | `feya_commerce_seo_keyword_master_v1` (458 rows; axis/pattern/page-level kept as meta) |
| `{set:'extra', market, page}` | same | frozen `lib/googleAdsDemandProbeSets.ts`: GSC web+image queries, 207-PDP primary/secondary phrases, Keyword Planner UI phrases, wave-1 phrases (1 038 unique) |
| `{set:'ideas', market, page}` | `generateKeywordIdeas` (+ `KEYWORD_CONCEPT` annotations) | frozen Discover seeds: 30 seed families by product part, event/scene, audience (drag, showgirl/burlesque/cabaret, pole/gogo, DJ/singer, couples, men, plus size, B2B custom), style/colour/material and funnel questions; 10 site seeds (own + competitors); 10 own collection URLs |

Profile: markets `us` 2840, `gb` 2826, `ca` 2124, `au` 2036; English 1000; Google Search; 24 complete months 2024-11..2026-10; `includeAdultKeywords=false`. Rows are returned compact (`columns` + `rows`, monthly aligned to the 24-month window, nulls preserved). Free-form keywords are still refused. Cooldown 6 s; no retries; no Supabase writes (the route test forbids insert/upsert/update/delete/rpc); no campaigns; no role or ownership changes. Results are saved as research files, not imported; the atomic import route remains the only storage path and still needs its migration fix and owner approval.

Rollback unchanged: close PR #262; the route exists only on this Preview branch.
