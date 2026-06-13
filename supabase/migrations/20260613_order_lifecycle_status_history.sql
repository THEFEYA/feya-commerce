-- FEYA Commerce — Order Lifecycle / Status History Backbone
-- Additive migration. Builds production workflow foundation on top of checkout/order drafts.

create table if not exists public.feya_commerce_order_status_events (
  status_event_id uuid primary key default gen_random_uuid(),
  order_draft_id uuid not null references public.feya_commerce_order_drafts(order_draft_id) on delete cascade,
  event_type text not null,
  from_status text null,
  to_status text not null,
  actor_type text not null default 'system',
  actor_label text null,
  note text null,
  raw_event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint feya_commerce_order_status_events_event_type_chk check (
    event_type in (
      'order_status',
      'payment_status',
      'production_status',
      'shipping_status',
      'review_status',
      'customer_note',
      'measurement_note',
      'system_note'
    )
  ),
  constraint feya_commerce_order_status_events_actor_type_chk check (
    actor_type in ('system','customer','admin','payment_provider','shipping_provider')
  )
);

create index if not exists feya_commerce_order_status_events_draft_idx
  on public.feya_commerce_order_status_events (order_draft_id, created_at desc);

create table if not exists public.feya_commerce_order_review_tasks (
  review_task_id uuid primary key default gen_random_uuid(),
  order_draft_id uuid not null references public.feya_commerce_order_drafts(order_draft_id) on delete cascade,
  task_code text not null,
  task_title text not null,
  task_status text not null default 'open',
  severity text not null default 'normal',
  source text not null default 'system',
  note text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feya_commerce_order_review_tasks_status_chk check (task_status in ('open','in_progress','resolved','ignored')),
  constraint feya_commerce_order_review_tasks_severity_chk check (severity in ('low','normal','high','blocking'))
);

create index if not exists feya_commerce_order_review_tasks_draft_idx
  on public.feya_commerce_order_review_tasks (order_draft_id, task_status, severity);

create or replace view public.feya_commerce_v_order_draft_review_queue as
select
  d.order_draft_id,
  d.draft_number,
  d.email,
  d.full_name,
  d.phone,
  d.event_date,
  d.shipping_method,
  d.shipping_price_amount,
  d.subtotal_amount,
  d.total_amount,
  d.currency,
  d.payment_status,
  d.order_status,
  d.production_status,
  d.shipping_status,
  d.price_contract_version,
  d.has_price_review_warning,
  d.has_label_review_warning,
  d.created_at,
  count(i.order_draft_item_id)::integer as item_count,
  coalesce(sum(i.quantity), 0)::integer as unit_count,
  count(t.review_task_id) filter (where t.task_status in ('open','in_progress'))::integer as open_task_count,
  count(t.review_task_id) filter (where t.severity = 'blocking' and t.task_status in ('open','in_progress'))::integer as blocking_task_count,
  max(e.created_at) as last_status_event_at
from public.feya_commerce_order_drafts d
left join public.feya_commerce_order_draft_items i
  on i.order_draft_id = d.order_draft_id
left join public.feya_commerce_order_review_tasks t
  on t.order_draft_id = d.order_draft_id
left join public.feya_commerce_order_status_events e
  on e.order_draft_id = d.order_draft_id
group by
  d.order_draft_id,
  d.draft_number,
  d.email,
  d.full_name,
  d.phone,
  d.event_date,
  d.shipping_method,
  d.shipping_price_amount,
  d.subtotal_amount,
  d.total_amount,
  d.currency,
  d.payment_status,
  d.order_status,
  d.production_status,
  d.shipping_status,
  d.price_contract_version,
  d.has_price_review_warning,
  d.has_label_review_warning,
  d.created_at;

alter table public.feya_commerce_order_status_events enable row level security;
alter table public.feya_commerce_order_review_tasks enable row level security;

comment on table public.feya_commerce_order_status_events is 'Append-only status/event history for checkout drafts and future paid orders.';
comment on table public.feya_commerce_order_review_tasks is 'Internal admin review tasks for price, label, measurements, production and shipping readiness.';
comment on view public.feya_commerce_v_order_draft_review_queue is 'Internal review queue view. Do not expose publicly without authenticated admin policies.';
