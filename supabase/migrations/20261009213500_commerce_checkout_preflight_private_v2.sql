-- M2 Issue #81. Exact destination-bound, immutable internal checkout preflight.
-- No live checkout, no provider transaction, no tax zero assumption, no promo,
-- no customer-facing API and no automatic acceptance of any carrier route.
-- This only adds service-role private storage; current production will have
-- zero rows until independent owner/privacy/business gates are complete.
begin;

create table public.feya_commerce_checkout_preflights_v2 (
  preflight_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256 ~ '^[0-9a-f]{64}$'),
  shipping_quote_receipt_id uuid not null unique
    references public.feya_commerce_approved_shipping_quote_receipts_v2(shipping_quote_receipt_id) on delete restrict,
  delivery_approval_id uuid not null,
  delivery_approval_revision bigint not null,
  workspace_version_id uuid not null,
  basket_sha256 text not null check(basket_sha256 ~ '^[0-9a-f]{64}$'),
  destination_sha256 text not null check(destination_sha256 ~ '^[0-9a-f]{64}$'),
  destination_country text not null check(destination_country ~ '^[A-Z]{2}$'),
  destination_postal_code text not null check(length(destination_postal_code) between 1 and 32),
  -- Address is verified transiently. Persist country/postal only, NEVER name,
  -- email, phone or street address before a governed private PII retention flow.
  destination jsonb not null check(jsonb_typeof(destination)='object'),
  policy_bundle_sha256 text not null check(policy_bundle_sha256 ~ '^[0-9a-f]{64}$'),
  policy_accepted_at timestamptz not null,
  merchandise_subtotal_minor bigint not null check(merchandise_subtotal_minor>0),
  shipping_amount_minor bigint not null check(shipping_amount_minor>=0),
  handling_amount_minor bigint not null check(handling_amount_minor>=0),
  pre_tax_estimate_minor bigint not null check(pre_tax_estimate_minor>0),
  currency text not null default 'EUR' check(currency='EUR'),
  tax_amount_minor bigint,
  amount_due_minor bigint,
  carrier_proof_complete boolean not null default false check(carrier_proof_complete=false),
  order_creation_enabled boolean not null default false check(order_creation_enabled=false),
  payable boolean not null default false check(payable=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  provider_session_enabled boolean not null default false check(provider_session_enabled=false),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null,
  expires_at timestamptz not null check(expires_at>created_at),
  check(tax_amount_minor is null and amount_due_minor is null),
  check(pre_tax_estimate_minor=merchandise_subtotal_minor+shipping_amount_minor+handling_amount_minor)
);

create index feya_checkout_preflight_expiry_v2
  on public.feya_commerce_checkout_preflights_v2(expires_at);

create function public.feya_commerce_checkout_preflight_immutable_v2()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'checkout_preflight_history_immutable'; end $$;

create trigger feya_checkout_preflight_immutable_v2
 before update or delete on public.feya_commerce_checkout_preflights_v2
 for each row execute function public.feya_commerce_checkout_preflight_immutable_v2();

create function public.feya_commerce_create_checkout_preflight_v2(p_request jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_quote public.feya_commerce_approved_shipping_quote_receipts_v2%rowtype;
  v_old public.feya_commerce_checkout_preflights_v2%rowtype;
  v_head public.feya_commerce_delivery_approval_head_v1%rowtype;
  v_request_id uuid; v_quote_id uuid; v_normalized jsonb; v_destination jsonb;
  v_hash text; v_country text; v_postal text; v_email text; v_dest_hash text;
  v_policy jsonb; v_policy_hash text; v_context jsonb;
  v_count integer; v_distinct_products integer; v_currencies integer;
  v_merchandise numeric; v_handling bigint; v_total numeric;
  v_created timestamptz; v_expires timestamptz;
  v_id uuid:=gen_random_uuid(); v_response jsonb;
  v_required constant text[]:=array[
    'contract_version','request_id','shipping_quote_receipt_id','destination','policy_acknowledgement'
  ];
  v_addr_required constant text[]:=array[
    'contract_version','country','postal_code','recipient_full_name','contact_email',
    'contact_phone','region','city','address_line1','address_line2'
  ];
begin
  if p_request is null or jsonb_typeof(p_request)<>'object'
    or octet_length(p_request::text)>4096
    or not(p_request ?& v_required)
    or (p_request-v_required)<>'{}'::jsonb
    or p_request->>'contract_version' is distinct from 'commerce_checkout_preflight_v2'
    or coalesce(p_request->>'request_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_request->>'shipping_quote_receipt_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then raise exception 'checkout_preflight_request_invalid'; end if;
  if jsonb_typeof(p_request->'destination') is distinct from 'object'
    or not(p_request->'destination' ?& v_addr_required)
    or ((p_request->'destination')-v_addr_required)<>'{}'::jsonb
    or p_request#>>'{destination,contract_version}' is distinct from 'commerce_checkout_destination_v2'
    or jsonb_typeof(p_request->'policy_acknowledgement') is distinct from 'object'
    or not(p_request->'policy_acknowledgement' ?& array['accepted','bundle_sha256'])
    or ((p_request->'policy_acknowledgement')-array['accepted','bundle_sha256'])<>'{}'::jsonb
    or p_request#>'{policy_acknowledgement,accepted}' is distinct from 'true'::jsonb
    or coalesce(p_request#>>'{policy_acknowledgement,bundle_sha256}','') !~ '^[0-9a-f]{64}$'
    then raise exception 'checkout_preflight_policy_or_address_invalid'; end if;

  v_request_id:=(p_request->>'request_id')::uuid;
  v_quote_id:=(p_request->>'shipping_quote_receipt_id')::uuid;
  v_destination:=p_request->'destination';
  v_country:=v_destination->>'country';
  v_postal:=v_destination->>'postal_code';
  v_email:=v_destination->>'contact_email';
  if v_country is null or v_country !~ '^[A-Z]{2}$'
    or v_country='UA'
    or v_country=any(array[
      'AF','BS','BY','BF','BI','HT','GY','GN','GQ','YE','IR','KI','KM',
      'MS','NE','PS','SS','RU','SY','SO','SD','TV','KP'
    ])
    then raise exception 'checkout_preflight_destination_unserved'; end if;
  if v_postal is null or length(v_postal) not between 1 and 32
    or v_postal !~ '^[A-Za-z0-9 -]+$'
    or jsonb_typeof(v_destination->'postal_code')<>'string'
    or jsonb_typeof(v_destination->'contact_email')<>'string'
    or jsonb_typeof(v_destination->'recipient_full_name')<>'string'
    or jsonb_typeof(v_destination->'city')<>'string'
    or jsonb_typeof(v_destination->'address_line1')<>'string'
    or v_email is null or length(v_email) not between 3 and 320
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or exists(
      select 1
      from jsonb_each_text(v_destination) fields(key,val)
      where key in ('recipient_full_name','city','address_line1','region','address_line2','contact_phone')
        and val is not null and val ~ '[[:cntrl:]]'
    )
    or length(btrim(coalesce(v_destination->>'recipient_full_name',''))) not between 1 and 200
    or length(btrim(coalesce(v_destination->>'city',''))) not between 1 and 150
    or length(btrim(coalesce(v_destination->>'address_line1',''))) not between 1 and 250
    or (v_destination->>'region' is not null
      and length(btrim(v_destination->>'region')) not between 1 and 150)
    or (v_destination->>'address_line2' is not null
      and length(btrim(v_destination->>'address_line2')) not between 1 and 250)
    or (v_destination->>'contact_phone' is not null
      and length(btrim(v_destination->>'contact_phone')) not between 1 and 100)
  then raise exception 'checkout_preflight_address_invalid'; end if;

  v_postal:=upper(regexp_replace(v_postal,'[ -]','','g'));
  v_normalized:=jsonb_set(jsonb_set(p_request,
    '{destination,postal_code}',to_jsonb(v_postal)),
    '{destination,contact_email}',to_jsonb(lower(btrim(v_email))));
  v_hash:=encode(pg_catalog.sha256(convert_to(v_normalized::text,'UTF8')),'hex');
  -- Canonical JS destination digest is JSON.stringify({country,postal_code});
  -- postal alphabet excludes quotes and backslashes, so this is byte-exact.
  v_dest_hash:=encode(pg_catalog.sha256(convert_to(
    '{"country":"'||v_country||'","postal_code":"'||v_postal||'"}','UTF8')),'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('feya-checkout-preflight-v2:'||v_request_id::text,0));
  select * into v_old from public.feya_commerce_checkout_preflights_v2
    where request_id=v_request_id;
  if found then
    if v_old.request_sha256<>v_hash then raise exception 'checkout_preflight_request_conflict'; end if;
    return v_old.response || jsonb_build_object(
      'replayed',true,'expired',v_old.expires_at<=clock_timestamp());
  end if;

  -- Share the exact owner lock used by delivery approval / shipping-v2 writes.
  perform pg_catalog.pg_advisory_xact_lock_shared(734608221815091::bigint);
  select * into v_quote from public.feya_commerce_approved_shipping_quote_receipts_v2
    where shipping_quote_receipt_id=v_quote_id for share;
  if not found then raise exception 'checkout_preflight_shipping_not_found'; end if;
  v_created:=clock_timestamp();
  if v_quote.expires_at<=v_created
    then raise exception 'checkout_preflight_shipping_expired'; end if;
  if v_quote.currency<>'EUR' or v_quote.payable<>false
    or v_quote.payment_enabled<>false or v_quote.provider_session_enabled<>false
    or v_quote.destination_country<>v_country
    or v_quote.destination_postal_code<>v_postal
    or v_quote.destination_sha256<>v_dest_hash
    or v_quote.response->>'country' is distinct from v_country
    or v_quote.response->>'shipping_method' is distinct from v_quote.shipping_method
    or v_quote.response->>'basket_sha256' is distinct from v_quote.basket_sha256
    or v_quote.response->>'destination_sha256' is distinct from v_quote.destination_sha256
    or v_quote.response->>'shipping_quote_receipt_id' is distinct from v_quote_id::text
    or v_quote.details->>'basket_sha256' is distinct from v_quote.basket_sha256
    or v_quote.details->>'destination_sha256' is distinct from v_quote.destination_sha256
    or v_quote.details->>'country' is distinct from v_country
    or v_quote.details->>'postal_code' is distinct from v_postal
    or v_quote.details->>'shipping_method' is distinct from v_quote.shipping_method
    or (v_quote.response->>'amount_minor')::bigint<>v_quote.amount_minor
  then raise exception 'checkout_preflight_shipping_identity_invalid'; end if;

  select * into v_head from public.feya_commerce_delivery_approval_head_v1
    where workspace_key='thefeya' for share;
  if not found or v_head.approval_id<>v_quote.approval_id
    or v_head.revision<>v_quote.approval_revision
    then raise exception 'checkout_preflight_shipping_approval_changed'; end if;

  -- Lock exact current offer heads against a racing price promotion.
  perform 1 from public.feya_commerce_offer_heads_v1 h
   join public.feya_commerce_quote_receipts_v1 q
     on q.canonical_product_id=h.canonical_product_id
   where q.quote_receipt_id=any(v_quote.merchandise_quote_receipt_ids)
   for share of h;

  -- This service-only reader rechecks every immutable merchandise line,
  -- exact active offer/variant price and currently approved delivery/catalog.
  v_context:=public.feya_commerce_approved_delivery_context_v1(
    v_quote.merchandise_quote_receipt_ids);
  if v_context->>'catalog_sha256' is distinct from v_quote.catalog_sha256
    or v_context#>>'{approval,approval_id}' is distinct from v_quote.approval_id::text
    or (v_context#>>'{approval,revision}')::bigint is distinct from v_quote.approval_revision
    or v_context#>>'{approval,workspace_version_id}' is distinct from v_quote.workspace_version_id::text
    or v_context#>>'{approval,snapshot_sha256}' is distinct from v_quote.workspace_snapshot_sha256
    then raise exception 'checkout_preflight_current_authority_changed'; end if;

  -- One live, versioned policy hash. Client MUST explicitly acknowledge it.
  v_policy:=public.feya_commerce_checkout_policy_bundle_v1();
  v_policy_hash:=v_policy->>'bundle_sha256';
  if v_policy_hash is null or v_policy_hash !~ '^[0-9a-f]{64}$'
    or v_policy_hash is distinct from p_request#>>'{policy_acknowledgement,bundle_sha256}'
    then raise exception 'checkout_preflight_policy_version_conflict'; end if;

  if jsonb_typeof(v_context->'merchandise')<>'array'
    then raise exception 'checkout_preflight_merchandise_invalid'; end if;
  select count(*),count(distinct l->>'canonical_product_id'),
    count(distinct l->>'currency'),
    coalesce(sum((l->>'line_amount_minor')::numeric),0)
  into v_count,v_distinct_products,v_currencies,v_merchandise
  from jsonb_array_elements(v_context->'merchandise') l;
  if v_count<>cardinality(v_quote.merchandise_quote_receipt_ids)
    or v_count not between 1 and 20 or v_currencies<>1
    or exists(select 1 from jsonb_array_elements(v_context->'merchandise') l
      where l->>'currency'<>'EUR')
    or v_merchandise<=0 or v_merchandise>9007199254740991
    then raise exception 'checkout_preflight_merchandise_invalid'; end if;

  -- Owner 2026-10-09 rule: EUR 5 per distinct *additional canonical listing*
  -- ONCE per order; not per quantity, variant, parcel, or shipment.
  v_handling:=greatest(0,v_distinct_products-1)*500;
  v_total:=v_merchandise+v_quote.amount_minor+v_handling;
  if v_total<=0 or v_total>9007199254740991
    then raise exception 'checkout_preflight_amount_invalid'; end if;

  v_expires:=least(v_quote.expires_at,v_created+interval '15 minutes');
  if v_expires<=v_created then raise exception 'checkout_preflight_shipping_expired'; end if;

  v_response:=jsonb_build_object(
    'contract_version','commerce_checkout_preflight_v2',
    'preflight_id',v_id,'request_id',v_request_id,
    'shipping_quote_receipt_id',v_quote_id,
    'delivery_approval_id',v_quote.approval_id,
    'delivery_approval_revision',v_quote.approval_revision,
    'workspace_version_id',v_quote.workspace_version_id,
    'basket_sha256',v_quote.basket_sha256,
    'destination_sha256',v_quote.destination_sha256,
    'policy_bundle_sha256',v_policy_hash,'currency','EUR',
    'merchandise_subtotal_minor',v_merchandise::bigint,
    'shipping_amount_minor',v_quote.amount_minor,
    'handling_amount_minor',v_handling,
    'additional_distinct_listing_count',greatest(0,v_distinct_products-1),
    'pre_tax_estimate_minor',v_total::bigint,
    'taxes_minor',null,'discount_minor',null,'provider_fees_minor',null,
    'amount_due_minor',null,'tax_status','unresolved',
    'carrier_proof_complete',false,
    'policy_accepted',true,
    'created_at',v_created,'expires_at',v_expires,
    'replayed',false,'expired',false,
    'payable',false,'order_creation_enabled',false,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false
  );

  insert into public.feya_commerce_checkout_preflights_v2(
    preflight_id,request_id,request_sha256,shipping_quote_receipt_id,
    delivery_approval_id,delivery_approval_revision,workspace_version_id,
    basket_sha256,destination_sha256,destination_country,destination_postal_code,
    destination,policy_bundle_sha256,policy_accepted_at,
    merchandise_subtotal_minor,shipping_amount_minor,handling_amount_minor,
    pre_tax_estimate_minor,currency,response,created_at,expires_at
  ) values(
    v_id,v_request_id,v_hash,v_quote_id,
    v_quote.approval_id,v_quote.approval_revision,v_quote.workspace_version_id,
    v_quote.basket_sha256,v_quote.destination_sha256,v_country,v_postal,
    jsonb_build_object('country',v_country,'postal_code',v_postal),v_policy_hash,v_created,
    v_merchandise::bigint,v_quote.amount_minor,v_handling,
    v_total::bigint,'EUR',v_response,v_created,v_expires
  );
  return v_response;
end $$;

create function public.feya_commerce_checkout_preflight_health_v2()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_ok boolean:=true; v_role text; v_fn text;
begin
  if not exists(select 1 from pg_catalog.pg_class c
    where c.oid='public.feya_commerce_checkout_preflights_v2'::regclass
      and c.relrowsecurity) then v_ok:=false; end if;
  foreach v_role in array array['anon','authenticated'] loop
    if has_table_privilege(v_role,'public.feya_commerce_checkout_preflights_v2',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then v_ok:=false; end if;
  end loop;
  if not has_table_privilege('service_role','public.feya_commerce_checkout_preflights_v2','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_checkout_preflights_v2',
      'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then v_ok:=false; end if;
  foreach v_fn in array array[
    'feya_commerce_create_checkout_preflight_v2(jsonb)',
    'feya_commerce_checkout_preflight_health_v2()'
  ] loop
    foreach v_role in array array['anon','authenticated'] loop
      if has_function_privilege(v_role,'public.'||v_fn,'EXECUTE') then v_ok:=false; end if;
    end loop;
    if not has_function_privilege('service_role','public.'||v_fn,'EXECUTE')
      then v_ok:=false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_trigger
    where tgrelid='public.feya_commerce_checkout_preflights_v2'::regclass
      and tgname='feya_checkout_preflight_immutable_v2' and tgenabled='O')
    then v_ok:=false; end if;
  return jsonb_build_object('contract_version','commerce_checkout_preflight_v2',
    'private_boundary_ready',v_ok,
    'preflight_count',(select count(*) from public.feya_commerce_checkout_preflights_v2),
    'legal_data_controller_verified',false,'full_contact_persisted',false,
    'carrier_proof_complete',false,
    'tax_calculation_enabled',false,
    'payable',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

alter table public.feya_commerce_checkout_preflights_v2 enable row level security;
revoke all on public.feya_commerce_checkout_preflights_v2
  from public,anon,authenticated,service_role;
grant select,insert on public.feya_commerce_checkout_preflights_v2 to service_role;

revoke all on function public.feya_commerce_checkout_preflight_immutable_v2(),
  public.feya_commerce_create_checkout_preflight_v2(jsonb),
  public.feya_commerce_checkout_preflight_health_v2()
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_create_checkout_preflight_v2(jsonb),
  public.feya_commerce_checkout_preflight_health_v2() to service_role;

notify pgrst,'reload schema';
commit;
