-- C4.1 internal draft persistence only. No source price, storefront, approval or index flags are changed.
begin;

create function public.feya_commerce_variant_draft_schema_v1() returns jsonb
language sql immutable set search_path='' as $schema$ select '{"type":"object","properties":{"contract_version":{"type":"string","enum":["product_variant_draft_v1"]},"request_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"expected_revision":{"type":"integer","minimum":0,"maximum":9007199254740991},"source_bindings":{"type":"object","properties":{"product_fingerprint":{"type":"string","minLength":1,"maxLength":32,"nullable":false,"pattern":"^[0-9a-f]{32}$"},"configurations":{"type":"array","items":{"type":"object","properties":{"configuration_price_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"sellable_configuration_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price_fingerprint":{"type":"string","minLength":1,"maxLength":32,"nullable":false,"pattern":"^[0-9a-f]{32}$"},"configuration_fingerprint":{"type":"string","minLength":1,"maxLength":32,"nullable":false,"pattern":"^[0-9a-f]{32}$"}}},"maxItems":128}}},"snapshot":{"type":"object","properties":{"canonical_product_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"product_revision":{"type":"integer","minimum":1,"maximum":9007199254740991},"pricing_policy_ref":{"type":"string","enum":["owner-configuration-base-price-20260924-04"]},"configurations":{"type":"array","items":{"type":"object","properties":{"configuration_price_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"sellable_configuration_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"base_price":{"type":"object","properties":{"quote_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price_revision":{"type":"integer","minimum":1,"maximum":9007199254740991},"status":{"type":"string","enum":["unverified","range"]},"amount_minor":{"type":"integer","minimum":1,"maximum":9007199254740991,"nullable":true},"currency":{"type":"string","minLength":1,"maxLength":3,"nullable":false,"pattern":"^[A-Z]{3}$"},"evidence_ref":{"type":"string","minLength":1,"maxLength":500,"nullable":true}}}}},"maxItems":128,"minItems":1},"colors":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"label":{"type":"string","minLength":1,"maxLength":140,"nullable":false},"state":{"type":"string","enum":["proposed","confirmed","retired"]}}},"maxItems":64},"sizes":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"label":{"type":"string","minLength":1,"maxLength":140,"nullable":false},"state":{"type":"string","enum":["proposed","confirmed","retired"]}}},"maxItems":64},"variants":{"type":"array","items":{"type":"object","properties":{"variant_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"configuration_price_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"color_id":{"type":"string","minLength":1,"maxLength":36,"nullable":true,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"size_id":{"type":"string","minLength":1,"maxLength":36,"nullable":true,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"state":{"type":"string","enum":["draft","retired"]},"pricing":{"oneOf":[{"type":"object","properties":{"mode":{"type":"string","enum":["configuration_base"]}}},{"type":"object","properties":{"mode":{"type":"string","enum":["exception_override"]},"exception_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"reason":{"type":"string","minLength":1,"maxLength":500,"nullable":false},"price":{"type":"object","properties":{"quote_id":{"type":"string","minLength":1,"maxLength":36,"nullable":false,"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price_revision":{"type":"integer","minimum":1,"maximum":9007199254740991},"status":{"type":"string","enum":["unverified","range"]},"amount_minor":{"type":"integer","minimum":1,"maximum":9007199254740991,"nullable":true},"currency":{"type":"string","minLength":1,"maxLength":3,"nullable":false,"pattern":"^[A-Z]{3}$"},"evidence_ref":{"type":"string","minLength":1,"maxLength":500,"nullable":true}}}}}]}}},"maxItems":512}}}}}'::jsonb $schema$;

create function public.feya_commerce_variant_shape_matches_v1(v jsonb, s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; sub jsonb; n integer;
begin
  if v is null then return false; end if;
  if v = 'null'::jsonb then return coalesce((s->>'nullable')::boolean,false); end if;
  if s ? 'oneOf' then
    select count(*) into n from jsonb_array_elements(s->'oneOf') a
      where public.feya_commerce_variant_shape_matches_v1(v,a);
    return n=1;
  end if;
  if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') a where a=v) then return false; end if;
  case s->>'type'
  when 'object' then
    if jsonb_typeof(v)<>'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v))<>(select count(*) from jsonb_object_keys(s->'properties')) then return false; end if;
    for k,sub in select key,value from jsonb_each(s->'properties') loop
      if not v ? k or not public.feya_commerce_variant_shape_matches_v1(v->k,sub) then return false; end if;
    end loop;
    return true;
  when 'array' then
    if jsonb_typeof(v)<>'array' then return false; end if;
    if jsonb_array_length(v)>coalesce((s->>'maxItems')::integer,0)
       or jsonb_array_length(v)<coalesce((s->>'minItems')::integer,0) then return false; end if;
    for sub in select value from jsonb_array_elements(v) loop
      if not public.feya_commerce_variant_shape_matches_v1(sub,s->'items') then return false; end if;
    end loop;
    return true;
  when 'string' then
    if jsonb_typeof(v)<>'string' then return false; end if;
    k:=v#>>'{}';
    return (not s ? 'minLength' or length(btrim(k))>=(s->>'minLength')::integer)
      and (not s ? 'maxLength' or length(k)<=(s->>'maxLength')::integer)
      and (not s ? 'pattern' or k~(s->>'pattern'));
  when 'integer' then
    if jsonb_typeof(v)<>'number' then return false; end if;
    return (v#>>'{}')::numeric=trunc((v#>>'{}')::numeric)
      and (v#>>'{}')::numeric>=(s->>'minimum')::numeric
      and (v#>>'{}')::numeric<=(s->>'maximum')::numeric;
  else return false;
  end case;
end $$;

create table public.feya_commerce_variant_heads_v1(
  canonical_product_id uuid primary key references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  current_revision bigint not null check(current_revision>=0),
  updated_at timestamptz not null default now()
);
create table public.feya_commerce_variant_revisions_v1(
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  product_revision bigint not null check(product_revision>0),
  request_id uuid not null unique,
  actor_user_id uuid not null,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  source_bindings jsonb not null check(jsonb_typeof(source_bindings)='object'),
  snapshot_sha256 text not null check(snapshot_sha256~'^[0-9a-f]{64}$'),
  execution_request_id uuid not null references public.feya_growth_execution_requests_v1(execution_request_id) on delete restrict,
  change_event_id uuid not null references public.feya_growth_change_events_v1(change_event_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(canonical_product_id,product_revision)
);
alter table public.feya_commerce_variant_heads_v1 add constraint feya_variant_head_revision_fk
  foreign key(canonical_product_id,current_revision)
  references public.feya_commerce_variant_revisions_v1(canonical_product_id,product_revision)
  deferrable initially deferred;
create index feya_variant_revision_execution_idx on public.feya_commerce_variant_revisions_v1(execution_request_id);
create index feya_variant_revision_change_idx on public.feya_commerce_variant_revisions_v1(change_event_id);
create table public.feya_commerce_variant_attributes_v1(
  attribute_id uuid primary key,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  dimension text not null check(dimension in ('color','size')),
  created_at timestamptz not null default now(),
  unique(canonical_product_id,attribute_id,dimension)
);
create table public.feya_commerce_variant_identities_v1(
  variant_id uuid primary key,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  configuration_price_id uuid not null references public.feya_commerce_configuration_prices(configuration_price_id) on delete restrict,
  color_id uuid,
  size_id uuid,
  color_dimension text not null default 'color' check(color_dimension='color'),
  size_dimension text not null default 'size' check(size_dimension='size'),
  created_at timestamptz not null default now(),
  foreign key(canonical_product_id,color_id,color_dimension) references public.feya_commerce_variant_attributes_v1(canonical_product_id,attribute_id,dimension) on delete restrict,
  foreign key(canonical_product_id,size_id,size_dimension) references public.feya_commerce_variant_attributes_v1(canonical_product_id,attribute_id,dimension) on delete restrict,
  unique nulls not distinct(canonical_product_id,configuration_price_id,color_id,size_id)
);
create index feya_variant_identity_price_idx on public.feya_commerce_variant_identities_v1(configuration_price_id);
create index feya_variant_identity_color_idx on public.feya_commerce_variant_identities_v1(canonical_product_id,color_id,color_dimension);
create index feya_variant_identity_size_idx on public.feya_commerce_variant_identities_v1(canonical_product_id,size_id,size_dimension);
create table public.feya_commerce_variant_quotes_v1(
  quote_id uuid primary key,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  configuration_price_id uuid not null references public.feya_commerce_configuration_prices(configuration_price_id) on delete restrict,
  variant_id uuid references public.feya_commerce_variant_identities_v1(variant_id) on delete restrict,
  scope_key text not null,
  price_revision bigint not null check(price_revision>0),
  price jsonb not null check(jsonb_typeof(price)='object' and price->>'status' in ('unverified','range')),
  created_at timestamptz not null default now(),
  unique(canonical_product_id,scope_key,price_revision)
);
create index feya_variant_quote_configuration_idx on public.feya_commerce_variant_quotes_v1(configuration_price_id);
create index feya_variant_quote_variant_idx on public.feya_commerce_variant_quotes_v1(variant_id);
create table public.feya_commerce_variant_save_receipts_v1(
  request_id uuid primary key,
  actor_user_id uuid not null,
  canonical_product_id uuid not null,
  product_revision bigint not null,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  foreign key(canonical_product_id,product_revision) references public.feya_commerce_variant_revisions_v1(canonical_product_id,product_revision) on delete restrict
);
create index feya_variant_receipt_revision_idx on public.feya_commerce_variant_save_receipts_v1(canonical_product_id,product_revision);
create table public.feya_commerce_variant_draft_outbox_v1(
  change_event_id uuid primary key references public.feya_growth_change_events_v1(change_event_id) on delete restrict,
  canonical_product_id uuid not null,
  product_revision bigint not null,
  delivery_state text not null default 'pending' check(delivery_state in ('pending','processing','delivered')),
  attempts integer not null default 0 check(attempts>=0),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  foreign key(canonical_product_id,product_revision) references public.feya_commerce_variant_revisions_v1(canonical_product_id,product_revision) on delete restrict
);
create index feya_variant_outbox_pending_idx on public.feya_commerce_variant_draft_outbox_v1(created_at) where delivery_state='pending';
create index feya_variant_outbox_revision_idx on public.feya_commerce_variant_draft_outbox_v1(canonical_product_id,product_revision);

create function public.feya_commerce_variant_immutable_v1() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'variant_history_is_immutable'; end $$;
do $$
declare t text;
begin
  foreach t in array array['revisions','attributes','identities','quotes','save_receipts'] loop
    execute format('create trigger variant_immutable before update or delete on public.%I for each row execute function public.feya_commerce_variant_immutable_v1()', 'feya_commerce_variant_'||t||'_v1');
  end loop;
end $$;

-- Add one tightly scoped human action; no existing action, approval or role is modified.
insert into public.feya_growth_registry_items_v1(registry_type,item_code,item_name,owner_role,item_state,implementation_state,public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag)
values('action_capability','SAVE_PRODUCT_VARIANT_DRAFT','Save product variant draft','CPIM','AVAILABLE_WITH_LIMITATIONS','internal_draft_only',
  'Save an authenticated human product-variant draft with a revision and audit trail.',
  'No source-price edits, price verification, active offers, publication, payment or indexing.',
  '{"action_class":"HUMAN_ACTION","executor_type":"SERVER_RPC","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"draft_only":true,"contract_version":"product_variant_draft_v1"}'::jsonb,
  '{"source":"Owner_Decisions_And_Variant_Lifecycle_20260924.md","pricing_policy":"owner-configuration-base-price-20260924-04"}'::jsonb,1,true);

create function public.feya_commerce_variant_draft_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare t text; p text; r text; ready boolean:=true;
begin
  foreach t in array array['heads','revisions','attributes','identities','quotes','save_receipts','draft_outbox'] loop
    if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='feya_commerce_variant_'||t||'_v1' and c.relrowsecurity) then ready:=false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.feya_commerce_variant_'||t||'_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready:=false; end if;
    end loop;
  end loop;
  foreach p in array array[
    'feya_commerce_variant_draft_health_v1()','feya_commerce_read_variant_draft_v1(uuid)',
    'feya_commerce_save_variant_draft_v1(uuid,jsonb)','feya_commerce_variant_draft_schema_v1()',
    'feya_commerce_variant_shape_matches_v1(jsonb,jsonb)','feya_commerce_variant_immutable_v1()'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,'public.'||p,'EXECUTE') then ready:=false; end if;
    end loop;
    if exists(select 1 from pg_catalog.pg_proc f where f.oid=to_regprocedure('public.'||p) and (f.prosecdef or not coalesce(f.proconfig@>array['search_path=""'],false))) then ready:=false; end if;
  end loop;
  if not exists(select 1 from public.feya_growth_registry_items_v1 r where r.registry_type='action_capability'
    and r.item_code='SAVE_PRODUCT_VARIANT_DRAFT' and r.version_no=1 and r.active_flag
    and r.item_state='AVAILABLE_WITH_LIMITATIONS' and r.implementation_state='internal_draft_only'
    and r.config_json='{"action_class":"HUMAN_ACTION","executor_type":"SERVER_RPC","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"draft_only":true,"contract_version":"product_variant_draft_v1"}'::jsonb)
    or (select count(*) from public.feya_growth_registry_items_v1 where registry_type='action_capability' and item_code='SAVE_PRODUCT_VARIANT_DRAFT' and active_flag)<>1 then ready:=false; end if;
  return jsonb_build_object('contract_version','product_variant_draft_v1','ready',ready,'draft_only',true,'can_publish',false,'can_index',false,'can_enable_checkout',false);
end $$;

create function public.feya_commerce_read_variant_draft_v1(p_product_id uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare product_row public.feya_commerce_product_drafts%rowtype; bindings jsonb; context_rows jsonb; revision_row public.feya_commerce_variant_revisions_v1%rowtype;
begin
  if not (public.feya_commerce_variant_draft_health_v1()->>'ready')::boolean then raise exception 'variant_contract_not_ready'; end if;
  select * into product_row from public.feya_commerce_product_drafts where canonical_product_id=p_product_id;
  if not found then raise exception 'variant_product_not_found'; end if;
  if (select count(*) from public.feya_commerce_configuration_prices where canonical_product_id=p_product_id)>128 then raise exception 'variant_source_limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('configuration_price_id',p.configuration_price_id,'sellable_configuration_id',p.sellable_configuration_id,
      'price_fingerprint',md5(to_jsonb(p)::text),'configuration_fingerprint',md5(to_jsonb(c)::text)) order by p.configuration_price_id),'[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('configuration_price_id',p.configuration_price_id,'sellable_configuration_id',p.sellable_configuration_id,
      'source_label',c.configuration_name,'source_amount',p.source_amount,'source_currency',p.source_currency,
      'public_price_amount',p.public_price_amount,'manual_override_amount',p.manual_override_amount,'price_status',p.price_status,'review_status',p.review_status)
      order by p.configuration_price_id),'[]'::jsonb)
    into bindings,context_rows from public.feya_commerce_configuration_prices p join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id where p.canonical_product_id=p_product_id;
  if jsonb_array_length(bindings)<>(select count(*) from public.feya_commerce_configuration_prices where canonical_product_id=p_product_id)
    then raise exception 'variant_configuration_scope_invalid'; end if;
  select v.* into revision_row from public.feya_commerce_variant_heads_v1 h join public.feya_commerce_variant_revisions_v1 v
    on v.canonical_product_id=h.canonical_product_id and v.product_revision=h.current_revision where h.canonical_product_id=p_product_id;
  return jsonb_build_object('contract_version','product_variant_draft_v1','canonical_product_id',p_product_id,
    'current_revision',coalesce(revision_row.product_revision,0),'snapshot',revision_row.snapshot,
    'snapshot_sha256',revision_row.snapshot_sha256,'source_bindings',jsonb_build_object('product_fingerprint',md5(to_jsonb(product_row)::text),'configurations',bindings),
    'configuration_context',context_rows,'draft_only',true,'can_publish',false,'can_index',false,'can_enable_checkout',false);
end $$;

create function public.feya_commerce_save_variant_draft_v1(p_actor_user_id uuid,p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  product_id uuid; request_id uuid; expected_revision bigint; next_revision bigint; current_revision bigint;
  payload_hash text; snapshot_hash text; old_snapshot jsonb; s jsonb; r jsonb; a jsonb; old_a jsonb; cfg jsonb; binding jsonb; price jsonb;
  attr_dimension text; array_name text; scope text; quote_id uuid; quote_variant uuid; config_id uuid; seen_quotes uuid[]:='{}';
  receipt public.feya_commerce_variant_save_receipts_v1%rowtype;
  product_row public.feya_commerce_product_drafts%rowtype; price_row public.feya_commerce_configuration_prices%rowtype;
  config_row public.feya_commerce_sellable_configurations%rowtype; old_quote public.feya_commerce_variant_quotes_v1%rowtype;
  execution_row record; event_id uuid:=gen_random_uuid(); response jsonb; count_ids integer; old_config jsonb;
begin
  if p_actor_user_id is null then raise exception 'variant_actor_required'; end if;
  if not (public.feya_commerce_variant_draft_health_v1()->>'ready')::boolean then raise exception 'variant_contract_not_ready'; end if;
  if p_payload is null or octet_length(p_payload::text)>1000000
    or not public.feya_commerce_variant_shape_matches_v1(p_payload,public.feya_commerce_variant_draft_schema_v1()) then raise exception 'variant_draft_shape_invalid'; end if;
  s:=p_payload->'snapshot'; product_id:=(s->>'canonical_product_id')::uuid; request_id:=(p_payload->>'request_id')::uuid;
  expected_revision:=(p_payload->>'expected_revision')::bigint; next_revision:=(s->>'product_revision')::bigint;
  if next_revision<>expected_revision+1 then raise exception 'variant_draft_scope_invalid'; end if;
  payload_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  snapshot_hash:=encode(sha256(convert_to(s::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('variant-draft-request:'||request_id::text,0));
  select * into receipt from public.feya_commerce_variant_save_receipts_v1 x where x.request_id=request_id;
  if found then
    if receipt.actor_user_id<>p_actor_user_id or receipt.request_sha256<>payload_hash or receipt.canonical_product_id<>product_id then raise exception 'variant_request_conflict'; end if;
    return receipt.response||'{"replayed":true}'::jsonb;
  end if;
  -- Consistent lock order: request -> source product -> head -> source configurations/prices.
  select * into product_row from public.feya_commerce_product_drafts where canonical_product_id=product_id for share;
  if not found then raise exception 'variant_product_not_found'; end if;
  if md5(to_jsonb(product_row)::text)<>p_payload#>>'{source_bindings,product_fingerprint}' then raise exception 'variant_source_conflict'; end if;
  insert into public.feya_commerce_variant_heads_v1(canonical_product_id,current_revision) values(product_id,0) on conflict do nothing;
  select h.current_revision into current_revision from public.feya_commerce_variant_heads_v1 h where h.canonical_product_id=product_id for update;
  if current_revision<>expected_revision then raise exception 'variant_revision_conflict'; end if;
  select v.snapshot into old_snapshot from public.feya_commerce_variant_revisions_v1 v where v.canonical_product_id=product_id and v.product_revision=current_revision;

  select count(distinct c->>'configuration_price_id') into count_ids from jsonb_array_elements(s->'configurations') c;
  if count_ids<>jsonb_array_length(s->'configurations') then raise exception 'variant_configuration_identity_invalid'; end if;
  select count(distinct c->>'configuration_price_id') into count_ids from jsonb_array_elements(p_payload#>'{source_bindings,configurations}') c;
  if count_ids<>jsonb_array_length(p_payload#>'{source_bindings,configurations}') then raise exception 'variant_source_conflict'; end if;
  -- Every persisted source binding is evidence, including rows not selected in this draft.
  for binding in select value from jsonb_array_elements(p_payload#>'{source_bindings,configurations}') order by value->>'configuration_price_id' loop
    config_id:=(binding->>'configuration_price_id')::uuid;
    select * into config_row from public.feya_commerce_sellable_configurations where sellable_configuration_id=(binding->>'sellable_configuration_id')::uuid and canonical_product_id=product_id for share;
    if not found then raise exception 'variant_configuration_scope_invalid'; end if;
    select * into price_row from public.feya_commerce_configuration_prices where configuration_price_id=config_id and canonical_product_id=product_id and sellable_configuration_id=config_row.sellable_configuration_id for share;
    if not found then raise exception 'variant_configuration_scope_invalid'; end if;
    if binding->>'price_fingerprint'<>md5(to_jsonb(price_row)::text)
      or binding->>'configuration_fingerprint'<>md5(to_jsonb(config_row)::text) then raise exception 'variant_source_conflict'; end if;
  end loop;
  for cfg in select value from jsonb_array_elements(s->'configurations') loop
    if not exists(select 1 from jsonb_array_elements(p_payload#>'{source_bindings,configurations}') b
      where b->>'configuration_price_id'=cfg->>'configuration_price_id' and b->>'sellable_configuration_id'=cfg->>'sellable_configuration_id')
      then raise exception 'variant_source_conflict'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(coalesce(old_snapshot->'configurations','[]')) o
    where not exists(select 1 from jsonb_array_elements(s->'configurations') n where n->>'configuration_price_id'=o->>'configuration_price_id' and n->>'sellable_configuration_id'=o->>'sellable_configuration_id'))
    then raise exception 'variant_configuration_reassigned_or_deleted'; end if;

  foreach attr_dimension in array array['color','size'] loop
    array_name:=case when attr_dimension='color' then 'colors' else 'sizes' end;
    select count(distinct c->>'id') into count_ids from jsonb_array_elements(s->array_name) c;
    if count_ids<>jsonb_array_length(s->array_name) then raise exception 'variant_attribute_identity_invalid'; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(old_snapshot->array_name,'[]')) o
      where not exists(select 1 from jsonb_array_elements(s->array_name) n where n->>'id'=o->>'id')) then raise exception 'variant_attribute_deleted_instead_of_retired'; end if;
    for a in select value from jsonb_array_elements(s->array_name) loop
      insert into public.feya_commerce_variant_attributes_v1(attribute_id,canonical_product_id,dimension) values((a->>'id')::uuid,product_id,attr_dimension) on conflict do nothing;
      if not exists(select 1 from public.feya_commerce_variant_attributes_v1 x where x.attribute_id=(a->>'id')::uuid and x.canonical_product_id=product_id and x.dimension=attr_dimension)
        then raise exception 'variant_attribute_identity_invalid'; end if;
    end loop;
  end loop;
  select count(distinct v->>'variant_id') into count_ids from jsonb_array_elements(s->'variants') v;
  if count_ids<>jsonb_array_length(s->'variants') then raise exception 'variant_tuple_identity_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(old_snapshot->'variants','[]')) o
    where not exists(select 1 from jsonb_array_elements(s->'variants') n where n->>'variant_id'=o->>'variant_id')) then raise exception 'variant_identity_reassigned_or_deleted'; end if;
  for a in select value from jsonb_array_elements(s->'variants') loop
    if not exists(select 1 from jsonb_array_elements(s->'configurations') c where c->>'configuration_price_id'=a->>'configuration_price_id')
      or (a->>'color_id' is not null and not exists(select 1 from jsonb_array_elements(s->'colors') c where c->>'id'=a->>'color_id'))
      or (a->>'size_id' is not null and not exists(select 1 from jsonb_array_elements(s->'sizes') c where c->>'id'=a->>'size_id')) then raise exception 'variant_tuple_identity_invalid'; end if;
    insert into public.feya_commerce_variant_identities_v1(variant_id,canonical_product_id,configuration_price_id,color_id,size_id)
      values((a->>'variant_id')::uuid,product_id,(a->>'configuration_price_id')::uuid,(a->>'color_id')::uuid,(a->>'size_id')::uuid) on conflict do nothing;
    if not exists(select 1 from public.feya_commerce_variant_identities_v1 x where x.variant_id=(a->>'variant_id')::uuid and x.canonical_product_id=product_id
      and x.configuration_price_id=(a->>'configuration_price_id')::uuid and x.color_id is not distinct from (a->>'color_id')::uuid and x.size_id is not distinct from (a->>'size_id')::uuid)
      then raise exception 'variant_identity_reassigned_or_deleted'; end if;
  end loop;
  for r in
    select jsonb_build_object('scope','configuration:'||(c->>'configuration_price_id'),'config',c->>'configuration_price_id','variant',null,'price',c->'base_price') from jsonb_array_elements(s->'configurations') c
    union all
    select jsonb_build_object('scope','variant:'||(v->>'variant_id')||':exception:'||(v#>>'{pricing,exception_id}'),'config',v->>'configuration_price_id','variant',v->>'variant_id','price',v#>'{pricing,price}')
      from jsonb_array_elements(s->'variants') v where v#>>'{pricing,mode}'='exception_override'
  loop
    price:=r->'price'; scope:=r->>'scope'; config_id:=(r->>'config')::uuid; quote_variant:=(r->>'variant')::uuid; quote_id:=(price->>'quote_id')::uuid;
    if quote_id=any(seen_quotes) then raise exception 'variant_quote_identity_collision'; end if; seen_quotes:=array_append(seen_quotes,quote_id);
    select * into old_quote from public.feya_commerce_variant_quotes_v1 q where q.quote_id=quote_id;
    if found then
      if old_quote.canonical_product_id<>product_id or old_quote.scope_key<>scope or old_quote.price<>price
        or old_quote.configuration_price_id<>config_id or old_quote.variant_id is distinct from quote_variant then raise exception 'variant_quote_reassigned_or_mutated'; end if;
      -- A later quote for this scope cannot silently be replaced by an older one.
      if exists(select 1 from public.feya_commerce_variant_quotes_v1 q where q.canonical_product_id=product_id and q.scope_key=scope and q.price_revision>old_quote.price_revision) then raise exception 'variant_price_revision_conflict'; end if;
    else
      if (price->>'price_revision')::bigint<>coalesce((select max(q.price_revision) from public.feya_commerce_variant_quotes_v1 q where q.canonical_product_id=product_id and q.scope_key=scope),0)+1 then raise exception 'variant_price_revision_conflict'; end if;
      insert into public.feya_commerce_variant_quotes_v1(quote_id,canonical_product_id,configuration_price_id,variant_id,scope_key,price_revision,price)
        values(quote_id,product_id,config_id,quote_variant,scope,(price->>'price_revision')::bigint,price);
    end if;
  end loop;

  -- Reuse canonical execution creation/approval. Approval covers this human draft save only.
  select * into execution_row from public.feya_fn_create_execution_request_v1(
    'SAVE_PRODUCT_VARIANT_DRAFT','OFFER',jsonb_build_object('canonical_product_id',product_id),
    jsonb_build_object('expected_revision',expected_revision,'source_bindings',p_payload->'source_bindings'),
    jsonb_build_object('draft_only',true,'request_id',request_id,'payload_sha256',payload_hash,'snapshot_sha256',snapshot_hash),
    jsonb_build_object('mode','append_compensating_draft_revision','previous_revision',expected_revision,'never_delete_history',true),
    jsonb_build_object('expected_revision',next_revision,'snapshot_sha256',snapshot_hash,'can_publish',false,'can_index',false),
    'human',p_actor_user_id,'variant-draft:'||request_id::text);
  if not execution_row.created_new or execution_row.request_status<>'APPROVAL_REQUIRED' then raise exception 'variant_execution_conflict'; end if;
  perform public.feya_fn_approve_execution_request_v1(execution_row.execution_request_id,'APPROVAL_REQUIRED',p_actor_user_id,
    'Authenticated human explicitly saved an internal variant draft; not price, offer, content or publication approval.');
  update public.feya_growth_execution_requests_v1 set request_status='SUCCEEDED',updated_at=now()
    where execution_request_id=execution_row.execution_request_id and request_status='APPROVED' and approval_hash=request_hash;
  if not found then raise exception 'variant_execution_conflict'; end if;
  insert into public.feya_growth_change_events_v1(change_event_id,event_code,change_domain,change_type,entity_type,entity_key,
    execution_request_id,version_before_json,version_after_json,source_type,source_ref,metadata_json,idempotency_key)
  values(event_id,'VARIANT-DRAFT-'||request_id::text,'OFFER','VARIANT_DRAFT_SAVED','canonical_product',product_id::text,
    execution_row.execution_request_id,jsonb_build_object('product_revision',expected_revision),
    jsonb_build_object('product_revision',next_revision,'snapshot_sha256',snapshot_hash),'human','Product OS variant draft',
    jsonb_build_object('actor_user_id',p_actor_user_id,'draft_only',true,'can_publish',false,'can_index',false,'can_enable_checkout',false),
    'variant-draft:'||request_id::text);
  insert into public.feya_commerce_variant_revisions_v1(canonical_product_id,product_revision,request_id,actor_user_id,snapshot,source_bindings,snapshot_sha256,execution_request_id,change_event_id)
    values(product_id,next_revision,request_id,p_actor_user_id,s,p_payload->'source_bindings',snapshot_hash,execution_row.execution_request_id,event_id);
  update public.feya_commerce_variant_heads_v1 set current_revision=next_revision,updated_at=now() where canonical_product_id=product_id;
  response:=jsonb_build_object('contract_version','product_variant_draft_v1','request_id',request_id,'canonical_product_id',product_id,
    'product_revision',next_revision,'snapshot_sha256',snapshot_hash,'execution_request_id',execution_row.execution_request_id,'change_event_id',event_id,
    'draft_only',true,'can_publish',false,'can_index',false,'can_enable_checkout',false,'replayed',false);
  insert into public.feya_commerce_variant_save_receipts_v1(request_id,actor_user_id,canonical_product_id,product_revision,request_sha256,response)
    values(request_id,p_actor_user_id,product_id,next_revision,payload_hash,response);
  insert into public.feya_commerce_variant_draft_outbox_v1(change_event_id,canonical_product_id,product_revision) values(event_id,product_id,next_revision);
  return response;
end $$;

do $$
declare t text; p text;
begin
  foreach t in array array['heads','revisions','attributes','identities','quotes','save_receipts','draft_outbox'] loop
    execute format('alter table public.%I enable row level security','feya_commerce_variant_'||t||'_v1');
    execute format('revoke all on public.%I from public,anon,authenticated,service_role','feya_commerce_variant_'||t||'_v1');
    execute format('grant select,insert on public.%I to service_role','feya_commerce_variant_'||t||'_v1');
  end loop;
  grant update on public.feya_commerce_variant_heads_v1,public.feya_commerce_variant_draft_outbox_v1 to service_role;
  foreach p in array array[
    'feya_commerce_variant_draft_health_v1()','feya_commerce_read_variant_draft_v1(uuid)',
    'feya_commerce_save_variant_draft_v1(uuid,jsonb)','feya_commerce_variant_draft_schema_v1()',
    'feya_commerce_variant_shape_matches_v1(jsonb,jsonb)','feya_commerce_variant_immutable_v1()'] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
