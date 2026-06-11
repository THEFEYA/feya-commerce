# FEYA Commerce — Supabase Handoff

Status: based on user-provided Supabase Step 8 report  
Prefix: `feya_commerce_`  
Schema: `public`

---

## 1. Current Supabase state

Supabase has prepared the commerce data layer through raw import, matching, product drafts, configuration prices, admin readiness views and safe storefront candidate views.

Reported final state:

```text
source_listings = 334
source_price_rows = 1193
listing_matches_total = 1210

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

old_projects_touched = false
```

---

## 2. Main storefront view

Use first:

```text
public.feya_commerce_v_step7_storefront_products_api
```

Expected fields:

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
min_price
max_price
currency
has_fallback_price
has_sampler_excluded_price
public_configuration_count
public_price_row_count
configurations
storefront_candidate_flag
```

---

## 3. Storefront support views

```text
public.feya_commerce_v_step7_storefront_configurations
public.feya_commerce_v_step7_storefront_cards
public.feya_commerce_v_step7_storefront_excluded
```

---

## 4. Admin/review views

```text
public.feya_commerce_v_step6_product_catalog_overview
public.feya_commerce_v_step6_product_builder_detail
public.feya_commerce_v_step6_ready_candidates
public.feya_commerce_v_step6_needs_price
public.feya_commerce_v_step6_missing_media
public.feya_commerce_v_step6_fallback_price_review
public.feya_commerce_v_step6_sampler_excluded
public.feya_commerce_v_step6_admin_dashboard
```

---

## 5. Handoff/report views

```text
public.feya_commerce_v_step8_project_report
public.feya_commerce_v_step8_frontend_api_contract
public.feya_commerce_v_step8_review_queues_summary
public.feya_commerce_v_step8_cleanup_plan
public.feya_commerce_v_step8_github_handoff_prompt
```

---

## 6. Review queue priorities

Priority order:

1. `needs_price = 17`
2. `missing_media = 10`
3. `fallback_price_review_rows = 92`
4. `storefront_excluded = 91`
5. `sampler_excluded_rows = 2` — audit only, not a problem.

---

## 7. Security and safety rules

Do not expose raw source tables publicly:

```text
public.feya_commerce_source_listings
public.feya_commerce_source_price_rows
```

Do not use raw `source_price_rows.source_listing_id` as absolute truth. The FK was reportedly removed because 45 rows had orphan old source listing IDs.

Use matching/views instead.

Do not include sampler/probnik rows in public prices.

Do not treat fallback prices as finally approved.

Do not add write/edit mutations until read-only preview is stable.

---

## 8. First verification queries later

Before relying on production frontend behavior, verify:

```sql
select * from public.feya_commerce_v_step8_project_report;
select * from public.feya_commerce_v_step8_review_queues_summary;
select * from public.feya_commerce_v_step7_storefront_products_api limit 5;
select * from public.feya_commerce_v_step8_frontend_api_contract;
```

These are for a Supabase-connected environment, not for browser public exposure.
