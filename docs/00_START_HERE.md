# FEYA Commerce — Start Here

Status: active code repository  
Source of truth for Phase 0 canon: `THEFEYA/FEYA/docs/feya-commerce/`  
Current repository: `THEFEYA/feya-commerce`

---

## 1. What this repository is

This repository is the future application/codebase for the independent TheFEYA commerce system.

It is not:

- a Shopify clone;
- an Etsy export viewer;
- a real estate project;
- an old Etsy SEO Monitor continuation;
- a generic CRUD admin.

It is TheFEYA Commerce Engine:

- English public storefront;
- Russian internal admin;
- Supabase-backed catalog;
- read-only safe views first;
- Product Builder later;
- SEO/AI workflow later;
- media pipeline later;
- checkout later.

---

## 2. Current implementation phase

Current phase:

```text
Phase A — read-only Supabase preview
```

Goal:

1. Connect to safe Supabase views.
2. Build a read-only storefront catalog preview.
3. Build a read-only admin review dashboard.
4. Do not add write/edit mutations yet.

---

## 3. Safe Supabase views for Phase A

Use these views first:

```text
public.feya_commerce_v_step7_storefront_products_api
public.feya_commerce_v_step7_storefront_configurations
public.feya_commerce_v_step7_storefront_cards
public.feya_commerce_v_step8_review_queues_summary
public.feya_commerce_v_step8_project_report
public.feya_commerce_v_step8_frontend_api_contract
```

Admin/debug views may use:

```text
public.feya_commerce_v_step6_product_catalog_overview
public.feya_commerce_v_step6_product_builder_detail
public.feya_commerce_v_step6_needs_price
public.feya_commerce_v_step6_missing_media
public.feya_commerce_v_step6_fallback_price_review
public.feya_commerce_v_step6_sampler_excluded
```

---

## 4. Forbidden for public frontend

Do not expose raw source tables publicly:

```text
feya_commerce_source_listings
feya_commerce_source_price_rows
```

Do not show sampler/probnik publicly.

Do not treat fallback price rows as final approved pricing.

Do not rebuild dropped FK blindly:

```text
feya_commerce_source_price_rows_source_listing_id_fkey
```

---

## 5. Current known Supabase handoff counts

Latest reported state from Supabase handoff:

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

These counts must be verified again before production launch.

---

## 6. First build target

First app target:

- `/` — simple project home/status page;
- `/shop` — read-only storefront product grid from safe storefront API view;
- `/admin` — Russian read-only admin overview;
- `/admin/review` — review queues summary;
- `/admin/products` — read-only catalog overview.

No product editing yet.

---

## 7. Environment variables

Use `.env.local` locally. Never commit real secrets.

Required later:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Service role keys must not be used in the browser.

---

## 8. Work rule

Every implementation step must keep these priorities:

```text
safe data access
→ read-only preview
→ admin review clarity
→ product builder later
→ storefront polish later
→ write workflows later
```

Do not build checkout or full CRM before read-only catalog and review dashboard are stable.
