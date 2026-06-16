-- FEYA Commerce SEO Applied Values v1
-- Status: draft for Supabase SQL editor review
-- Creates an internal read model from approved/applied SEO change-set rows.
-- Does not update products, source/import rows, sitemap, feeds, orders, payment, shipping, or indexation flags.

create or replace view public.feya_commerce_v_admin_seo_applied_values_v1 as
with ranked as (
  select
    change_set_id,
    product_slug,
    canonical_product_id,
    target_field,
    proposed_value,
    status,
    created_at,
    reviewed_at,
    applied_at,
    row_number() over (
      partition by product_slug, target_field
      order by coalesce(applied_at, reviewed_at, created_at) desc, created_at desc
    ) as field_rank
  from public.feya_commerce_seo_change_sets
  where status in ('approved', 'applied')
)
select
  change_set_id,
  product_slug,
  canonical_product_id,
  target_field,
  proposed_value as applied_value,
  status,
  created_at,
  reviewed_at,
  applied_at
from ranked
where field_rank = 1;

revoke all on public.feya_commerce_v_admin_seo_applied_values_v1 from anon;
revoke all on public.feya_commerce_v_admin_seo_applied_values_v1 from authenticated;

comment on view public.feya_commerce_v_admin_seo_applied_values_v1 is
  'Internal admin view of latest approved/applied SEO values by product and field. Not a public storefront contract.';
