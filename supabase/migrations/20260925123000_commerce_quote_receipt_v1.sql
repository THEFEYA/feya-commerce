-- C4.3-C private quote receipt persistence. No checkout, payment, public offer promotion or indexing activation.
-- Depends on 20260924173914_product_variant_draft_atomic_v1.sql for stable product/variant identities.
begin;

create table public.feya_commerce_offer_revisions_v1(
  offer_revision_id uuid primary key,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  offer_revision bigint not null check(offer_revision>0 and offer_revision<=9007199254740991),
  product_revision bigint not null check(product_revision>0 and product_revision<=9007199254740991),
  release_ref text not null check(length(btrim(release_ref)) between 1 and 200),
  approval_ref text not null check(length(btrim(approval_ref)) between 1 and 500),
  status text not null check(status in ('active','hold','retired')),
  max_quantity_per_line integer not null check(max_quantity_per_line>0),
  snapshot_sha256 text not null check(snapshot_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(canonical_product_id,offer_revision),
  unique(offer_revision_id,canonical_product_id),
  foreign key(canonical_product_id,product_revision)
    references public.feya_commerce_variant_revisions_v1(canonical_product_id,product_revision) on delete restrict
);
create index feya_offer_revision_product_idx on public.feya_commerce_offer_revisions_v1(canonical_product_id,offer_revision desc);

create table public.feya_commerce_offer_heads_v1(
  canonical_product_id uuid primary key references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  current_offer_revision_id uuid not null,
  updated_at timestamptz not null default now(),
  foreign key(current_offer_revision_id,canonical_product_id)
    references public.feya_commerce_offer_revisions_v1(offer_revision_id,canonical_product_id) on delete restrict
);
create unique index feya_offer_head_revision_idx on public.feya_commerce_offer_heads_v1(current_offer_revision_id);

create table public.feya_commerce_offer_variant_items_v1(
  offer_revision_id uuid not null,
  canonical_product_id uuid not null,
  variant_id uuid not null references public.feya_commerce_variant_identities_v1(variant_id) on delete restrict,
  configuration_price_id uuid not null references public.feya_commerce_configuration_prices(configuration_price_id) on delete restrict,
  color_id uuid,
  size_id uuid,
  color_dimension text not null default 'color' check(color_dimension='color'),
  size_dimension text not null default 'size' check(size_dimension='size'),
  item_status text not null check(item_status in ('active','hold','retired')),
  price_quote_id uuid not null,
  price_revision bigint not null check(price_revision>0 and price_revision<=9007199254740991),
  amount_minor bigint not null check(amount_minor>0 and amount_minor<=9007199254740991),
  currency text not null check(currency~'^[A-Z]{3}$'),
  price_source text not null check(price_source in ('configuration_base','exception_override')),
  price_evidence_ref text not null check(length(btrim(price_evidence_ref)) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key(offer_revision_id,variant_id),
  foreign key(offer_revision_id,canonical_product_id)
    references public.feya_commerce_offer_revisions_v1(offer_revision_id,canonical_product_id) on delete restrict,
  foreign key(canonical_product_id,color_id,color_dimension)
    references public.feya_commerce_variant_attributes_v1(canonical_product_id,attribute_id,dimension) on delete restrict,
  foreign key(canonical_product_id,size_id,size_dimension)
    references public.feya_commerce_variant_attributes_v1(canonical_product_id,attribute_id,dimension) on delete restrict
);
create index feya_offer_item_product_idx on public.feya_commerce_offer_variant_items_v1(canonical_product_id,variant_id);
create index feya_offer_item_configuration_idx on public.feya_commerce_offer_variant_items_v1(configuration_price_id);

create table public.feya_commerce_quote_receipts_v1(
  quote_receipt_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  offer_revision_id uuid not null references public.feya_commerce_offer_revisions_v1(offer_revision_id) on delete restrict,
  canonical_product_id uuid not null,
  product_revision bigint not null check(product_revision>0 and product_revision<=9007199254740991),
  variant_id uuid not null references public.feya_commerce_variant_identities_v1(variant_id) on delete restrict,
  configuration_price_id uuid not null references public.feya_commerce_configuration_prices(configuration_price_id) on delete restrict,
  color_id uuid,
  size_id uuid,
  quantity integer not null check(quantity>0),
  unit_amount_minor bigint not null check(unit_amount_minor>0 and unit_amount_minor<=9007199254740991),
  line_amount_minor bigint not null check(line_amount_minor>0 and line_amount_minor<=9007199254740991),
  currency text not null check(currency~'^[A-Z]{3}$'),
  price_quote_id uuid not null,
  price_revision bigint not null check(price_revision>0 and price_revision<=9007199254740991),
  price_source text not null check(price_source in ('configuration_base','exception_override')),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  foreign key(offer_revision_id,canonical_product_id)
    references public.feya_commerce_offer_revisions_v1(offer_revision_id,canonical_product_id) on delete restrict
);
create index feya_quote_receipt_offer_idx on public.feya_commerce_quote_receipts_v1(offer_revision_id,created_at);
create index feya_quote_receipt_product_idx on public.feya_commerce_quote_receipts_v1(canonical_product_id,created_at);

create function public.feya_commerce_quote_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'commerce_quote_history_is_immutable'; end $$;
create trigger feya_offer_revision_immutable before update or delete on public.feya_commerce_offer_revisions_v1
  for each row execute function public.feya_commerce_quote_history_immutable_v1();
create trigger feya_offer_item_immutable before update or delete on public.feya_commerce_offer_variant_items_v1
  for each row execute function public.feya_commerce_quote_history_immutable_v1();
create trigger feya_quote_receipt_immutable before update or delete on public.feya_commerce_quote_receipts_v1
  for each row execute function public.feya_commerce_quote_history_immutable_v1();

create function public.feya_commerce_quote_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare t text; p text; r text; ready boolean:=true;
begin
  foreach t in array array['feya_commerce_offer_revisions_v1','feya_commerce_offer_heads_v1','feya_commerce_offer_variant_items_v1','feya_commerce_quote_receipts_v1'] loop
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity) then ready:=false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready:=false; end if;
    end loop;
  end loop;
  -- The quote service may only read the approved offer projection. It cannot promote/edit it.
  foreach t in array array['feya_commerce_offer_revisions_v1','feya_commerce_offer_heads_v1','feya_commerce_offer_variant_items_v1'] loop
    if not has_table_privilege('service_role','public.'||t,'SELECT')
      or has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready:=false; end if;
  end loop;
  if not has_table_privilege('service_role','public.feya_commerce_quote_receipts_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_quote_receipts_v1','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready:=false; end if;
  foreach p in array array['feya_commerce_quote_health_v1()','feya_commerce_create_quote_v1(jsonb)','feya_commerce_quote_history_immutable_v1()'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,'public.'||p,'EXECUTE') then ready:=false; end if;
    end loop;
    if exists(select 1 from pg_catalog.pg_proc f where f.oid=to_regprocedure('public.'||p)
      and (f.prosecdef or not coalesce(f.proconfig@>array['search_path=""'],false))) then ready:=false; end if;
  end loop;
  if to_regclass('public.feya_commerce_variant_identities_v1') is null
    or to_regclass('public.feya_commerce_variant_revisions_v1') is null then ready:=false; end if;
  return jsonb_build_object('contract_version','commerce_quote_receipt_v1','ready',ready,
    'offer_projection_write_enabled',false,'quote_receipt_write_enabled',ready,
    'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false);
end $$;

create function public.feya_commerce_create_quote_v1(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  request_id uuid; product_id uuid; variant_id uuid; config_id uuid; color_id uuid; size_id uuid;
  expected_product_revision bigint; expected_offer_revision bigint; quantity integer;
  payload_hash text; quote_id uuid:=gen_random_uuid(); line_amount numeric; response jsonb;
  head_row public.feya_commerce_offer_heads_v1%rowtype;
  offer_row public.feya_commerce_offer_revisions_v1%rowtype;
  item_row public.feya_commerce_offer_variant_items_v1%rowtype;
  receipt public.feya_commerce_quote_receipts_v1%rowtype;
  k text;
begin
  if not (public.feya_commerce_quote_health_v1()->>'ready')::boolean then raise exception 'quote_contract_not_ready'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>32768
    or (select count(*) from jsonb_object_keys(p_payload))<>9 then raise exception 'quote_request_invalid'; end if;
  foreach k in array array['request_id','canonical_product_id','variant_id','configuration_price_id','color_id','size_id','expected_product_revision','expected_offer_revision','quantity'] loop
    if not p_payload ? k then raise exception 'quote_request_invalid'; end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(p_payload) x(k) where x.k<>all(array['request_id','canonical_product_id','variant_id','configuration_price_id','color_id','size_id','expected_product_revision','expected_offer_revision','quantity']))
    then raise exception 'quote_request_invalid'; end if;
  foreach k in array array['request_id','canonical_product_id','variant_id','configuration_price_id'] loop
    if jsonb_typeof(p_payload->k)<>'string' or not ((p_payload->>k)~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      then raise exception 'quote_request_invalid'; end if;
  end loop;
  foreach k in array array['color_id','size_id'] loop
    if p_payload->k<>'null'::jsonb and (jsonb_typeof(p_payload->k)<>'string'
      or not ((p_payload->>k)~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
      then raise exception 'quote_request_invalid'; end if;
  end loop;
  foreach k in array array['expected_product_revision','expected_offer_revision','quantity'] loop
    if jsonb_typeof(p_payload->k)<>'number'
      or (p_payload->>k)::numeric<>trunc((p_payload->>k)::numeric)
      or (p_payload->>k)::numeric<1 then raise exception 'quote_request_invalid'; end if;
    if k='quantity' then
      if (p_payload->>k)::numeric>2147483647 then raise exception 'quote_request_invalid'; end if;
    elsif (p_payload->>k)::numeric>9007199254740991 then
      raise exception 'quote_request_invalid';
    end if;
  end loop;

  request_id:=(p_payload->>'request_id')::uuid;
  product_id:=(p_payload->>'canonical_product_id')::uuid;
  variant_id:=(p_payload->>'variant_id')::uuid;
  config_id:=(p_payload->>'configuration_price_id')::uuid;
  color_id:=case when p_payload->'color_id'='null'::jsonb then null else (p_payload->>'color_id')::uuid end;
  size_id:=case when p_payload->'size_id'='null'::jsonb then null else (p_payload->>'size_id')::uuid end;
  expected_product_revision:=(p_payload->>'expected_product_revision')::bigint;
  expected_offer_revision:=(p_payload->>'expected_offer_revision')::bigint;
  quantity:=(p_payload->>'quantity')::integer;
  payload_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  perform pg_advisory_xact_lock(hashtextextended('commerce-quote-request:'||request_id::text,0));
  select * into receipt from public.feya_commerce_quote_receipts_v1 q where q.request_id=request_id;
  if found then
    if receipt.request_sha256<>payload_hash then raise exception 'quote_request_conflict'; end if;
    return receipt.response||'{"replayed":true}'::jsonb;
  end if;

  select * into head_row from public.feya_commerce_offer_heads_v1 h where h.canonical_product_id=product_id;
  if not found then raise exception 'quote_offer_not_found'; end if;
  select * into offer_row from public.feya_commerce_offer_revisions_v1 o
    where o.offer_revision_id=head_row.current_offer_revision_id and o.canonical_product_id=product_id;
  if not found then raise exception 'quote_offer_not_found'; end if;
  if offer_row.status<>'active' then raise exception 'quote_offer_not_orderable'; end if;
  if offer_row.offer_revision<>expected_offer_revision then raise exception 'quote_offer_revision_conflict'; end if;
  if offer_row.product_revision<>expected_product_revision then raise exception 'quote_product_revision_conflict'; end if;
  if quantity>offer_row.max_quantity_per_line then raise exception 'quote_quantity_exceeds_offer_limit'; end if;

  select * into item_row from public.feya_commerce_offer_variant_items_v1 i
    where i.offer_revision_id=offer_row.offer_revision_id and i.variant_id=variant_id;
  if not found or item_row.item_status<>'active' then raise exception 'quote_variant_not_orderable'; end if;
  if item_row.canonical_product_id<>product_id or item_row.configuration_price_id<>config_id
    or item_row.color_id is distinct from color_id or item_row.size_id is distinct from size_id then raise exception 'quote_variant_conflict'; end if;
  if not exists(select 1 from public.feya_commerce_variant_identities_v1 v
    where v.variant_id=variant_id and v.canonical_product_id=product_id and v.configuration_price_id=config_id
      and v.color_id is not distinct from color_id and v.size_id is not distinct from size_id)
    then raise exception 'quote_variant_identity_conflict'; end if;

  line_amount:=item_row.amount_minor::numeric*quantity::numeric;
  if line_amount<1 or line_amount>9007199254740991 or line_amount<>trunc(line_amount) then raise exception 'quote_line_amount_overflow'; end if;

  response:=jsonb_build_object(
    'contract_version','commerce_quote_receipt_v1','quote_receipt_id',quote_id,'request_id',request_id,
    'offer_revision_id',offer_row.offer_revision_id,'offer_revision',offer_row.offer_revision,
    'canonical_product_id',product_id,'product_revision',offer_row.product_revision,
    'variant_id',variant_id,'configuration_price_id',config_id,'color_id',color_id,'size_id',size_id,
    'quantity',quantity,'unit_amount_minor',item_row.amount_minor,'line_amount_minor',line_amount::bigint,
    'currency',item_row.currency,'price_quote_id',item_row.price_quote_id,'price_revision',item_row.price_revision,
    'price_source',item_row.price_source,'release_ref',offer_row.release_ref,'expires_at',null,
    'order_creation_enabled',false,'payment_enabled',false,'replayed',false);

  insert into public.feya_commerce_quote_receipts_v1(
    quote_receipt_id,request_id,request_sha256,offer_revision_id,canonical_product_id,product_revision,
    variant_id,configuration_price_id,color_id,size_id,quantity,unit_amount_minor,line_amount_minor,currency,
    price_quote_id,price_revision,price_source,response)
  values(
    quote_id,request_id,payload_hash,offer_row.offer_revision_id,product_id,offer_row.product_revision,
    variant_id,config_id,color_id,size_id,quantity,item_row.amount_minor,line_amount::bigint,item_row.currency,
    item_row.price_quote_id,item_row.price_revision,item_row.price_source,response);
  return response;
end $$;

do $$
declare t text; p text;
begin
  foreach t in array array['feya_commerce_offer_revisions_v1','feya_commerce_offer_heads_v1','feya_commerce_offer_variant_items_v1','feya_commerce_quote_receipts_v1'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;
  grant select on public.feya_commerce_offer_revisions_v1,public.feya_commerce_offer_heads_v1,public.feya_commerce_offer_variant_items_v1 to service_role;
  grant select,insert on public.feya_commerce_quote_receipts_v1 to service_role;
  foreach p in array array['feya_commerce_quote_health_v1()','feya_commerce_create_quote_v1(jsonb)','feya_commerce_quote_history_immutable_v1()'] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
