# FEYA Commerce SEO Pipeline Handoff — 2026-06-15

## Project

Repository: `THEFEYA/feya-commerce`

Active branch: `rebuild/emergent-template-port-v2`

Active PR: #5, `Recover FEYA storefront baseline and prepare v4-safe data wiring`

Current preview domain:

`https://feya-commerce-git-rebuild-emerge-e78489-alexs-projects-5419f9ec.vercel.app`

## Current mission

Build a safe internal SEO change-set pipeline before any public storefront SEO wiring.

The pipeline must stay internal until a later reviewed storefront SEO contract is created.

## Hard safety rules

- Do not publish public SEO changes yet.
- Do not enable sitemap, feeds, indexation, checkout, payment, shipping, or order creation.
- Do not mutate product/source/import data from the admin SEO screens.
- Do not expose service-role logic to the browser.
- Do not grant direct anon/authenticated access to internal admin views.

## Supabase state confirmed

Created and verified:

- `public.feya_commerce_seo_change_sets`
- `public.feya_commerce_v_admin_seo_change_sets_v1`
- `public.feya_commerce_v_admin_seo_applied_values_v1`
- `public.feya_commerce_v_admin_storefront_seo_preview_v1`

Confirmed latest values:

- Storefront SEO Preview rows: 243
- Applied title rows: 0
- Applied meta rows: 0
- Applied H1 rows: 0
- Applied image-alt rows: 0
- anon grants: none
- authenticated grants: none

## Implemented app screens

- `/admin/seo-apply`
- `/admin/seo-change-sets`
- `/admin/seo-applied-values`
- `/admin/seo-storefront-preview`
- `/admin/seo-gate`

## Implemented admin/API flow

- Create pending change sets from `/admin/seo-apply`
- Review pending rows in `/admin/seo-change-sets`
- Mark approved rows as applied through `/api/admin/seo-change-sets-apply`
- Inspect internal values in `/admin/seo-applied-values`
- Inspect current-vs-applied storefront preview in `/admin/seo-storefront-preview`
- Watch pipeline status in `/admin/seo-gate`

## Environment/Vercel status

Vercel environment variables added:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The correct Preview deployment was redeployed from branch `rebuild/emergent-template-port-v2` at commit `036759f`.

`/admin/seo-gate` was verified through Vercel preview and now loads Supabase data. It shows:

- Pending: 0
- Approved: 0
- Applied: 0
- Preview rows: 243
- Applied values: 0
- Title: 0
- Meta: 0
- H1/Alt: 0/0

## Current blocker

`/admin/seo-apply` is not usable yet.

User screenshot shows this runtime error:

`column feya_commerce_v_step7_storefront_products_api_v4.has_fallback_price does not exist`

This means the app code or helper select expects a column that is not present in the current Supabase v4 storefront view.

Do not patch blindly. First inspect the exact code path and the actual Supabase contract.

Likely files to inspect first:

- `app/admin/seo-apply/page.tsx`
- `lib/seo-apply-preview.ts`
- `lib/storefront.ts`
- `lib/types.ts`

Likely fix options:

1. Remove `has_fallback_price` dependency from the SEO Apply query/helper if it is not actually needed for SEO change-set creation.
2. Or make the helper tolerant of this missing field.
3. Or create a Supabase view version/compatibility layer only if the field is truly needed.

Prefer the smallest safe fix that does not alter public storefront data.

## Next recommended step

Fix `/admin/seo-apply` so it can load preview rows without expecting the missing `has_fallback_price` column.

Then run the smoke test on one product:

1. `/admin/seo-apply` → create pending change sets for one product.
2. `/admin/seo-change-sets` → approve one or two rows.
3. `/admin/seo-change-sets` → mark approved rows applied.
4. `/admin/seo-applied-values` → verify values appear.
5. `/admin/seo-storefront-preview` → verify current vs applied values.
6. `/admin/seo-gate` → verify numbers changed.

## Decision principle for the next assistant

Use existing passports and docs as direction, not as chains. If a safer or better solution is found, apply it only after explaining why, and record the reason in a project passport or handoff doc.
