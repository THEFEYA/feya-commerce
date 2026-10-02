-- M2 commerce authority v2: bind explicit policy acknowledgement to every quote-bound order intent.
-- This migration is additive and fail-closed. It does not enable live checkout/payment/provider sessions.

begin;

create table public.feya_commerce_order_intent_policy_acceptance_v1(
  order_intent_id uuid primary key references public.feya_commerce_order_intents_v1(order_intent_id) on delete restrict,
  policy_bundle_sha256 text not null check(policy_bundle_sha256~'^[0-9a-f]{64}$'),
  policy_bundle_json jsonb not null check(jsonb_typeof(policy_bundle_json)='object'),
  explicit_checkbox boolean not null check(explicit_checkbox=true),
  accepted_at timestamptz not null default now()
);

create function public.feya_commerce_order_intent_policy_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'commerce_order_intent_policy_history_is_immutable';
end $$;

create trigger feya_order_intent_policy_immutable
  before update or delete on public.feya_commerce_order_intent_policy_acceptance_v1
  for each row execute function public.feya_commerce_order_intent_policy_history_immutable_v1();

create function public.feya_commerce_checkout_policy_bundle_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  required_codes constant text[]:=array[
    'CHECKOUT_POLICY_ACKNOWLEDGEMENT',
    'ORDER_CANCELLATIONS',
    'RETURN_POLICY_CURRENT',
    'RETURN_NOTICE_WINDOW',
    'DISCOUNTED_ITEM_RETURN_TREATMENT',
    'CUSTOM_OR_MADE_TO_MEASURE_RETURNS',
    'EVENT_OR_SHOOT_CHANGE_POLICY',
    'CUSTOMS_DUTIES_RESPONSIBILITY',
    'CARRIER_DELAY_EVENT_DEADLINE_POLICY',
    'STANDARD_MADE_TO_ORDER_PRODUCTION_TIME',
    'STANDARD_INTERNATIONAL_TRACKED_SHIPPING_TIME',
    'EXPRESS_SHIPPING_TIME'
  ];
  refs jsonb;
  base jsonb;
  h text;
begin
  select jsonb_agg(
    jsonb_build_object(
      'truth_code',b.truth_code,
      'version_no',b.version_no,
      'authority_type',b.authority_type,
      'public_copy',b.public_copy,
      'value_json',b.value_json
    )
    order by b.truth_code
  )
  into refs
  from public.feya_commerce_business_truth_v1 b
  where b.truth_code=any(required_codes)
    and b.locale='en'
    and b.status='ACTIVE'
    and b.valid_to is null;

  if refs is null or jsonb_array_length(refs)<>array_length(required_codes,1)
    then raise exception 'checkout_policy_bundle_incomplete'; end if;

  if exists(
    select 1
    from unnest(required_codes) code
    where (
      select count(*)
      from public.feya_commerce_business_truth_v1 b
      where b.truth_code=code
        and b.locale='en'
        and b.status='ACTIVE'
        and b.valid_to is null
    )<>1
  ) then raise exception 'checkout_policy_bundle_ambiguous'; end if;

  base:=jsonb_build_object(
    'contract_version','checkout_policy_bundle_v1',
    'bundle_version',1,
    'routes',jsonb_build_object(
      'terms','/terms',
      'returns','/returns',
      'shipping','/shipping'
    ),
    'truth_refs',refs,
    'explicit_checkbox_required',true,
    'prechecked_forbidden',true
  );
  h:=encode(sha256(convert_to(base::text,'UTF8')),'hex');
  return base||jsonb_build_object('bundle_sha256',h);
end $$;

create function public.feya_commerce_order_intent_health_v2() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  base jsonb;
  bundle jsonb;
  ready boolean:=true;
  r text;
begin
  base:=public.feya_commerce_order_intent_health_v1();
  begin bundle:=public.feya_commerce_checkout_policy_bundle_v1();
  exception when others then ready:=false; bundle:=null; end;

  if coalesce((base->>'ready')::boolean,false) is not true then ready:=false; end if;
  if not exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='feya_commerce_order_intent_policy_acceptance_v1'
      and c.relrowsecurity
  ) then ready:=false; end if;

  foreach r in array array['anon','authenticated'] loop
    if has_table_privilege(r,'public.feya_commerce_order_intent_policy_acceptance_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then ready:=false; end if;
  end loop;

  if not has_table_privilege('service_role','public.feya_commerce_order_intent_policy_acceptance_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_order_intent_policy_acceptance_v1',
      'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;

  return jsonb_build_object(
    'contract_version','commerce_order_intent_v2',
    'ready',ready,
    'policy_bundle_sha256',bundle->>'bundle_sha256',
    'explicit_policy_acknowledgement_required',true,
    'prechecked_policy_acknowledgement_forbidden',true,
    'client_amounts_accepted',false,
    'quote_receipt_binding_required',true,
    'current_offer_revalidation_required',true,
    'shipping_authority_ready',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false
  );
end $$;

create function public.feya_commerce_create_order_intent_v2(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  v_bundle jsonb;
  v_bundle_hash text;
  v_request jsonb;
  v_receipt jsonb;
  v_intent_id uuid;
  v_existing public.feya_commerce_order_intent_policy_acceptance_v1%rowtype;
begin
  if not (public.feya_commerce_order_intent_health_v2()->>'ready')::boolean
    then raise exception 'order_intent_contract_not_ready'; end if;

  if p_payload is null or jsonb_typeof(p_payload)<>'object'
    or octet_length(p_payload::text)>65536
    or (select count(*) from jsonb_object_keys(p_payload))<>6
    then raise exception 'order_intent_request_invalid'; end if;

  if not (
    p_payload ? 'contract_version'
    and p_payload ? 'request_id'
    and p_payload ? 'quote_receipt_ids'
    and p_payload ? 'contact'
    and p_payload ? 'shipping_method'
    and p_payload ? 'policy_acknowledgement'
  ) then raise exception 'order_intent_request_invalid'; end if;

  if p_payload->>'contract_version'<>'commerce_order_intent_v2'
    then raise exception 'order_intent_request_invalid'; end if;

  if jsonb_typeof(p_payload->'policy_acknowledgement')<>'object'
    or (select count(*) from jsonb_object_keys(p_payload->'policy_acknowledgement'))<>2
    or not (p_payload->'policy_acknowledgement' ? 'accepted')
    or not (p_payload->'policy_acknowledgement' ? 'bundle_sha256')
    or p_payload#>>'{policy_acknowledgement,accepted}'<>'true'
    or not ((p_payload#>>'{policy_acknowledgement,bundle_sha256}')~'^[0-9a-f]{64}$')
    then raise exception 'order_intent_policy_acknowledgement_required'; end if;

  v_bundle:=public.feya_commerce_checkout_policy_bundle_v1();
  v_bundle_hash:=v_bundle->>'bundle_sha256';
  if p_payload#>>'{policy_acknowledgement,bundle_sha256}'<>v_bundle_hash
    then raise exception 'order_intent_policy_version_conflict'; end if;

  v_request:=jsonb_build_object(
    'contract_version','commerce_order_intent_v1',
    'request_id',p_payload->>'request_id',
    'quote_receipt_ids',p_payload->'quote_receipt_ids',
    'contact',p_payload->'contact',
    'shipping_method',p_payload->>'shipping_method'
  );

  v_receipt:=public.feya_commerce_create_order_intent_v1(v_request);
  v_intent_id:=(v_receipt->>'order_intent_id')::uuid;

  select * into v_existing
  from public.feya_commerce_order_intent_policy_acceptance_v1 a
  where a.order_intent_id=v_intent_id;

  if found then
    if v_existing.policy_bundle_sha256<>v_bundle_hash
      then raise exception 'order_intent_policy_version_conflict'; end if;
  else
    insert into public.feya_commerce_order_intent_policy_acceptance_v1(
      order_intent_id,policy_bundle_sha256,policy_bundle_json,explicit_checkbox
    ) values(v_intent_id,v_bundle_hash,v_bundle,true);
  end if;

  return (v_receipt-'contract_version')||jsonb_build_object(
    'contract_version','commerce_order_intent_v2',
    'policy_bundle_sha256',v_bundle_hash,
    'policy_accepted',true,
    'policy_accepted_at',(
      select accepted_at
      from public.feya_commerce_order_intent_policy_acceptance_v1
      where order_intent_id=v_intent_id
    ),
    'replayed',coalesce((v_receipt->>'replayed')::boolean,false)
  );
end $$;

do $$
declare p text;
begin
  alter table public.feya_commerce_order_intent_policy_acceptance_v1 enable row level security;
  revoke all on public.feya_commerce_order_intent_policy_acceptance_v1
    from public,anon,authenticated,service_role;
  grant select,insert on public.feya_commerce_order_intent_policy_acceptance_v1 to service_role;

  foreach p in array array[
    'feya_commerce_order_intent_policy_history_immutable_v1()',
    'feya_commerce_checkout_policy_bundle_v1()',
    'feya_commerce_order_intent_health_v2()',
    'feya_commerce_create_order_intent_v2(jsonb)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
