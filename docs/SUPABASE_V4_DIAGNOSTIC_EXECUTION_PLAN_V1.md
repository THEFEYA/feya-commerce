# FEYA Commerce — Supabase v4 Diagnostic Execution Plan v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
Status: execution plan, not SQL yet

## Purpose

This document defines the exact diagnostic block required before creating or switching to the v4 storefront data contract.

It follows:

- `docs/CONTROL_TOWER_ROADMAP_V1.md`;
- `docs/DATA_AUDIT_PRICE_DNA_V1.md`;
- `docs/SUPABASE_PRICE_CONFIG_CONTRACT_V4_SPEC.md`;
- `docs/VISUAL_LOCK_PHASE_C_V1.md`.

The goal is to make product prices, labels, configurations and components safe enough for a real storefront and later checkout.

---

## 1. Why this block comes now

The current storefront visual is usable, but it is connected to the v3 data contract.

v3 is acceptable for visual preview, but not enough for production launch because:

- some source labels came from a translated/Russian collector context;
- option labels are not fully normalized;
- component codes are not fully canonical;
- full-set/bundle logic is not fully explicit;
- collected prices may already include sale/discount effects;
- fallback prices must not become approved launch prices;
- frontend should not be responsible for business price math.

Therefore, the next correct block is data diagnostics first, then v4 safe view/API contract.

---

## 2. Non-negotiable rules

Do not:

- manually edit individual Supabase rows;
- overwrite source collector data;
- drop v1/v2/v3 views while testing v4;
- move payment forward before v4 prices/labels are safe;
- show raw Russian/internal option labels publicly;
- use frontend regex guesses as the primary product taxonomy;
- invent discounts in frontend;
- publish SEO/feed pages from unapproved data.

Allowed:

- create diagnostic views;
- create versioned mapping tables/import tables;
- create safe v4 view;
- keep old views available for rollback;
- keep frontend visual unchanged while switching data source later.

---

## 3. Current expected source layers

Expected existing source/canonical layers from prior handoff:

- source listings: imported Etsy listing/source rows;
- source price rows: browser collector price/configuration rows;
- product drafts: canonical product draft layer;
- option mappings/configurations: mapping between source options and sellable configurations;
- media drafts/gallery views;
- v3 storefront products API view;
- review queues for price/media/source issues.

Counts must be re-verified in Supabase before using them as truth.

Previously reported counts:

```text
source_listings = 334
source_price_rows = 1193
product_drafts = 334
option_mappings = 1169
sellable_configurations = 459
configuration_prices = 1169
content_drafts_en = 334
media_drafts = 2651
storefront_products_api = 243
storefront_configurations = 442
storefront_excluded = 91
needs_price = 17
missing_media = 10
fallback_price_review_rows = 92
sampler_excluded_rows = 2
```

These are not launch truth until rechecked.

---

## 4. Diagnostic output A — source coverage

Purpose: confirm that all source layers still match each other.

Required output columns:

```text
metric_code
metric_label
row_count
notes
severity
```

Required checks:

- total source listings;
- total source price rows;
- total product drafts;
- total storefront-ready products v3;
- total storefront-excluded products;
- products without any price rows;
- products without media;
- source listings not mapped to product drafts;
- price collector rows not mapped to product drafts;
- duplicated source listing IDs;
- duplicated product slugs;
- sampler/probnik rows excluded from public storefront.

Acceptance condition:

- no unexpected unmapped source blocks;
- sampler rows excluded;
- missing media and missing price rows clearly listed.

---

## 5. Diagnostic output B — Russian/internal label audit

Purpose: identify every value that must not appear in customer-facing storefront/order snapshots.

Required output columns:

```text
source_listing_id
product_slug
field_name
raw_value
suggested_public_label
source_layer
has_cyrillic
has_safe_english_alternative
needs_manual_review
severity
```

Required checks:

- product title fields;
- H1/card title fields;
- option axis names;
- option values;
- configuration labels;
- material/color fields;
- product type/category fields;
- order item snapshot labels if any drafts already exist.

Rules:

- Russian/Cyrillic values may stay in raw/debug fields;
- public storefront fields must be English;
- if confident mapping exists, use public label;
- if not confident, public label becomes `Option N` and review flag is true.

Acceptance condition:

- all public labels are English or review-blocked;
- no raw collector-language labels leak to storefront.

---

## 6. Diagnostic output C — price reconciliation audit

Purpose: prevent wrong launch prices and double discounts.

Required output columns:

```text
source_listing_id
product_slug
configuration_id
raw_option_label
public_label
component_code
collector_price_amount
collector_currency
current_v3_min_price
current_v3_max_price
current_frontend_display_price
suspected_price_source_mode
suspected_discount_status
has_fallback_price
needs_price_review
severity
```

Required checks:

- compare collector price rows with current v3 min/max prices;
- identify fallback visible price rows;
- identify rows where sale/discount may already be included;
- identify full-set prices that look too low;
- identify component options with missing price;
- identify products where min/max range is polluted by sampler/probnik;
- identify products with only fallback price available.

Suggested `suspected_price_source_mode` values:

```text
collector_visible_price
collector_original_price
manual_price
fallback_visible_price
unknown
```

Suggested `suspected_discount_status` values:

```text
already_discounted
probably_original
needs_original
fallback
unknown
```

Acceptance condition:

- every public product has a launch-safe display price or is blocked with `needs_price_review`;
- frontend no longer invents sale price;
- compare-at price is shown only when approved.

---

## 7. Diagnostic output D — component and bundle mapping audit

Purpose: normalize raw Etsy/collector options into TheFEYA canonical components.

Required output columns:

```text
source_listing_id
product_slug
raw_option_value
normalized_public_label
component_code
component_family
is_full_set
is_bundle
bundle_component_codes
confidence
needs_manual_review
severity
```

Canonical examples:

```text
Fringe Skirt / Open Skirt / Leather Skirt / Юбка -> skirt
Top / Bra / Bustier / Топ -> top
Shoulder / Shoulders / Плечи -> shoulders
Choker / Collar / Воротник -> choker
Mask / Маска -> mask
Full Set / Complete Set / Полный комплект -> full_set
```

Important rule:

`Full Set` is a bundle/kit option, not a product type.

Acceptance condition:

- all high-frequency configuration labels have component codes;
- uncertain mappings are blocked for review;
- full-set options are explicit;
- component-only options are distinguishable from full-set options.

---

## 8. Diagnostic output E — media readiness audit

Purpose: ensure storefront and later feeds can use reliable product images.

Required output columns:

```text
product_slug
source_listing_id
primary_image_url
media_count
has_primary_image
has_secondary_image
has_hover_image
has_video
primary_image_alt
needs_media_review
severity
```

Required checks:

- product has primary image;
- product has enough gallery images for PDP;
- hover image exists where possible;
- primary image alt is not empty/generic;
- media gallery remains compatible with current v3 frontend behavior.

Acceptance condition:

- public products without primary media are blocked or reviewed;
- v4 keeps `media_gallery`, `primary_image_url`, `secondary_image_url`, `hover_image_url` behavior.

---

## 9. v4 contract requirements

The future v4 storefront contract must preserve current v3 frontend fields and add explicit safety fields.

Top-level product additions:

```text
price_contract_version
price_source_mode
price_confidence_status
has_unverified_discount
has_russian_public_label
needs_price_review
needs_label_review
```

Configuration object additions:

```text
public_label
raw_option_value
raw_option_text
component_code
component_family
is_full_set
is_bundle
bundle_component_codes
base_price_amount
sale_price_amount
compare_at_price_amount
display_price_amount
discount_percent
price_source_mode
price_confidence_status
has_fallback_price
has_russian_raw_label
needs_label_review
sort_order
```

Frontend display rules after v4:

- use `public_label` for option text;
- use `display_price_amount` for current price;
- use `compare_at_price_amount` only if approved;
- do not calculate discount in frontend;
- never show raw option values to customers.

---

## 10. Supabase implementation order

When Supabase work begins, use this order:

1. Verify existing table/view names and row counts.
2. Run source coverage diagnostics.
3. Run Russian/internal label diagnostics.
4. Run price reconciliation diagnostics.
5. Run component/bundle mapping diagnostics.
6. Run media readiness diagnostics.
7. Create versioned mapping/import tables only if needed.
8. Create or replace v4 safe view.
9. Test v4 row counts against v3.
10. Test several known products manually.
11. Only then switch frontend from v3 to v4.

---

## 11. Frontend switch gate

Do not switch frontend to v4 until:

- v4 returns at least the same public product coverage as expected;
- no public labels contain Cyrillic;
- sampler/probnik is excluded;
- products with missing/fallback prices are flagged;
- display prices are stable;
- media gallery shape remains compatible;
- PDP configurations render correctly;
- full-set/component options are sorted correctly;
- no approved visual layout changes are required.

---

## 12. Next action

Next actionable step after this plan:

```text
Prepare Supabase diagnostics SQL / prompt for a Supabase-connected execution context.
```

Do not run SQL blindly.

Before any SQL is provided, verify whether the current chat/tooling has Supabase access. If not, prepare a copy-paste diagnostic prompt/instruction for the Supabase-connected environment.
