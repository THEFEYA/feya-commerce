-- Durable Human Owner approval bridge for explicit approvals given outside Supabase Auth.
-- This does not broaden execution authority: approval is still bound to one exact request_hash and service-role-only function.
begin;

create table if not exists public.feya_growth_external_owner_approvals_v1(
  external_owner_approval_id uuid primary key default gen_random_uuid(),
  execution_request_id uuid not null references public.feya_growth_execution_requests_v1(execution_request_id) on delete restrict,
  request_hash text not null,
  confirmation_channel text not null,
  confirmation_text_sha256 text not null,
  reason text not null,
  idempotency_key text not null unique,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint feya_external_owner_approval_hash_chk check(request_hash~'^[0-9a-f]{64}$'),
  constraint feya_external_owner_confirmation_hash_chk check(confirmation_text_sha256~'^[0-9a-f]{64}$'),
  constraint feya_external_owner_channel_chk check(confirmation_channel in ('CHAT_OWNER_CONFIRMATION'))
);

create unique index if not exists feya_external_owner_approval_request_hash_uniq
  on public.feya_growth_external_owner_approvals_v1(execution_request_id,request_hash);

alter table public.feya_growth_external_owner_approvals_v1 enable row level security;
revoke all on table public.feya_growth_external_owner_approvals_v1 from public,anon,authenticated,service_role;
grant select on table public.feya_growth_external_owner_approvals_v1 to service_role;

create or replace function public.feya_fn_execution_request_human_approval_valid_v1(
  p_execution_request_id uuid
) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((
    select
      r.request_status='APPROVED'
      and r.approval_hash is not null
      and r.approval_hash=r.request_hash
      and (
        r.approved_by_user_id is not null
        or exists(
          select 1
          from public.feya_growth_external_owner_approvals_v1 a
          where a.execution_request_id=r.execution_request_id
            and a.request_hash=r.request_hash
        )
      )
    from public.feya_growth_execution_requests_v1 r
    where r.execution_request_id=p_execution_request_id
  ),false)
$$;

create or replace function public.feya_fn_owner_approve_execution_request_external_v1(
  p_execution_request_id uuid,
  p_expected_status text,
  p_expected_request_hash text,
  p_reason text,
  p_confirmation_channel text,
  p_confirmation_text text,
  p_idempotency_key text
) returns table(
  execution_request_id uuid,
  request_status text,
  approval_hash text,
  external_owner_approval_id uuid,
  approved_at timestamptz
)
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  existing public.feya_growth_external_owner_approvals_v1%rowtype;
  confirmation_hash text;
  approval_id uuid;
  at_time timestamptz:=now();
begin
  if p_execution_request_id is null then raise exception 'external_owner_execution_request_required'; end if;
  if upper(nullif(btrim(coalesce(p_expected_status,'')),''))<>'APPROVAL_REQUIRED'
    then raise exception 'external_owner_expected_status_invalid'; end if;
  if p_expected_request_hash is null or p_expected_request_hash!~'^[0-9a-f]{64}$'
    then raise exception 'external_owner_request_hash_invalid'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null or length(btrim(p_reason))>1500
    then raise exception 'external_owner_reason_invalid'; end if;
  if p_confirmation_channel<>'CHAT_OWNER_CONFIRMATION'
    then raise exception 'external_owner_confirmation_channel_invalid'; end if;
  if nullif(btrim(coalesce(p_confirmation_text,'')),'') is null or length(btrim(p_confirmation_text))>2000
    then raise exception 'external_owner_confirmation_text_invalid'; end if;
  if nullif(btrim(coalesce(p_idempotency_key,'')),'') is null or length(btrim(p_idempotency_key))>500
    then raise exception 'external_owner_idempotency_key_invalid'; end if;

  confirmation_hash:=encode(extensions.digest(convert_to(btrim(p_confirmation_text),'UTF8'),'sha256'),'hex');

  select * into existing
  from public.feya_growth_external_owner_approvals_v1 a
  where a.idempotency_key=btrim(p_idempotency_key);

  if found then
    if existing.execution_request_id<>p_execution_request_id
      or existing.request_hash<>p_expected_request_hash
      or existing.confirmation_channel<>p_confirmation_channel
      or existing.confirmation_text_sha256<>confirmation_hash
      then raise exception 'external_owner_approval_idempotency_conflict'; end if;

    return query
    select existing.execution_request_id,'APPROVED'::text,existing.request_hash,
      existing.external_owner_approval_id,existing.approved_at;
    return;
  end if;

  select * into req
  from public.feya_growth_execution_requests_v1 r
  where r.execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'external_owner_execution_request_not_found'; end if;

  if req.request_status<>'APPROVAL_REQUIRED'
    then raise exception 'external_owner_execution_request_stale'; end if;
  if req.request_hash<>p_expected_request_hash
    then raise exception 'external_owner_execution_request_hash_conflict'; end if;

  insert into public.feya_growth_external_owner_approvals_v1(
    execution_request_id,request_hash,confirmation_channel,confirmation_text_sha256,
    reason,idempotency_key,approved_at
  ) values(
    p_execution_request_id,req.request_hash,p_confirmation_channel,confirmation_hash,
    btrim(p_reason),btrim(p_idempotency_key),at_time
  )
  returning feya_growth_external_owner_approvals_v1.external_owner_approval_id into approval_id;

  update public.feya_growth_execution_requests_v1 r
  set request_status='APPROVED',
      approval_hash=req.request_hash,
      approval_reason=btrim(p_reason),
      approved_at=at_time,
      updated_at=at_time
  where r.execution_request_id=p_execution_request_id
    and r.request_status='APPROVAL_REQUIRED'
    and r.request_hash=req.request_hash;

  if not found then raise exception 'external_owner_execution_request_state_conflict'; end if;

  return query
  select p_execution_request_id,'APPROVED'::text,req.request_hash,approval_id,at_time;
end $$;

do $$
declare
  fn regprocedure;
  ddl text;
  patched text;
begin
  foreach fn in array array[
    'public.feya_commerce_execute_release_configuration_binding_repair_v1(uuid)'::regprocedure,
    'public.feya_commerce_execute_price_baseline_adoption_v1(uuid)'::regprocedure,
    'public.feya_commerce_execute_manual_price_lane_governance_v1(uuid)'::regprocedure,
    'public.feya_commerce_execute_color_price_lane_governance_v1(uuid)'::regprocedure
  ] loop
    ddl:=pg_get_functiondef(fn);
    patched:=replace(
      ddl,
      'or req.approved_by_user_id is null',
      'or not public.feya_fn_execution_request_human_approval_valid_v1(p_execution_request_id)'
    );
    if patched=ddl then
      raise exception 'external_owner_executor_patch_not_applied:%',fn::text;
    end if;
    execute patched;
  end loop;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_fn_execution_request_human_approval_valid_v1(uuid)',
    'feya_fn_owner_approve_execution_request_external_v1(uuid,text,text,text,text,text,text)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_fn_execution_request_human_approval_valid_v1(uuid) to service_role;
  grant execute on function public.feya_fn_owner_approve_execution_request_external_v1(uuid,text,text,text,text,text,text) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
