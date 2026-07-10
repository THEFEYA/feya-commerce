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

## Hard contract test

For pilot listing `4348580005`, if `feya_commerce_v_seo_product_truth_v1` returns:

```json
{"included_components":["shoulder"]}
```

before approved phrase mappings exist for both `Одно плечо` and `Полные плечи`, the SQL violates this contract and must be redesigned.

A successful query is not enough. The view is valid only when unresolved mapping remains visible as evidence and blockers rather than being hidden by inferred component truth.

## Application behavior

The GitHub application must:

- prefer `feya_commerce_v_seo_product_truth_v1`;
- treat Listing Master Product Focus only as blocked diagnostic evidence;
- preserve mapped values without semantic remapping;
- preserve raw variations and price rows;
- block OpenAI generation while component blockers or unresolved facts exist;
- never use SEO keywords as component evidence.
