-- M2 Issue #91. Owner-only reviewed parcel envelope workflow on already
-- approved delivery workspace versions. No carrier/route/rate/payment approval.
-- Partner method mappings require separate source-backed workflow.
begin;

create function public.feya_commerce_owner_carrier_review_context_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  a public.feya_commerce_delivery_approvals_v1%rowtype;
  w public.feya_commerce_delivery_workspace_versions_v1%rowtype;
  v_profiles jsonb;
  v_draft_revision bigint;
begin
  if (public.feya_commerce_shipping_carrier_coverage_health_v1()->>'private_boundary_ready')::boolean is not true
    then raise exception 'carrier_owner_review_boundary_unavailable'; end if;

  select revision into v_draft_revision
    from public.feya_commerce_delivery_workspace_head_v1 where workspace_key='thefeya';
  select approval.* into a
    from public.feya_commerce_delivery_approval_head_v1 h
    join public.feya_commerce_delivery_approvals_v1 approval
      on approval.approval_id=h.approval_id and approval.revision=h.revision
    where h.workspace_key='thefeya';
  if not found then
    return jsonb_build_object(
      'contract_version','commerce_carrier_owner_review_context_v1',
      'status','awaiting_delivery_approval','saved_draft_revision',coalesce(v_draft_revision,0),
      'approved_workspace_version_id',null,'approved_workspace_revision',null,
      'profiles','[]'::jsonb,
      'mapping_review_count',(select count(*) from public.feya_commerce_carrier_service_mapping_reviews_v1),
      'source_observation_count',(select count(*) from public.feya_commerce_carrier_method_observations_v1),
      'payable',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
  end if;

  select * into w from public.feya_commerce_delivery_workspace_versions_v1
    where version_id=a.workspace_version_id and revision=a.workspace_revision;
  if not found or w.snapshot_sha256<>a.snapshot_sha256
    or jsonb_typeof(w.draft->'shipping_profiles') is distinct from 'array'
    then raise exception 'carrier_owner_review_workspace_invalid'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'shipping_profile_id',p.value->>'id',
    'name',p.value->>'name',
    'currency',p.value->>'currency',
    'max_units_per_parcel',p.value->'max_units_per_parcel',
    'owner_review',(select jsonb_build_object(
       'review_id',r.review_id,
       'parcel_class',r.parcel_class,'max_units_per_parcel',r.max_units_per_parcel,
       'envelope_weight_grams',r.envelope_weight_grams,
       'envelope_length_mm',r.envelope_length_mm,
       'envelope_width_mm',r.envelope_width_mm,
       'envelope_height_mm',r.envelope_height_mm,
       'packaging_reference',r.packaging_reference,
       'reviewed_at',r.reviewed_at)
      from public.feya_commerce_shipping_parcel_profile_reviews_v1 r
      where r.workspace_version_id=w.version_id and r.workspace_revision=w.revision
        and r.shipping_profile_id=(p.value->>'id')::uuid)
    ) order by p.value->>'name',p.value->>'id'),'[]'::jsonb) into v_profiles
  from jsonb_array_elements(w.draft->'shipping_profiles') p(value)
  where coalesce(p.value->>'id','') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  return jsonb_build_object(
    'contract_version','commerce_carrier_owner_review_context_v1',
    'status','approved_workspace',
    'saved_draft_revision',coalesce(v_draft_revision,0),
    'approved_workspace_version_id',w.version_id,
    'approved_workspace_revision',w.revision,
    'profiles',v_profiles,
    'mapping_review_count',(select count(*) from public.feya_commerce_carrier_service_mapping_reviews_v1),
    'source_observation_count',(select count(*) from public.feya_commerce_carrier_method_observations_v1),
    'payable',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

create function public.feya_commerce_confirm_owner_parcel_review_v1(p_payload jsonb,p_actor_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  a public.feya_commerce_delivery_approvals_v1%rowtype;
  w public.feya_commerce_delivery_workspace_versions_v1%rowtype;
  r public.feya_commerce_shipping_parcel_profile_reviews_v1%rowtype;
  v_key constant text[]:=array[
    'request_id','workspace_version_id','workspace_revision','shipping_profile_id',
    'parcel_class','max_units_per_parcel','envelope_weight_grams',
    'envelope_length_mm','envelope_width_mm','envelope_height_mm',
    'packaging_reference','business_review_confirmed'
  ];
  v_id uuid; v_workspace uuid; v_profile uuid; v_revision bigint;
  v_cls text;v_qty integer;v_grams integer;v_l integer;v_w integer;v_h integer;
  v_ref text;v_owner_cap integer;v_owner_count integer;v_digest text;
  v_current record;
begin
  if (public.feya_commerce_shipping_carrier_coverage_health_v1()->>'private_boundary_ready')::boolean is not true
     then raise exception 'carrier_owner_review_boundary_unavailable'; end if;
  if p_actor_id is null or not exists(select 1 from auth.users where id=p_actor_id)
    or p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
    or octet_length(p_payload::text)>2800
    or not(p_payload ?& v_key) or (p_payload-v_key)<>'{}'::jsonb
    or coalesce(p_payload->>'request_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_payload->>'workspace_version_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_payload->>'shipping_profile_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or p_payload->'business_review_confirmed' is distinct from 'true'::jsonb
    or p_payload->>'parcel_class' not in ('ordinary','oversize')
    or jsonb_typeof(p_payload->'workspace_revision') is distinct from 'number'
    or jsonb_typeof(p_payload->'max_units_per_parcel') is distinct from 'number'
    or jsonb_typeof(p_payload->'envelope_weight_grams') is distinct from 'number'
    or jsonb_typeof(p_payload->'envelope_length_mm') is distinct from 'number'
    or jsonb_typeof(p_payload->'envelope_width_mm') is distinct from 'number'
    or jsonb_typeof(p_payload->'envelope_height_mm') is distinct from 'number'
    or coalesce(p_payload->>'workspace_revision','') !~ '^[0-9]{1,16}$'
    or coalesce(p_payload->>'max_units_per_parcel','') !~ '^[0-9]{1,3}$'
    or coalesce(p_payload->>'envelope_weight_grams','') !~ '^[0-9]{1,6}$'
    or coalesce(p_payload->>'envelope_length_mm','') !~ '^[0-9]{1,4}$'
    or coalesce(p_payload->>'envelope_width_mm','') !~ '^[0-9]{1,4}$'
    or coalesce(p_payload->>'envelope_height_mm','') !~ '^[0-9]{1,4}$'
    or jsonb_typeof(p_payload->'packaging_reference') is distinct from 'string'
  then raise exception 'carrier_owner_review_request_invalid'; end if;
  v_id:=(p_payload->>'request_id')::uuid;
  v_workspace:=(p_payload->>'workspace_version_id')::uuid;
  v_profile:=(p_payload->>'shipping_profile_id')::uuid;
  v_revision:=(p_payload->>'workspace_revision')::bigint;
  v_cls:=p_payload->>'parcel_class';
  v_qty:=(p_payload->>'max_units_per_parcel')::integer;
  v_grams:=(p_payload->>'envelope_weight_grams')::integer;
  v_l:=(p_payload->>'envelope_length_mm')::integer;
  v_w:=(p_payload->>'envelope_width_mm')::integer;
  v_h:=(p_payload->>'envelope_height_mm')::integer;
  v_ref:=btrim(p_payload->>'packaging_reference');
  if v_revision<1 or v_qty not between 1 and 100
    or v_grams not between 1 and 500000
    or v_l not between 1 and 5000 or v_w not between 1 and 5000 or v_h not between 1 and 5000
    or length(v_ref) not between 12 and 200 or v_ref ~ '[[:cntrl:]]'
    then raise exception 'carrier_owner_review_package_invalid'; end if;

  -- This hash is an immutable OWNER MEASUREMENT ATTESTATION, not a carrier
  -- certification and not a cryptographic hash of a photo we never received.
  v_digest:=encode(pg_catalog.sha256(convert_to(jsonb_build_object(
     'workspace_version_id',v_workspace,'workspace_revision',v_revision,
     'shipping_profile_id',v_profile,'parcel_class',v_cls,
     'max_units_per_parcel',v_qty,'weight_grams',v_grams,
     'length_mm',v_l,'width_mm',v_w,'height_mm',v_h,
     'reference',v_ref,'reviewed_by',p_actor_id
   )::text,'UTF8')),'hex');

  -- Same lock used by approved delivery save/promotion.
  perform pg_catalog.pg_advisory_xact_lock(734608221815091::bigint);
  select * into r from public.feya_commerce_shipping_parcel_profile_reviews_v1 where review_id=v_id;
  if found then
    if r.reviewed_by<>p_actor_id or r.workspace_version_id<>v_workspace
      or r.workspace_revision<>v_revision or r.shipping_profile_id<>v_profile
      or r.parcel_class<>v_cls or r.max_units_per_parcel<>v_qty
      or r.envelope_weight_grams<>v_grams or r.envelope_length_mm<>v_l
      or r.envelope_width_mm<>v_w or r.envelope_height_mm<>v_h
      or r.packaging_reference<>v_ref or r.packaging_evidence_sha256<>v_digest
    then raise exception 'carrier_owner_review_request_conflict'; end if;
    return jsonb_build_object(
      'contract_version','commerce_carrier_owner_review_receipt_v1',
      'review_id',r.review_id,'shipping_profile_id',r.shipping_profile_id,
      'workspace_version_id',r.workspace_version_id,
      'workspace_revision',r.workspace_revision,
      'parcel_class',r.parcel_class,'reviewed_at',r.reviewed_at,
      'replayed',true,'carrier_route_verified',false,
      'payable',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
  end if;

  select approval.* into a from public.feya_commerce_delivery_approval_head_v1 head
    join public.feya_commerce_delivery_approvals_v1 approval
      on approval.approval_id=head.approval_id and approval.revision=head.revision
    where head.workspace_key='thefeya';
  if not found or a.workspace_version_id<>v_workspace or a.workspace_revision<>v_revision
    then raise exception 'carrier_owner_review_approval_required'; end if;
  select * into w from public.feya_commerce_delivery_workspace_versions_v1
    where version_id=v_workspace and revision=v_revision;
  if not found or w.snapshot_sha256<>a.snapshot_sha256
    or jsonb_typeof(w.draft->'shipping_profiles') is distinct from 'array'
  then raise exception 'carrier_owner_review_workspace_changed'; end if;

  select count(*),max((p.value->>'max_units_per_parcel')::integer)
    into v_owner_count,v_owner_cap from jsonb_array_elements(w.draft->'shipping_profiles') p(value)
   where p.value->>'id'=v_profile::text
     and jsonb_typeof(p.value->'max_units_per_parcel')='number';
  if v_owner_count<>1 or v_owner_cap is distinct from v_qty
    then raise exception 'carrier_owner_review_profile_mismatch'; end if;

  if exists(select 1 from public.feya_commerce_shipping_parcel_profile_reviews_v1
     where workspace_version_id=v_workspace and workspace_revision=v_revision
       and shipping_profile_id=v_profile)
    then raise exception 'carrier_owner_review_already_confirmed'; end if;

  insert into public.feya_commerce_shipping_parcel_profile_reviews_v1(
    review_id,workspace_version_id,workspace_revision,shipping_profile_id,
    parcel_class,max_units_per_parcel,envelope_weight_grams,
    envelope_length_mm,envelope_width_mm,envelope_height_mm,
    packaging_evidence_sha256,packaging_reference,reviewed_by,business_review_confirmed
  ) values(
    v_id,v_workspace,v_revision,v_profile,
    v_cls,v_qty,v_grams,v_l,v_w,v_h,
    v_digest,v_ref,p_actor_id,true
  ) returning * into r;

  return jsonb_build_object(
    'contract_version','commerce_carrier_owner_review_receipt_v1',
    'review_id',r.review_id,'shipping_profile_id',r.shipping_profile_id,
    'workspace_version_id',r.workspace_version_id,
    'workspace_revision',r.workspace_revision,
    'parcel_class',r.parcel_class,'reviewed_at',r.reviewed_at,
    'replayed',false,'carrier_route_verified',false,
    'payable',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

-- Never expose review records or RPCs directly to browsers.
revoke all on function public.feya_commerce_owner_carrier_review_context_v1(),
  public.feya_commerce_confirm_owner_parcel_review_v1(jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_owner_carrier_review_context_v1(),
  public.feya_commerce_confirm_owner_parcel_review_v1(jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
