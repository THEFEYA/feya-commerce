-- Correct the first exact-product RPC deployment: Product Truth v1 also has
-- a builder_source CTE that otherwise aggregates every catalog product before
-- joining the already-filtered product_focus CTE. Recreate the exact read
-- chain with that builder aggregation constrained to the requested product.
do $migration$
declare
  v_sql text;
begin
  v_sql := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v1'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_listing_master_product_focus_v1 pf_1',
    'FROM feya_commerce_v_listing_master_product_focus_v1 pf_1 WHERE pf_1.canonical_product_id::uuid = p_canonical_product_id'
  );
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step6_product_builder_detail b',
    'FROM feya_commerce_v_step6_product_builder_detail b JOIN product_focus pf_builder ON pf_builder.canonical_product_id = b.canonical_product_id'
  );
  if position('p_canonical_product_id' in v_sql) = 0
     or position('pf_builder' in v_sql) = 0 then
    raise exception 'Could not fully parameterize SEO Product Truth v1';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_seo_product_truth_v1(p_canonical_product_id uuid) returns setof public.feya_commerce_v_seo_product_truth_v1 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v3'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_seo_product_truth_v1 v1',
    'FROM feya_commerce_get_seo_product_truth_v1(p_canonical_product_id) v1'
  );
  if position('feya_commerce_get_seo_product_truth_v1' in v_sql) = 0 then
    raise exception 'Could not parameterize SEO Product Truth v3';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_seo_product_truth_v3(p_canonical_product_id uuid) returns setof public.feya_commerce_v_seo_product_truth_v3 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v4'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_seo_product_truth_v3 v3',
    'FROM feya_commerce_get_seo_product_truth_v3(p_canonical_product_id) v3'
  );
  if position('feya_commerce_get_seo_product_truth_v3' in v_sql) = 0 then
    raise exception 'Could not parameterize SEO Product Truth v4';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_seo_product_truth_v4(p_canonical_product_id uuid) returns setof public.feya_commerce_v_seo_product_truth_v4 language sql stable security definer set search_path = public as %L',
    v_sql
  );
end
$migration$;

revoke all on function public.feya_commerce_get_seo_product_truth_v1(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v3(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v4(uuid) from public, anon, authenticated;

grant execute on function public.feya_commerce_get_seo_product_truth_v1(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v3(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v4(uuid) to service_role;

comment on function public.feya_commerce_get_seo_product_truth_v4(uuid) is
  'Exact-product canonical Product Truth read for SEO generation. Both product focus and builder aggregation are constrained to the requested product.';
