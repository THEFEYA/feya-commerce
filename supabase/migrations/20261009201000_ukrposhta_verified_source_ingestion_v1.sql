-- M2 Issue #91: capture only a genuine server-verified Ukrposhta
-- international country/product/transport observation, bound to an already
-- owner-reviewed immutable carrier service mapping. No public checkout, rates,
-- order/payment, user postal data, carrier tokens, or auto-approved countries.
-- PR #93 private evidence tables must be installed first.
begin;

create function public.feya_commerce_record_ukrposhta_availability_v1(p_capture jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_required constant text[] := array[
    'contract_version','source_request_id','mapping_revision_id','country',
    'carrier_product','transport_type','carrier_api_result','source_digest_sha256',
    'source_adapter_version','captured_at','expires_at'
  ];
  v_req_id uuid; v_mapping_id uuid; v_country text; v_product text;
  v_transport text; v_result text; v_digest text; v_adapter text;
  v_service text; v_captured timestamptz; v_expires timestamptz;
  v_now timestamptz := clock_timestamp(); v_mapping record;
  v_saved record; v_new_id uuid;
begin
  if p_capture is null or jsonb_typeof(p_capture)<>'object'
    or not (p_capture ?& v_required)
    or (p_capture - v_required) <> '{}'::jsonb
    or p_capture->>'contract_version'<>'commerce_ukrposhta_source_capture_v1'
    or (p_capture->>'source_request_id') is null
    or (p_capture->>'source_request_id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or (p_capture->>'mapping_revision_id') is null
    or (p_capture->>'mapping_revision_id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then raise exception 'ukrposhta_capture_invalid'; end if;
  v_req_id:=(p_capture->>'source_request_id')::uuid;
  v_mapping_id:=(p_capture->>'mapping_revision_id')::uuid;
  v_country:=p_capture->>'country';
  v_product:=p_capture->>'carrier_product';
  v_transport:=p_capture->>'transport_type';
  v_result:=p_capture->>'carrier_api_result';
  v_digest:=p_capture->>'source_digest_sha256';
  v_adapter:=p_capture->>'source_adapter_version';
  if v_country is null or v_country !~ '^[A-Z]{2}$'
    or v_product is null or v_product not in ('SMALL_BAG','PARCEL','EMS')
    or v_transport is null or v_transport not in ('AVIA','GROUND')
    or v_result is null or v_result not in ('available','unavailable')
    or v_digest is null or v_digest !~ '^[0-9a-f]{64}$'
    or v_adapter is distinct from 'ukrposhta_international_20260309_v1'
    or p_capture->>'captured_at' is null
    or p_capture->>'captured_at' !~ '^\\d{4}-\\d{2}-\\d{2}T'
    or p_capture->>'expires_at' is null
    or p_capture->>'expires_at' !~ '^\\d{4}-\\d{2}-\\d{2}T'
  then raise exception 'ukrposhta_capture_invalid'; end if;
  -- Ukraine domestic service is not part of this international export proof.
  -- Suspension hard-deny also overrides any stale owner mapping/positive API.
  if v_country='UA' or v_country=any(array[
    'AF','BS','BY','BF','BI','HT','GY','GN','GQ','YE','IR','KI','KM',
    'MS','NE','PS','SS','RU','SY','SO','SD','TV','KP'
  ]) then raise exception 'ukrposhta_capture_destination_blocked'; end if;
  v_captured:=(p_capture->>'captured_at')::timestamptz;
  v_expires:=(p_capture->>'expires_at')::timestamptz;
  if not isfinite(v_captured) or not isfinite(v_expires)
    or v_captured>v_now+interval '10 seconds'
    or v_captured<v_now-interval '5 minutes'
    or v_expires<=v_now or v_expires<=v_captured
    or v_expires>v_captured+interval '60 minutes'
  then raise exception 'ukrposhta_capture_stale_or_future'; end if;

  -- Standard/Express and parcel class come ONLY from a previously reviewed
  -- immutable mapping, never from API response or client. No EMS=Express guess.
  v_service:=v_product||'_'||v_transport;
  select * into v_mapping
  from public.feya_commerce_carrier_service_mapping_reviews_v1
  where mapping_revision_id=v_mapping_id and carrier='ukrposhta'
    and direction='UA_EXPORT' and carrier_service_code=v_service
    and business_review_confirmed=true
    and public_rates_enabled=false and payment_enabled=false;
  if not found then raise exception 'ukrposhta_capture_mapping_not_reviewed'; end if;

  -- Concurrency-safe idempotency. A reused UUID with different source,
  -- mapping or timestamp never rewrites immutable evidence.
  insert into public.feya_commerce_carrier_method_observations_v1
    (source_request_id,mapping_revision_id,carrier,direction,country,
     postal_prefix,shipping_method,parcel_class,carrier_service_code,
     carrier_api_result,source_digest_sha256,source_adapter_version,
     captured_at,expires_at)
  values(v_req_id,v_mapping_id,'ukrposhta','UA_EXPORT',v_country,
    null,v_mapping.shipping_method,v_mapping.parcel_class,v_service,
    v_result,v_digest,v_adapter,v_captured,v_expires)
  on conflict(source_request_id) do nothing returning capture_id into v_new_id;

  select * into v_saved
    from public.feya_commerce_carrier_method_observations_v1
   where source_request_id=v_req_id;
  if not found then raise exception 'ukrposhta_capture_storage_unavailable'; end if;
  if v_saved.mapping_revision_id<>v_mapping_id or v_saved.carrier<>'ukrposhta'
    or v_saved.direction<>'UA_EXPORT' or v_saved.country<>v_country
    or v_saved.postal_prefix is not null
    or v_saved.shipping_method<>v_mapping.shipping_method
    or v_saved.parcel_class<>v_mapping.parcel_class
    or v_saved.carrier_service_code<>v_service
    or v_saved.carrier_api_result<>v_result
    or v_saved.source_digest_sha256<>v_digest
    or v_saved.source_adapter_version<>v_adapter
    or v_saved.captured_at<>v_captured or v_saved.expires_at<>v_expires
  then raise exception 'ukrposhta_capture_replay_conflict'; end if;

  return jsonb_build_object(
    'contract_version','commerce_ukrposhta_source_receipt_v1',
    'capture_id',v_saved.capture_id,'source_request_id',v_saved.source_request_id,
    'mapping_revision_id',v_saved.mapping_revision_id,
    'country',v_saved.country,'carrier_service_code',v_saved.carrier_service_code,
    'carrier_api_result',v_saved.carrier_api_result,
    'replayed',v_new_id is null,'expired',v_saved.expires_at<=clock_timestamp(),
    'method_mapping_owner_approved',true,
    'payable',false,'public_rates_enabled',false,'payment_enabled',false,
    'provider_session_enabled',false
  );
end $$;

-- Only the backend service identity can record a verified API response.
revoke all on function public.feya_commerce_record_ukrposhta_availability_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.feya_commerce_record_ukrposhta_availability_v1(jsonb)
  to service_role;
notify pgrst, 'reload schema';
commit;
