# HANDOFF — SEO Apply Preview Fix

Date: 2026-06-15
Branch: `rebuild/emergent-template-port-v2`
PR: #5

## Fixed

`/admin/seo-apply` was failing because the page reused a storefront product select that requested `has_fallback_price`, but `feya_commerce_v_step7_storefront_products_api_v4` did not expose that column.

The page now uses a local minimal select for the internal SEO Apply flow:

- `canonical_product_id`
- `product_slug`
- `card_title`
- `h1`
- `seo_title`
- `meta_description`
- `product_type`
- `material`
- `color`
- `primary_image_url`
- `primary_image_alt`

## Second fix

The page then hit a Supabase `statement timeout` on the heavy v4 storefront view. The SEO Apply preview is now capped at 50 products for the first admin-safe iteration.

## Third fix

The page originally filtered out `Pending Approval` previews. Since current data mostly returns pending rows, the UI showed metrics but no cards. Pending previews are now visible so the operator can create change-set rows after review.

## Current safety boundary

This flow is still internal-only.

It does not:

- update products
- update source/import tables
- publish SEO values to public storefront
- update sitemap
- update feeds
- enable indexation
- touch checkout, payments, orders, or shipping

`/admin/*` and `/api/admin/*` are protected by middleware. Preview deployments rely on Vercel Preview Authentication. Production requires `FEYA_ADMIN_ACCESS_TOKEN`.

## Current verified state

Latest relevant commit:

`45b04b3d2f674e0afd3e57b57542df4ced7d4c3e`

Vercel deployment reached `READY` and the build completed successfully.

Direct automated page fetch for the final deployment was blocked by the tool layer, so a manual browser check is still required.

## Manual check required

Open:

`/admin/seo-apply`

Confirm:

1. The page loads.
2. Preview product cards are visible, not only counters.
3. Clicking `Create pending change sets` creates rows.
4. `/admin/seo-change-sets` shows the new pending rows.

## Next engineering step

After the manual check, test the full internal loop:

`SEO Apply -> Create pending change sets -> SEO Change Sets -> Approve/Reject -> Mark applied -> SEO Preview/Gate`

Do not connect this to public storefront SEO until the gate confirms the full internal loop is stable.
