# Commercial keyword promote RPC plan — 2026-07-05

## Current state

Commercial keyword metrics are imported and validated.

Dry-run view:

- `public.feya_commerce_v_seo_commercial_metrics_promote_dry_run_v1`

Dry-run result:

- 150 rows total
- 66 `promotion_safe = true`
- 47 new candidates for review only
- 28 evidence-only rows, no promote
- 9 no-metric rows, hold

## Decision

Create a guarded Supabase RPC for the first promotion step.

The first promote path must update only existing approved/approved_draft keyword bank rows with metric evidence from the dry-run view.

It must not approve new candidates and must not revive hold/reject rows.

## Allowed writes

Only rows where:

- `promotion_safe = true`
- `dry_run_action = 'would_update_existing_approved_metrics'`
- `recommended_action = 'update_existing_approved_metrics'`
- `normalized_market = 'US'`
- `normalized_language = 'en'`
- `bank_review_status in ('approved','approved_draft')`
- `avg_monthly_searches > 0`

## Allowed fields to update in `seo_keyword_bank_v1`

- average monthly search metric field, if it exists in the bank
- competition field, if it exists
- competition index field, if it exists
- metric source / source batch field, if it exists
- updated timestamp, if it exists

## Forbidden writes

- Do not change `review_status`
- Do not change `bank_bucket`
- Do not insert new keywords
- Do not touch rows with bank status `reject` or `hold`
- Do not write UAH bid fields into bank bid fields
- Do not delete anything

## Required safety behavior

The RPC should support dry-run mode first:

- default `p_execute = false`
- if dry-run: return rows that would change, but do not update
- if execute: update allowed rows only and return updated count + row preview

If existing bank column names differ, first create a reality report instead of guessing.

## Next UI after RPC

After the RPC exists and is tested, add an admin review screen showing:

- ready metric updates
- new candidate review queue
- evidence-only rows
- no-metric rows

This keeps Listing Master on the approved keyword bank while commercial metrics mature through review.
