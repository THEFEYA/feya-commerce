-- Private owner approval of an exact immutable workspace. No public rate head,
-- shipping receipt, checkout snapshot, order or payment gate is changed.
begin;
create table public.feya_commerce_delivery_approvals_v1 (
  approval_id uuid primary key default gen_random_uuid(),
  revision bigint not null unique check (revision between 1 and 9007199254740991),
  request_id uuid not null unique,
  actor_id uuid not null references auth.users(id) on delete restrict,
  expected_revision bigint not null check (expected_revision >= 0),
  workspace_version_id uuid not null,
  workspace_revision bigint not null,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_sha256 text not null check (catalog_sha256 ~ '^[0-9a-f]{64}$'),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  business_review_contract text not null check (business_review_contract = 'owner_delivery_business_review_v1'),
  validation jsonb not null check (jsonb_typeof(validation) = 'object'
    and validation->>'contract_version' = 'commerce_delivery_approval_readiness_v1'
    and validation->'ready' = 'true'::jsonb and validation->'issues' = '[]'::jsonb),
  approved_at timestamptz not null default now(),
  foreign key (workspace_version_id, workspace_revision) references public.feya_commerce_delivery_workspace_versions_v1(version_id, revision) on delete restrict,
  unique (approval_id, revision)
);
create index feya_delivery_approval_workspace_idx on public.feya_commerce_delivery_approvals_v1(workspace_version_id, workspace_revision);
create index feya_delivery_approval_actor_idx on public.feya_commerce_delivery_approvals_v1(actor_id, approved_at desc);
create table public.feya_commerce_delivery_approval_head_v1 (
  workspace_key text primary key check (workspace_key = 'thefeya'), approval_id uuid not null, revision bigint not null,
  foreign key (approval_id, revision) references public.feya_commerce_delivery_approvals_v1(approval_id, revision) on delete restrict
);
create index feya_delivery_approval_head_idx on public.feya_commerce_delivery_approval_head_v1(approval_id, revision);
create function public.feya_commerce_delivery_approval_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$ begin raise exception 'delivery_approval_history_immutable'; end $$;
create trigger feya_delivery_approval_history_immutable before update or delete on public.feya_commerce_delivery_approvals_v1
  for each row execute function public.feya_commerce_delivery_approval_immutable_v1();

create function public.feya_commerce_delivery_approval_health_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t text; r text; ready boolean := (public.feya_commerce_delivery_workspace_health_v1()->>'ready')::boolean;
begin
  foreach t in array array['feya_commerce_delivery_approvals_v1','feya_commerce_delivery_approval_head_v1'] loop
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity) then ready := false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready := false; end if;
    end loop;
    if not has_table_privilege('service_role','public.'||t,'SELECT')
      or has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready := false; end if;
  end loop;
  foreach t in array array['feya_commerce_delivery_approval_health_v1()','feya_commerce_read_delivery_approval_v1()',
    'feya_commerce_delivery_approval_context_v1()',
    'feya_commerce_approve_delivery_workspace_v1(uuid,bigint,uuid,bigint,text,text,boolean,uuid,jsonb)'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,'public.'||t,'EXECUTE') then ready := false; end if;
    end loop;
    if not has_function_privilege('service_role','public.'||t,'EXECUTE') then ready := false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.feya_commerce_delivery_approvals_v1'::regclass
    and tgname='feya_delivery_approval_history_immutable' and tgenabled='O') then ready := false; end if;
  return jsonb_build_object('contract_version','commerce_delivery_approval_v1','ready',ready,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;
create function public.feya_commerce_read_delivery_approval_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.feya_commerce_delivery_approvals_v1;
begin
  if (public.feya_commerce_delivery_approval_health_v1()->>'ready')::boolean is not true then raise exception 'delivery_approval_boundary_not_ready'; end if;
  select x.* into v from public.feya_commerce_delivery_approval_head_v1 h
    join public.feya_commerce_delivery_approvals_v1 x on x.approval_id=h.approval_id and x.revision=h.revision where h.workspace_key='thefeya';
  return jsonb_build_object('contract_version','commerce_delivery_approval_v1','revision',coalesce(v.revision,0),
    'approval_id',v.approval_id,'workspace_version_id',v.workspace_version_id,'workspace_revision',v.workspace_revision,
    'snapshot_sha256',v.snapshot_sha256,'catalog_sha256',v.catalog_sha256,'approved_at',v.approved_at,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;
create function public.feya_commerce_delivery_approval_context_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare catalog jsonb;
begin
  if (public.feya_commerce_delivery_approval_health_v1()->>'ready')::boolean is not true then raise exception 'delivery_approval_boundary_not_ready'; end if;
  catalog := public.feya_commerce_delivery_catalog_v1();
  return jsonb_build_object('workspace',public.feya_commerce_read_delivery_workspace_v1(),'catalog',catalog,
    'catalog_sha256',encode(extensions.digest(convert_to(catalog::text,'UTF8'),'sha256'),'hex'),
    'approval',public.feya_commerce_read_delivery_approval_v1());
end $$;
create function public.feya_commerce_approve_delivery_workspace_v1(
  p_request_id uuid, p_expected_revision bigint, p_workspace_version_id uuid, p_workspace_revision bigint,
  p_snapshot_sha256 text, p_catalog_sha256 text, p_business_review_confirmed boolean, p_actor_id uuid, p_validation jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.feya_commerce_delivery_approvals_v1; draft public.feya_commerce_delivery_workspace_versions_v1;
  request_hash text; head_revision bigint; catalog jsonb; configuration_count bigint;
begin
  if (public.feya_commerce_delivery_approval_health_v1()->>'ready')::boolean is not true then raise exception 'delivery_approval_boundary_not_ready'; end if;
  if p_request_id is null or p_actor_id is null or p_workspace_version_id is null or p_expected_revision is null
    or p_expected_revision not between 0 and 9007199254740990 or p_workspace_revision is null
    or p_workspace_revision not between 1 and 9007199254740991 or p_business_review_confirmed is not true
    or p_snapshot_sha256 is null or p_snapshot_sha256 !~ '^[0-9a-f]{64}$'
    or p_catalog_sha256 is null or p_catalog_sha256 !~ '^[0-9a-f]{64}$'
    or not exists(select 1 from auth.users where id=p_actor_id) then raise exception 'delivery_approval_request_invalid'; end if;
  request_hash := encode(extensions.digest(convert_to(jsonb_build_object('request_id',p_request_id,'actor_id',p_actor_id,
    'expected_revision',p_expected_revision,'workspace_version_id',p_workspace_version_id,'workspace_revision',p_workspace_revision,
    'snapshot_sha256',p_snapshot_sha256,'catalog_sha256',p_catalog_sha256,'business_review_contract','owner_delivery_business_review_v1')::text,'UTF8'),'sha256'),'hex');
  -- Shared with draft saves: a draft edit and its approval cannot race past each other's CAS.
  perform pg_advisory_xact_lock(734608221815091::bigint);
  select * into v from public.feya_commerce_delivery_approvals_v1 where request_id=p_request_id;
  if found then
    if v.request_sha256<>request_hash then raise exception 'delivery_approval_request_conflict'; end if;
  else
    -- Lookup-only phase never inserts, moves a head, or accepts caller validation.
    if p_validation is null then return null; end if;
    select x.* into draft from public.feya_commerce_delivery_workspace_head_v1 h
      join public.feya_commerce_delivery_workspace_versions_v1 x on x.version_id=h.version_id and x.revision=h.revision where h.workspace_key='thefeya';
    if draft.version_id is distinct from p_workspace_version_id or draft.revision is distinct from p_workspace_revision
      or draft.snapshot_sha256 is distinct from p_snapshot_sha256 then raise exception 'delivery_approval_revision_conflict'; end if;
    select revision into head_revision from public.feya_commerce_delivery_approval_head_v1 where workspace_key='thefeya';
    if coalesce(head_revision,0)<>p_expected_revision then raise exception 'delivery_approval_revision_conflict'; end if;
    catalog := public.feya_commerce_delivery_catalog_v1();
    if encode(extensions.digest(convert_to(catalog::text,'UTF8'),'sha256'),'hex')<>p_catalog_sha256 then raise exception 'delivery_approval_catalog_conflict'; end if;
    select count(*) into configuration_count from jsonb_array_elements(catalog) p
      cross join lateral jsonb_array_elements(p->'configurations') c where jsonb_array_length(c->'currencies')>0;
    if jsonb_typeof(p_validation) is distinct from 'object' or octet_length(p_validation::text)>16000
      or p_validation->>'contract_version' is distinct from 'commerce_delivery_approval_readiness_v1'
      or p_validation->'ready' is distinct from 'true'::jsonb or p_validation->'issues' is distinct from '[]'::jsonb
      or p_validation->'issue_count' is distinct from '0'::jsonb or configuration_count=0
      or p_validation->'configuration_count' is distinct from to_jsonb(configuration_count)
      or p_validation->'public_rates_enabled' is distinct from 'false'::jsonb
      or p_validation->'payment_enabled' is distinct from 'false'::jsonb
      or p_validation->'provider_session_enabled' is distinct from 'false'::jsonb
      or draft.draft->>'scheduling_time_zone' is null or draft.draft->>'cutoff_local' is null
      or jsonb_typeof(draft.draft->'dispatch_calendar') is distinct from 'object'
      or (draft.draft->>'combination_rule' in ('one_parcel_highest_rate','separate_profile_parcels')) is not true
      then raise exception 'delivery_approval_validation_invalid'; end if;
    -- Detailed profile/currency/rule validation is derived by the protected server,
    -- not accepted in the browser request. No public/authenticated role can call this RPC.
    insert into public.feya_commerce_delivery_approvals_v1(request_id,actor_id,expected_revision,revision,
      workspace_version_id,workspace_revision,snapshot_sha256,catalog_sha256,request_sha256,business_review_contract,validation)
      values(p_request_id,p_actor_id,p_expected_revision,p_expected_revision+1,p_workspace_version_id,p_workspace_revision,
        p_snapshot_sha256,p_catalog_sha256,request_hash,'owner_delivery_business_review_v1',p_validation) returning * into v;
    insert into public.feya_commerce_delivery_approval_head_v1(workspace_key,approval_id,revision) values('thefeya',v.approval_id,v.revision)
      on conflict(workspace_key) do update set approval_id=excluded.approval_id,revision=excluded.revision;
    return jsonb_build_object('contract_version','commerce_delivery_approval_v1','request_id',v.request_id,'approval_id',v.approval_id,
      'revision',v.revision,'workspace_version_id',v.workspace_version_id,'workspace_revision',v.workspace_revision,
      'snapshot_sha256',v.snapshot_sha256,'catalog_sha256',v.catalog_sha256,'approved_at',v.approved_at,'replayed',false,
      'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
  end if;
  return jsonb_build_object('contract_version','commerce_delivery_approval_v1','request_id',v.request_id,'approval_id',v.approval_id,
    'revision',v.revision,'workspace_version_id',v.workspace_version_id,'workspace_revision',v.workspace_revision,
    'snapshot_sha256',v.snapshot_sha256,'catalog_sha256',v.catalog_sha256,'approved_at',v.approved_at,'replayed',true,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;
alter table public.feya_commerce_delivery_approvals_v1 enable row level security;
alter table public.feya_commerce_delivery_approval_head_v1 enable row level security;
revoke all on public.feya_commerce_delivery_approvals_v1,public.feya_commerce_delivery_approval_head_v1 from public,anon,authenticated,service_role;
grant select on public.feya_commerce_delivery_approvals_v1,public.feya_commerce_delivery_approval_head_v1 to service_role;
revoke all on function public.feya_commerce_delivery_approval_immutable_v1() from public,anon,authenticated,service_role;
revoke all on function public.feya_commerce_delivery_approval_health_v1(),public.feya_commerce_read_delivery_approval_v1(),
  public.feya_commerce_delivery_approval_context_v1(),public.feya_commerce_approve_delivery_workspace_v1(uuid,bigint,uuid,bigint,text,text,boolean,uuid,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_delivery_approval_health_v1(),public.feya_commerce_read_delivery_approval_v1(),
  public.feya_commerce_delivery_approval_context_v1(),public.feya_commerce_approve_delivery_workspace_v1(uuid,bigint,uuid,bigint,text,text,boolean,uuid,jsonb) to service_role;
comment on table public.feya_commerce_delivery_approvals_v1 is 'Private exact-version Human Owner approvals for a future shipping successor. No public-rate publication or checkout/payment capability. Validation is derived by the protected server.';
notify pgrst, 'reload schema';
commit;
