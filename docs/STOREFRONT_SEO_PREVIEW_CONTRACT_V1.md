# Storefront SEO Preview Contract v1

Date: 2026-06-14  
Status: draft for Supabase review

## Purpose

Create an internal admin preview that compares current storefront SEO fields with approved SEO values from the change-set pipeline.

This is not the public storefront SEO contract. It must not change product rows, source/import rows, sitemap, feeds, orders, payment, shipping, or indexation flags.

## Inputs

- `public.feya_commerce_v_step7_storefront_products_api_v4`
- `public.feya_commerce_v_admin_seo_applied_values_v1`

## Output

Recommended internal view:

`public.feya_commerce_v_admin_storefront_seo_preview_v1`

## Fields

The view should expose:

- `product_slug`
- `card_title`
- current SEO values from v4
- approved SEO values from applied-values view
- boolean flags showing whether approved values are available

## Safety rules

- no anonymous grants;
- no authenticated browser grants;
- no source/product updates;
- no sitemap/feed/indexation output;
- no public SEO publishing;
- no payment/order/shipping changes.

## Next implementation step

Create SQL draft for this admin preview view and add `/admin/seo-storefront-preview` to inspect values before any future storefront wiring.
