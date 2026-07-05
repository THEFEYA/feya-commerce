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
8. Created guarded insert RPC:
   - public.feya_commerce_insert_commercial_candidates_v1(p_source_batch text, p_execute boolean)
   - dry-run only executed so far
   - dry-run result: 36 would_insert, 0 inserted, 11 excluded, 0 duplicates, 0 invalid buckets, 0 bid fields in payload
   - seo_keyword_bank_v1 remains 9570 rows
9. Fixed commercial metrics UI crash and simplified the page.

## Important correction

Manual approve/reject for every keyword is not the main workflow.

Correct workflow:

Google Ads CSV -> validation -> scoring -> auto classification -> safe dry-run -> guarded promote.

Human review should be only an override for suspicious or strategic exceptions.

## Insert RPC dry-run status

The guarded insert RPC dry-run is clean.

Clean would_insert:

- 36 rows
- valid buckets only
- duplicate_count = 0
- invalid_bucket_count = 0
- bid fields not present in payload
- no near me / reddit / in store rows would insert

Excluded/held:

- 11 rows
- local near me / offline in-store / reddit research intent

## Next Supabase step

Execute guarded insert for the 36 clean new commercial candidates.

Run only:

`select * from public.feya_commerce_insert_commercial_candidates_v1('commercial_v1_a_google_ads_stats_2026_07_05', true);`

Then immediately run post-execute diagnostics.

Do not run any broad new Google Ads batches until this batch is closed.

## Expected after execute

- inserted_count = 36
- seo_keyword_bank_v1 row count increases from 9570 to 9606
- inserted rows have metric_source = commercial_v1_a_google_ads_stats_2026_07_05
- inserted rows have review_status = approved_draft
- inserted buckets are commercial_collection or faq
- excluded hold/evidence rows are not inserted
- bid fields remain untouched/null for inserted rows

## Next project step after execute diagnostics

1. Mark commercial_v1_a batch closed.
2. Return to Listing Master and SEO Brief pipeline.
3. Ensure Listing Master/SEO Brief can read the updated approved keyword bank.
4. Start first real SEO pack generation flow with QA.

## Guardrails

- No fake metrics.
- No fake persona/style/event/gender.
- Keep Russian UI labels for operator screens.
- Keyword values stay English.
- Avoid creating new permanent screens when existing screens can do the job.
- Do not stay stuck on keyword metrics; the main goal is first indexation with strong product SEO pages.
