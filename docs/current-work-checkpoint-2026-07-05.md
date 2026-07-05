# Current work checkpoint — 2026-07-05

## Project

FEYA Commerce / TheFEYA e-commerce.

Repo branch: rebuild/emergent-template-port-v2.

## Current focus

Commercial keyword metrics are being integrated into the existing SEO keyword pipeline.

Do not make a second keyword bank. The final source remains `seo_keyword_bank_v1` and the `/admin/seo-keywords` page.

`/admin/seo-engine/commercial-review` is only a temporary/staging diagnostics page for Google Ads commercial signals.

## Completed

1. Imported first commercial metrics batch into staging.
2. Updated 66 existing approved keywords through guarded promote RPC.
3. Confirmed:
   - 0 reject/hold touched
   - 0 new candidates inserted
   - 0 bid fields touched
4. Created new-candidate staging/review layer for 47 new keywords.
5. Created read-only auto-classification view:
   - 40 auto_promote_safe
   - 7 hold/evidence
6. Created read-only candidate insert dry-run v1:
   - 40 would_insert by initial logic
   - 7 excluded_hold
   - 0 duplicates
   - 0 bid fields in insert payload
   - exposed invalid bucket issue before writes
7. Created corrected read-only candidate insert dry-run v2:
   - source view: public.feya_commerce_v_seo_commercial_candidate_insert_dry_run_v2
   - 47 rows total
   - 36 would_insert
   - 11 excluded_hold
   - 0 duplicates
   - 0 invalid buckets for would_insert
   - 0 bid fields in insert payload
   - seo_keyword_bank_v1 remains 9570 rows
8. Fixed commercial metrics UI crash and simplified the page.

## Important correction

Manual approve/reject for every keyword is not the main workflow.

Correct workflow:

Google Ads CSV -> validation -> scoring -> auto classification -> safe dry-run -> guarded promote.

Human review should be only an override for suspicious or strategic exceptions.

## Dry-run v2 status

The corrected insert dry-run v2 is clean enough to prepare a guarded insert RPC.

Clean would_insert:

- 36 rows
- valid buckets only: commercial_collection = 34, faq = 2
- duplicate_count = 0
- invalid_bucket_count = 0
- bid fields not present in insert payload

Excluded/held:

- 6 local near me rows
- 4 offline retail in-store rows
- 1 reddit research row

## Next Supabase step

Create guarded insert RPC for the 36 clean new commercial candidates.

Do not execute immediately.

The RPC must support dry-run mode first:

- default p_execute = false
- p_execute = false returns rows that would insert, but writes nothing
- p_execute = true inserts only dry_run_action = 'would_insert' rows from v2

Required guards:

- source: public.feya_commerce_v_seo_commercial_candidate_insert_dry_run_v2
- only dry_run_action = 'would_insert'
- duplicate_in_bank = false
- proposed_bank_bucket in valid list
- normalized_market/region = US
- normalized_language/language = en
- avg_monthly_searches > 0
- no bid fields inserted
- no near me / reddit / in store / noise rows

Do not create any second keyword bank.

## Next project step after insert RPC

If RPC dry-run is clean:

1. Execute guarded insert for 36 safe candidates.
2. Verify keyword bank count increases from 9570 to 9606.
3. Confirm inserted rows have metric_source = commercial_v1_a_google_ads_stats_2026_07_05 and review_status = approved_draft.
4. Confirm excluded hold/evidence rows are not inserted.
5. Return to Listing Master and SEO Brief pipeline.

## Guardrails

- No fake metrics.
- No fake persona/style/event/gender.
- Keep Russian UI labels for operator screens.
- Keyword values stay English.
- Avoid creating new permanent screens when existing screens can do the job.
- Do not stay stuck on keyword metrics; the main goal is first indexation with strong product SEO pages.
