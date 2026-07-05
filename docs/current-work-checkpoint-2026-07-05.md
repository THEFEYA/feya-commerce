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

## Listing Master blocker found after diagnostics

The current Listing Master issue is not just a visual bug.

For product `b6e0171f-4d42-4d71-88b1-ee0d4e0e109e` / Etsy `4348580005`, Supabase diagnostics showed:

- product focus view has real title/material/category/media, but normalized DNA fields are mostly empty:
  - parent_components_json = []
  - child_components_json = []
  - context_primary/context_secondary/persona/style/gender/audience = null
  - color = null, but canonical_color_label = Gold
- title/focus_text contains useful text signals: shoulders, gold, Burning Man, rave, futuristic, apocalyptic, warrior, men.
- `vw_seo_keyword_bank_v1_for_listing_master` has 4827 approved rows, but it has no separate product-compatibility DNA columns such as component/material/color/event/style/persona/audience/gender.
- Because of that, the frontend currently tries to connect product focus and keyword bank by text matching over keyword/source_clusters/page_type/reason/notes.
- Strict matching like shoulders + gold + rave + futuristic + warrior returns 0 rows.
- Medium matching shoulders + gold returns only 4 rows.
- Relaxed shoulders OR gold returns many rows but can include broad/noisy rows if not guarded.
- A naive substring match for `men` is wrong because it catches `placement` inside reason text.
- Approved keyword bank contains valid portfolio-wide words that are wrong for this product, such as women/ladies, bodysuit, neon, snake, and legacy noise like lego.

Conclusion: do not keep patching the UI with blind text filters. The correct next layer is a read-only product-keyword compatibility bridge.

## Next Supabase step

Create a read-only bridge view, not a second keyword bank:

`public.feya_commerce_v_listing_master_keyword_match_preview_v1`

Purpose:

- combine `feya_commerce_v_listing_master_product_focus_v1` with `vw_seo_keyword_bank_v1_for_listing_master`;
- compute positive match signals for component/material/color/event/style/persona/audience;
- compute negative flags for wrong gender/product type/noise/bodysuit/neon/snake/lego;
- expose final match status such as STRONG_MATCH / MEDIUM_MATCH / BROAD_MATCH / EXCLUDE;
- expose reason_json so the UI can show why a word is suggested or excluded;
- keep `seo_keyword_bank_v1` as the only source of truth.

Do not:

- create a second SEO Keyword Bank;
- delete women/bodysuit/neon/snake from the general bank, because they may be valid for other products;
- mass-change review_status;
- generate SEO packs until keyword matching works for at least one product.

## Next GitHub step after Supabase bridge exists

Patch `/admin/listing-master` to use the new bridge view for selected product keyword suggestions.

Frontend should:

- keep auto-focus chips/buttons as an operator UI layer;
- apply filters only after the operator clicks “Применить поиск слов”;
- use bridge view match_status/reason_json instead of raw text contains where possible;
- never show EXCLUDE rows in normal suggestions;
- show a compact reason popup/details only when needed;
- keep Russian UI labels and English keyword values.

## Next project step

1. Create Supabase read-only bridge view for product-keyword matching.
2. Validate it on product `b6e0171f-4d42-4d71-88b1-ee0d4e0e109e`.
3. Patch Listing Master to consume the bridge.
4. Save first clean decision draft.
5. Move to SEO Brief page/flow.
6. Generate first real SEO Pack only after:
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
