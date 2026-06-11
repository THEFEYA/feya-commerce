# FEYA Commerce — Phase A Implementation Plan

Status: active plan  
Phase: read-only Supabase preview

---

## 1. Goal

Create the first working application layer for FEYA Commerce.

The goal is not final production launch.

The goal is:

- connect safely to Supabase;
- read from safe views only;
- show storefront catalog preview;
- show Russian admin review dashboard;
- keep everything read-only.

---

## 2. First application routes

### Public storefront preview

```text
/
/shop
/shop/[slug]
```

`/shop` reads from:

```text
public.feya_commerce_v_step7_storefront_products_api
```

`/shop/[slug]` can start from the same view using `product_slug`.

### Admin preview

```text
/admin
/admin/review
/admin/products
```

Admin routes are read-only in Phase A.

Recommended data sources:

```text
public.feya_commerce_v_step8_review_queues_summary
public.feya_commerce_v_step6_product_catalog_overview
public.feya_commerce_v_step6_product_builder_detail
```

---

## 3. First UI components

### Storefront

- ProductCard
- ProductGrid
- PriceRange
- ProductBadges
- ProductImage
- EmptyState
- LoadingState

### Admin

- AdminMetricCard
- ReviewQueueCard
- AdminProductTable
- ProductReadinessBadge
- IssueBadge
- AdminPageHeader

### Shared

- Currency formatter
- Supabase error state
- Image fallback

---

## 4. Data access rules

Use Supabase anon key only for safe read-only queries.

Do not query raw tables from public pages.

Do not expose service role key in browser.

Do not add server write actions yet.

---

## 5. TypeScript data contracts

Create local TypeScript types for:

- StorefrontProduct
- StorefrontConfiguration
- ReviewQueueSummary
- AdminCatalogRow
- ProductBuilderDetail

Keep types based on Supabase views.

Avoid over-modeling future write workflows in Phase A.

---

## 6. Phase A acceptance checklist

Phase A is done when:

- project builds locally;
- Supabase env vars are documented;
- `/shop` shows products from safe storefront view;
- product cards show image, title, price range and currency;
- `/admin/review` shows review queue counts;
- `/admin/products` shows a read-only product table;
- no raw tables are queried by public pages;
- no write/edit mutations exist;
- no service role key is exposed.

---

## 7. What comes after Phase A

Phase B:

- product detail page improvements;
- admin product detail read-only view;
- missing price/missing media/fallback review drilldowns.

Phase C:

- controlled admin write workflows;
- Product Builder editing;
- content/SEO review workflow.

Phase D:

- storefront design polish;
- collections/SEO landing pages;
- media optimization.

Phase E:

- checkout/order strategy.
