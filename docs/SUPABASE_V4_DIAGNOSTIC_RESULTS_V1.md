# FEYA Commerce — Supabase v4 Diagnostic Results v1

Date: 2026-06-13

## Status

Diagnostics completed in a Supabase-connected context in READ ONLY mode.

No v4 view was created during diagnostics.

No existing v1/v2/v3 objects were modified.

---

## Main decision

v4 can be created now, but it must not be a direct copy of v3.

The correct next step is an add-only safe contract view:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

The v4 view must rebuild `configurations` and expose only safe public fields.

---

## Row counts

```text
source_listings                         334
source_price_rows                     1,193
product_drafts                          334
option_mappings                       1,169
sellable_configurations                 459
configuration_prices                  1,169
media_drafts                          2,651
content_drafts                          334
component_families                       24
component_aliases                        24
sampler_aliases                           7
storefront_products_api v1              243
storefront_products_api v2              243
storefront_products_api v3              243
media_gallery_fast_v1                   243
```

v4 does not exist yet.

---

## Key findings

### 1. Cyrillic label exposure

All existing storefront views still contain Cyrillic somewhere inside `configurations` JSON:

```text
v1: 243 products
v2: 243 products
v3: 243 products
```

Cyrillic appears mostly in raw/internal fields, but sometimes also in public-facing label fields.

v4 must not expose Russian/Cyrillic values as public labels.

### 2. Fallback prices

Current v3 exposes zero fallback prices:

```text
fallback_options_exposed_in_v3 = 0
```

But fallback rows exist in source/config layers:

```text
source visible_price fallback rows: 78
configuration fallback needs_review rows: 73
missing_price rows: 17
```

v4 must explicitly mark or exclude fallback prices.

### 3. Discount contract missing

Supabase currently has no approved sale/compare-at contract:

```text
sale_price_amount: not approved
compare_at_price_amount: not approved
discount_percent: not approved
original_price: not available
```

Therefore v4 must not treat any frontend/global discount as approved pricing.

Initial v4 should use:

```text
base_price_amount = public_price_amount
display_price_amount = public_price_amount
sale_price_amount = null
compare_at_price_amount = null
discount_percent = null
price_contract_version = v4_unverified
```

### 4. Component normalization blocker

Current `component_family_id` is empty for all option mappings:

```text
1169 / 1169 option_mappings have no component_family_id
```

Therefore v4 cannot rely on existing component_family_id.

For launch-safe v4, component information must be heuristic in the safe view layer.

### 5. Full Set / bundle detection

Current data contains:

```text
full_set_option_rows = 215
products_with_full_set = 210
bundle_like_option_rows = 10
```

v4 can set `is_full_set` and partial `is_bundle` heuristically.

Savings should be unverified until component mapping is normalized.

### 6. Sampler exclusion

Sampler exclusion currently works:

```text
source sampler rows = 2
sampler excluded rows = 2
sampler exposed in v3 = 0
```

v4 must preserve this exclusion.

### 7. Media readiness

Media is launch-usable:

```text
v3 products = 243
products_without_media = 0
avg_media_count = 8.48
products_with_second_image = 241
products_with_video = 0
```

AI/styled media exists and must remain flagged.

---

## v4 fields safe to carry from v3

```text
canonical_product_id
product_slug
matched_etsy_listing_id
source_url
card_title
h1
seo_title
meta_description
product_type
material
color
size_mode
production_profile
shipping_profile
handmade_flag
styled_imagery_flag
primary_image_url
primary_image_alt
secondary_image_url
hover_image_url
video_url
has_video
media_count
media_gallery
currency
storefront_candidate_flag
```

---

## v4 fields to rebuild

`configurations` must be rebuilt.

Do not copy v3 configurations directly.

Required configuration-level fields:

```text
public_label
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
```

---

## v4 public label rule

v4 must generate English `public_label` values through safe CASE mapping.

Raw Russian labels may be used only internally for diagnostics.

If a safe English label cannot be generated:

```text
public_label = Option
needs_label_review = true
has_russian_raw_label = true if raw contains Cyrillic
```

---

## Next step

Create v4 as add-only SQL.

Then validate:

```text
v4 exists
v4 row count = 243
no Cyrillic in public_label
fallback launch exposure = 0
sampler exposure = 0
configurations contain required v4 fields
frontend can query v4 first and fallback remains safe
```

Do not continue payment, SEO feeds, or production launch until v4 validation passes.
