-- FEYA Commerce — Checkout / Account / Order Draft Backbone
-- Additive migration. Does not modify existing feya_commerce import/storefront tables.
-- Purpose: prepare safe order-draft foundation before payment provider integration.

create extension if not exists pgcrypto;

create table if not exists public.feya_commerce_customers (
  customer_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid null,
  email text not null,
  full_name text null,
  phone text null,
  preferred_language text not null default 'en',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feya_commerce_customers_email_nonempty check (length(trim(email)) > 0)
);

create unique index if not exists feya_commerce_customers_email_uidx
  on public.feya_commerce_customers (lower(email));

create table if not exists public.feya_commerce_customer_addresses (
  address_id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.feya_commerce_customers(customer_id) on delete cascade,
  email text null,
  label text null,
  full_name text null,
  phone text null,
  country text null,
  city text null,
  address_line_1 text null,
  address_line_2 text null,
  postal_code text null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feya_commerce_customer_addresses_customer_idx
  on public.feya_commerce_customer_addresses (customer_id);

create table if not exists public.feya_commerce_measurement_profiles (
  measurement_profile_id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.feya_commerce_customers(customer_id) on delete cascade,
  email text null,
  label text null,
  height_cm numeric(8,2) null,
  bust_cm numeric(8,2) null,
  underbust_cm numeric(8,2) null,
  waist_cm numeric(8,2) null,
  hips_cm numeric(8,2) null,
  shoulder_width_cm numeric(8,2) null,
  arm_length_cm numeric(8,2) null,
  thigh_cm numeric(8,2) null,
  raw_measurements_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feya_commerce_measurement_profiles_customer_idx
  on public.feya_commerce_measurement_profiles (customer_id);

create table if not exists public.feya_commerce_order_drafts (
  order_draft_id uuid primary key default gen_random_uuid(),
  draft_number text not null unique default ('DRAFT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id uuid null references public.feya_commerce_customers(customer_id) on delete set null,
  email text null,
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
  payment_provider text null,
  payment_status text not null default 'not_started',
  order_status text not null default 'draft_only',
  production_status text not null default 'not_started',
  shipping_status text not null default 'not_started',
  price_contract_version text null,
  has_price_review_warning boolean not null default false,
  has_label_review_warning boolean not null default false,
  raw_checkout_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feya_commerce_order_drafts_shipping_method_chk check (shipping_method in ('standard','express')),
  constraint feya_commerce_order_drafts_payment_status_chk check (payment_status in ('not_started','pending','paid','failed','cancelled','refunded')),
  constraint feya_commerce_order_drafts_order_status_chk check (order_status in ('draft_only','placed','cancelled','converted_to_order'))
);

create index if not exists feya_commerce_order_drafts_email_idx
  on public.feya_commerce_order_drafts (lower(email));

create index if not exists feya_commerce_order_drafts_customer_idx
  on public.feya_commerce_order_drafts (customer_id);

create table if not exists public.feya_commerce_order_draft_items (
  order_draft_item_id uuid primary key default gen_random_uuid(),
  order_draft_id uuid not null references public.feya_commerce_order_drafts(order_draft_id) on delete cascade,
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
  constraint feya_commerce_order_draft_items_quantity_chk check (quantity > 0)
);

create index if not exists feya_commerce_order_draft_items_draft_idx
  on public.feya_commerce_order_draft_items (order_draft_id);

create table if not exists public.feya_commerce_order_payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_draft_id uuid null references public.feya_commerce_order_drafts(order_draft_id) on delete set null,
  payment_provider text not null,
  provider_session_id text null,
  provider_payment_id text null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'created',
  raw_provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feya_commerce_order_payments_status_chk check (status in ('created','pending','paid','failed','cancelled','refunded'))
);

create index if not exists feya_commerce_order_payments_draft_idx
  on public.feya_commerce_order_payments (order_draft_id);

alter table public.feya_commerce_customers enable row level security;
alter table public.feya_commerce_customer_addresses enable row level security;
alter table public.feya_commerce_measurement_profiles enable row level security;
alter table public.feya_commerce_order_drafts enable row level security;
alter table public.feya_commerce_order_draft_items enable row level security;
alter table public.feya_commerce_order_payments enable row level security;

comment on table public.feya_commerce_order_drafts is 'Safe checkout draft layer. No paid order is created here until payment provider integration is approved.';
comment on table public.feya_commerce_order_draft_items is 'Customer-facing order item snapshot. Must use English labels and approved v4 display prices.';
comment on table public.feya_commerce_order_payments is 'Payment provider references only. Card data must never be stored in FEYA database.';
