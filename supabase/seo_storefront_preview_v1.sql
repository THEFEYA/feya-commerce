-- FEYA Commerce Storefront SEO Preview v1
-- Status: draft for Supabase SQL editor review
-- Internal admin preview only. Does not publish SEO or enable sitemap/feed/indexation.

create or replace view public.feya_commerce_v_admin_storefront_seo_preview_v1 as
with applied as (
  select
    product_slug,
    max(applied_value) filter (where target_field = 'seo_title') as applied_seo_title,
    max(applied_value) filter (where target_field = 'meta_description') as applied_meta_description,
    max(applied_value) filter (where target_field = 'h1') as applied_h1,
    max(applied_value) filter (where target_field = 'primary_image_alt') as applied_primary_image_alt
  from public.feya_commerce_v_admin_seo_applied_values_v1
  group by product_slug
)
select
  p.product_slug,
  p.card_title,
  p.seo_title as current_seo_title,
  p.meta_description as current_meta_description,
  p.h1 as current_h1,
  p.primary_image_alt as current_primary_image_alt,
  a.applied_seo_title,
  a.applied_meta_description,
  a.applied_h1,
  a.applied_primary_image_alt,
  (a.applied_seo_title is not null) as has_applied_seo_title,
  (a.applied_meta_description is not null) as has_applied_meta_description,
  (a.applied_h1 is not null) as has_applied_h1,
  (a.applied_primary_image_alt is not null) as has_applied_primary_image_alt
from public.feya_commerce_v_step7_storefront_products_api_v4 p
left join applied a on a.product_slug = p.product_slug;

revoke all on public.feya_commerce_v_admin_storefront_seo_preview_v1 from anon;
revoke all on public.feya_commerce_v_admin_storefront_seo_preview_v1 from authenticated;

comment on view public.feya_commerce_v_admin_storefront_seo_preview_v1 is
  'Internal admin preview comparing current storefront SEO fields with approved SEO values. Not a public SEO contract.';
