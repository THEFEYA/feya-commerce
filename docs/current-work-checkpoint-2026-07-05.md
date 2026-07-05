# Current work checkpoint — 2026-07-05

## Project

FEYA Commerce / TheFEYA e-commerce.

Repo branch: rebuild/emergent-template-port-v2.

## Current focus

First commercial keyword metrics batch is closed. The project should now return from keyword plumbing to the main SEO production flow:

Listing Master -> SEO Brief -> first real SEO Pack -> QA -> indexation readiness.

Do not make a second keyword bank. The final source remains `seo_keyword_bank_v1` and the `/admin/seo-keywords` page.

`/admin/seo-engine/commercial-review` is only a temporary/staging diagnostics page for Google Ads commercial signals.

## Completed commercial batch

Batch:

- commercial_v1_a_google_ads_stats_2026_07_05

Completed results:

1. Imported first commercial metrics batch into staging.
2. Updated 66 existing approved keywords through guarded promote RPC.
3. Created new-candidate staging/review layer for 47 new keywords.
4. Created read-only auto-classification view.
5. Created candidate insert dry-run v1 and v2.
6. Created guarded insert RPC:
   - public.feya_commerce_insert_commercial_candidates_v1(p_source_batch text, p_execute boolean)
7. Executed guarded insert RPC after clean dry-run.

Final post-execute diagnostics:

- seo_keyword_bank_v1 row count: 9570 -> 9606
- 66 existing approved keywords updated with commercial metrics
- 36 clean new commercial candidates inserted
- 11 hold/evidence candidates not inserted
- 102 total rows now have metric_source = commercial_v1_a_google_ads_stats_2026_07_05
- inserted rows have review_status = approved_draft
- inserted buckets are commercial_collection or faq only
- 0 excluded_hold rows inserted
- 0 near me / reddit / in store rows inserted
- 0 invalid buckets inserted
- 0 bid fields touched

## Important correction

Manual approve/reject for every keyword is not the main workflow.

Correct workflow:

Google Ads CSV -> validation -> scoring -> auto classification -> safe dry-run -> guarded promote.

Human review should be only an override for suspicious or strategic exceptions.

## Current status

Commercial_v1_a batch is closed.

Do not run another broad Google Ads batch immediately unless it is a clearly scoped missing-metrics task.

Return to the main production pipeline.

## Next Supabase step

Run read-only diagnostics to confirm the updated approved keyword bank is visible to Listing Master / SEO Brief sources.

Need to verify:

- Listing Master keyword source/view/RPC can see newly inserted approved_draft keywords
- commercial_collection and faq buckets are handled correctly
- no hold/reject/local/reddit/in-store rows can appear in Listing Master suggestions
- SEO Brief source can consume product focus + selected/approved keyword candidates
- no duplicate screen/workflow is needed

## Next project step

1. Verify keyword bank integration into Listing Master / SEO Brief.
2. Fix only if the updated bank is not visible in existing flows.
3. Move to SEO Brief page/flow.
4. Generate first real SEO Pack only after:
   - Product focus is selected/saved
   - validated keywords are available
   - brief is formed from real product facts/components/media
   - QA rules are ready

## Guardrails

- No fake metrics.
- No fake persona/style/event/gender.
- Keep Russian UI labels for operator screens.
- Keyword values stay English.
- Avoid creating new permanent screens when existing screens can do the job.
- Do not stay stuck on keyword metrics; the main goal is first indexation with strong product SEO pages.
