# Commercial keyword promote RPC status — 2026-07-05

## Current state

Supabase RPC was created:

`public.feya_commerce_promote_commercial_metrics_v1(p_source_batch text default null, p_execute boolean default false)`

## Precheck

The target table `public.seo_keyword_bank_v1` contains the required columns:

- `keyword_norm`
- `keyword`
- `avg_monthly_searches`
- `competition`
- `competition_index`
- `metric_source`
- `updated_at`
- `review_status`
- `bank_bucket`

Bid columns exist (`low_bid`, `high_bid`) but are intentionally not touched by this RPC.

## Dry-run result

Dry-run was executed for batch:

`commercial_v1_a_google_ads_stats_2026_07_05`

Result:

- mode: `dry_run`
- updated_count: 66
- excluded_count: 84
- reject/hold eligible count: 0
- new candidates eligible count: 0
- bid fields in update payload: 0

## Allowed execute behavior

Execute mode may update only:

- `avg_monthly_searches`
- `competition`
- `competition_index`
- `metric_source`
- `updated_at`

It must not update:

- `review_status`
- `bank_bucket`
- `low_bid`
- `high_bid`
- new candidates
- reject/hold rows

## Decision

The dry-run looks safe for first execution.

Recommended next step:

1. Execute the RPC only for `commercial_v1_a_google_ads_stats_2026_07_05`.
2. Immediately run post-execute diagnostics.
3. Do not promote new candidates yet.
4. Keep review queue work separate.

## Post-execute diagnostics required

After execute, confirm:

- executed updated_count = 66
- affected rows have `metric_source = commercial_v1_a_google_ads_stats_2026_07_05`
- no reject/hold rows were updated
- no new candidates were inserted
- `low_bid` / `high_bid` were not changed
- Listing Master keyword bank still loads normally
