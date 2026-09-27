-- Storefront IA N7 immutable shopper-facet snapshot.
-- Keeps shopper browse/filter semantics separate from SEO landing ownership.
begin;

create table if not exists public.feya_storefront_facet_snapshots_v1(
  facet_snapshot_id uuid primary key,
  snapshot_code text not null unique check(length(btrim(snapshot_code))>0),
  facet_contract_version text not null check(length(btrim(facet_contract_version))>0),
  source_revision text not null check(length(btrim(source_revision))>0),
  source_release_ref text not null check(length(btrim(source_release_ref))>0),
  product_count integer not null check(product_count>=0),
  snapshot_hash text not null check(snapshot_hash~'^[0-9a-f]{64}$'),
  snapshot_status text not null check(snapshot_status in ('PREVIEW','RETIRED')),
  evidence_json jsonb not null check(jsonb_typeof(evidence_json)='object'),
  captured_at timestamptz not null default now()
);

create table if not exists public.feya_storefront_facet_items_v1(
  facet_snapshot_id uuid not null references public.feya_storefront_facet_snapshots_v1(facet_snapshot_id) on delete restrict,
  canonical_product_id uuid not null,
  source_draft_id uuid not null,
  parent_components_json jsonb not null check(jsonb_typeof(parent_components_json)='array'),
  child_components_json jsonb not null check(jsonb_typeof(child_components_json)='array'),
  component_groups_json jsonb not null check(jsonb_typeof(component_groups_json)='array'),
  event_values_json jsonb not null check(jsonb_typeof(event_values_json)='array'),
  style_values_json jsonb not null check(jsonb_typeof(style_values_json)='array'),
  persona_values_json jsonb not null check(jsonb_typeof(persona_values_json)='array'),
  canonical_color_label text,
  item_hash text not null check(item_hash~'^[0-9a-f]{64}$'),
  evidence_json jsonb not null check(jsonb_typeof(evidence_json)='object'),
  created_at timestamptz not null default now(),
  primary key(facet_snapshot_id,canonical_product_id)
);

create index if not exists feya_storefront_facet_items_product_idx
  on public.feya_storefront_facet_items_v1(canonical_product_id);

alter table public.feya_storefront_facet_snapshots_v1 enable row level security;
alter table public.feya_storefront_facet_items_v1 enable row level security;

revoke all on table public.feya_storefront_facet_snapshots_v1 from public,anon,authenticated;
revoke all on table public.feya_storefront_facet_items_v1 from public,anon,authenticated;
grant select on table public.feya_storefront_facet_snapshots_v1 to service_role;
grant select on table public.feya_storefront_facet_items_v1 to service_role;

with release_ids as (
  select distinct (x.value #>> '{}')::uuid as canonical_product_id
  from public.feya_growth_execution_requests_v1 r,
       lateral jsonb_array_elements(r.request_payload_json->'canonical_product_ids') x(value)
  where r.execution_request_id='9f1151e3-4fb5-41b9-8922-878c85bfa81a'::uuid
    and r.request_status='SUCCEEDED'
),
latest as (
  select distinct on (p.canonical_product_id)
    p.canonical_product_id,
    p.id as source_draft_id,
    p.manual_focus_snapshot
  from public.feya_commerce_seo_pack_drafts_v1 p
  join release_ids r using(canonical_product_id)
  where p.review_status='approved'
    and p.archived_at is null
  order by p.canonical_product_id,coalesce(p.reviewed_at,p.created_at) desc,p.id desc
),
rows as (
  select
    l.canonical_product_id,
    l.source_draft_id,
    coalesce(t.parent_components_json,'[]'::jsonb) as parent_components_json,
    coalesce(t.child_components_json,'[]'::jsonb) as child_components_json,
    coalesce(t.component_groups_json,'[]'::jsonb) as component_groups_json,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'event') as event_values_json,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'style') as style_values_json,
    public.feya_search_normalize_text_values_v1(l.manual_focus_snapshot->'persona') as persona_values_json,
    t.canonical_color_label
  from latest l
  join public.feya_commerce_v_seo_product_truth_v4 t using(canonical_product_id)
),
hashed as (
  select
    r.*,
    encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'contract','feya-storefront-facets-v2',
            'canonical_product_id',r.canonical_product_id,
            'source_draft_id',r.source_draft_id,
            'parent_components',r.parent_components_json,
            'child_components',r.child_components_json,
            'component_groups',r.component_groups_json,
            'events',r.event_values_json,
            'styles',r.style_values_json,
            'personas',r.persona_values_json,
            'canonical_color_label',r.canonical_color_label
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as item_hash
  from rows r
),
snapshot as (
  select
    extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:storefront-facet-snapshot:feya-n7-20260927-v1'
    ) as facet_snapshot_id,
    'feya-n7-20260927-v1'::text as snapshot_code,
    'feya-storefront-facets-v2'::text as facet_contract_version,
    'feya-review-207-20260924|approved-seo-pack-current|product-truth-v4'::text as source_revision,
    'feya-review-207-20260924'::text as source_release_ref,
    count(*)::int as product_count,
    encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'snapshot_code','feya-n7-20260927-v1',
            'facet_contract_version','feya-storefront-facets-v2',
            'items',jsonb_agg(
              jsonb_build_object(
                'canonical_product_id',canonical_product_id,
                'item_hash',item_hash
              )
              order by canonical_product_id
            )
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as snapshot_hash
  from hashed
),
insert_snapshot as (
  insert into public.feya_storefront_facet_snapshots_v1(
    facet_snapshot_id,snapshot_code,facet_contract_version,source_revision,source_release_ref,
    product_count,snapshot_hash,snapshot_status,evidence_json
  )
  select
    facet_snapshot_id,snapshot_code,facet_contract_version,source_revision,source_release_ref,
    product_count,snapshot_hash,'PREVIEW',
    jsonb_build_object(
      'architecture','FEYA_N7_Target_IA_v1',
      'source_policy','exact 207-product release set + latest approved SEO pack at capture time + Product Truth v4',
      'seo_owner_urls_created',false,
      'index_authorized',false
    )
  from snapshot
  on conflict (snapshot_code) do nothing
  returning facet_snapshot_id
)
insert into public.feya_storefront_facet_items_v1(
  facet_snapshot_id,canonical_product_id,source_draft_id,
  parent_components_json,child_components_json,component_groups_json,
  event_values_json,style_values_json,persona_values_json,canonical_color_label,
  item_hash,evidence_json
)
select
  s.facet_snapshot_id,h.canonical_product_id,h.source_draft_id,
  h.parent_components_json,h.child_components_json,h.component_groups_json,
  h.event_values_json,h.style_values_json,h.persona_values_json,h.canonical_color_label,
  h.item_hash,
  jsonb_build_object(
    'source','approved_manual_focus_plus_product_truth',
    'source_draft_id',h.source_draft_id,
    'index_authorized',false
  )
from hashed h
cross join snapshot s
on conflict (facet_snapshot_id,canonical_product_id) do nothing;

do $$
declare
  sid uuid;
  expected_count integer;
  actual_count integer;
  stored_hash text;
  recalculated_hash text;
begin
  select facet_snapshot_id,product_count,snapshot_hash
    into sid,expected_count,stored_hash
  from public.feya_storefront_facet_snapshots_v1
  where snapshot_code='feya-n7-20260927-v1';

  select count(*) into actual_count
  from public.feya_storefront_facet_items_v1
  where facet_snapshot_id=sid;

  if expected_count<>207 or actual_count<>207 then
    raise exception 'storefront_facet_snapshot_count_mismatch:%/%',expected_count,actual_count;
  end if;

  select encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'snapshot_code','feya-n7-20260927-v1',
          'facet_contract_version','feya-storefront-facets-v2',
          'items',jsonb_agg(
            jsonb_build_object(
              'canonical_product_id',canonical_product_id,
              'item_hash',item_hash
            )
            order by canonical_product_id
          )
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  into recalculated_hash
  from public.feya_storefront_facet_items_v1
  where facet_snapshot_id=sid;

  if stored_hash<>recalculated_hash then
    raise exception 'storefront_facet_snapshot_hash_mismatch';
  end if;
end $$;

commit;
