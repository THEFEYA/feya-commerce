# Commercial keyword workflow correction — 2026-07-05

## Correction

Manual approve/reject per keyword is not the main workflow.

The operator should not have to approve every keyword one by one.

## Correct workflow

Use the existing SEO metric pipeline style:

1. Generate keyword batches.
2. Export metrics from Google Ads Keyword Planner.
3. Import CSV through metric validation.
4. Normalize/scoring layer validates the file.
5. Existing approved keywords are updated automatically through guarded promote.
6. New keywords are classified by rules and staged as candidates.
7. Only suspicious or strategic exceptions need human override.

## Why the review table still exists

`public.feya_commerce_seo_commercial_keyword_review_decisions_v1` remains useful as an override table, not as a required manual work queue.

Use it only when the operator sees a keyword that should be forced to hold/reject/approve candidate.

## Product direction

The UI should show commercial metrics as signals and auto-classification, not as mandatory word-by-word work.

Next product step:

- create rule-based dry-run for new commercial candidates
- separate automatic landing/FAQ candidates from local/research/noise terms
- promote only safe auto-approved candidate groups after dry-run

## Current state

First commercial batch:

- 66 existing approved keywords were updated safely
- 47 new candidates remain staged
- no reject/hold rows were promoted
- no bid fields were touched

## UI correction

The commercial page should be called `Commercial metrics` and explain that review is optional override.
