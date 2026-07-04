# FEYA keyword pipeline reconciliation — 2026-07-05

## Decision

Do not create a third independent keyword core.

Commercial keyword metrics must be treated as a staging/enrichment layer and then bridged into the existing keyword systems.

## Current systems

### A. Working Listing Master keyword bank

Canonical for current Listing Master UI:

- `public.seo_keyword_bank_v1`
- `public.vw_seo_keyword_bank_v1_approved`
- `public.vw_seo_keyword_bank_v1_for_listing_master`
- `public.vw_seo_keyword_bank_v1_hold`
- `public.vw_seo_keyword_bank_v1_reject`
- `public.vw_seo_keyword_bank_v1_by_bucket`

This is the bank that Listing Master reads today.

### B. Older metric validation / AI cleanup / scoring pipeline

Existing objects:

- `public.feya_commerce_seo_keyword_master_v1`
- `public.feya_commerce_seo_keyword_ai_cleanup_v1`
- `public.feya_commerce_seo_keyword_metric_import_staging_v1`
- `public.feya_commerce_seo_keyword_metric_snapshots_v1`
- `public.feya_commerce_v_seo_keyword_metric_validation_queue_v1`
- `public.feya_commerce_v_seo_keyword_recommendation_v1`
- `public.feya_commerce_v_seo_keyword_score_preview_v1`
- `public.feya_commerce_v_seo_keyword_brief_pool_v1`

This pipeline exists but is currently waiting for metric import on queued keywords.

### C. New commercial metrics staging table

- `public.feya_commerce_seo_commercial_keyword_metrics_v1`

This table must not be used directly as a final SEO core. It is only a buffer/review layer for Google Ads commercial intent keywords.

## Correct path

1. Import Google Ads commercial keyword stats into staging.
2. Create read-only bridge preview to compare staging rows against `seo_keyword_bank_v1` by `keyword_norm`.
3. Create validation view for duplicates, missing fields, bad language, invalid bucket, and currency/source warnings.
4. After human review, mark rows as `approved_for_seo_core` or rejected/hold.
5. Promote only approved rows into:
   - `seo_keyword_bank_v1` for Listing Master use,
   - optionally `feya_commerce_seo_keyword_metric_snapshots_v1` to wake the older scoring/recommendation pipeline.

## Why not direct insert

Direct insert into `seo_keyword_bank_v1` would hide import problems, duplicate existing keywords, and mix commercial metrics with regular SEO core without review.

Direct use of the commercial table by Listing Master would create a third keyword universe and break the project principle that operators work from one approved keyword core.

## Google Ads batch strategy

Continue Google Ads batches, but do not generate every possible combination.

Use controlled seed batches around:

- broad commercial outfit terms
- product parts
- custom / handmade / shipping
- strong styles / personas only

Google Ads will expand seeds into related phrases with metrics. Import metric-backed suggestions, not every manually generated phrase.

## Immediate next tasks

1. Create Supabase read-only bridge/validation views for commercial metrics.
2. Import the first cleaned commercial CSV into staging.
3. Review matches/new candidates.
4. Create promote RPC only after validation.
5. Fix Listing Master auto-focus chip override bug (`focus_off`).
