-- Read-only preflight for 20260923205841_search_portfolio_foundation_v1.sql.
-- PASS here covers key compatibility and name collisions, not a full staging restore.
with required(table_name, column_name) as (
  values ('feya_commerce_seo_pages_v1','seo_page_id'),
         ('feya_commerce_product_drafts','canonical_product_id'),
         ('feya_growth_execution_requests_v1','execution_request_id'),
         ('feya_growth_change_events_v1','change_event_id')
), required_keys as (
  select r.*, a.atttypid::regtype::text as actual_type, a.attnotnull,
    exists (
      select 1 from pg_index i
      where i.indrelid=c.oid and i.indisunique and i.indisvalid
        and i.indpred is null and i.indexprs is null
        and i.indnkeyatts=1 and i.indkey[0]=a.attnum
    ) as exact_unique_key
  from required r
  left join pg_namespace n on n.nspname='public'
  left join pg_class c on c.relnamespace=n.oid and c.relname=r.table_name
  left join pg_attribute a on a.attrelid=c.oid and a.attname=r.column_name and not a.attisdropped
), objects(name,kind) as (
  values ('feya_search_page_specs_v1','table'), ('feya_search_membership_snapshots_v1','table'),
    ('feya_search_membership_items_v1','table'), ('feya_search_page_versions_v1','table'),
    ('feya_search_link_edges_v1','table'), ('feya_search_check_family_v1','function'),
    ('feya_search_reject_snapshot_mutation_v1','function'), ('feya_search_check_snapshot_count_v1','function')
)
select jsonb_build_object(
  'observed_at', current_timestamp,
  'read_only', true,
  'required_keys', (select jsonb_agg(to_jsonb(k) order by table_name) from required_keys k),
  'keys_pass', (select bool_and(coalesce(actual_type='uuid' and attnotnull and exact_unique_key,false)) from required_keys),
  'object_collisions', (select coalesce(jsonb_agg(name),'[]'::jsonb) from objects where
    (kind='table' and to_regclass('public.'||name) is not null)
    or (kind='function' and to_regprocedure('public.'||name||'()') is not null)),
  'required_roles_present', (select count(*)=3 from pg_roles where rolname in ('anon','authenticated','service_role')),
  'page_type_column', (select udt_name from information_schema.columns where table_schema='public' and table_name='feya_commerce_seo_pages_v1' and column_name='page_type'),
  'can_apply_production', false,
  'remaining_gate', 'isolated full Supabase schema restore, advisors, grants and authenticated API/browser validation'
) as preflight;
