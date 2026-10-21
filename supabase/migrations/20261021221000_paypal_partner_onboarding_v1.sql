-- PayPal-approved platform seller onboarding evidence only.
-- This schema never activates TheFEYA payment/order creation.
begin;
create table public.feya_pay_partner_onboarding_v1(
  tracking_id uuid primary key,
  initiated_by_grant_id uuid references public.feya_pay_access_grants_v1(grant_id) on delete restrict,
  environment text not null check(environment in ('sandbox','live')),
  status text not null default 'created'
    check(status in ('created','awaiting_consent','verified','rejected')),
  merchant_id text check(merchant_id is null or merchant_id ~ '^[A-Za-z0-9]{10,32}$'),
  client_id_hash text not null check(client_id_hash ~ '^[0-9a-f]{64}$'),
  payments_receivable boolean not null default false,
  primary_email_confirmed boolean not null default false,
  payment_permission boolean not null default false,
  refund_permission boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '48 hours',
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint verified_partner_evidence_only check(
    status<>'verified' or (
      merchant_id is not null and verified_at is not null
      and payments_receivable and primary_email_confirmed
      and payment_permission and refund_permission
    )
  )
);
create index feya_pay_partner_onboarding_grants_v1
  on public.feya_pay_partner_onboarding_v1(initiated_by_grant_id,created_at desc);
create index feya_pay_partner_onboarding_pending_v1
  on public.feya_pay_partner_onboarding_v1(status,expires_at);
alter table public.feya_pay_partner_onboarding_v1 enable row level security;
revoke all on public.feya_pay_partner_onboarding_v1 from public,anon,authenticated,service_role;
grant select,insert,update on public.feya_pay_partner_onboarding_v1 to service_role;
comment on table public.feya_pay_partner_onboarding_v1 is
  'PayPal Partner Referrals verified consent (approved partner app only); never a payment activation flag.';
commit;
