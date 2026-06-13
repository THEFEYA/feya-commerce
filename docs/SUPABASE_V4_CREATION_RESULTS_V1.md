# FEYA Commerce — Supabase v4 Creation Results v1

Date: 2026-06-13

## Status

Supabase v4 safe contract view has been created and validated.

Created object:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

Migration name reported by Supabase:

```text
feya_commerce_step7_storefront_products_api_v4_safe_contract
```

Result:

```text
success = true
```

---

## Safety confirmation

Supabase work was add-only for the new safe v4 view.

Not modified:

```text
v1
v2
v3
raw/source tables
payment
orders
SEO/feed/export
```

Access:

```text
anon can select v4 = true
authenticated can select v4 = true
anon can select raw source listings = false
anon can select raw source price rows = false
```

Raw/source tables remain closed.

---

## v4 basic validation

```text
v4_exists = true
v4_row_count = 243
```

The frontend fallback order remains valid:

```text
v4 -> v3 -> v2 -> v1
```

Now v4 should be the primary source for storefront reads.

---

## v4 construction

Product/media base:

```text
public.feya_commerce_v_step7_storefront_products_api_v3
```

Configurations rebuilt from:

```text
configuration_prices
source_price_rows
sellable_configurations
```

Important: v3 `configurations` JSON was not copied directly.

---

## Product-level contract status

```text
products = 243
products_with_v4_contract = 243
products_with_source_option_text_mode = 243
products_unverified = 243
products_with_unverified_discount_flag = 0
products_with_russian_public_label = 0
products_needing_label_review = 65
products_needing_price_review = 0
```

Contract values:

```text
price_contract_version = v4_unverified
price_source_mode = source_option_text
price_confidence_status = unverified
has_unverified_discount = false
```

No sale/discount/compare-at contract is asserted in v4.

---

## Configuration JSON validation

Sample validation confirmed required keys exist.

Required configuration fields:

```text
configuration_id
sellable_configuration_id
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
currency
price_source_mode
price_confidence_status
has_fallback_price
has_russian_raw_label
needs_label_review
sort_order
```

---

## Public label safety

```text
configuration_rows = 1066
configurations_with_cyrillic_public_label = 0
products_with_russian_public_label_flag = 0
```

Raw Russian source is not exposed as buyer-facing text.

Russian raw presence is only flagged:

```text
configurations_with_russian_raw_label = 1066
```

---

## Review zones

```text
products_needing_label_review = 65
configurations_needing_label_review = 206
products_price_confidence_status_unverified = 243
```

These are not blockers for frontend wiring.

They are blockers for final launch/pricing approval.

---

## Fallback / sampler validation

```text
fallback_configurations_exposed = 0
fallback_exposed_as_approved = 0
sampler_like_public_label_rows = 0
products_needing_price_review = 0
```

Sampler/probnik options remain excluded from public configurations.

Fallback prices are not exposed as approved launch prices.

---

## Sale / discount validation

```text
configurations_with_sale_or_discount_contract = 0
products_with_unverified_discount_flag = 0
```

v4 price fields:

```text
base_price_amount = display_price_amount
sale_price_amount = null
compare_at_price_amount = null
discount_percent = null
```

---

## Component / bundle / full-set validation

```text
configuration_rows = 1066
full_set_configuration_rows = 215
products_with_full_set = 210
bundle_configuration_rows = 75
configurations_with_component_code = 860
configurations_without_component_code = 206
products_with_component_sum = 208
products_with_full_set_savings = 153
```

Heuristic mapping is usable for storefront/UI metadata.

It is not yet final product truth.

---

## Frontend usage rule

Frontend should now read:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

For configurations, frontend should use:

```text
configurations[].public_label
configurations[].component_code
configurations[].component_family
configurations[].is_full_set
configurations[].is_bundle
configurations[].bundle_component_codes
configurations[].display_price_amount
configurations[].currency
configurations[].price_confidence_status
configurations[].needs_label_review
```

Frontend must not use legacy raw labels from v1/v2/v3:

```text
raw_option_value
configuration_name
option_name
```

---

## Next decision

v4 is safe for frontend wiring.

Next GitHub work:

```text
1. Confirm frontend select/adapter matches v4 fields.
2. Confirm /shop and PDP use v4 first.
3. Fix checkout draft metadata persistence so v4 cart metadata is not lost.
4. Keep payment disabled.
5. Do not start SEO/feed/export until v4 storefront behavior is manually checked.
```
