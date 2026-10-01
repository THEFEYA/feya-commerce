-- Storefront IA N7 immutable shopper-facet snapshot storage.
-- Schema-only migration: production snapshot materialization is a governed data operation,
-- not a migration-time dependency on live catalog rows.
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

commit;
