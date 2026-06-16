# FEYA Commerce — Supabase v4 Handoff from GitHub v1

Date: 2026-06-13  
Repository: `THEFEYA/feya-commerce`  
Branch: `rebuild/emergent-template-port-v2`  
PR: #5  
Head commit: `8c2255ce9f1d00ef5e9ef290350c53b3967fac43`

## Purpose

This document is a compact handoff from the GitHub/frontend work into the Supabase v4 diagnostics step.

Use it together with:

```text
docs/SUPABASE_V4_DIAGNOSTIC_PROMPT_V1.md
```

---

## 1. Current GitHub status

PR title:

```text
Recover FEYA storefront baseline and prepare v4-safe data wiring
```

PR state:

```text
open / draft / mergeable
```

CI status for the latest head commit:

```text
Phase A CI — completed / success
```

---

## 2. Current frontend state

The frontend is already prepared to consume a future v4 safe view.

Implemented:

```text
STOREFRONT_VIEW_V4
STOREFRONT_V4_CARD_SELECT
STOREFRONT_V4_PDP_SELECT
```

Current frontend query order:

```text
/shop:        v4 -> v3 -> v2 -> v1
/shop/[slug]: v4 -> v3 -> v2 -> v1
```

If v4 does not exist, the frontend falls back to current v3/v2/v1 views.

---

## 3. Current v4 frontend expectations

The future Supabase v4 view should provide product-level fields where possible:

```text
price_contract_version
price_source_mode
price_confidence_status
has_unverified_discount
has_russian_public_label
needs_price_review
needs_label_review
full_set_display_price_amount
component_sum_display_price_amount
full_set_savings_amount
full_set_savings_percent
category_label
world_label
canonical_color_label
color_options
```

The future `configurations` JSON should provide configuration-level fields:

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

## 4. Required Supabase diagnostics

Before writing v4 SQL, run diagnostics for:

1. source table/view existence;
2. current v1/v2/v3 row counts;
3. Russian/Cyrillic public label exposure;
4. fallback price exposure;
5. possible double-discount / collector visible-price issue;
6. component normalization coverage;
7. full-set/bundle detection coverage;
8. media readiness;
9. sampler/probnik exclusion;
10. existing view contracts and missing columns.

---

## 5. Non-negotiable SQL rules

Do not:

- drop v1/v2/v3;
- overwrite raw source tables;
- manually edit rows one by one;
- expose raw tables to public frontend;
- use fallback prices as approved prices;
- expose Cyrillic/raw labels as public labels;
- activate payment;
- create paid orders;
- generate SEO/feed pages from unverified data.

Preferred approach:

- add-only diagnostics;
- versioned helper views/tables;
- safe v4 view only after diagnostics;
- rollback-safe frontend because it already falls back to v3/v2/v1.

---

## 6. What Supabase should produce next

Create/update:

```text
docs/SUPABASE_V4_DIAGNOSTIC_RESULTS_V1.md
```

The result should answer:

1. Which source objects exist now?
2. Which objects are missing?
3. How many rows are safe for storefront?
4. How many products/configurations need label review?
5. How many need price review?
6. How many have fallback prices?
7. How many have possible unverified discounts?
8. How many can map to canonical component codes?
9. Which fields can v4 safely expose immediately?
10. What exact SQL should be written next?

---

## 7. Current decision

Do not continue payment, SEO feeds, or production launch work until Supabase v4 diagnostics are completed and reviewed.

The frontend is ready to consume v4 when it exists, but the data contract must now be proven in Supabase.
