-- M2 commerce authority: quote-bound order intent foundation.
-- This is additive and fail-closed. It does not enable checkout, payment, provider sessions,
-- order placement, production, shipping purchase, Merchant Center or analytics purchase events.
--
-- Authority rule:
--   browser/client amounts are never accepted;
--   every line is reconstructed from an immutable server quote receipt and revalidated
--   against the current active offer projection before an intent is persisted.
-- Shipping price/total remain NULL until a separately governed shipping/provider authority exists.

begin;

create table public.feya_commerce_order_intents_v1(
  order_intent_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  email text not null check(length(btrim(email)) between 3 and 320),
  full_name text not null check(length(btrim(full_name)) between 1 and 200),
  phone text,
  shipping_address text not null check(length(btrim(shipping_address)) between 3 and 1000),
  customer_note text,
  shipping_method text not null check(shipping_method in ('standard','express')),
  source_release_ref text not null check(length(btrim(source_release_ref)) between 1 and 200),
  currency text not null check(currency~'^[A-Z]{3}$'),
  merchandise_subtotal_minor bigint not null check(merchandise_subtotal_minor>0 and merchandise_subtotal_minor<=9007199254740991),
  shipping_amount_minor bigint,
  total_amount_minor bigint,
  intent_status text not null default 'quote_bound_shipping_pending'
    check(intent_status in ('quote_bound_shipping_pending','provider_pending','cancelled','converted')),
  order_creation_enabled boolean not null default false check(order_creation_enabled=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  provider_session_enabled boolean not null default false check(provider_session_enabled=false),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  check(shipping_amount_minor is null),
  check(total_amount_minor is null)
);

create table public.feya_commerce_order_intent_items_v1(
  order_intent_id uuid not null references public.feya_commerce_order_intents_v1(order_intent_id) on delete restrict,
  line_no integer not null check(line_no>0),
  quote_receipt_id uuid not null references public.feya_commerce_quote_receipts_v1(quote_receipt_id) on delete restrict,
  offer_revision_id uuid not null,
  canonical_product_id uuid not null,
  product_revision bigint not null,
  variant_id uuid not null,
  configuration_price_id uuid not null,
  color_id uuid,
  size_id uuid,
  quantity integer not null check(quantity>0),
  unit_amount_minor bigint not null check(unit_amount_minor>0),
  line_amount_minor bigint not null check(line_amount_minor>0),
  currency text not null check(currency~'^[A-Z]{3}$'),
  price_quote_id uuid not null,
  price_revision bigint not null check(price_revision>0),
  price_source text not null check(price_source in ('configuration_base','exception_override')),
  source_release_ref text not null,
  created_at timestamptz not null default now(),
  primary key(order_intent_id,line_no),
  unique(order_intent_id,quote_receipt_id)
);
create index feya_order_intent_item_quote_idx
  on public.feya_commerce_order_intent_items_v1(quote_receipt_id);
create index feya_order_intent_item_product_idx
  on public.feya_commerce_order_intent_items_v1(canonical_product_id,variant_id);

create function public.feya_commerce_order_intent_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'commerce_order_intent_history_is_immutable';
end $$;

create trigger feya_order_intent_immutable
  before update or delete on public.feya_commerce_order_intents_v1
  for each row execute function public.feya_commerce_order_intent_history_immutable_v1();

create trigger feya_order_intent_item_immutable
  before update or delete on public.feya_commerce_order_intent_items_v1
  for each row execute function public.feya_commerce_order_intent_history_immutable_v1();

create function public.feya_commerce_order_intent_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  t text;
  r text;
  ready boolean:=true;
begin
  foreach t in array array['feya_commerce_order_intents_v1','feya_commerce_order_intent_items_v1'] loop
    if not exists(
      select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity
    ) then ready:=false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        then ready:=false; end if;
    end loop;
  end loop;

  if not has_table_privilege('service_role','public.feya_commerce_order_intents_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_order_intents_v1','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;
  if not has_table_privilege('service_role','public.feya_commerce_order_intent_items_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_order_intent_items_v1','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;

  if to_regclass('public.feya_commerce_quote_receipts_v1') is null
    or to_regclass('public.feya_commerce_offer_heads_v1') is null
    or to_regclass('public.feya_commerce_offer_revisions_v1') is null
    or to_regclass('public.feya_commerce_offer_variant_items_v1') is null
    then ready:=false; end if;

  return jsonb_build_object(
    'contract_version','commerce_order_intent_v1',
    'ready',ready,
    'client_amounts_accepted',false,
    'quote_receipt_binding_required',true,
    'current_offer_revalidation_required',true,
    'shipping_authority_ready',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false
  );
end $$;

create function public.feya_commerce_create_order_intent_v1(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  v_request_id uuid;
  v_payload_hash text;
  v_order_intent_id uuid:=gen_random_uuid();
  v_email text;
  v_full_name text;
  v_phone text;
  v_shipping_address text;
  v_customer_note text;
  v_shipping_method text;
  v_quote_ids uuid[];
  v_quote_count integer;
  v_valid_count integer;
  v_distinct_count integer;
  v_currency text;
  v_release_ref text;
  v_subtotal numeric;
  v_response jsonb;
  v_existing public.feya_commerce_order_intents_v1%rowtype;
  k text;
begin
  if not (public.feya_commerce_order_intent_health_v1()->>'ready')::boolean
    then raise exception 'order_intent_contract_not_ready'; end if;

  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536
    or (select count(*) from jsonb_object_keys(p_payload))<>5
    then raise exception 'order_intent_request_invalid'; end if;

  foreach k in array array['request_id','quote_receipt_ids','contact','shipping_method','contract_version'] loop
    if not p_payload ? k then raise exception 'order_intent_request_invalid'; end if;
  end loop;
  if exists(
    select 1 from jsonb_object_keys(p_payload) x(k)
    where x.k<>all(array['request_id','quote_receipt_ids','contact','shipping_method','contract_version'])
  ) then raise exception 'order_intent_request_invalid'; end if;

  if p_payload->>'contract_version'<>'commerce_order_intent_v1'
    then raise exception 'order_intent_request_invalid'; end if;
  if jsonb_typeof(p_payload->'request_id')<>'string'
    or not ((p_payload->>'request_id')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    then raise exception 'order_intent_request_invalid'; end if;
  if jsonb_typeof(p_payload->'quote_receipt_ids')<>'array'
    or jsonb_array_length(p_payload->'quote_receipt_ids') not between 1 and 20
    then raise exception 'order_intent_request_invalid'; end if;
  if jsonb_typeof(p_payload->'contact')<>'object'
    then raise exception 'order_intent_request_invalid'; end if;
  if exists(
    select 1 from jsonb_object_keys(p_payload->'contact') x(k)
    where x.k<>all(array['email','full_name','phone','shipping_address','note'])
  ) then raise exception 'order_intent_request_invalid'; end if;
  foreach k in array array['email','full_name','shipping_address'] loop
    if jsonb_typeof(p_payload->'contact'->k)<>'string' or length(btrim(p_payload->'contact'->>k))<1
      then raise exception 'order_intent_request_invalid'; end if;
  end loop;
  foreach k in array array['phone','note'] loop
    if p_payload->'contact' ? k
      and p_payload->'contact'->k<>'null'::jsonb
      and jsonb_typeof(p_payload->'contact'->k)<>'string'
      then raise exception 'order_intent_request_invalid'; end if;
  end loop;
  if jsonb_typeof(p_payload->'shipping_method')<>'string'
    or p_payload->>'shipping_method' not in ('standard','express')
    then raise exception 'order_intent_request_invalid'; end if;

  begin
    select array_agg(value::uuid order by ord)
      into v_quote_ids
    from jsonb_array_elements_text(p_payload->'quote_receipt_ids') with ordinality q(value,ord)
    where value~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  exception when others then
    raise exception 'order_intent_request_invalid';
  end;

  v_quote_count:=jsonb_array_length(p_payload->'quote_receipt_ids');
  if coalesce(array_length(v_quote_ids,1),0)<>v_quote_count
    or (select count(distinct x) from unnest(v_quote_ids) x)<>v_quote_count
    then raise exception 'order_intent_request_invalid'; end if;

  v_request_id:=(p_payload->>'request_id')::uuid;
  v_email:=btrim(p_payload#>>'{contact,email}');
  v_full_name:=btrim(p_payload#>>'{contact,full_name}');
  v_phone:=nullif(btrim(coalesce(p_payload#>>'{contact,phone}','')),'');
  v_shipping_address:=btrim(p_payload#>>'{contact,shipping_address}');
  v_customer_note:=nullif(btrim(coalesce(p_payload#>>'{contact,note}','')),'');
  v_shipping_method:=p_payload->>'shipping_method';

  if length(v_email)>320 or position('@' in v_email)<2
    or length(v_full_name)>200
    or length(v_shipping_address)>1000
    or coalesce(length(v_phone),0)>100
    or coalesce(length(v_customer_note),0)>4000
    then raise exception 'order_intent_request_invalid'; end if;

  v_payload_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('commerce-order-intent:'||v_request_id::text,0));

  select * into v_existing
  from public.feya_commerce_order_intents_v1 x
  where x.request_id=v_request_id;
  if found then
    if v_existing.request_sha256<>v_payload_hash then raise exception 'order_intent_request_conflict'; end if;
    return v_existing.response||'{"replayed":true}'::jsonb;
  end if;

  select
    count(*),
    count(distinct q.quote_receipt_id),
    min(q.currency),
    min(o.release_ref),
    sum(q.line_amount_minor)::numeric
  into v_valid_count,v_distinct_count,v_currency,v_release_ref,v_subtotal
  from public.feya_commerce_quote_receipts_v1 q
  join public.feya_commerce_offer_heads_v1 h
    on h.canonical_product_id=q.canonical_product_id
   and h.current_offer_revision_id=q.offer_revision_id
  join public.feya_commerce_offer_revisions_v1 o
    on o.offer_revision_id=q.offer_revision_id
   and o.canonical_product_id=q.canonical_product_id
   and o.status='active'
   and o.product_revision=q.product_revision
  join public.feya_commerce_offer_variant_items_v1 i
    on i.offer_revision_id=q.offer_revision_id
   and i.canonical_product_id=q.canonical_product_id
   and i.variant_id=q.variant_id
   and i.item_status='active'
   and i.configuration_price_id=q.configuration_price_id
   and i.color_id is not distinct from q.color_id
   and i.size_id is not distinct from q.size_id
   and i.amount_minor=q.unit_amount_minor
   and i.currency=q.currency
   and i.price_quote_id=q.price_quote_id
   and i.price_revision=q.price_revision
   and i.price_source=q.price_source
  where q.quote_receipt_id=any(v_quote_ids)
    and (q.expires_at is null or q.expires_at>now());

  if v_valid_count<>v_quote_count or v_distinct_count<>v_quote_count
    then raise exception 'order_intent_quote_not_current'; end if;

  if (select count(distinct q.currency) from public.feya_commerce_quote_receipts_v1 q
      where q.quote_receipt_id=any(v_quote_ids))<>1
    then raise exception 'order_intent_currency_conflict'; end if;

  if (select count(distinct o.release_ref)
      from public.feya_commerce_quote_receipts_v1 q
      join public.feya_commerce_offer_revisions_v1 o on o.offer_revision_id=q.offer_revision_id
      where q.quote_receipt_id=any(v_quote_ids))<>1
    then raise exception 'order_intent_release_conflict'; end if;

  if v_subtotal<1 or v_subtotal>9007199254740991 or v_subtotal<>trunc(v_subtotal)
    then raise exception 'order_intent_subtotal_overflow'; end if;

  v_response:=jsonb_build_object(
    'contract_version','commerce_order_intent_v1',
    'order_intent_id',v_order_intent_id,
    'request_id',v_request_id,
    'quote_receipt_ids',to_jsonb(v_quote_ids),
    'items_count',v_quote_count,
    'source_release_ref',v_release_ref,
    'currency',v_currency,
    'merchandise_subtotal_minor',v_subtotal::bigint,
    'shipping_method',v_shipping_method,
    'shipping_amount_minor',null,
    'total_amount_minor',null,
    'intent_status','quote_bound_shipping_pending',
    'shipping_authority_ready',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false,
    'replayed',false
  );

  insert into public.feya_commerce_order_intents_v1(
    order_intent_id,request_id,request_sha256,email,full_name,phone,shipping_address,customer_note,
    shipping_method,source_release_ref,currency,merchandise_subtotal_minor,response
  ) values(
    v_order_intent_id,v_request_id,v_payload_hash,v_email,v_full_name,v_phone,v_shipping_address,v_customer_note,
    v_shipping_method,v_release_ref,v_currency,v_subtotal::bigint,v_response
  );

  insert into public.feya_commerce_order_intent_items_v1(
    order_intent_id,line_no,quote_receipt_id,offer_revision_id,canonical_product_id,product_revision,
    variant_id,configuration_price_id,color_id,size_id,quantity,unit_amount_minor,line_amount_minor,currency,
    price_quote_id,price_revision,price_source,source_release_ref
  )
  select
    v_order_intent_id,
    u.ord::integer,
    q.quote_receipt_id,q.offer_revision_id,q.canonical_product_id,q.product_revision,
    q.variant_id,q.configuration_price_id,q.color_id,q.size_id,q.quantity,q.unit_amount_minor,q.line_amount_minor,
    q.currency,q.price_quote_id,q.price_revision,q.price_source,o.release_ref
  from unnest(v_quote_ids) with ordinality u(quote_receipt_id,ord)
  join public.feya_commerce_quote_receipts_v1 q on q.quote_receipt_id=u.quote_receipt_id
  join public.feya_commerce_offer_revisions_v1 o on o.offer_revision_id=q.offer_revision_id
  order by u.ord;

  return v_response;
end $$;

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['feya_commerce_order_intents_v1','feya_commerce_order_intent_items_v1'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;
  grant select,insert on public.feya_commerce_order_intents_v1,public.feya_commerce_order_intent_items_v1 to service_role;

  foreach p in array array[
    'feya_commerce_order_intent_history_immutable_v1()',
    'feya_commerce_order_intent_health_v1()',
    'feya_commerce_create_order_intent_v1(jsonb)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
