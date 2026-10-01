-- Additive preparation only. Apply to an isolated database before production.
-- Existing Product OS/Growth IDs, truth and approval records remain authoritative.
begin;

create table public.feya_search_page_specs_v1 (
  seo_page_id uuid primary key references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  family text not null check (family in ('home','shop','type_hub','event_hub','style_hub','subhub','product','guide','trust')),
  primary_parent_page_id uuid references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  accountable_owner text not null check (length(btrim(accountable_owner)) > 0),
  review_state text not null default 'draft' check (review_state in ('draft','review','approved','hold')),
  user_intent text not null default '',
  primary_intent text not null default '',
  unique_value_brief text not null default '',
  intent_evidence_status text not null default 'unknown' check (intent_evidence_status in ('confirmed','unknown','rejected')),
  truth_status text not null default 'unknown' check (truth_status in ('confirmed','unknown','rejected')),
  utility_rationale text,
  selection_rule_json jsonb not null default '{}'::jsonb check (jsonb_typeof(selection_rule_json) = 'object'),
  inventory_policy_json jsonb check (jsonb_typeof(inventory_policy_json) = 'object'),
  excluded_queries_json jsonb not null default '[]'::jsonb check (jsonb_typeof(excluded_queries_json) = 'array'),
  evidence_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs_json) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (primary_parent_page_id is distinct from seo_page_id)
);
create index feya_search_specs_parent_idx on public.feya_search_page_specs_v1(primary_parent_page_id);

create table public.feya_search_membership_snapshots_v1 (
  membership_snapshot_id uuid primary key default gen_random_uuid(),
  seo_page_id uuid not null references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  rule_version text not null check (length(btrim(rule_version)) > 0),
  source_revision text not null check (length(btrim(source_revision)) > 0),
  expected_item_count integer not null check (expected_item_count >= 0),
  captured_at timestamptz not null default now(),
  unique (membership_snapshot_id, seo_page_id)
);
create index feya_search_membership_page_idx on public.feya_search_membership_snapshots_v1(seo_page_id, captured_at desc);

create table public.feya_search_membership_items_v1 (
  membership_snapshot_id uuid not null references public.feya_search_membership_snapshots_v1(membership_snapshot_id) on delete restrict,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  design_family_key text check (design_family_key is null or length(btrim(design_family_key)) > 0),
  eligibility_status text not null check (eligibility_status in ('eligible','ineligible','unknown')),
  orderability_status text not null default 'unknown' check (orderability_status in ('confirmed','unknown','rejected')),
  truth_version text,
  evidence_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs_json) = 'array'),
  reason_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(reason_codes_json) = 'array'),
  primary key (membership_snapshot_id, canonical_product_id),
  check (eligibility_status <> 'eligible' or (orderability_status = 'confirmed' and length(btrim(truth_version)) > 0 and truth_version is not null))
);
create index feya_search_membership_product_idx on public.feya_search_membership_items_v1(canonical_product_id);

create table public.feya_search_page_versions_v1 (
  page_version_id uuid primary key default gen_random_uuid(),
  seo_page_id uuid not null references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  version_number integer not null check (version_number > 0),
  membership_snapshot_id uuid,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  spec_json jsonb not null check (jsonb_typeof(spec_json) = 'object'),
  content_json jsonb not null check (jsonb_typeof(content_json) = 'object'),
  evidence_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs_json) = 'array'),
  execution_request_id uuid references public.feya_growth_execution_requests_v1(execution_request_id) on delete restrict,
  change_event_id uuid references public.feya_growth_change_events_v1(change_event_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (seo_page_id, version_number),
  foreign key (membership_snapshot_id, seo_page_id) references public.feya_search_membership_snapshots_v1(membership_snapshot_id, seo_page_id) on delete restrict
);
create index feya_search_versions_snapshot_idx on public.feya_search_page_versions_v1(membership_snapshot_id, seo_page_id);
create index feya_search_versions_execution_idx on public.feya_search_page_versions_v1(execution_request_id);
create index feya_search_versions_change_idx on public.feya_search_page_versions_v1(change_event_id);

-- Proposed links, never a second publication/approval engine.
create table public.feya_search_link_edges_v1 (
  link_edge_id uuid primary key default gen_random_uuid(),
  from_page_id uuid not null references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  to_page_id uuid not null references public.feya_commerce_seo_pages_v1(seo_page_id) on delete restrict,
  link_kind text not null check (link_kind in ('breadcrumb','navigation','product_membership','related_product','editorial')),
  generation_mode text not null check (generation_mode in ('deterministic','editorial')),
  status text not null default 'proposed' check (status in ('proposed','approved','hold','retired')),
  evidence_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs_json) = 'array'),
  source_version text not null check (length(btrim(source_version)) > 0),
  created_at timestamptz not null default now(),
  check (from_page_id <> to_page_id),
  unique (from_page_id, to_page_id, link_kind, source_version)
);
create index feya_search_links_target_idx on public.feya_search_link_edges_v1(to_page_id);

create function public.feya_search_check_family_v1() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare expected_type text; actual_type text;
begin
  expected_type := case when new.family = 'product' then 'product' when new.family = 'guide' then 'editorial' else 'landing' end;
  select page_type into actual_type from public.feya_commerce_seo_pages_v1 where seo_page_id = new.seo_page_id;
  if actual_type is distinct from expected_type then
    raise exception 'Search family conflicts with canonical page_type' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger feya_search_specs_family before insert or update on public.feya_search_page_specs_v1
for each row execute function public.feya_search_check_family_v1();

create function public.feya_search_reject_snapshot_mutation_v1() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'Search evidence/version rows are immutable; insert a new snapshot or version' using errcode = '55000';
end $$;
create trigger feya_search_snapshot_immutable before update or delete on public.feya_search_membership_snapshots_v1
for each row execute function public.feya_search_reject_snapshot_mutation_v1();
create trigger feya_search_member_immutable before update or delete on public.feya_search_membership_items_v1
for each row execute function public.feya_search_reject_snapshot_mutation_v1();
create trigger feya_search_version_immutable before update or delete on public.feya_search_page_versions_v1
for each row execute function public.feya_search_reject_snapshot_mutation_v1();

-- Header and all items must be inserted in ONE transaction. A committed snapshot
-- cannot receive additional items: at commit its count must still equal the header.
create function public.feya_search_check_snapshot_count_v1() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare expected_count integer; actual_count bigint;
begin
  select expected_item_count into expected_count from public.feya_search_membership_snapshots_v1
    where membership_snapshot_id = new.membership_snapshot_id;
  select count(*) into actual_count from public.feya_search_membership_items_v1
    where membership_snapshot_id = new.membership_snapshot_id;
  if expected_count is null or actual_count <> expected_count then
    raise exception 'Incomplete or changed search membership snapshot' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger feya_search_snapshot_count after insert on public.feya_search_membership_snapshots_v1
deferrable initially deferred for each row execute function public.feya_search_check_snapshot_count_v1();
create constraint trigger feya_search_member_count after insert on public.feya_search_membership_items_v1
deferrable initially deferred for each row execute function public.feya_search_check_snapshot_count_v1();

alter table public.feya_search_page_specs_v1 enable row level security;
alter table public.feya_search_membership_snapshots_v1 enable row level security;
alter table public.feya_search_membership_items_v1 enable row level security;
alter table public.feya_search_page_versions_v1 enable row level security;
alter table public.feya_search_link_edges_v1 enable row level security;

revoke all on public.feya_search_page_specs_v1, public.feya_search_membership_snapshots_v1,
  public.feya_search_membership_items_v1, public.feya_search_page_versions_v1, public.feya_search_link_edges_v1
  from public, anon, authenticated;
revoke all on public.feya_search_page_specs_v1, public.feya_search_membership_snapshots_v1,
  public.feya_search_membership_items_v1, public.feya_search_page_versions_v1, public.feya_search_link_edges_v1
  from service_role;
grant select, insert on public.feya_search_page_specs_v1, public.feya_search_membership_snapshots_v1,
  public.feya_search_membership_items_v1, public.feya_search_page_versions_v1, public.feya_search_link_edges_v1
  to service_role;
grant update on public.feya_search_page_specs_v1, public.feya_search_link_edges_v1 to service_role;
revoke all on function public.feya_search_check_family_v1(), public.feya_search_reject_snapshot_mutation_v1(), public.feya_search_check_snapshot_count_v1() from public, anon, authenticated;
-- Trigger functions run as invoker. No SECURITY DEFINER privilege escalation.

comment on table public.feya_search_page_specs_v1 is 'Private search preparation. An approved spec is not an authorization to publish or index.';
comment on table public.feya_search_membership_snapshots_v1 is 'Atomic immutable evidence. Revalidate truth versions and orderability before any release.';
comment on table public.feya_search_page_versions_v1 is 'Immutable drafts using existing Growth execution/change IDs. No public release pointer in this foundation.';
commit;
