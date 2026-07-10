# SEO Product Truth Aggregation Contract v1

Date: 2026-07-10

## Purpose

`public.feya_commerce_v_seo_product_truth_v1` is an aggregation and contract layer. It is not a second component normalizer.

It must combine product identity, source listing evidence, option prices, sellable configurations, and the existing component mapping/review system into one server-only row per `canonical_product_id`.

## Existing normalization authority

The Product Truth view must consume the existing Supabase mapping layer:

- `public.feya_commerce_seo_component_phrase_map_v1`
- `public.feya_commerce_seo_component_phrase_components_v1`
- `public.feya_commerce_v_seo_product_component_mapping_v1`
- `public.feya_commerce_v_seo_component_mapping_review_v1`
- `public.feya_commerce_v_seo_component_mapping_coverage_v1`
- `public.feya_commerce_v_product_option_text_derivation_v1`
- `public.feya_commerce_v_product_component_configuration_derivation_v1`
- `public.feya_commerce_component_families`
- `public.feya_commerce_component_aliases`

Do not duplicate this behavior with application regexes or SQL such as:

```sql
case when raw_option_value ilike '%юбк%' then 'skirt'
```

## Evidence rule

Keep these concepts separate:

1. `raw_label`
   - exact source text and language;
   - never discarded.

2. mapped component family
   - comes from the existing phrase/component mapping layer;
   - never inferred from keywords, title, image style, or substring matching.

3. selectable configuration
   - buyer choice such as one shoulder, full shoulders, top only, skirt only, or full set;
   - does not mean every piece is included in every purchase.

4. review blocker
   - remains visible when a raw phrase has no approved mapping or evidence sources disagree.

## Configuration-aware included-components rule

An approved phrase mapping proves what a raw option phrase means. It does not by itself prove that the mapped component is included in every purchase.

Therefore `included_components` must not be the simple union of all approved component mappings for a product.

A component may enter `included_components` only when configuration-aware evidence proves that it is unconditional, for example:

- it is present in every eligible public, non-sampler sellable configuration; or
- it is an explicitly fixed base component confirmed by the existing mapping/configuration contract without review blockers.

Mutually exclusive buyer choices remain in `optional_configurations`. For example, approved mappings for `Top only`, `Skirt only`, and `Full Set` must not produce `included_components = ["Top", "Skirt"]` merely because both component phrases are understood.

If configuration ownership, component family, review state, or price linkage is unresolved, keep the component out of `included_components` and preserve the blocker.

A `NULL` review status is unresolved. SQL must use null-safe review checks and must not allow `NULL NOT IN (...)` to suppress a blocker or produce `needs_review = null`.

## Variation and price alignment rule

Do not pair source variation values with price rows solely because both happen to have the same ordinal position.

Positional pairing is permitted only as explicitly unapproved evidence when all of the following are confirmed:

- the existing derivation layer identifies the same configuration axis;
- source counts match;
- source order is deterministic;
- the result is labeled `positional_evidence_only_unapproved`;
- the pairing cannot confirm component truth or clear a blocker.

Otherwise preserve variation values and price rows separately and add an alignment blocker instead of inventing a pair.

## Provenance and structured JSON rule

`mapping_layer_sources` must distinguish sources directly queried by the Product Truth SQL from sources that are only upstream dependencies of an existing view. Do not claim direct provenance for a table or view that the SQL does not consume.

The following Product Truth fields are structured JSON evidence arrays, not flattened string lists:

- `optional_configurations`;
- `available_variants`;
- `known_non_components`;
- `unresolved_component_facts`;
- `component_review_blockers_json`;
- `source_variations_json`;
- `option_price_rows_json`.

The application must preserve their objects and raw labels. It must not run them through a component-string extractor that discards fields such as `raw_value`, `parallel_source_raw_value`, `mapping_status`, `review_reason`, prices, or source identifiers.

All JSON arrays must be deterministic. Every `jsonb_agg`, including deduplicated sellable-configuration aggregates, must have stable ordering.

## Unmapped phrase rule

When a raw phrase is not resolved by the existing mapping layer:

- preserve the raw phrase;
- add `missing_component_phrase_mapping`;
- keep `unresolved_component_facts` non-empty;
- do not guess the component family;
- do not allow real AI generation.

## Pilot product

```text
matched_etsy_listing_id: 4348580005
canonical_product_id: b6e0171f-4d42-4d71-88b1-ee0d4e0e109e
```

Known source evidence:

- source description: `KIT INCLUDES: Shoulder`;
- source variation meaning: `One Shoulder / Full Shoulders`;
- source price values: `Одно плечо / Полные плечи`;
- Product Focus component JSON is empty;
- option component family/code is null;
- current component mapping returns `unmapped_raw_phrase` for both Russian values.

Expected Product Truth state before mapping repair:

```text
included_components: []
optional_configurations: preserve One Shoulder / Full Shoulders evidence
unresolved_component_facts: non-empty
component_review_blockers:
- product_focus_components_empty
- source_description_indicates_shoulder
- missing_component_phrase_mapping: Одно плечо
- missing_component_phrase_mapping: Полные плечи
- option_component_family_null
```

The source description is evidence, but it is not sufficient to silently promote `shoulder` into confirmed `included_components` while selectable configuration mappings remain unresolved.

## HARD CONTRACT CHECK

```text
HARD CONTRACT CHECK

public.feya_commerce_v_seo_product_truth_v1 is a contract/aggregation layer,
not a new component normalizer.

It must use existing component mapping/review sources only:

- public.feya_commerce_seo_component_phrase_map_v1
- public.feya_commerce_seo_component_phrase_components_v1
- public.feya_commerce_v_seo_product_component_mapping_v1
- public.feya_commerce_v_seo_component_mapping_review_v1
- public.feya_commerce_v_seo_component_mapping_coverage_v1
- public.feya_commerce_v_product_option_text_derivation_v1
- public.feya_commerce_v_product_component_configuration_derivation_v1
- public.feya_commerce_component_families
- public.feya_commerce_component_aliases

It must not infer component truth from:
- source title;
- SEO keywords;
- image interpretation;
- ad-hoc CASE WHEN;
- ILIKE/regex component classification;
- automatic translation of raw phrases.

For pilot:

matched_etsy_listing_id = 4348580005
canonical_product_id = b6e0171f-4d42-4d71-88b1-ee0d4e0e109e

Current unresolved raw phrases:

- Одно плечо
- Полные плечи

Until approved mapping exists for these raw phrases, expected Product Truth output is:

included_components = []

optional_configurations must preserve raw evidence:
- One Shoulder / Одно плечо
- Full Shoulders / Полные плечи

unresolved_component_facts must be non-empty.

component_review_blockers_json must be non-empty and include:
- product_focus_components_empty
- source_description_indicates_shoulder
- missing_component_phrase_mapping: Одно плечо
- missing_component_phrase_mapping: Полные плечи
- option_component_family_null

Source description fragment “KIT INCLUDES: Shoulder” is evidence only.
It cannot by itself confirm included_components while option mapping remains unresolved.

If the view returns included_components = ["shoulder"] before approved mapping repair for
“Одно плечо” and “Полные плечи”, the SQL violates the Product Truth contract.

A successful SQL execution is not a PASS if unresolved mapping was hidden or replaced with inferred component truth.
```

Главная проверка простая:

```text
Если SQL красиво работает, но для 4348580005 сам догадался included_components = ["shoulder"],
значит SQL неправильный.
```

## Application behavior

The GitHub application must:

- prefer `feya_commerce_v_seo_product_truth_v1`;
- treat Listing Master Product Focus only as blocked diagnostic evidence;
- preserve mapped values without semantic remapping;
- preserve structured JSON evidence objects without flattening them to component strings;
- preserve raw variations and price rows;
- block OpenAI generation while component blockers or unresolved facts exist;
- never use SEO keywords as component evidence.