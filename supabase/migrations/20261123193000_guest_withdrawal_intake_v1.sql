-- Guest declaration and durable acknowledgement queue. Receipt and jobs commit together.
begin;

create table public.feya_withdrawal_notices_v1 (
  reference uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  submitted_at timestamptz not null default clock_timestamp(),
  consumer_name text not null check(length(consumer_name) between 1 and 120),
  contract_reference text not null check(length(contract_reference) between 1 and 240),
  confirmation_email text not null check(length(confirmation_email) between 3 and 254),
  declaration text not null default 'I hereby withdraw from the contract identified below.',
  order_id uuid references public.feya_pay_orders_v1(order_id),
  recipient_basis text check(recipient_basis in ('checkout_identity','order_token_and_checkout_email','verified_by_operator')),
  verified_by text, verification_ref text, verified_at timestamptz,
  handled_at timestamptz, handled_by text
);
create index feya_withdrawal_pending_cases_v1 on public.feya_withdrawal_notices_v1(submitted_at) where handled_at is null;
create table public.feya_withdrawal_delivery_v1 (
  job_id uuid primary key default gen_random_uuid(),
  reference uuid not null references public.feya_withdrawal_notices_v1(reference),
  kind text not null check(kind in ('customer','studio')),
  state text not null check(state in ('ready','dispatching','submitted','review')),
  reason text check(reason in ('recipient_unverified','mail_outcome_unknown')),
  created_at timestamptz not null default clock_timestamp(),
  active_attempt uuid, handed_to_mail_at timestamptz,
  recovery_by text, recovery_ref text, recovered_at timestamptz,
  unique(reference,kind),
  check((state='submitted')=(handed_to_mail_at is not null))
);
create index feya_withdrawal_due_delivery_v1 on public.feya_withdrawal_delivery_v1(kind,created_at) where state='ready';
-- An attempt authorizes at most one MailApp call, including if the network loses its response.
create table public.feya_withdrawal_dispatch_v1 (
  attempt_id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.feya_withdrawal_delivery_v1(job_id),
  issued_at timestamptz not null default clock_timestamp(),
  outcome text check(outcome in ('submitted','unknown')),
  reported_at timestamptz
);
create index feya_withdrawal_dispatch_window_v1 on public.feya_withdrawal_dispatch_v1(issued_at);
create table public.feya_withdrawal_limits_v1 (
  hour_utc timestamptz not null, scope_key text not null, used int not null,
  primary key (hour_utc,scope_key)
);
create table public.feya_withdrawal_worker_v1 (
  singleton boolean primary key default true check(singleton), last_poll_at timestamptz, remaining_quota integer
);
insert into public.feya_withdrawal_worker_v1(singleton) values(true);
alter table public.feya_withdrawal_worker_v1 enable row level security;
alter table public.feya_withdrawal_notices_v1 enable row level security;
alter table public.feya_withdrawal_delivery_v1 enable row level security;
alter table public.feya_withdrawal_limits_v1 enable row level security;
alter table public.feya_withdrawal_dispatch_v1 enable row level security;
revoke all on public.feya_withdrawal_notices_v1,public.feya_withdrawal_delivery_v1,public.feya_withdrawal_limits_v1,public.feya_withdrawal_dispatch_v1,public.feya_withdrawal_worker_v1 from public,anon,authenticated,service_role;

create function public.feya_withdrawal_record_v1(p_key uuid,p_name text,p_order_reference text,p_email text,p_access_sha text,p_ip_sha text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare n public.feya_withdrawal_notices_v1%rowtype; o public.feya_pay_orders_v1%rowtype;
  basis text; slot timestamptz:=date_trunc('hour',clock_timestamp(),'UTC'); quota record;
begin
  if p_key is null or p_name is null or p_order_reference is null or p_email is null
    or length(p_name) not between 1 and 120 or length(p_order_reference) not between 1 and 240
    or length(p_email) not between 3 and 254 or p_name ~ '[[:cntrl:]]' or p_order_reference ~ '[[:cntrl:]]'
    or p_email ~ '[[:space:][:cntrl:],;<>]' or p_email !~ '^[^@]+@[^@]+[.][^@]+$'
    or (p_access_sha is not null and p_access_sha !~ '^[0-9a-f]{64}$')
    or (p_ip_sha is not null and p_ip_sha !~ '^[0-9a-f]{64}$') then
    raise exception 'invalid_withdrawal';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('withdrawal:'||p_key::text,0));
  select * into n from public.feya_withdrawal_notices_v1 where idempotency_key=p_key;
  if found then
    if (n.consumer_name,n.contract_reference,n.confirmation_email) is distinct from (p_name,p_order_reference,p_email) then
      return jsonb_build_object('code','idempotency_conflict');
    end if;
    return jsonb_build_object('reference',n.reference,'submitted_at',n.submitted_at);
  end if;

  -- Short-lived counters use no clear IP or mailbox. Retried receipts above never spend a new slot.
  delete from public.feya_withdrawal_limits_v1 where hour_utc < slot - interval '48 hours';
  begin
  for quota in select * from (values
     ('all',800),('ip:'||coalesce(p_ip_sha,'unknown'),45),
     ('mail:'||encode(sha256(convert_to(lower(p_email),'UTF8')),'hex'),8)) as caps(bucket,maximum)
  loop
    insert into public.feya_withdrawal_limits_v1 as l(hour_utc,scope_key,used)
      values(slot,quota.bucket,1) on conflict(hour_utc,scope_key) do update set used=l.used+1 where l.used<quota.maximum;
    if not found then raise exception using errcode='P0429', message='rate_limited'; end if;
  end loop;
  exception when sqlstate 'P0429' then return jsonb_build_object('code','rate_limited');
  end;

  -- Reserve the automatic acknowledgement for a known checkout mailbox and a bound order identity.
  -- A different destination, missing number or incomplete identity still records the notice for studio review.
  if upper(p_order_reference) ~ '^FEYA-[0-9]{6,9}$' then
    select * into o from public.feya_pay_orders_v1 where order_number=upper(p_order_reference)
      and kind='customer' and environment='live' and paid_at is not null and capture_id is not null;
    if found and lower(o.buyer_email)=lower(p_email)
      and regexp_replace(lower(btrim(o.buyer_name)),'[[:space:]]+',' ','g')=
          regexp_replace(lower(btrim(p_name)),'[[:space:]]+',' ','g') then
      basis:=case when p_access_sha=o.access_token_sha256 then 'order_token_and_checkout_email' else 'checkout_identity' end;
    end if;
  end if;
  insert into public.feya_withdrawal_notices_v1(idempotency_key,consumer_name,contract_reference,confirmation_email,order_id,recipient_basis)
    values(p_key,p_name,p_order_reference,p_email,case when basis is not null then o.order_id end,basis)
    returning * into n;
  insert into public.feya_withdrawal_delivery_v1(reference,kind,state,reason) values
    (n.reference,'customer',case when basis is null then 'review' else 'ready' end,
       case when basis is null then 'recipient_unverified' end),
    (n.reference,'studio','ready',null);
  return jsonb_build_object('reference',n.reference,'submitted_at',n.submitted_at);
end $$;

-- Google MailApp has no provider idempotency key. Grant the content only once. Even
-- losing the first HTTP response sends the case to review rather than authorizing another send.
create function public.feya_withdrawal_take_v1(p_remaining int)
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare j public.feya_withdrawal_delivery_v1%rowtype; n public.feya_withdrawal_notices_v1%rowtype;
  a public.feya_withdrawal_dispatch_v1%rowtype; t timestamptz:=clock_timestamp();
  spent int; alerts int;
begin
  if p_remaining is null or p_remaining<0 or p_remaining>1000000 then raise exception 'invalid_mail_quota'; end if;
  perform pg_advisory_xact_lock(hashtextextended('withdrawal:Gmail dispatch capacity',0));
  update public.feya_withdrawal_worker_v1 set last_poll_at=t,remaining_quota=p_remaining where singleton;
  update public.feya_withdrawal_delivery_v1 d set state='review',reason='mail_outcome_unknown'
    from public.feya_withdrawal_dispatch_v1 attempt
    where d.state='dispatching' and d.active_attempt=attempt.attempt_id and attempt.issued_at<=t-interval '15 minutes';
  if p_remaining=0 then return '[]'::jsonb; end if;
  select count(*),count(*) filter(where d.kind='studio') into spent,alerts
    from public.feya_withdrawal_dispatch_v1 attempt join public.feya_withdrawal_delivery_v1 d on d.job_id=attempt.job_id
    where attempt.issued_at>t-interval '24 hours';
  if spent>=90 then return '[]'::jsonb; end if;
  select * into j from public.feya_withdrawal_delivery_v1 d
    where d.state='ready' and (d.kind='customer' or (p_remaining>20 and alerts<10))
    order by (d.kind='customer') desc,d.created_at,d.job_id limit 1 for update skip locked;
  if not found then return '[]'::jsonb; end if;
  select * into strict n from public.feya_withdrawal_notices_v1 where reference=j.reference;
  if j.kind='customer' and n.recipient_basis is null then raise exception 'recipient_unverified'; end if;
  insert into public.feya_withdrawal_dispatch_v1(job_id) values(j.job_id) returning * into a;
  update public.feya_withdrawal_delivery_v1 set state='dispatching',active_attempt=a.attempt_id where job_id=j.job_id;
  return jsonb_build_array(jsonb_build_object('job_id',j.job_id,'attempt_id',a.attempt_id,'kind',j.kind,
    'to',case when j.kind='customer' then n.confirmation_email else 'manager.feya@gmail.com' end,
    'reference',n.reference,'submitted_at',n.submitted_at,
    'statement',case when j.kind='customer' then jsonb_build_object('name',n.consumer_name,
    'contract',n.contract_reference,'email',n.confirmation_email,'declaration',n.declaration) end));
end $$;

create function public.feya_withdrawal_report_v1(p_job uuid,p_attempt uuid,p_outcome text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare j public.feya_withdrawal_delivery_v1%rowtype; a public.feya_withdrawal_dispatch_v1%rowtype;
  t timestamptz:=clock_timestamp();
begin
  if p_outcome is null or p_outcome not in ('submitted','unknown') then raise exception 'invalid_mail_result'; end if;
  select * into j from public.feya_withdrawal_delivery_v1 where job_id=p_job for update;
  if not found or j.active_attempt is distinct from p_attempt then return false; end if;
  select * into strict a from public.feya_withdrawal_dispatch_v1 where attempt_id=p_attempt and job_id=p_job;
  if a.outcome is not null then return a.outcome=p_outcome; end if;
  if j.state not in ('dispatching','review') or (j.state='review' and j.reason is distinct from 'mail_outcome_unknown') then return false; end if;
  update public.feya_withdrawal_dispatch_v1 set outcome=p_outcome,reported_at=t where attempt_id=p_attempt;
  update public.feya_withdrawal_delivery_v1 set state=case when p_outcome='submitted' then 'submitted' else 'review' end,
    reason=case when p_outcome='unknown' then 'mail_outcome_unknown' end,
    handed_to_mail_at=case when p_outcome='submitted' then t end where job_id=p_job;
  return true;
end $$;

-- Restricted staff queue. Only individual-case detail contains the original personal information.
create function public.feya_withdrawal_open_cases_v1(p_limit integer default 50)
returns table(reference uuid,submitted_at timestamptz,needs_verified_recipient boolean,mail_state text,studio_state text)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select n.reference,n.submitted_at,n.recipient_basis is null,a.state,s.state
  from public.feya_withdrawal_notices_v1 n
  join public.feya_withdrawal_delivery_v1 a on a.reference=n.reference and a.kind='customer'
  join public.feya_withdrawal_delivery_v1 s on s.reference=n.reference and s.kind='studio'
  where n.handled_at is null or a.state<>'submitted' or s.state<>'submitted'
  order by n.submitted_at,n.reference limit greatest(1,least(200,coalesce(p_limit,50)))
$$;
-- The operator can confirm a real scheduler poll and see acknowledgement delays without exposing customer details.
create function public.feya_withdrawal_health_v1()
returns jsonb language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('last_poll_at',w.last_poll_at,'last_reported_google_quota',w.remaining_quota,
    'customer_pending',(select count(*) from public.feya_withdrawal_delivery_v1 where kind='customer' and state<>'submitted'),
    'oldest_unconfirmed_utc',(select min(created_at) from public.feya_withdrawal_delivery_v1 where kind='customer' and state<>'submitted'),
    'studio_open',(select count(*) from public.feya_withdrawal_notices_v1 where handled_at is null))
  from public.feya_withdrawal_worker_v1 w where w.singleton
$$;
create function public.feya_withdrawal_case_v1(p_reference uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object('reference',reference,'submitted_at',submitted_at,'name',consumer_name,
    'contract',contract_reference,'email',confirmation_email,'declaration',declaration,
    'recipient_basis',n.recipient_basis,'verified_by',n.verified_by,'verification_ref',n.verification_ref,'verified_at',n.verified_at,
    'order_id',n.order_id,'handled_at',n.handled_at,'handled_by',n.handled_by,
    'deliveries',(select jsonb_agg(jsonb_build_object('job_id',d.job_id,'kind',d.kind,'state',d.state,'reason',d.reason,
      'attempt_id',d.active_attempt,'handed_to_mail_at',d.handed_to_mail_at,
      'recovery_by',d.recovery_by,'recovery_ref',d.recovery_ref,'recovered_at',d.recovered_at) order by d.kind)
      from public.feya_withdrawal_delivery_v1 d where d.reference=n.reference))
  from public.feya_withdrawal_notices_v1 n where n.reference=p_reference
$$;
create function public.feya_withdrawal_verify_recipient_v1(p_reference uuid,p_verified_email text,p_actor text,p_evidence text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare n public.feya_withdrawal_notices_v1%rowtype;
begin
  if p_actor is null or p_evidence is null or length(btrim(p_actor)) not between 1 and 128 or length(btrim(p_evidence)) not between 1 and 180
    then raise exception 'verification_evidence_required'; end if;
  select * into n from public.feya_withdrawal_notices_v1 where reference=p_reference for update;
  if not found or p_verified_email is null or lower(btrim(p_verified_email))<>lower(n.confirmation_email) then return false; end if;
  if n.recipient_basis is not null then return true; end if;
  update public.feya_withdrawal_notices_v1 set recipient_basis='verified_by_operator',verified_by=p_actor,verification_ref=p_evidence,verified_at=clock_timestamp()
    where reference=p_reference;
  update public.feya_withdrawal_delivery_v1 set state='ready',reason=null
    where reference=p_reference and kind='customer' and state='review' and reason='recipient_unverified';
  return true;
end $$;
create function public.feya_withdrawal_resolve_case_v1(p_reference uuid,p_actor text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
  if p_actor is null or length(btrim(p_actor)) not between 1 and 128 then raise exception 'actor_required'; end if;
  update public.feya_withdrawal_notices_v1 set handled_at=coalesce(handled_at,clock_timestamp()),handled_by=coalesce(handled_by,p_actor)
    where reference=p_reference;
  return found;
end $$;
-- Only a restricted staff operator may reconcile an uncertain attempt after positive
-- evidence. "Did not see it in Sent" or a missing read receipt is insufficient.
create function public.feya_withdrawal_reconcile_job_v1(p_job uuid,p_attempt uuid,p_disposition text,p_actor text,p_evidence text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare j public.feya_withdrawal_delivery_v1%rowtype; a public.feya_withdrawal_dispatch_v1%rowtype;
  t timestamptz:=clock_timestamp();
begin
  if p_actor is null or p_evidence is null or length(btrim(p_actor)) not between 1 and 128 or length(btrim(p_evidence)) not between 1 and 180
    then raise exception 'recovery_evidence_required'; end if;
  select * into j from public.feya_withdrawal_delivery_v1 where job_id=p_job and state='review'
    and reason='mail_outcome_unknown' and active_attempt=p_attempt for update;
  if not found then return false; end if;
  select * into strict a from public.feya_withdrawal_dispatch_v1 where attempt_id=p_attempt and job_id=p_job;
  if p_disposition='confirmed_submitted' then
    update public.feya_withdrawal_delivery_v1 set state='submitted',handed_to_mail_at=t,reason=null,
      recovery_by=p_actor,recovery_ref=p_evidence,recovered_at=t where job_id=p_job;
  elsif p_disposition='confirmed_not_sent' and a.issued_at<=t-interval '1 hour' then
    update public.feya_withdrawal_delivery_v1 set state='ready',active_attempt=null,reason=null,
      recovery_by=p_actor,recovery_ref=p_evidence,recovered_at=t where job_id=p_job;
  else return false; end if;
  return true;
end $$;

revoke all on function public.feya_withdrawal_record_v1(uuid,text,text,text,text,text),public.feya_withdrawal_take_v1(integer),
  public.feya_withdrawal_report_v1(uuid,uuid,text),public.feya_withdrawal_case_v1(uuid),public.feya_withdrawal_health_v1(),
  public.feya_withdrawal_open_cases_v1(integer),public.feya_withdrawal_verify_recipient_v1(uuid,text,text,text),
  public.feya_withdrawal_resolve_case_v1(uuid,text),public.feya_withdrawal_reconcile_job_v1(uuid,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.feya_withdrawal_record_v1(uuid,text,text,text,text,text),public.feya_withdrawal_take_v1(integer),
  public.feya_withdrawal_report_v1(uuid,uuid,text),public.feya_withdrawal_case_v1(uuid),public.feya_withdrawal_health_v1(),
  public.feya_withdrawal_open_cases_v1(integer),public.feya_withdrawal_verify_recipient_v1(uuid,text,text,text),
  public.feya_withdrawal_resolve_case_v1(uuid,text),public.feya_withdrawal_reconcile_job_v1(uuid,uuid,text,text,text)
  to service_role;
commit;
