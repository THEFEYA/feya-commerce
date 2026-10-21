import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
const sql=read('supabase/migrations/20261021174000_seller_online_paypal_ipn_inbox_v1.sql');
const route=read('app/api/commerce/paypal/ipn/route.ts');

test('production IPN never turns on checkout or credits unbound orders',()=>{
  for(const fragment of [
    'order_bound boolean not null default false check(order_bound=false)',
    'payment_enabled boolean not null default false check(payment_enabled=false)',
    'verified_by_paypal boolean not null default true check(verified_by_paypal=true)',
    "p_currency is distinct from 'EUR'",
    "v.integration_mode<>'paypal_standard'",
    'pg_catalog.lower(pg_catalog.btrim(p_receiver_email))',
    "p_custom is distinct from (p_invoice_id::text||';opencart:'||v_store_key)",
  ])assert.ok(sql.includes(fragment),fragment);
  assert.ok(!sql.includes('create or replace function public.feya_commerce_create_checkout_snapshot'));
  assert.ok(!route.includes('markPaid('));
  assert.ok(!route.includes('checkout_status ='));
  assert.ok(route.includes('bound_to_order:false,payment_enabled:false'));
});

test('only PayPal-verified callbacks can reach a private storage RPC',()=>{
  for(const fragment of [
    "process.env.FEYA_PAYPAL_IPN_INGEST_ENABLED!=='true'",
    "process.env.VERCEL_ENV!=='production'",
    "req.nextUrl.hostname!=='thefeya.com'",
    "verifyPayPalStandardIpnPostback(body,environment)",
    "if(!verified.ok)",
    "field('txn_id')",
    "field('mc_currency')",
    "field('receiver_email')",
    "field('payment_status')",
    "p_event_sha256:digest(body)",
    "p_txn_sha256:digest(environment+':'+txn)",
  ])assert.ok(route.includes(fragment),fragment);
  assert.ok(sql.includes('revoke all on public.feya_seller_online_paypal_ipn_inbox_v1 from public,anon,authenticated'));
  assert.ok(sql.includes('grant select,insert on public.feya_seller_online_paypal_ipn_inbox_v1 to service_role'));
  assert.ok(sql.includes('grant execute on function public.feya_seller_online_record_paypal_ipn_unbound_v1'));
  assert.ok(!route.includes("console.log"));
  assert.ok(!route.includes("console.error"));
  assert.ok(!sql.includes('payer_email'));
  assert.ok(!sql.includes('payer_address'));
  assert.ok(!sql.includes('credit_card'));
});
