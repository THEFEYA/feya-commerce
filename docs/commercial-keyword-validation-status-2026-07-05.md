# Commercial keyword validation status — 2026-07-05

## Current status

The first commercial Google Ads keyword metrics import is complete and normalized.

Staging table:

- `public.feya_commerce_seo_commercial_keyword_metrics_v1`

Bridge / validation views:

- `public.feya_commerce_v_seo_commercial_metrics_keyword_bank_match_v1`
- `public.feya_commerce_v_seo_commercial_metrics_import_validation_v1`

## Imported rows

150 rows.

## Normalized validation summary

- total_rows: 150
- matched_existing_count: 98
- new_candidate_count: 52
- no_metric_count: 9
- duplicate_count: 0
- invalid_language_count: 0
- invalid_market_count: 0
- invalid_competition_count: 0
- currency_warning_count: 89
- ready_for_review_count: 113
- metric_evidence_only_count: 28
- update_existing_approved_count: 66
- review_new_candidate_count: 47

## Recommended action counts

- update_existing_approved_metrics: 66
- review_new_candidate: 47
- metric_evidence_only: 28
- hold_no_metric_signal: 9

## Decision

Do not promote yet.

Next step must be a dry-run preview view/RPC that shows exactly what would be changed before any write into the existing keyword bank.

## Promotion rules

Allowed for first promote path:

- Only `recommended_action = update_existing_approved_metrics`
- Only `normalized_market = US`
- Only `normalized_language = en`
- Only existing approved/approved_draft bank rows
- Do not write UAH bid fields into bank low/high bid fields until currency mapping is explicitly confirmed

Excluded from automatic promote:

- `metric_evidence_only`
- `hold_no_metric_signal`
- bank rows with review_status reject/hold
- new keyword candidates without human review

## Next Supabase task

Create a read-only dry-run preview view for promotion.

The preview should show before/after values for metrics fields, recommended action, and excluded reason. No insert/update/delete yet.

## Listing Master status

The `focus_off` bug was patched in GitHub commit `9bb0b52cef46a426b60c99ee7ac2aeb618b8061d`; Vercel build was successful. Operator confirmed that clicking an inferred chip off now removes it from the UI.
