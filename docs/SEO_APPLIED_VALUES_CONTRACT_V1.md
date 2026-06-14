# SEO Applied Values Contract v1

Date: 2026-06-14  
Status: draft for Supabase review

## Purpose

This layer prepares a safe read model for SEO values that have passed the change-set queue.

It must not mutate products, imports, source rows, price rows, orders, sitemap, feeds, or indexation flags.

## Input

`public.feya_commerce_seo_change_sets`

Only rows with status `approved` or `applied` are eligible for the read model.

## Output

Recommended view:

`public.feya_commerce_v_admin_seo_applied_values_v1`

This is still an internal admin view in v1. Public storefront wiring comes later through a separate safe public contract.

## Allowed fields

- `seo_title`
- `meta_description`
- `h1`
- `primary_image_alt`
- `collection_hint`
- `description_outline`

## Conflict rule

If a product has multiple rows for the same target field, the latest reviewed row wins. If there is no reviewed timestamp, the latest created row wins.

## Safety rules

- no anonymous grants;
- no authenticated browser grants;
- no direct product/source updates;
- no sitemap/feed/indexation output;
- no payment/order/shipping changes.

## Next implementation step

Create the SQL draft for the internal applied-values view, then add an admin page that shows the currently selected SEO value per product/field.
