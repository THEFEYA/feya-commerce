import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
const legacySql=read('supabase/migrations/20261021174000_seller_online_paypal_ipn_inbox_v1.sql');
const route=read('app/api/commerce/paypal/ipn/route.ts');
const handler=read('lib/payments/providerEvents.ts');
const sql=read('supabase/migrations/20261021200000_payments_provider_checkout_v1.sql');

test('legacy unbound IPN inbox migration stays historical and inert',()=>{
  for(const fragment of [
    'order_bound boolean not null default false check(order_bound=false)',
    'payment_enabled boolean not null default false check(payment_enabled=false)',
    'verified_by_paypal boolean not null default true check(verified_by_paypal=true)',
  ])assert.ok(legacySql.includes(fragment),fragment);
  assert.ok(!legacySql.includes('payer_email'));
  assert.ok(!legacySql.includes('credit_card'));
});

test('IPN (PayPal Standard fallback): PayPal VERIFIED first, then de-duplicated, then matched to the exact order',()=>{
  assert.ok(route.includes("startsWith('application/x-www-form-urlencoded')"));
  assert.ok(route.includes('handlePayPalIpn(raw)'));
  const verify=handler.indexOf('verifyPayPalStandardIpnPostback(rawBody');
  const claim=handler.indexOf("paymentsStore.claimEvent(key, 'paypal_ipn'");
  const record=handler.indexOf('paymentsStore.recordPayment({',claim);
  assert.ok(verify>0&&claim>verify&&record>claim,'verify → claim → record order');
  assert.ok(handler.includes("payee_email: parsed.receiver_email"));
  // Database refuses to mark paid on any amount / currency / payee / invoice / custom mismatch.
  for(const fragment of ["v_reason := 'amount_mismatch'","v_reason := 'currency_mismatch'","v_reason := 'payee_mismatch'",
    "v_reason := 'invoice_mismatch'","v_reason := 'custom_reference_mismatch'"]) assert.ok(sql.includes(fragment),fragment);
  assert.ok(!route.includes('console.log'));
});
