-- Synthetic customers, local disposable database only. Everything rolls back.
begin;
insert into public.feya_pay_orders_v1(order_number,kind,status,engine,environment,config_version,
  merchandise_minor,total_minor,item_quantity,snapshot,snapshot_sha256,buyer_email,buyer_name,country_code,
  custom_id,invoice_id,idempotency_key,request_sha256,access_token_sha256,paid_minor,paid_at,capture_id)
values ('FEYA-889991','customer','paid','paypal_checkout','live',1,100,100,1,'{}',repeat('a',64),
  'verified@example.test','Ada Buyer','NL','withdrawal-test','withdrawal-test',gen_random_uuid(),
  repeat('b',64),repeat('c',64),100,now(),'test-cap-feya-withdrawal'),
 ('FEYA-889992','customer','pending_payment','paypal_checkout','live',1,100,100,1,'{}',repeat('a',64),
  'unpaid@example.test','Unpaid Guest','IE','withdrawal-pending','withdrawal-pending',gen_random_uuid(),
  repeat('b',64),repeat('d',64),null,null,null);

do $$
declare k uuid:=gen_random_uuid(); saved jsonb; unknown_notice jsonb; lost jsonb; later jsonb;
  job jsonb; firstjob jsonb; n int; other jsonb;
begin
  assert not has_table_privilege('anon','public.feya_withdrawal_notices_v1','select');
  assert not has_table_privilege('authenticated','public.feya_withdrawal_delivery_v1','select');
  assert not has_function_privilege('anon','public.feya_withdrawal_record_v1(uuid,text,text,text,text,text)','execute');
  assert not has_function_privilege('authenticated','public.feya_withdrawal_case_v1(uuid)','execute');
  assert has_function_privilege('service_role','public.feya_withdrawal_record_v1(uuid,text,text,text,text,text)','execute');
  saved:=public.feya_withdrawal_record_v1(k,'Ada Buyer','FEYA-889991','verified@example.test',null,repeat('0',64));
  assert saved ? 'reference' and saved ? 'submitted_at' and (saved->>'submitted_at')::timestamptz is not null;
  assert saved=public.feya_withdrawal_record_v1(k,'Ada Buyer','FEYA-889991','verified@example.test',null,null);
  assert public.feya_withdrawal_record_v1(k,'Different person','FEYA-889991','verified@example.test',null,null)->>'code'='idempotency_conflict';
  select count(*) into n from public.feya_withdrawal_delivery_v1 where reference=(saved->>'reference')::uuid;
  assert n=2;
  assert public.feya_withdrawal_case_v1((saved->>'reference')::uuid)->>'recipient_basis'='checkout_identity';
  unknown_notice:=public.feya_withdrawal_record_v1(gen_random_uuid(),'Visitor','FEYA-889991','alternate@example.test',repeat('c',64),null);
  lost:=public.feya_withdrawal_record_v1(gen_random_uuid(),'Other Visitor','The costume ordered on 3 October','lost@example.test',null,null);
  assert (select array_agg(key order by key) from jsonb_object_keys(saved) key) =
         (select array_agg(key order by key) from jsonb_object_keys(lost) key);
  assert (public.feya_withdrawal_case_v1((unknown_notice->>'reference')::uuid)->>'recipient_basis') is null;
  assert not public.feya_withdrawal_verify_recipient_v1((lost->>'reference')::uuid,'another@example.test','test-staff','QA-001');
  assert exists(select 1 from public.feya_withdrawal_open_cases_v1(10) where reference=(lost->>'reference')::uuid and needs_verified_recipient);
  assert public.feya_withdrawal_verify_recipient_v1((lost->>'reference')::uuid,'lost@example.test','test-staff','QA-002');
  assert not(public.feya_withdrawal_case_v1((lost->>'reference')::uuid)->>'declaration' is null);
  later:=public.feya_withdrawal_record_v1(gen_random_uuid(),'Unpaid Guest','FEYA-889992','unpaid@example.test',repeat('d',64),null);
  assert (public.feya_withdrawal_case_v1((later->>'reference')::uuid)->>'recipient_basis') is null;

  -- No recipient info leaves the database before an atomic send grant. A lost response cannot issue the same grant twice.
  assert public.feya_withdrawal_health_v1()->>'last_poll_at' is null;
  assert public.feya_withdrawal_take_v1(0)='[]'::jsonb;
  assert public.feya_withdrawal_health_v1()->>'last_poll_at' is not null;
  assert public.feya_withdrawal_health_v1()->>'last_reported_google_quota'='0';
  firstjob:=public.feya_withdrawal_take_v1(65)->0;
  assert firstjob->>'kind'='customer' and firstjob->>'to'='verified@example.test';
  assert firstjob#>>'{statement,name}'='Ada Buyer';
  assert firstjob#>>'{statement,contract}'='FEYA-889991';
  assert firstjob#>>'{statement,declaration}'='I hereby withdraw from the contract identified below.';
  job:=public.feya_withdrawal_take_v1(65)->0;
  assert job->>'job_id'<>firstjob->>'job_id' and job->>'to'='lost@example.test';
  assert public.feya_withdrawal_take_v1(5)='[]'::jsonb;  -- reserve the last 20 places for customers
  assert not public.feya_withdrawal_report_v1((firstjob->>'job_id')::uuid,gen_random_uuid(),'submitted');
  assert public.feya_withdrawal_report_v1((job->>'job_id')::uuid,(job->>'attempt_id')::uuid,'submitted');
  assert public.feya_withdrawal_report_v1((job->>'job_id')::uuid,(job->>'attempt_id')::uuid,'submitted');
  assert not public.feya_withdrawal_report_v1((job->>'job_id')::uuid,(job->>'attempt_id')::uuid,'unknown');
  update public.feya_withdrawal_dispatch_v1 set issued_at=now()-interval '20 minutes'
    where attempt_id=(firstjob->>'attempt_id')::uuid;
  assert public.feya_withdrawal_take_v1(5)='[]'::jsonb;
  assert exists(select 1 from public.feya_withdrawal_delivery_v1 where job_id=(firstjob->>'job_id')::uuid and reason='mail_outcome_unknown');
  assert not public.feya_withdrawal_reconcile_job_v1((firstjob->>'job_id')::uuid,(firstjob->>'attempt_id')::uuid,'confirmed_not_sent','staff','QA-3');
  update public.feya_withdrawal_dispatch_v1 set issued_at=now()-interval '2 hours' where attempt_id=(firstjob->>'attempt_id')::uuid;
  assert public.feya_withdrawal_reconcile_job_v1((firstjob->>'job_id')::uuid,(firstjob->>'attempt_id')::uuid,'confirmed_not_sent','staff','QA-4');
  job:=public.feya_withdrawal_take_v1(5)->0;
  assert job->>'job_id'=firstjob->>'job_id' and job->>'attempt_id'<>firstjob->>'attempt_id';
  assert not public.feya_withdrawal_report_v1((job->>'job_id')::uuid,(firstjob->>'attempt_id')::uuid,'submitted');
  assert public.feya_withdrawal_report_v1((job->>'job_id')::uuid,(job->>'attempt_id')::uuid,'unknown');
  assert public.feya_withdrawal_reconcile_job_v1((job->>'job_id')::uuid,(job->>'attempt_id')::uuid,'confirmed_submitted','staff','QA-5');
  assert public.feya_withdrawal_resolve_case_v1((saved->>'reference')::uuid,'test-staff');
  assert exists(select 1 from public.feya_withdrawal_open_cases_v1(100) where reference=(saved->>'reference')::uuid);
  assert public.feya_withdrawal_record_v1(k,'Ada Buyer','FEYA-889991','verified@example.test',null,null)=saved;
  job:=public.feya_withdrawal_take_v1(66)->0;
  assert job->>'kind'='studio' and job->>'to'='manager.feya@gmail.com' and job->'statement'='null'::jsonb;

  for n in 1..8 loop
    other:=public.feya_withdrawal_record_v1(gen_random_uuid(),'Guest','Description','quota@example.test',null,repeat('e',64));
    assert other ? 'reference';
  end loop;
  assert public.feya_withdrawal_record_v1(gen_random_uuid(),'Guest','Description','quota@example.test',null,repeat('e',64))->>'code'='rate_limited';
  assert (select used from public.feya_withdrawal_limits_v1 where scope_key='ip:'||repeat('e',64))=8;
  -- A wave of anonymous descriptions cannot consume the buyer mail reserve.
  for n in 1..12 loop
    perform public.feya_withdrawal_record_v1(gen_random_uuid(),'Guest','Summary',format('c%s@example.test',n),null,null);
  end loop;
  for n in 1..9 loop assert (public.feya_withdrawal_take_v1(90)->0->>'kind')='studio'; end loop;
  assert public.feya_withdrawal_take_v1(90)='[]'::jsonb;
  assert (select count(*) from public.feya_withdrawal_dispatch_v1 a join public.feya_withdrawal_delivery_v1 d using(job_id) where d.kind='studio')=10;
  insert into public.feya_withdrawal_dispatch_v1(job_id) select (job->>'job_id')::uuid from generate_series(1,90);
  later:=public.feya_withdrawal_record_v1(gen_random_uuid(),'Ada Buyer','FEYA-889991','verified@example.test',null,null);
  assert later ? 'reference' and public.feya_withdrawal_take_v1(100)='[]'::jsonb;
  raise notice 'withdrawal_v1: all assertions passed';
end $$;
rollback;
