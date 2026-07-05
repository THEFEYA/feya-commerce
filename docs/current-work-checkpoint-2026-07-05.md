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
6. Created read-only candidate insert dry-run view:
   - 47 rows total
   - 40 would_insert by initial dry-run logic
   - 7 excluded_hold
   - 0 duplicates
   - 0 bid fields in insert payload
   - seo_keyword_bank_v1 remains 9570 rows
7. Fixed commercial metrics UI crash and simplified the page.

## Important correction

Manual approve/reject for every keyword is not the main workflow.

Correct workflow:

Google Ads CSV -> validation -> scoring -> auto classification -> safe dry-run -> guarded promote.

Human review should be only an override for suspicious or strategic exceptions.

## Current dry-run issue

The insert dry-run exposed one real problem before writes:

- 2 `would_insert` rows had proposed bucket `commercial_product_or_collection`
- this is not a valid `seo_keyword_bank_v1.bank_bucket`

Affected rows:

- `handmade festival clothes` — good commercial/handmade phrase, should map to `commercial_collection`
- `festival clothes in store` — weak/offline retail phrasing, should be held for first automated insert

## Next Supabase step

Create a corrected read-only insert dry-run v2.

No insert/update/delete yet.

V2 should:

- map `commercial_product_or_collection` to a valid bucket only when safe
- map `handmade festival clothes` -> `commercial_collection`
- hold/exclude `festival clothes in store` as offline/retail intent for first automated insert
- keep near me/reddit/noise excluded
- confirm no duplicates
- confirm no bid fields in payload
- return final clean insert count

Do not create insert RPC until v2 dry-run is clean.

## Next project step after v2 dry-run

If v2 dry-run is clean:

1. Create guarded insert RPC for safe new candidates.
2. Execute only after preview is checked.
3. Verify keyword bank counts.
4. Return to Listing Master and SEO Brief pipeline.

## Guardrails

- No fake metrics.
- No fake persona/style/event/gender.
- Keep Russian UI labels for operator screens.
- Keyword values stay English.
- Avoid creating new permanent screens when existing screens can do the job.
- Do not stay stuck on keyword metrics; the main goal is first indexation with strong product SEO pages.
