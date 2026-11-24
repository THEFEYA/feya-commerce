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
