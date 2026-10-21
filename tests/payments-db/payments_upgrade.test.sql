\set QUIET on
create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;
select pg_temp.expect(public.feya_pay_provider_status_v1()->>'engine'='paypal_standard','legacy mode carried over');
select pg_temp.expect(public.feya_pay_provider_status_v1()->>'payee_email'='legacy@seller-online.example','legacy PayPal email carried over');
select pg_temp.expect((public.feya_pay_provider_status_v1()->>'store_key_set')::boolean,'legacy store key carried over');
select pg_temp.expect(public.feya_pay_provider_runtime_v1()->>'store_key'='aaaaaaaabbbbbbbbccccccccdddddddd','legacy store key readable by server');
select pg_temp.expect((public.feya_pay_grant_resolve_v1(encode(sha256(convert_to('legacy-token','UTF8')),'hex'))->>'role')='technician','previous invitation link still works');
select pg_temp.expect(not (public.feya_pay_provider_status_v1()->>'active')::boolean,'carry-over never activates payments');
select pg_temp.expect(to_regclass('public.feya_seller_online_payment_setup_v1') is not null,'legacy tables preserved (non-destructive)');
\echo 'payments_upgrade: all assertions passed'
