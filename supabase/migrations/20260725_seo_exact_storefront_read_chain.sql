-- Push the requested product id into the deepest storefront relations used by
-- synchronous SEO preview/generation. Filtering the catalog views from the
-- outside is not sufficient: PostgreSQL materializes several aggregate CTEs
-- and otherwise scans all products, media, configurations and prices.
do $migration$
declare
  v_sql text;
begin
  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_cards'::regclass, true);
  v_sql := replace(
    v_sql,
    'GROUP BY p.canonical_product_id',
    'WHERE p.canonical_product_id = p_canonical_product_id GROUP BY p.canonical_product_id'
  );
  if position('p_canonical_product_id' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront cards';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_cards(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_cards language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_configurations'::regclass, true);
  v_sql := replace(
    v_sql,
    'WHERE sc.is_public_candidate = true',
    'WHERE p.canonical_product_id = p_canonical_product_id AND sc.is_public_candidate = true'
  );
  if position('p_canonical_product_id' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront configurations';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_configurations(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_configurations language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_products_api'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_cards card',
    'FROM feya_commerce_get_step7_storefront_cards(p_canonical_product_id) card'
  );
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_configurations cfg',
    'FROM feya_commerce_get_step7_storefront_configurations(p_canonical_product_id) cfg'
  );
  if position('feya_commerce_get_step7_storefront_cards' in v_sql) = 0
     or position('feya_commerce_get_step7_storefront_configurations' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront products API';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_products_api(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_products_api language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_products_api_v2'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_products_api p',
    'FROM feya_commerce_get_step7_storefront_products_api(p_canonical_product_id) p'
  );
  if position('feya_commerce_get_step7_storefront_products_api' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront products API v2';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_products_api_v2(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_products_api_v2 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_products_api_v3'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_products_api_v2 p',
    'FROM feya_commerce_get_step7_storefront_products_api_v2(p_canonical_product_id) p'
  );
  if position('feya_commerce_get_step7_storefront_products_api_v2' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront products API v3';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_products_api_v3(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_products_api_v3 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_step7_storefront_products_api_v4'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_products_api_v3 p',
    'FROM feya_commerce_get_step7_storefront_products_api_v3(p_canonical_product_id) p'
  );
  if position('feya_commerce_get_step7_storefront_products_api_v3' in v_sql) = 0 then
    raise exception 'Could not parameterize storefront products API v4';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_step7_storefront_products_api_v4(p_canonical_product_id uuid) returns setof public.feya_commerce_v_step7_storefront_products_api_v4 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_listing_master_product_focus_v1'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step7_storefront_products_api_v4',
    'FROM feya_commerce_get_step7_storefront_products_api_v4(p_canonical_product_id)'
  );
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step6_product_catalog_overview',
    'FROM feya_commerce_v_step6_product_catalog_overview WHERE canonical_product_id = p_canonical_product_id'
  );
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_seo_product_brief_readiness_v1',
    'FROM feya_commerce_v_seo_product_brief_readiness_v1 WHERE canonical_product_id = p_canonical_product_id'
  );
  v_sql := replace(
    v_sql,
    'WHERE feya_commerce_v_seo_product_component_mapping_v1.active_flag',
    'WHERE feya_commerce_v_seo_product_component_mapping_v1.canonical_product_id = p_canonical_product_id AND feya_commerce_v_seo_product_component_mapping_v1.active_flag'
  );
  if position('feya_commerce_get_step7_storefront_products_api_v4' in v_sql) = 0
     or position('p_canonical_product_id' in v_sql) = 0 then
    raise exception 'Could not parameterize listing master product focus';
  end if;
  execute format(
    'create or replace function public.feya_commerce_get_listing_master_product_focus_v1(p_canonical_product_id uuid) returns setof public.feya_commerce_v_listing_master_product_focus_v1 language sql stable security definer set search_path = public as %L',
    v_sql
  );

  v_sql := pg_get_viewdef('public.feya_commerce_v_seo_product_truth_v1'::regclass, true);
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_listing_master_product_focus_v1 pf_1',
    'FROM feya_commerce_get_listing_master_product_focus_v1(p_canonical_product_id) pf_1'
  );
  v_sql := replace(
    v_sql,
    'FROM feya_commerce_v_step6_product_builder_detail b',
    'FROM feya_commerce_v_step6_product_builder_detail b JOIN product_focus pf_builder ON pf_builder.canonical_product_id = b.canonical_product_id'
  );
  if position('feya_commerce_get_listing_master_product_focus_v1' in v_sql) = 0
     or position('pf_builder' in v_sql) = 0 then
    raise exception 'Could not parameterize SEO Product Truth v1';
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
  execute format(
    'create or replace function public.feya_commerce_get_seo_product_truth_v4(p_canonical_product_id uuid) returns setof public.feya_commerce_v_seo_product_truth_v4 language sql stable security definer set search_path = public as %L',
    v_sql
  );
end
$migration$;

revoke all on function public.feya_commerce_get_step7_storefront_cards(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_step7_storefront_configurations(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_step7_storefront_products_api(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_step7_storefront_products_api_v2(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_step7_storefront_products_api_v3(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_step7_storefront_products_api_v4(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_listing_master_product_focus_v1(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v1(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v3(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v4(uuid) from public, anon, authenticated;

grant execute on function public.feya_commerce_get_step7_storefront_cards(uuid) to service_role;
grant execute on function public.feya_commerce_get_step7_storefront_configurations(uuid) to service_role;
grant execute on function public.feya_commerce_get_step7_storefront_products_api(uuid) to service_role;
grant execute on function public.feya_commerce_get_step7_storefront_products_api_v2(uuid) to service_role;
grant execute on function public.feya_commerce_get_step7_storefront_products_api_v3(uuid) to service_role;
grant execute on function public.feya_commerce_get_step7_storefront_products_api_v4(uuid) to service_role;
grant execute on function public.feya_commerce_get_listing_master_product_focus_v1(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v1(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v3(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v4(uuid) to service_role;

comment on function public.feya_commerce_get_seo_product_truth_v4(uuid) is
  'Exact-product canonical Product Truth read. The requested id is pushed into storefront cards, configurations, focus and builder sources before aggregation.';
