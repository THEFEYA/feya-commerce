-- FEYA Commerce — Paid Order Conversion / Payment Lifecycle Backbone
-- Additive migration. Creates the safe boundary between checkout drafts and real paid orders.

create extension if not exists pgcrypto;

create table if not exists public.feya_commerce_payment_sessions (
  payment_session_id uuid primary key default gen_random_uuid(),
  order_draft_id uuid not null references public.feya_commerce_order_drafts(order_draft_id) on delete cascade,
  payment_provider text not null,
  provider_session_id text null,
  provider_checkout_url text null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'created',
  expires_at timestamptz null,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feya_commerce_payment_sessions_status_chk check (status in ('created','pending','paid','failed','cancelled','expired'))
);

create index if not exists feya_commerce_payment_sessions_draft_idx
  on public.feya_commerce_payment_sessions (order_draft_id, created_at desc);

create unique index if not exists feya_commerce_payment_sessions_provider_session_uidx
  on public.feya_commerce_payment_sessions (payment_provider, provider_session_id)
  where provider_session_id is not null;

create table if not exists public.feya_commerce_payment_webhook_events (
  webhook_event_id uuid primary key default gen_random_uuid(),
  payment_provider text not null,
  provider_event_id text not null,
  provider_event_type text null,
  provider_session_id text null,
  provider_payment_id text null,
  processing_status text not null default 'received',
  error_message text null,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  constraint feya_commerce_payment_webhook_events_status_chk check (processing_status in ('received','processed','ignored','failed'))
);

create unique index if not exists feya_commerce_payment_webhook_events_provider_event_uidx
  on public.feya_commerce_payment_webhook_events (payment_provider, provider_event_id);

create table if not exists public.feya_commerce_orders (
  order_id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('FEYA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  order_draft_id uuid null references public.feya_commerce_order_drafts(order_draft_id) on delete set null,
  customer_id uuid null references public.feya_commerce_customers(customer_id) on delete set null,
  email text not null,
  full_name text null,
  phone text null,
  country text null,
  city text null,
  address_line_1 text null,
  address_line_2 text null,
  postal_code text null,
  customer_note text null,
  event_date text null,
  measurements_note text null,
  shipping_method text not null default 'standard',
  shipping_price_amount numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  payment_provider text not null,
  provider_session_id text null,
  provider_payment_id text null,
  payment_status text not null default 'paid',
  order_status text not null default 'placed',
  production_status text not null default 'review_required',
  shipping_status text not null default 'not_started',
  price_contract_version text null,
  has_price_review_warning boolean not null default false,
  has_label_review_warning boolean not null default false,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_order_snapshot jsonb not null default '{}'::jsonb,
  constraint feya_commerce_orders_email_nonempty check (length(trim(email)) > 0),
  constraint feya_commerce_orders_payment_status_chk check (payment_status in ('paid','refunded','partially_refunded','chargeback','failed')),
  constraint feya_commerce_orders_order_status_chk check (order_status in ('placed','cancelled','in_review','in_production','ready_to_ship','shipped','delivered','return_requested','closed')),
  constraint feya_commerce_orders_production_status_chk check (production_status in ('review_required','approved','materials_pending','in_production','quality_check','ready_to_ship','blocked','cancelled')),
  constraint feya_commerce_orders_shipping_status_chk check (shipping_status in ('not_started','label_needed','label_created','shipped','delivered','exception','returned'))
);

create index if not exists feya_commerce_orders_email_idx
  on public.feya_commerce_orders (lower(email));

create index if not exists feya_commerce_orders_draft_idx
  on public.feya_commerce_orders (order_draft_id);

create index if not exists feya_commerce_orders_status_idx
  on public.feya_commerce_orders (order_status, production_status, shipping_status, created_at desc);

create table if not exists public.feya_commerce_order_items (
  order_item_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.feya_commerce_orders(order_id) on delete cascade,
  source_order_draft_item_id uuid null references public.feya_commerce_order_draft_items(order_draft_item_id) on delete set null,
  product_slug text not null,
  canonical_product_id text null,
  matched_etsy_listing_id text null,
  product_title text not null,
  image_url text null,
  configuration_id text null,
  configuration_label text not null,
  component_code text null,
  component_family text null,
  is_full_set boolean not null default false,
  color text null,
  size text null,
  quantity integer not null default 1,
  unit_price_amount numeric(12,2) not null default 0,
  line_total_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  price_confidence_status text null,
  label_confidence_status text null,
  raw_item_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint feya_commerce_order_items_quantity_chk check (quantity > 0)
);

create index if not exists feya_commerce_order_items_order_idx
  on public.feya_commerce_order_items (order_id);

create or replace view public.feya_commerce_v_paid_orders_admin_queue as
select
  o.order_id,
  o.order_number,
  o.order_draft_id,
  o.email,
  o.full_name,
  o.phone,
  o.event_date,
  o.shipping_method,
  o.subtotal_amount,
  o.shipping_price_amount,
  o.total_amount,
  o.currency,
  o.payment_provider,
  o.payment_status,
  o.order_status,
  o.production_status,
  o.shipping_status,
  o.has_price_review_warning,
  o.has_label_review_warning,
  o.paid_at,
  o.created_at,
  count(i.order_item_id)::integer as item_count,
  coalesce(sum(i.quantity), 0)::integer as unit_count
from public.feya_commerce_orders o
left join public.feya_commerce_order_items i
  on i.order_id = o.order_id
group by
  o.order_id,
  o.order_number,
  o.order_draft_id,
  o.email,
  o.full_name,
  o.phone,
  o.event_date,
  o.shipping_method,
  o.subtotal_amount,
  o.shipping_price_amount,
  o.total_amount,
  o.currency,
  o.payment_provider,
  o.payment_status,
  o.order_status,
  o.production_status,
  o.shipping_status,
  o.has_price_review_warning,
  o.has_label_review_warning,
  o.paid_at,
  o.created_at;

alter table public.feya_commerce_payment_sessions enable row level security;
alter table public.feya_commerce_payment_webhook_events enable row level security;
alter table public.feya_commerce_orders enable row level security;
alter table public.feya_commerce_order_items enable row level security;

comment on table public.feya_commerce_payment_sessions is 'Provider checkout sessions created from order drafts. No card data is stored.';
comment on table public.feya_commerce_payment_webhook_events is 'Immutable payment webhook event log. Paid orders should be created only from verified webhooks.';
comment on table public.feya_commerce_orders is 'Real paid customer orders converted from checkout drafts after verified payment provider webhook.';
comment on table public.feya_commerce_order_items is 'Paid order item snapshots with customer-facing English labels and verified/display prices.';
comment on view public.feya_commerce_v_paid_orders_admin_queue is 'Internal paid order queue for admin/production workflow. Do not expose publicly without auth/RLS policies.';
