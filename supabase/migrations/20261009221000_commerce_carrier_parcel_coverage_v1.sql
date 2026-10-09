-- M2 Issue #91 / post PR #103. Service-role ONLY read-only carrier source
-- coverage bound to an immutable shipping v2 quote and reviewed parcel profile.
-- A COUNTRY/PRODUCT carrier API positive is NOT full parcel serviceability.
-- No buyer-facing rate, parcel label, tax, payment or provider session.
begin;

create table public.feya_commerce_shipping_parcel_profile_reviews_v1(
  review_id uuid primary key default gen_random_uuid(),
  workspace_version_id uuid not null,
  workspace_revision bigint not null check(workspace_revision>0),
  shipping_profile_id uuid not null,
  parcel_class text not null check(parcel_class in ('ordinary','oversize')),
  max_units_per_parcel integer not null check(max_units_per_parcel between 1 and 100),
  envelope_weight_grams integer not null check(envelope_weight_grams between 1 and 500000),
  envelope_length_mm integer not null check(envelope_length_mm between 1 and 5000),
  envelope_width_mm integer not null check(envelope_width_mm between 1 and 5000),
  envelope_height_mm integer not null check(envelope_height_mm between 1 and 5000),
  packaging_evidence_sha256 text not null check(packaging_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  packaging_reference text not null check(length(btrim(packaging_reference)) between 8 and 200),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  business_review_confirmed boolean not null check(business_review_confirmed=true),
  reviewed_at timestamptz not null default transaction_timestamp(),
  payable boolean not null default false check(payable=false),
  public_rates_enabled boolean not null default false check(public_rates_enabled=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  unique(workspace_version_id,workspace_revision,shipping_profile_id),
  foreign key (workspace_version_id,workspace_revision)
    references public.feya_commerce_delivery_workspace_versions_v1(version_id,revision) on delete restrict
);

create function public.feya_commerce_parcel_review_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'carrier_parcel_review_immutable'; end $$;
create trigger feya_carrier_parcel_review_immutable_v1 before update or delete
 on public.feya_commerce_shipping_parcel_profile_reviews_v1
 for each row execute function public.feya_commerce_parcel_review_immutable_v1();

-- One STABLE DB snapshot, including quote, owner head, parcel reviews and
-- service-only carrier evidence. NEVER asserts package weight or route can
-- actually be purchased; it can only expose source-country/product coverage.
create function public.feya_commerce_shipping_carrier_coverage_v1(p_quote_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_quote public.feya_commerce_approved_shipping_quote_receipts_v2%rowtype;
  v_head public.feya_commerce_delivery_approval_head_v1%rowtype;
  v_workspace public.feya_commerce_delivery_workspace_versions_v1%rowtype;
  v_parcel jsonb; v_ord bigint; v_qty integer; v_ids jsonb; v_rules jsonb;
  v_shipping_id uuid; v_rule_id uuid; v_profile_count integer;
  v_review public.feya_commerce_shipping_parcel_profile_reviews_v1%rowtype;
  v_context jsonb; v_parcels jsonb:='[]'::jsonb; v_status text;
  v_postal text; v_blocked boolean:=false;
  v_now timestamptz:=transaction_timestamp();
  v_checked text;
begin
  if p_quote_id is null then raise exception 'carrier_coverage_quote_invalid'; end if;

  select * into v_quote
  from public.feya_commerce_approved_shipping_quote_receipts_v2
  where shipping_quote_receipt_id=p_quote_id;
  if not found then raise exception 'carrier_coverage_quote_not_found'; end if;

  if v_quote.expires_at<=v_now then raise exception 'carrier_coverage_quote_expired'; end if;
  if v_quote.payable<>false or v_quote.payment_enabled<>false
    or v_quote.provider_session_enabled<>false or v_quote.currency<>'EUR'
    or v_quote.destination_country !~ '^[A-Z]{2}$'
    or v_quote.destination_postal_code !~ '^[A-Z0-9]{1,32}$'
    or v_quote.response->>'shipping_quote_receipt_id' is distinct from p_quote_id::text
    or v_quote.response->>'country' is distinct from v_quote.destination_country
    or v_quote.response->>'shipping_method' is distinct from v_quote.shipping_method
    or v_quote.response->>'basket_sha256' is distinct from v_quote.basket_sha256
    or v_quote.response->>'destination_sha256' is distinct from v_quote.destination_sha256
    or v_quote.details->>'country' is distinct from v_quote.destination_country
    or v_quote.details->>'postal_code' is distinct from v_quote.destination_postal_code
    or v_quote.details->>'shipping_method' is distinct from v_quote.shipping_method
    or jsonb_typeof(v_quote.details->'parcels') is distinct from 'array'
    or jsonb_array_length(v_quote.details->'parcels')<>v_quote.parcel_count
    or v_quote.parcel_count not between 1 and 100
  then raise exception 'carrier_coverage_quote_authority_invalid'; end if;

  select * into v_head from public.feya_commerce_delivery_approval_head_v1
    where workspace_key='thefeya';
  if not found or v_head.approval_id<>v_quote.approval_id
    or v_head.revision<>v_quote.approval_revision
  then raise exception 'carrier_coverage_owner_approval_changed'; end if;

  select * into v_workspace from public.feya_commerce_delivery_workspace_versions_v1
    where version_id=v_quote.workspace_version_id
      and revision=v_quote.workspace_revision;
  if not found or v_workspace.snapshot_sha256<>v_quote.workspace_snapshot_sha256
    or jsonb_typeof(v_workspace.draft->'shipping_profiles') is distinct from 'array'
  then raise exception 'carrier_coverage_workspace_invalid'; end if;

  v_postal:=v_quote.destination_postal_code;
  v_checked:=to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_blocked:=v_quote.destination_country='UA' or v_quote.destination_country=any(array[
    'AF','BS','BY','BF','BI','HT','GY','GN','GQ','YE','IR','KI','KM',
    'MS','NE','PS','SS','RU','SY','SO','SD','TV','KP'
  ]);

  for v_parcel,v_ord in
    select item.value,item.ordinality
    from jsonb_array_elements(v_quote.details->'parcels') with ordinality item(value,ordinality)
  loop
    v_status:='parcel_review_missing';
    v_context:=null;
    v_shipping_id:=null; v_rule_id:=null;

    if jsonb_typeof(v_parcel) is distinct from 'object'
      or jsonb_typeof(v_parcel->'shipping_profile_ids') is distinct from 'array'
      or jsonb_typeof(v_parcel->'rule_ids') is distinct from 'array'
      or jsonb_array_length(v_parcel->'shipping_profile_ids')<>1
      or jsonb_array_length(v_parcel->'rule_ids')<>1
      or jsonb_typeof(v_parcel->'quantity') is distinct from 'number'
      or coalesce(v_parcel->>'quantity','') !~ '^[0-9]{1,3}$'
    then
      v_status:='mixed_or_invalid_parcel';
    else
      v_ids:=v_parcel->'shipping_profile_ids';
      v_rules:=v_parcel->'rule_ids';
      if coalesce(v_ids->>0,'') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or coalesce(v_rules->>0,'') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then
        v_status:='mixed_or_invalid_parcel';
      else
        v_shipping_id:=(v_ids->>0)::uuid;v_rule_id:=(v_rules->>0)::uuid;
        v_qty:=(v_parcel->>'quantity')::integer;
        select count(*) into v_profile_count
          from jsonb_array_elements(v_workspace.draft->'shipping_profiles') sp
          where sp->>'id'=v_shipping_id::text
            and jsonb_typeof(sp->'rules')='array'
            and exists (select 1 from jsonb_array_elements(sp->'rules') r
                         where r->>'id'=v_rule_id::text);
        if v_qty<1 or v_profile_count<>1 then
          v_status:='mixed_or_invalid_parcel';
        elsif v_blocked then
          v_status:='destination_blocked';
        else
          select * into v_review
            from public.feya_commerce_shipping_parcel_profile_reviews_v1
           where workspace_version_id=v_quote.workspace_version_id
             and workspace_revision=v_quote.workspace_revision
             and shipping_profile_id=v_shipping_id
             and business_review_confirmed=true;
          if not found then
            v_status:='parcel_review_missing';
          elsif v_qty>v_review.max_units_per_parcel then
            v_status:='parcel_capacity_exceeded';
          else
            v_status:='country_product_source_check';
            v_context:=public.feya_commerce_carrier_method_context_v1(
              v_quote.destination_country,v_postal,v_quote.shipping_method,
              v_review.parcel_class);
          end if;
        end if;
      end if;
    end if;
    v_parcels:=v_parcels||jsonb_build_array(jsonb_build_object(
      'index',v_ord,'status',v_status,
      'parcel_class',case when v_status='country_product_source_check' then v_review.parcel_class else null end,
      'method_context',v_context
    ));
  end loop;

  return jsonb_build_object(
    'contract_version','commerce_shipping_carrier_coverage_v1',
    'shipping_quote_receipt_id',p_quote_id,
    'workspace_version_id',v_quote.workspace_version_id,
    'workspace_revision',v_quote.workspace_revision,
    'country',v_quote.destination_country,
    'postal_code',v_quote.destination_postal_code,
    'shipping_method',v_quote.shipping_method,
    'parcel_count',v_quote.parcel_count,
    'checked_at',v_checked,'quote_expires_at',v_quote.expires_at,
    'globally_blocked',v_blocked,'parcels',v_parcels,
    'coverage_scope','country_product_transport_only',
    'parcel_dimensions_provider_verified',false,
    'postal_route_provider_verified',false,
    'payable',false,'public_rates_enabled',false,
    'payment_enabled',false,'provider_session_enabled',false
  );
end $$;

create function public.feya_commerce_shipping_carrier_coverage_health_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_ok boolean:=true; v_role text;
begin
  if not exists(select 1 from pg_catalog.pg_class c
    where c.oid='public.feya_commerce_shipping_parcel_profile_reviews_v1'::regclass
      and c.relrowsecurity) then v_ok:=false; end if;
  foreach v_role in array array['anon','authenticated'] loop
    if has_table_privilege(v_role,'public.feya_commerce_shipping_parcel_profile_reviews_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_function_privilege(v_role,'public.feya_commerce_shipping_carrier_coverage_v1(uuid)','EXECUTE')
      or has_function_privilege(v_role,'public.feya_commerce_shipping_carrier_coverage_health_v1()','EXECUTE')
      then v_ok:=false; end if;
  end loop;
  if not has_table_privilege('service_role','public.feya_commerce_shipping_parcel_profile_reviews_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_shipping_parcel_profile_reviews_v1',
      'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or not has_function_privilege('service_role','public.feya_commerce_shipping_carrier_coverage_v1(uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.feya_commerce_shipping_carrier_coverage_health_v1()','EXECUTE')
    then v_ok:=false; end if;
  if not exists(select 1 from pg_catalog.pg_trigger
    where tgrelid='public.feya_commerce_shipping_parcel_profile_reviews_v1'::regclass
      and tgname='feya_carrier_parcel_review_immutable_v1' and tgenabled='O')
    then v_ok:=false; end if;
  return jsonb_build_object('contract_version','commerce_shipping_carrier_coverage_v1',
    'private_boundary_ready',v_ok,
    'parcel_profile_reviews',(select count(*) from public.feya_commerce_shipping_parcel_profile_reviews_v1),
    'carrier_observations',(select count(*) from public.feya_commerce_carrier_method_observations_v1),
    'payable',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

alter table public.feya_commerce_shipping_parcel_profile_reviews_v1 enable row level security;
revoke all on public.feya_commerce_shipping_parcel_profile_reviews_v1
  from public,anon,authenticated,service_role;
grant select,insert on public.feya_commerce_shipping_parcel_profile_reviews_v1 to service_role;
revoke all on function public.feya_commerce_parcel_review_immutable_v1(),
  public.feya_commerce_shipping_carrier_coverage_v1(uuid),
  public.feya_commerce_shipping_carrier_coverage_health_v1()
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_shipping_carrier_coverage_v1(uuid),
  public.feya_commerce_shipping_carrier_coverage_health_v1() to service_role;
notify pgrst,'reload schema';
commit;
