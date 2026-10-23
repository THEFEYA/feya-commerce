import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(name:string)=>readFileSync(name,'utf8');
const ui=source('components/payments/SellerOnlineInstallClient.tsx');
const server=source('lib/payments/installation.ts');
const handoff=source('docs/payments/SELLER_ONLINE_NO_CODE_CONNECTION_RUNBOOK_20261023.md');

test('operator is not sent to inactive unapproved partner authorization',()=>{
 assert.ok(ui.includes('partnerConnect?.available && <div'));
 assert.ok(ui.includes('разработка и доступ к GitHub / Supabase не требуются'));
 assert.ok(ui.includes('PayPal Checkout (REST API)'));
 assert.ok(ui.includes('PayPal Standard'));
});

test('do not claim successful funds receipt from an unpaid PayPal payee probe',()=>{
 assert.ok(server.includes('НЕОПЛАЧЕННЫЙ заказ'));
 assert.ok(server.includes('не доказывает зачисление денег'));
 assert.ok(!server.includes('принимает платежи в EUR'));
 assert.ok(ui.includes('специалист должен убедиться'));
 assert.ok(ui.includes('зачислил платёж именно магазину TheFEYA'));
});

test('provider receives clear no-code handoff and owner checkout stays gated',()=>{
 for(const fragment of [
   'my.seller-online.com/personal_link.php','NOT_AUTHORIZED',
   '/admin/payments','/partner/seller-online#access=',
   'seller-online.com/help/integraciya-z-cms/',
   'PayPal Standard устаревает',
   'API v2 для посылок',
   'FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED',
 ])assert.ok(handoff.includes(fragment),fragment);
 const checkout=source('lib/payments/checkoutService.ts');
 assert.ok(checkout.includes('!isPaidCommerceReleaseApproved()'));
});
