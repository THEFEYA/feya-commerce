# FEYA Commerce

Independent e-commerce system for TheFEYA.

This repository is the application codebase for the TheFEYA owned commerce site and admin system.

## Current phase

```text
Phase A — read-only Supabase preview
```

The first implementation target is intentionally small and safe:

- public storefront preview from safe Supabase views;
- Russian admin review dashboard;
- read-only product overview;
- no write/edit mutations;
- no checkout yet;
- no raw source tables exposed publicly.

## Main routes

```text
/
/shop
/shop/[slug]
/admin
/admin/review
/admin/products
```

## Supabase views used first

Storefront:

```text
public.feya_commerce_v_step7_storefront_products_api
```

Admin preview:

```text
public.feya_commerce_v_step8_review_queues_summary
public.feya_commerce_v_step6_product_catalog_overview
```

## Environment variables

Create `.env.local` locally:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not expose service role keys in browser code.

## Docs

Start here:

```text
docs/00_START_HERE.md
docs/SUPABASE_HANDOFF.md
docs/IMPLEMENTATION_PLAN_PHASE_A.md
docs/ENVIRONMENT_SETUP.md
docs/VERCEL_SETUP_PHASE_A.md
docs/DEPLOYMENT_CHECKLIST_PHASE_A.md
```

## Safety rules

Do not query these raw tables from public frontend:

```text
feya_commerce_source_listings
feya_commerce_source_price_rows
```

Do not show sampler/probnik rows publicly.

Do not treat fallback prices as final approved pricing.

Do not add write/edit mutations before Phase A is stable.
