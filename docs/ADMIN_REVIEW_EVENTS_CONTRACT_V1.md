# Admin Review Events Contract v1

## Goal

Create the first safe write layer for Control Tower actions.

This contract must not mutate product source data, v4 storefront data, order draft data, prices, labels, media, SEO fields, or payment state.

It only records admin review decisions as append-only events.

## Why this layer exists

The current Control Tower is read-only:

- `/admin/products/[slug]`
- `/admin/review/labels`
- `/admin/review/prices`
- `/admin/review/components`
- `/admin/media`
- `/admin/seo`
- `/admin/orders`

Before editing product data directly, the app needs a safe action log. This lets the admin mark that something was checked without overwriting canonical product/import data.

## Safety rules

- Add-only.
- No product data overwrite.
- No price overwrite.
- No label overwrite.
- No media overwrite.
- No SEO publish.
- No payment state changes.
- No paid order creation.
- No webhook logic.
- No public table access.
- Server-side admin API only.

## Event examples

```text
label_review_approved
price_review_approved
component_mapping_checked
media_checked
seo_ready_checked
needs_fix
internal_note_added
order_draft_reviewed
```

## Recommended Supabase SQL

Run only after order draft contract is already installed and verified.

```sql
create table if not exists public.feya_commerce_admin_review_events (
  review_event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_status text not null default 'recorded',
  subject_type text not null default 'product',
  canonical_product_id text,
  product_slug text,
  configuration_id text,
  order_draft_id uuid,
  admin_note text,
  source_route text,
  payload_json jsonb not null default '{}'::jsonb,
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint feya_admin_review_events_subject_type_chk check (
    subject_type in (
      'product',
      'configuration',
      'label',
      'price',
      'component',
      'media',
      'seo',
      'order_draft'
    )
  ),
  constraint feya_admin_review_events_status_chk check (
    event_status in ('recorded', 'needs_fix', 'approved', 'resolved', 'archived')
  )
);

create index if not exists idx_feya_admin_review_events_product
  on public.feya_commerce_admin_review_events (canonical_product_id, product_slug, created_at desc);

create index if not exists idx_feya_admin_review_events_config
  on public.feya_commerce_admin_review_events (configuration_id, created_at desc);

create index if not exists idx_feya_admin_review_events_type
  on public.feya_commerce_admin_review_events (event_type, event_status, created_at desc);

create index if not exists idx_feya_admin_review_events_order_draft
  on public.feya_commerce_admin_review_events (order_draft_id, created_at desc);

alter table public.feya_commerce_admin_review_events enable row level security;

revoke all on table public.feya_commerce_admin_review_events from anon, authenticated;
```

## Admin read view

```sql
create or replace view public.feya_commerce_v_admin_review_events_v1 as
select
  review_event_id,
  event_type,
  event_status,
  subject_type,
  canonical_product_id,
  product_slug,
  configuration_id,
  order_draft_id,
  admin_note,
  source_route,
  payload_json,
  created_by,
  created_at,
  resolved_at
from public.feya_commerce_admin_review_events;

revoke all on public.feya_commerce_v_admin_review_events_v1 from anon, authenticated;
```

## Verification SQL

```sql
select to_regclass('public.feya_commerce_admin_review_events') as review_events_table;
select to_regclass('public.feya_commerce_v_admin_review_events_v1') as review_events_view;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'feya_commerce_admin_review_events'
order by ordinal_position;

select relrowsecurity
from pg_class
where oid = 'public.feya_commerce_admin_review_events'::regclass;

select count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename = 'feya_commerce_admin_review_events';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('feya_commerce_admin_review_events', 'feya_commerce_v_admin_review_events_v1')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expected:

```text
review_events_table = exists
review_events_view = exists
relrowsecurity = true
policy_count = 0
anon/authenticated grants = none
```

## Future GitHub wiring

After the Supabase contract is verified, GitHub should add:

```text
/api/admin/review-events
components/AdminReviewActionsClient.tsx
```

Admin action buttons should appear in:

```text
/admin/products/[slug]
/admin/orders
```

Initial buttons:

```text
Mark label reviewed
Mark price reviewed
Mark component checked
Mark media checked
Mark SEO ready
Add internal note
Needs fix
```

These buttons must write only to `feya_commerce_admin_review_events` through server-side admin API.

They must not mutate product data directly.
