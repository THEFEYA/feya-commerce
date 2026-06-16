# FEYA Commerce — Supabase Price & Configuration Contract v4 Spec

Date: 2026-06-13
Status: Draft spec for Supabase-side implementation
Depends on: `docs/DATA_AUDIT_PRICE_DNA_V1.md`, `docs/VISUAL_LOCK_PHASE_C_V1.md`

## Purpose

Create a clean, frontend-safe product contract that fixes:

1. Russian/transliterated configuration labels leaking into the customer UI.
2. Unverified frontend discount math.
3. Full-set prices looking too low.
4. Component/variation rows not mapped to FEYA product DNA.
5. The risk of rebuilding the approved visual storefront while fixing data.

This spec is for a new safe view or API layer, not destructive table changes.

Recommended new view name:

```sql
public.feya_commerce_v_step7_storefront_products_api_v4
```

The existing v1/v2/v3 views should remain available until v4 is tested.

## Non-negotiable safety rules

- Do not expose raw tables to `anon`.
- Do not use service role in frontend.
- Do not overwrite existing collector/source rows.
- Do not manually edit individual rows.
- Do not break the existing `product_slug` URLs.
- Do not remove `media_gallery` behavior from v3.
- Do not change visual frontend layout for this patch.

## v4 top-level product fields

v4 should preserve current frontend fields and add explicit price confidence fields.

Required fields:

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
media_count
has_video
media_gallery
currency
min_price
max_price
storefront_candidate_flag
has_fallback_price
has_sampler_excluded_price
public_configuration_count
public_price_row_count
pdp_option_count
has_multiple_pdp_options
configurations
```

New price-safety fields:

```text
price_contract_version = 'v4'
price_source_mode
price_confidence_status
has_unverified_discount
has_russian_public_label
needs_price_review
needs_label_review
```

Suggested values:

```text
price_source_mode:
  collector_visible_price
  collector_original_price
  manual_price
  fallback_visible_price
  unknown

price_confidence_status:
  approved
  review_discount_risk
  review_fallback_price
  review_missing_price
  review_label_translation
```

## Configuration object contract

Each object in `configurations[]` must be customer-safe.

Required fields per option:

```text
configuration_id
configuration_price_id
source_price_row_id
sellable_configuration_id
configuration_name
configuration_label
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
currency
price_source_mode
price_confidence_status
has_fallback_price
has_russian_raw_label
needs_label_review
sort_order
```

Frontend display rules:

```text
Use public_label for PDP option text.
Use display_price_amount only for current price.
Use compare_at_price_amount only when a real compare-at/original price is approved.
Never display raw_option_value to customer.
Never calculate discount in frontend unless v4 explicitly provides discount_percent or compare_at_price_amount.
```

## Russian label policy

Russian/Cyrillic strings are allowed only in raw/source/debug fields.

They must not appear in:

```text
card_title
h1
seo_title
configuration_label
public_label
product_type
material
color
frontend-visible fields
```

If a label cannot be safely translated, v4 should set:

```text
public_label = 'Option N'
needs_label_review = true
has_russian_raw_label = true
```

Do not guess high-risk labels in production.

## Component/DNA mapping policy

Raw Etsy/collector option names must map into normalized FEYA component codes.

Examples:

```text
Fringe Skirt / Open Skirt / Leather Skirt / Юбка -> component_code = skirt
Top / Bra / Bustier / Вершина / Топ -> component_code = top
Shoulder / Shoulders / Плечо / Плечи -> component_code = shoulders
Forearm Bracers / Наручи для предплечья -> component_code = forearm_bracers
Biceps Armor / элементы защиты бицепсов -> component_code = biceps_armor
Choker / Collar / Воротник / колье -> component_code = choker
Mask / Маска -> component_code = mask
Full Set / Полный комплект -> component_code = full_set, is_full_set = true
```

Suggested component families:

```text
top
skirt
arms
shoulders
legs
head
mask
choker
belt
bodysuit
wings
tail
spine
full_set
other
```

## Full-set savings policy

Full-set savings should not be invented by frontend.

v4 should provide enough data for savings calculation:

```text
full_set_display_price_amount
component_sum_display_price_amount
full_set_savings_amount
full_set_savings_percent
```

Rules:

- Calculate savings only when a full-set option and component options are both available.
- If component rows are incomplete, set `full_set_savings_amount = null`.
- Frontend should hide savings text if value is null or <= 0.

## Discount policy

Current frontend global `SALE_PERCENT` must stay disabled until v4 provides approved sale data.

v4 must distinguish:

```text
base_price_amount: original approved price
sale_price_amount: current sale price if active
compare_at_price_amount: crossed-out price if different from sale
discount_percent: approved discount percent
```

If collector price is already discounted, do not apply discount again.

## Media policy

Keep media behavior from v3/fast media view:

```text
primary_image_url = first image
secondary_image_url = second image
hover_image_url = second image when available, otherwise primary
media_gallery = all imported image URLs in source order
has_video = false until real video URLs are imported
```

Product card hover should use:

```text
hover_image_url
```

PDP gallery should use:

```text
media_gallery
```

## Acceptance criteria

v4 is accepted only if:

1. No public label contains Cyrillic.
2. No frontend sale math is required.
3. Full-set price equals approved v4 display price.
4. Compare-at price only appears when approved.
5. Fallback/unknown prices are clearly marked for review.
6. PDP configurations show English labels only.
7. Media gallery still returns 7–10 images where available.
8. Raw tables remain closed to anon/authenticated.
9. Frontend visual layout is unchanged except for correct labels/prices.

## Recommended implementation order

1. Build diagnostic views/queries for current source problems.
2. Create label mapping table or view CTE for Cyrillic/raw labels.
3. Create component mapping layer.
4. Create price confidence layer.
5. Create `storefront_products_api_v4` safe view.
6. Grant select only on v4 safe view.
7. Test v4 on a sample of 20 products.
8. Switch frontend from v3 to v4 only after comparison.

## Frontend switch plan

Current frontend must remain compatible with v3 while v4 is being built.

When v4 is ready:

- update `STOREFRONT_VIEW_V3` or add `STOREFRONT_VIEW_V4` in `lib/storefront.ts`;
- read `public_label`, `display_price_amount`, `compare_at_price_amount`, and `discount_percent`;
- keep v3 as fallback for one release;
- remove temporary frontend Cyrillic label fallback after v4 is proven clean.
