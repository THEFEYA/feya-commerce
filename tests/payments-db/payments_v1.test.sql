-- Behavioural tests for 20261021200000_payments_provider_checkout_v1.sql
-- Run (after supabase_stub.sql and the migration) with: psql -v ON_ERROR_STOP=1 -f this_file
\set QUIET on
create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- 1. Privilege boundary -------------------------------------------------------
select pg_temp.expect(not has_table_privilege('anon','public.feya_pay_orders_v1','SELECT'),'anon cannot read orders');
select pg_temp.expect(not has_table_privilege('authenticated','public.feya_pay_provider_v1','SELECT'),'authenticated cannot read provider');
select pg_temp.expect(not has_table_privilege('service_role','public.feya_pay_orders_v1','SELECT,INSERT,UPDATE,DELETE'),'service_role has no direct table access');
select pg_temp.expect(has_function_privilege('service_role','public.feya_pay_order_create_v1(jsonb)','EXECUTE'),'service_role may create orders via function');
select pg_temp.expect(not has_function_privilege('anon','public.feya_pay_order_create_v1(jsonb)','EXECUTE'),'anon may not create orders');
select pg_temp.expect(not has_function_privilege('authenticated','public.feya_pay_provider_runtime_v1()','EXECUTE'),'authenticated may not read secrets');
select pg_temp.expect(not has_function_privilege('service_role','public.feya_pay_vault_get_v1(uuid)','EXECUTE'),'vault helper not exposed');
select pg_temp.expect((select count(*)=0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'feya\_pay\_%' and (not p.prosecdef and p.proname not in ('feya_pay_hint_v1'))),
  'every payments function is SECURITY DEFINER');
select pg_temp.expect((select bool_and(coalesce(p.proconfig @> array['search_path=""'],false)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'feya\_pay\_%'),'every payments function pins search_path');

-- 2. Initial state and activation guard ---------------------------------------
select pg_temp.expect((public.feya_pay_provider_status_v1()->>'active')::boolean=false,'payments start inactive');
select pg_temp.expect(public.feya_pay_provider_set_active_v1(true,'tester','owner')->>'code'='live_test_payment_required','cannot activate without live test');
do $$ begin
  begin
    update public.feya_pay_provider_v1 set active=true where id=1;
    raise exception 'FAILED: direct activation was accepted';
  exception when check_violation then raise notice 'ok - CHECK constraint blocks direct activation';
  end;
end $$;

-- 3. Installation: save REST credentials, payee, store key ---------------------
set role service_role;
select pg_temp.expect((public.feya_pay_provider_save_v1(jsonb_build_object(
  'engine','paypal_checkout','environment','sandbox',
  'client_id','AbCdEfGhIjKlMnOpQrStUvWxYz0123456789','client_secret','EeFfGgHhIiJjKkLlMmNnOoPpQq0123456789',
  'payee_email','Payments@Seller-Online.example','store_key','0123456789abcdef0123456789abcdef'),
  'tech@example','technician')->>'changed')::boolean,'technician saves configuration');
reset role;
select pg_temp.expect((public.feya_pay_provider_status_v1()->>'payee_email')='payments@seller-online.example','payee email normalised');
select pg_temp.expect(public.feya_pay_provider_status_v1()::text not like '%EeFfGgHh%','status never contains client secret');
select pg_temp.expect(public.feya_pay_provider_status_v1()::text not like '%0123456789abcdef0123%','status never contains store key');
select pg_temp.expect((public.feya_pay_provider_runtime_v1()->>'client_secret')='EeFfGgHhIiJjKkLlMmNnOoPpQq0123456789','runtime returns decrypted secret to server');
select pg_temp.expect((public.feya_pay_provider_status_v1()->>'config_version')::int=2,'config version bumped');
do $$ begin
  begin perform public.feya_pay_provider_save_v1('{"payee_email":"not-an-email"}','x','technician');
    raise exception 'FAILED: invalid email accepted';
  exception when others then if sqlerrm<>'feya_pay_payee_email_invalid' then raise; end if; raise notice 'ok - invalid payee rejected';
  end;
  begin perform public.feya_pay_provider_save_v1('{"evil":"x"}','x','technician');
    raise exception 'FAILED: unknown key accepted';
  exception when others then if sqlerrm<>'feya_pay_payload_invalid' then raise; end if; raise notice 'ok - unknown key rejected';
  end;
end $$;

-- 4. Customer orders refused while inactive; test order allowed ----------------
create or replace function pg_temp.order_payload(p_kind text,p_key uuid,p_total bigint default 21400,p_req text default null,p_ip text default null)
returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotency_key',p_key,'request_sha256',coalesce(p_req,repeat('a',64)),'kind',p_kind,
    'engine',(public.feya_pay_provider_status_v1()->>'engine'),
    'environment',(public.feya_pay_provider_status_v1()->>'environment'),
    'config_version',(public.feya_pay_provider_status_v1()->>'config_version')::bigint,
    'amounts',jsonb_build_object('merchandise_minor',p_total-2400,'extras_minor',0,'shipping_minor',1900,
      'remote_minor',0,'handling_minor',500,'total_minor',p_total),
    'snapshot',jsonb_build_object('lines',jsonb_build_array(
      jsonb_build_object('title','A','unit_minor',(p_total-2400)/2,'quantity',2,'line_minor',p_total-2400)),
      'extras','[]'::jsonb,'delivery',jsonb_build_object('method','standard')),
    'snapshot_sha256',repeat('b',64),'buyer_email','Buyer@Example.com','buyer_name','Ann Buyer',
    'country_code','DE','client_ip_sha256',p_ip,
    'access_token_sha256',encode(sha256(convert_to(p_key::text,'UTF8')),'hex'))
$$;
select pg_temp.expect(public.feya_pay_order_create_v1(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000001'))->>'code'='payments_not_active','customer order refused while inactive');

create temporary table t_ids(k text primary key, v text);
insert into t_ids select 'test_order', public.feya_pay_order_create_v1(jsonb_build_object(
    'idempotency_key','00000000-0000-4000-8000-0000000000a1','request_sha256',repeat('c',64),'kind','test',
    'engine','paypal_checkout','environment','sandbox','config_version',2,
    'amounts',jsonb_build_object('merchandise_minor',100,'extras_minor',0,'shipping_minor',0,'remote_minor',0,'handling_minor',0,'total_minor',100),
    'snapshot',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('title','Connection test','unit_minor',100,'quantity',1,'line_minor',100)),'extras','[]'::jsonb),
    'snapshot_sha256',repeat('d',64),'access_token_sha256',repeat('e',64)))::text;
select pg_temp.expect((select (v::jsonb->>'ok')::boolean from t_ids where k='test_order'),'test order created');
select pg_temp.expect((select (v::jsonb->>'custom_id') like 'FEYA-%;opencart:0123456789abcdef0123456789abcdef' from t_ids where k='test_order'),'custom reference uses Seller Online store key format');
select pg_temp.expect((select (v::jsonb->>'invoice_id')=(v::jsonb->>'order_number') from t_ids where k='test_order'),'invoice id is the order number');
select pg_temp.expect(public.feya_pay_order_create_v1(jsonb_build_object(
    'idempotency_key','00000000-0000-4000-8000-0000000000a1','request_sha256',repeat('f',64),'kind','test',
    'engine','paypal_checkout','environment','sandbox','config_version',2,'amounts','{}'::jsonb,'snapshot','{}'::jsonb,
    'snapshot_sha256',repeat('d',64),'access_token_sha256',repeat('e',64)))->>'code'='idempotency_conflict','idempotency key reuse with other body is a conflict');

-- 5. Verification checks are bound to the configuration version ---------------
select pg_temp.expect(public.feya_pay_provider_record_check_v1(1,'credentials',true,'{}','t','technician')->>'code'='configuration_changed','stale check ignored');
select public.feya_pay_provider_record_check_v1(2,'credentials',true,'{}','t','technician');
select public.feya_pay_provider_record_check_v1(2,'payee',true,'{"payee_merchant_id":"MERCHANT123"}','t','technician');
select public.feya_pay_provider_record_check_v1(2,'webhook',true,'{"webhook_id":"WH-1AB23456CD789012E-3FG45678HI901234J"}','t','technician');
select pg_temp.expect((public.feya_pay_provider_status_v1()#>>'{checks,webhook}')::boolean,'webhook check recorded');

select public.feya_pay_order_attach_provider_v1((select (v::jsonb->>'order_id')::uuid from t_ids where k='test_order'),'5O190127TN364715T');
-- Sandbox test payment: verified but cannot activate (live required).
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','5O190127TN364715T','transaction_id','3C679366HH908993F','status','COMPLETED',
  'amount_minor',100,'currency','EUR','payee_email','payments@seller-online.example','payee_merchant_id','MERCHANT123',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='test_order'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='test_order'),
  'source','capture_api','environment','sandbox'))->>'outcome'='paid','sandbox test capture marks test order paid');
select pg_temp.expect((public.feya_pay_provider_status_v1()#>>'{checks,test_payment}')::boolean,'test payment recorded for current version');
select pg_temp.expect(public.feya_pay_provider_set_active_v1(true,'t','technician')->>'code'='live_environment_required','sandbox cannot be activated');

-- 6. Switch to live: everything must be re-verified ------------------------------
select public.feya_pay_provider_save_v1('{"environment":"live"}','tech@example','technician');
select pg_temp.expect(not (public.feya_pay_provider_status_v1()#>>'{checks,credentials}')::boolean,'environment change invalidates checks');
select public.feya_pay_provider_record_check_v1(3,'credentials',true,'{}','t','technician');
select public.feya_pay_provider_record_check_v1(3,'payee',true,'{"payee_merchant_id":"MERCHANT123"}','t','technician');
select public.feya_pay_provider_record_check_v1(3,'webhook',true,'{"webhook_id":"WH-LIVE0000000000000000"}','t','technician');
select pg_temp.expect(public.feya_pay_provider_set_active_v1(true,'t','technician')->>'code'='live_test_payment_required','live activation needs live test');
insert into t_ids select 'live_test', public.feya_pay_order_create_v1(jsonb_build_object(
    'idempotency_key','00000000-0000-4000-8000-0000000000a2','request_sha256',repeat('c',64),'kind','test',
    'engine','paypal_checkout','environment','live','config_version',3,
    'amounts',jsonb_build_object('merchandise_minor',100,'extras_minor',0,'shipping_minor',0,'remote_minor',0,'handling_minor',0,'total_minor',100),
    'snapshot',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('title','Connection test','unit_minor',100,'quantity',1,'line_minor',100)),'extras','[]'::jsonb),
    'snapshot_sha256',repeat('d',64),'access_token_sha256',repeat('9',64)))::text;
select public.feya_pay_order_attach_provider_v1((select (v::jsonb->>'order_id')::uuid from t_ids where k='live_test'),'LIVEORDER0001');
-- A capture paid to a different PayPal account must never count.
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','LIVEORDER0001','transaction_id','LIVECAPTURE0BAD','status','COMPLETED','amount_minor',100,'currency','EUR',
  'payee_email','attacker@example.com','payee_merchant_id','OTHER999',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='live_test'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='live_test'),
  'source','capture_api','environment','live'))->>'reason'='payee_mismatch','payment to another account is rejected');
select pg_temp.expect(public.feya_pay_provider_set_active_v1(true,'t','technician')->>'code'='live_test_payment_required','mismatched test cannot activate');
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','LIVEORDER0001','transaction_id','LIVECAPTURE0001','status','COMPLETED','amount_minor',100,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='live_test'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='live_test'),
  'source','capture_api','environment','live'))->>'outcome'='paid','correct live test capture accepted');
select pg_temp.expect((public.feya_pay_provider_set_active_v1(true,'owner@example','owner')->>'active')::boolean,'activation succeeds after verified live test');

-- 7. Customer orders --------------------------------------------------------------
insert into t_ids select 'order1', public.feya_pay_order_create_v1(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000101',21400,repeat('1',64),repeat('7',64)))::text;
select pg_temp.expect((select (v::jsonb->>'ok')::boolean and not (v::jsonb->>'replayed')::boolean from t_ids where k='order1'),'customer order created');
select pg_temp.expect((public.feya_pay_order_create_v1(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000101',21400,repeat('1',64),repeat('7',64)))->>'replayed')::boolean,'double submit replays same order');
do $$ begin
  begin
    perform public.feya_pay_order_create_v1(jsonb_set(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000102'),'{amounts,merchandise_minor}','1'));
    raise exception 'FAILED: wrong merchandise total accepted';
  exception when others then if sqlerrm<>'feya_pay_order_totals_mismatch' then raise; end if; raise notice 'ok - server re-checks merchandise arithmetic';
  end;
  begin
    perform public.feya_pay_order_create_v1(jsonb_set(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000103'),'{amounts,total_minor}','1'));
    raise exception 'FAILED: wrong grand total accepted';
  exception when check_violation then raise notice 'ok - grand total must equal its parts';
  end;
end $$;
select public.feya_pay_order_attach_provider_v1((select (v::jsonb->>'order_id')::uuid from t_ids where k='order1'),'ORDERCUST0001');
select pg_temp.expect(public.feya_pay_order_attach_provider_v1((select (v::jsonb->>'order_id')::uuid from t_ids where k='order1'),'ORDERCUST9999')->>'code'='provider_order_conflict','provider order cannot be swapped');
-- Wrong amount -> needs_review, not paid.
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','ORDERCUST0001','transaction_id','CAPTUREWRONG01','status','COMPLETED','amount_minor',100,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='order1'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='order1'),
  'source','webhook','environment','live'))->>'reason'='amount_mismatch','under-payment detected');
-- Pending then completed.
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','ORDERCUST0001','transaction_id','CAPTUREGOOD01','status','PENDING','amount_minor',21400,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='order1'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='order1'),
  'source','capture_api','environment','live'))->>'status'='payment_pending','pending capture recorded');
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','ORDERCUST0001','transaction_id','CAPTUREGOOD01','status','COMPLETED','amount_minor',21400,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='order1'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='order1'),
  'source','webhook','environment','live'))->>'outcome'='paid','completed capture marks order paid');
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','ORDERCUST0001','transaction_id','CAPTUREGOOD01','status','COMPLETED','amount_minor',21400,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='order1'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='order1'),
  'source','capture_api','environment','live'))->>'outcome'='already_paid','repeated notification is idempotent');
select pg_temp.expect(public.feya_pay_record_payment_v1(jsonb_build_object(
  'provider_order_id','ORDERCUST0001','transaction_id','CAPTUREOTHER02','status','COMPLETED','amount_minor',21400,'currency','EUR',
  'payee_email','payments@seller-online.example',
  'invoice_id',(select v::jsonb->>'invoice_id' from t_ids where k='order1'),
  'custom_id',(select v::jsonb->>'custom_id' from t_ids where k='order1'),
  'source','webhook','environment','live'))->>'outcome'='duplicate_payment','second different payment is flagged');
select pg_temp.expect(public.feya_pay_order_cancel_v1('ORDERCUST0001',null)->>'status'='paid','a paid order cannot be cancelled by the return page');

-- 8. Refunds -----------------------------------------------------------------------
select public.feya_pay_record_refund_v1('{"kind":"refund","transaction_id":"REFUND000001","capture_id":"CAPTUREGOOD01","environment":"live","amount_minor":1000,"status":"COMPLETED"}');
select pg_temp.expect(public.feya_pay_order_for_buyer_v1(encode(sha256(convert_to('00000000-0000-4000-8000-000000000101','UTF8')),'hex'))->>'status'='partially_refunded','partial refund');
select public.feya_pay_record_refund_v1('{"kind":"refund","transaction_id":"REFUND000002","capture_id":"CAPTUREGOOD01","environment":"live","amount_minor":20400,"status":"COMPLETED"}');
select pg_temp.expect(public.feya_pay_order_for_buyer_v1(encode(sha256(convert_to('00000000-0000-4000-8000-000000000101','UTF8')),'hex'))->>'status'='refunded','full refund');
select pg_temp.expect(public.feya_pay_order_for_buyer_v1(repeat('0',64))->>'code'='not_found','unknown buyer token reveals nothing');

-- 9. Events -------------------------------------------------------------------------
select pg_temp.expect((public.feya_pay_event_claim_v1('paypal_webhook:WH-EVENT-0001','paypal_webhook','PAYMENT.CAPTURE.COMPLETED',true)->>'first')::boolean,'first delivery claimed');
select public.feya_pay_event_finish_v1('paypal_webhook:WH-EVENT-0001',null,'paid');
select pg_temp.expect(not (public.feya_pay_event_claim_v1('paypal_webhook:WH-EVENT-0001','paypal_webhook','PAYMENT.CAPTURE.COMPLETED',true)->>'first')::boolean,'duplicate delivery ignored');

-- 10. Rate limit per client --------------------------------------------------------
do $$ declare i integer; r jsonb; begin
  for i in 2..8 loop
    r := public.feya_pay_order_create_v1(pg_temp.order_payload('customer',('00000000-0000-4000-8000-0000000002'||lpad(i::text,2,'0'))::uuid,21400,repeat('2',64),repeat('7',64)));
  end loop;
  r := public.feya_pay_order_create_v1(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000299',21400,repeat('2',64),repeat('7',64)));
  if r->>'code'<>'rate_limited' then raise exception 'FAILED: rate limit (%).',r; end if;
  raise notice 'ok - rate limit per client';
end $$;

-- 11. Any configuration change pauses live payments ---------------------------------
select public.feya_pay_provider_save_v1('{"store_key":"ffffffffffffffffffffffffffffffff"}','tech@example','technician');
select pg_temp.expect(not (public.feya_pay_provider_status_v1()->>'active')::boolean,'configuration change pauses payments');
select pg_temp.expect(public.feya_pay_order_create_v1(pg_temp.order_payload('customer','00000000-0000-4000-8000-000000000301'))->>'code'='payments_not_active','no new customer orders after pause');

-- 12. Grants ----------------------------------------------------------------------
insert into t_ids select 'grant', public.feya_pay_grant_mint_v1('technician','Seller Online',168,'owner@example')::text;
select pg_temp.expect((select length(v::jsonb->>'token')=64 from t_ids where k='grant'),'grant token is 64 hex chars');
select pg_temp.expect((public.feya_pay_grant_resolve_v1(encode(sha256(convert_to((select v::jsonb->>'token' from t_ids where k='grant'),'UTF8')),'hex'))->>'role')='technician','grant resolves by hash');
select public.feya_pay_grant_revoke_v1((public.feya_pay_grant_resolve_v1(encode(sha256(convert_to((select v::jsonb->>'token' from t_ids where k='grant'),'UTF8')),'hex'))->>'grant_id')::uuid,'owner');
select pg_temp.expect(not (public.feya_pay_grant_resolve_v1(encode(sha256(convert_to((select v::jsonb->>'token' from t_ids where k='grant'),'UTF8')),'hex'))->>'ok')::boolean,'revoked grant no longer works');
select pg_temp.expect((select count(*)=0 from public.feya_pay_access_grants_v1 where token_sha256 !~ '^[0-9a-f]{64}$'),'only hashes are stored');

\echo 'payments_v1: all assertions passed'
