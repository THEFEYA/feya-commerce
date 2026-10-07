-- Private owner workspace, DRAFT only. Existing shipping rate heads and commerce
-- receipts are untouched. No publication/payment transition exists in this contract.
begin;

create table public.feya_commerce_delivery_workspace_versions_v1 (
  version_id uuid primary key default gen_random_uuid(),
  revision bigint not null unique check (revision between 1 and 9007199254740991),
  request_id uuid not null unique,
  actor_id uuid not null references auth.users(id) on delete restrict,
  expected_revision bigint not null check (expected_revision >= 0),
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'
    and draft->>'contract_version' = 'commerce_delivery_workspace_draft_v1'),
  created_at timestamptz not null default now(),
  unique (version_id, revision)
);
create index feya_delivery_workspace_actor_idx on public.feya_commerce_delivery_workspace_versions_v1(actor_id, created_at desc);
create table public.feya_commerce_delivery_workspace_head_v1 (
  workspace_key text primary key check (workspace_key = 'thefeya'),
  version_id uuid not null,
  revision bigint not null,
  foreign key (version_id, revision) references public.feya_commerce_delivery_workspace_versions_v1(version_id, revision) on delete restrict
);
create index feya_delivery_workspace_head_version_idx on public.feya_commerce_delivery_workspace_head_v1(version_id, revision);

create function public.feya_commerce_delivery_workspace_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'delivery_workspace_history_immutable'; end $$;
create trigger feya_delivery_workspace_history_immutable
  before update or delete on public.feya_commerce_delivery_workspace_versions_v1
  for each row execute function public.feya_commerce_delivery_workspace_immutable_v1();

create function public.feya_commerce_delivery_workspace_health_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t text; r text; ready boolean := true;
begin
  foreach t in array array['feya_commerce_delivery_workspace_versions_v1','feya_commerce_delivery_workspace_head_v1'] loop
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity) then ready := false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready := false; end if;
    end loop;
    if not has_table_privilege('service_role','public.'||t,'SELECT')
      or has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready := false; end if;
  end loop;
  foreach t in array array[
    'feya_commerce_read_delivery_workspace_v1()', 'feya_commerce_delivery_catalog_v1()',
    'feya_commerce_save_delivery_workspace_v1(uuid,bigint,jsonb,uuid)', 'feya_commerce_delivery_workspace_health_v1()'
  ] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,'public.'||t,'EXECUTE') then ready := false; end if;
    end loop;
    if not has_function_privilege('service_role','public.'||t,'EXECUTE') then ready := false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.feya_commerce_delivery_workspace_versions_v1'::regclass
    and tgname='feya_delivery_workspace_history_immutable' and tgenabled='O') then ready := false; end if;
  return jsonb_build_object('contract_version','commerce_delivery_workspace_draft_v1','ready',ready,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

create function public.feya_commerce_read_delivery_workspace_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.feya_commerce_delivery_workspace_versions_v1;
begin
  if (public.feya_commerce_delivery_workspace_health_v1()->>'ready')::boolean is not true
    then raise exception 'delivery_workspace_boundary_not_ready'; end if;
  select x.* into v from public.feya_commerce_delivery_workspace_head_v1 h
    join public.feya_commerce_delivery_workspace_versions_v1 x on x.version_id=h.version_id and x.revision=h.revision
    where h.workspace_key='thefeya';
  return jsonb_build_object('contract_version','commerce_delivery_workspace_draft_v1',
    'revision',coalesce(v.revision,0),'version_id',v.version_id,'snapshot_sha256',v.snapshot_sha256,
    'draft',v.draft,'updated_at',v.created_at,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

create function public.feya_commerce_delivery_catalog_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if (public.feya_commerce_delivery_workspace_health_v1()->>'ready')::boolean is not true
    then raise exception 'delivery_workspace_boundary_not_ready'; end if;
  select coalesce(jsonb_agg(p.item order by p.title,p.product_id),'[]'::jsonb) into result from (
    select d.canonical_product_id product_id, coalesce(nullif(d.card_title,''),nullif(d.draft_site_title,''),d.canonical_product_id::text) title,
      jsonb_build_object('canonical_product_id',d.canonical_product_id,
        'title',coalesce(nullif(d.card_title,''),nullif(d.draft_site_title,''),d.canonical_product_id::text),
        'configurations',coalesce((select jsonb_agg(jsonb_build_object('configuration_price_id',c.configuration_price_id,
          'name',coalesce(nullif(s.configuration_name,''),c.configuration_price_id::text),
          'currencies',coalesce((select jsonb_agg(x.currency order by x.currency) from (
            select distinct i.currency from public.feya_commerce_offer_heads_v1 h
            join public.feya_commerce_offer_revisions_v1 o on o.offer_revision_id=h.current_offer_revision_id and o.status='active'
            join public.feya_commerce_offer_variant_items_v1 i on i.offer_revision_id=o.offer_revision_id and i.item_status='active'
            where h.canonical_product_id=d.canonical_product_id and i.configuration_price_id=c.configuration_price_id
          ) x),'[]'::jsonb)) order by s.sort_order,c.configuration_price_id)
          from public.feya_commerce_configuration_prices c
          join public.feya_commerce_sellable_configurations s on s.sellable_configuration_id=c.sellable_configuration_id
          where c.canonical_product_id=d.canonical_product_id and c.sampler_excluded_flag is not true),'[]'::jsonb)) item
    from public.feya_commerce_product_drafts d
    where exists(select 1 from public.feya_commerce_offer_heads_v1 h where h.canonical_product_id=d.canonical_product_id)
  ) p;
  return result;
end $$;

create function public.feya_commerce_save_delivery_workspace_v1(
  p_request_id uuid, p_expected_revision bigint, p_draft jsonb, p_actor_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.feya_commerce_delivery_workspace_versions_v1; head_revision bigint;
  hash text; assignment jsonb;
begin
  if (public.feya_commerce_delivery_workspace_health_v1()->>'ready')::boolean is not true
    then raise exception 'delivery_workspace_boundary_not_ready'; end if;
  if p_request_id is null or p_actor_id is null or p_expected_revision is null
    or p_expected_revision not between 0 and 9007199254740990
    or not exists(select 1 from auth.users where id=p_actor_id)
    then raise exception 'delivery_workspace_request_invalid'; end if;
  if p_draft is null or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>512000
    or p_draft->>'contract_version' is distinct from 'commerce_delivery_workspace_draft_v1'
    or (select count(*) from jsonb_object_keys(p_draft))<>10
    or exists(select 1 from jsonb_object_keys(p_draft) k where k<>all(array['contract_version','scheduling_time_zone',
      'cutoff_local','dispatch_calendar','combination_rule','default_shipping_profile_id','default_production_profile_id',
      'shipping_profiles','production_profiles','assignments']))
    or jsonb_typeof(p_draft->'shipping_profiles') is distinct from 'array'
    or jsonb_typeof(p_draft->'production_profiles') is distinct from 'array'
    or jsonb_typeof(p_draft->'assignments') is distinct from 'array'
    then raise exception 'delivery_workspace_draft_invalid'; end if;
  if jsonb_array_length(p_draft->'shipping_profiles')>50 or jsonb_array_length(p_draft->'production_profiles')>50
    or jsonb_array_length(p_draft->'assignments')>1200 then raise exception 'delivery_workspace_draft_invalid'; end if;
  for assignment in select value from jsonb_array_elements(p_draft->'assignments') loop
    if jsonb_typeof(assignment)<>'object' or not exists(select 1 from public.feya_commerce_product_drafts d
      where d.canonical_product_id::text=assignment->>'canonical_product_id')
      or (assignment->>'configuration_price_id' is not null and not exists(
        select 1 from public.feya_commerce_configuration_prices c
        where c.configuration_price_id::text=assignment->>'configuration_price_id'
          and c.canonical_product_id::text=assignment->>'canonical_product_id'))
      then raise exception 'delivery_workspace_assignment_target_invalid'; end if;
    if assignment->>'shipping_profile_id' is not null and not exists(select 1 from jsonb_array_elements(p_draft->'shipping_profiles') p
      where p->>'id'=assignment->>'shipping_profile_id') then raise exception 'delivery_workspace_profile_reference_invalid'; end if;
    if assignment->>'production_profile_id' is not null and not exists(select 1 from jsonb_array_elements(p_draft->'production_profiles') p
      where p->>'id'=assignment->>'production_profile_id') then raise exception 'delivery_workspace_profile_reference_invalid'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_draft->'assignments') a
    group by a->>'canonical_product_id',a->>'configuration_price_id' having count(*)>1)
    then raise exception 'delivery_workspace_assignment_ambiguous'; end if;
  hash := encode(extensions.digest(convert_to(p_draft::text,'UTF8'),'sha256'),'hex');
  -- One workspace lock covers first save, head CAS and idempotency checks atomically.
  perform pg_advisory_xact_lock(734608221815091::bigint);
  select * into v from public.feya_commerce_delivery_workspace_versions_v1 where request_id=p_request_id;
  if found then
    if v.actor_id<>p_actor_id or v.expected_revision<>p_expected_revision or v.snapshot_sha256<>hash
      then raise exception 'delivery_workspace_request_conflict'; end if;
    return jsonb_build_object('request_id',p_request_id,'version_id',v.version_id,'revision',v.revision,
      'snapshot_sha256',v.snapshot_sha256,'replayed',true,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
  end if;
  select revision into head_revision from public.feya_commerce_delivery_workspace_head_v1 where workspace_key='thefeya';
  if coalesce(head_revision,0)<>p_expected_revision then raise exception 'delivery_workspace_revision_conflict'; end if;
  insert into public.feya_commerce_delivery_workspace_versions_v1(request_id,actor_id,expected_revision,revision,snapshot_sha256,draft)
    values(p_request_id,p_actor_id,p_expected_revision,p_expected_revision+1,hash,p_draft) returning * into v;
  insert into public.feya_commerce_delivery_workspace_head_v1(workspace_key,version_id,revision) values('thefeya',v.version_id,v.revision)
    on conflict(workspace_key) do update set version_id=excluded.version_id,revision=excluded.revision;
  return jsonb_build_object('request_id',p_request_id,'version_id',v.version_id,'revision',v.revision,
    'snapshot_sha256',v.snapshot_sha256,'replayed',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

alter table public.feya_commerce_delivery_workspace_versions_v1 enable row level security;
alter table public.feya_commerce_delivery_workspace_head_v1 enable row level security;
revoke all on public.feya_commerce_delivery_workspace_versions_v1,public.feya_commerce_delivery_workspace_head_v1 from public,anon,authenticated,service_role;
grant select on public.feya_commerce_delivery_workspace_versions_v1,public.feya_commerce_delivery_workspace_head_v1 to service_role;
revoke all on function public.feya_commerce_delivery_workspace_immutable_v1() from public,anon,authenticated,service_role;
revoke all on function public.feya_commerce_delivery_workspace_health_v1(),public.feya_commerce_read_delivery_workspace_v1(),
  public.feya_commerce_delivery_catalog_v1(),public.feya_commerce_save_delivery_workspace_v1(uuid,bigint,jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_delivery_workspace_health_v1(),public.feya_commerce_read_delivery_workspace_v1(),
  public.feya_commerce_delivery_catalog_v1(),public.feya_commerce_save_delivery_workspace_v1(uuid,bigint,jsonb,uuid) to service_role;

comment on table public.feya_commerce_delivery_workspace_versions_v1 is 'Immutable private Human Owner DRAFT settings. Not approved rates, not a payable quote; no active head publication capability.';
notify pgrst, 'reload schema';
commit;
