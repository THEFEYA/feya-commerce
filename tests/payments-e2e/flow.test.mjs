// End-to-end payments flow: real SQL functions (PostgreSQL), real TheFEYA server
// modules, PayPal replaced by a contract-faithful double. Run via run.sh.
import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {createFakePayPal} from './fakePayPal.mjs';
import {PRODUCTS} from './stubs/storefront-presentation.mjs';
import {revalidated} from './stubs/next-cache.mjs';
import {productA, productB, lineA, validCheckoutBody, PRODUCT_B_ID, CONFIG_B} from '../payments/fixtures.ts';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.local';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';
const paypal = createFakePayPal();
globalThis.fetch = paypal.fetch;

const installation = await import('../../lib/payments/installation.ts');
const checkout = await import('../../lib/payments/checkoutService.ts');
const events = await import('../../lib/payments/providerEvents.ts');
const {paymentsStore} = await import('../../lib/payments/store.ts');
const {resetPayPalTokenCacheForTests} = await import('../../lib/payments/paypalRest.ts');

const tech = {role: 'technician', name: 'seller-online:test'};
const owner = {role: 'owner', name: 'owner@thefeya.test'};
const origin = 'https://thefeya.com';
const ctx = () => ({headers: new Headers({'x-real-ip': '203.0.113.' + Math.floor(Math.random() * 200)}), origin});
const lastOrderId = (url) => new URL(url).searchParams.get('token');
const bLine = (overrides = {}) => ({id: `${PRODUCT_B_ID}-${CONFIG_B}-M-Silver`, slug: 'chrome-mask', configuration_id: CONFIG_B,
  size: 'M', color: 'Silver', quantity: 1, wearer: null, made_to_measure: false, client_unit_minor: 4500, ...overrides});

before(() => {
  PRODUCTS.set('mirror-festival-set', productA());
  PRODUCTS.set('chrome-mask', productB());
});

test('1. nothing can be bought before installation', async () => {
  const state = await checkout.publicCheckoutState();
  assert.equal(state.active, false);
  await assert.rejects(checkout.startCheckout(validCheckoutBody(), ctx()), /payments_not_active/);
});

test('2. wrong credentials are reported precisely, nothing verified', async () => {
  resetPayPalTokenCacheForTests();
  await installation.saveProviderSettings({engine: 'paypal_checkout', environment: 'sandbox',
    client_id: 'SANDBOXCLIENTID000000000001', client_secret: 'WRONGSECRET00000000000000001',
    payee_email: 'payments@seller-online.example', store_key: '0123456789abcdef0123456789abcdef'}, tech);
  const {results, status} = await installation.runInstallationChecks(tech);
  const cred = results.find(r => r.check === 'credentials');
  assert.equal(cred.ok, false);
  assert.match(cred.paypal_error, /invalid_client/);
  assert.equal(status.checks.credentials, false);
});

test('3. sandbox installation: credentials, payee, webhook registered automatically; sandbox test payment', async () => {
  resetPayPalTokenCacheForTests();
  await installation.saveProviderSettings({client_secret: 'SANDBOXSECRET00000000000000001'}, tech);
  const {results, status} = await installation.runInstallationChecks(tech);
  assert.deepEqual(results.map(r => [r.check, r.ok]), [['store_key', true], ['credentials', true], ['payee', true], ['webhook', true]]);
  assert.equal(paypal.state.webhooks.length, 1);
  assert.equal(paypal.state.webhooks[0].url, 'https://thefeya.com/api/payments/paypal/webhook');
  assert.ok(status.checks.webhook);
  const started = await installation.startTestPayment(origin);
  assert.equal(started.session.kind, 'redirect');
  const providerId = lastOrderId(started.session.url);
  const order = paypal.approve(providerId);
  assert.equal(order.payee, 'payments@seller-online.example');
  assert.equal(order.unit.amount.value, '1.00');
  assert.match(order.unit.custom_id, /^FEYA-\d+;opencart:0123456789abcdef0123456789abcdef$/);
  const done = await checkout.completeProviderOrder(providerId);
  assert.equal(done.status, 'paid');
  const after = await installation.providerStatusForPanel();
  assert.equal(after.checks.test_payment, true);
  assert.equal(after.checks.test_environment, 'sandbox');
  assert.equal(after.ready_to_activate, false, 'sandbox can never go live');
  assert.equal((await paymentsStore.setActive(true, tech.name, tech.role)).code, 'live_environment_required');
});

test('4. live installation + live €1 test payment, then activation', async () => {
  resetPayPalTokenCacheForTests();
  await installation.saveProviderSettings({environment: 'live', client_id: 'LIVECLIENTID00000000000000001', client_secret: 'LIVESECRET0000000000000000001'}, tech);
  let status = await installation.providerStatusForPanel();
  assert.equal(status.checks.credentials, false, 'new configuration must be re-verified');
  await installation.runInstallationChecks(tech);
  assert.equal((await paymentsStore.setActive(true, tech.name, tech.role)).code, 'live_test_payment_required');
  const started = await installation.startTestPayment(origin);
  const providerId = lastOrderId(started.session.url);
  paypal.approve(providerId);
  assert.equal((await checkout.completeProviderOrder(providerId)).status, 'paid');
  status = await installation.providerStatusForPanel();
  assert.equal(status.ready_to_activate, true);
  const activated = await paymentsStore.setActive(true, tech.name, tech.role);
  assert.equal(activated.active, true);
  assert.equal((await checkout.publicCheckoutState()).active, true);
});

let paidProviderOrder = null;
let paidOrderNumber = null;
test('5. buyer: server price authority, exact PayPal order, capture → paid, receipt', async () => {
  // Browser claims a €1 price: ignored.
  const body = validCheckoutBody({
    lines: [lineA({client_unit_minor: 100, made_to_measure: true}), bLine()],
    method: 'express', gift_box: true,
    address: {country: 'AU', region: 'NSW', city: 'Sydney', postal_code: '2000', line1: '1 George St', line2: ''},
  });
  const quote = await checkout.quoteCheckout({lines: body.lines, method: 'express', gift_card: false, gift_box: true, country: 'AU'});
  // 189 + 45 + 15 (made to measure) + 25 (box) + 35 express + 20 remote + 5 packaging
  assert.equal(quote.amounts.total_minor, 18900 + 4500 + 1500 + 2500 + 3500 + 2000 + 500);
  assert.equal(quote.lines[0].price_changed, true);
  const started = await checkout.startCheckout(body, ctx());
  assert.equal(started.total_minor, quote.amounts.total_minor);
  assert.ok(started.access_token);
  const providerId = lastOrderId(started.session.url);
  const order = paypal.order(providerId);
  assert.equal(order.payee, 'payments@seller-online.example');
  assert.equal(order.unit.invoice_id, started.order_number);
  assert.equal(order.unit.amount.value, (quote.amounts.total_minor / 100).toFixed(2));
  assert.equal(order.unit.amount.breakdown.shipping.value, '55.00');
  assert.equal(order.unit.amount.breakdown.handling.value, '5.00');
  assert.equal(order.unit.shipping.address.admin_area_1, 'NSW');
  assert.equal(order.payload.payment_source.paypal.experience_context.return_url, 'https://thefeya.com/checkout/return');

  // Double click: same idempotency key → same order and same PayPal session.
  const again = await checkout.startCheckout(body, ctx());
  assert.equal(again.order_number, started.order_number);
  assert.equal(again.replayed, true);
  assert.equal(lastOrderId(again.session.url), providerId);

  // Returning before approval does not mark anything paid.
  assert.equal((await checkout.completeProviderOrder(providerId)).status, 'not_approved');
  paypal.approve(providerId);
  const done = await checkout.completeProviderOrder(providerId);
  assert.equal(done.status, 'paid');
  assert.equal((await checkout.completeProviderOrder(providerId)).outcome, 'already_paid');
  const captures = paypal.state.requests.filter(r => r.path === `/v2/checkout/orders/${providerId}/capture`).length;
  assert.equal(captures, 2, 'second visit does not capture again');
  const receipt = await checkout.buyerReceipt(started.access_token);
  assert.equal(receipt.status, 'paid');
  assert.equal(receipt.total_minor, quote.amounts.total_minor);
  assert.equal(await checkout.buyerReceipt('x'.repeat(32)), null);
  paidProviderOrder = providerId;
  paidOrderNumber = started.order_number;
});

test('6. webhooks: forged signature refused, valid event processed once, refund recorded', async () => {
  const o = paypal.order(paidProviderOrder);
  const resource = {...o.capture, supplementary_data: {related_ids: {order_id: paidProviderOrder}}};
  const event = paypal.webhookEvent('PAYMENT.CAPTURE.COMPLETED', resource, 'WH-EVENT-COMPLETED-1');
  const forged = await events.handlePayPalWebhook(JSON.stringify(event), paypal.signatureHeaders(false));
  assert.equal(forged.status, 400);
  const first = await events.handlePayPalWebhook(JSON.stringify(event), paypal.signatureHeaders(true));
  assert.equal(first.status, 200);
  assert.equal(first.body.outcome, 'already_paid');
  const dup = await events.handlePayPalWebhook(JSON.stringify(event), paypal.signatureHeaders(true));
  assert.equal(dup.body.duplicate, true);
  const refund = paypal.webhookEvent('PAYMENT.CAPTURE.REFUNDED', {
    id: 'REFUND00000000001', status: 'COMPLETED', amount: {currency_code: 'EUR', value: '10.00'},
    links: [{rel: 'up', href: `https://api-m.paypal.com/v2/payments/captures/${o.capture.id}`}],
  });
  assert.equal((await events.handlePayPalWebhook(JSON.stringify(refund), paypal.signatureHeaders(true))).body.outcome, 'refund_recorded');
  const orders = await paymentsStore.ordersForOwner(50, false);
  const row = orders.find(x => x.order_number === paidOrderNumber);
  assert.equal(row.status, 'partially_refunded');
  assert.equal(row.refunded_minor, 1000);
  assert.equal(row.snapshot.address.city, 'Sydney');
});

test('7. buyer closes the browser after paying: the APPROVED webhook captures the order', async () => {
  const started = await checkout.startCheckout(validCheckoutBody({idempotency_key: '2b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx());
  const providerId = lastOrderId(started.session.url);
  paypal.approve(providerId);
  const event = paypal.webhookEvent('CHECKOUT.ORDER.APPROVED', {id: providerId, status: 'APPROVED'});
  const result = await events.handlePayPalWebhook(JSON.stringify(event), paypal.signatureHeaders(true));
  assert.equal(result.body.outcome, 'paid');
  assert.equal((await checkout.buyerReceipt(started.access_token)).status, 'paid');
});

test('8. PayPal-reported amount differing from the order → needs review, never paid', async () => {
  const started = await checkout.startCheckout(validCheckoutBody({idempotency_key: '3b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx());
  const providerId = lastOrderId(started.session.url);
  paypal.approve(providerId);
  paypal.state.nextCaptureOverride = {amount: '1.00'};
  const result = await checkout.completeProviderOrder(providerId);
  assert.equal(result.status, 'needs_review');
  assert.equal((await checkout.buyerReceipt(started.access_token)).status, 'needs_review');
});

test('9. cancel on PayPal and declined card', async () => {
  const cancelled = await checkout.startCheckout(validCheckoutBody({idempotency_key: '4b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx());
  assert.equal((await checkout.cancelProviderOrder(lastOrderId(cancelled.session.url))).status, 'cancelled');
  const declined = await checkout.startCheckout(validCheckoutBody({idempotency_key: '5b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx());
  const id = lastOrderId(declined.session.url);
  paypal.approve(id);
  paypal.state.declineNext = true;
  const result = await checkout.completeProviderOrder(id);
  assert.equal(result.status, 'instrument_declined');
  assert.match(result.retry_url, /^https:\/\/www\.paypal\.com\/checkoutnow\?token=/);
});

test('10. tampered requests and unavailable items are refused', async () => {
  await assert.rejects(checkout.startCheckout({...validCheckoutBody(), total_minor: 1}, ctx()), /checkout_request_invalid/);
  await assert.rejects(checkout.startCheckout(validCheckoutBody({lines: [lineA({slug: 'missing-product'})], idempotency_key: '6b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx()), /checkout_product_mismatch/);
  await assert.rejects(checkout.startCheckout(validCheckoutBody({accepted_terms: false}), ctx()), /checkout_terms_required/);
  const bad = await checkout.startCheckout(validCheckoutBody({idempotency_key: '7b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
    address: {country: 'DE', city: 'Berlin', postal_code: '!!', line1: 'x'}}), ctx()).catch(e => e);
  assert.equal(bad.message, 'provider_rejected_address');
});

test('11. any configuration change pauses checkout immediately', async () => {
  const before = revalidated.length;
  await installation.saveProviderSettings({payee_email: 'other@seller-online.example'}, owner);
  assert.equal((await checkout.publicCheckoutState()).active, false);
  await assert.rejects(checkout.startCheckout(validCheckoutBody({idempotency_key: '8b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx()), /payments_not_active/);
  assert.equal(revalidated.length, before, 'service layer itself does not revalidate; routes do');
});

test('12. PayPal Standard fallback: IPN-verified test payment, activation, buyer payment, receiver check', async () => {
  await installation.saveProviderSettings({engine: 'paypal_standard', payee_email: 'payments@seller-online.example'}, tech);
  const {results} = await installation.runInstallationChecks(tech);
  assert.ok(results.find(r => r.check === 'ipn_channel').ok);
  const test = await installation.startTestPayment(origin);
  assert.equal(test.session.kind, 'form');
  const f = test.session.form.fields;
  assert.equal(f.business, 'payments@seller-online.example');
  const ipn = (fields) => new URLSearchParams(fields).toString();
  const ok = await events.handlePayPalIpn(ipn({txn_id: '1AB23456CD7890123', payment_status: 'Completed', mc_gross: f.amount,
    mc_currency: 'EUR', receiver_email: f.business, invoice: f.invoice, custom: f.custom}));
  assert.equal(ok.body.outcome, 'paid');
  assert.equal((await events.handlePayPalIpn(ipn({txn_id: '1AB23456CD7890123', payment_status: 'Completed', mc_gross: f.amount,
    mc_currency: 'EUR', receiver_email: f.business, invoice: f.invoice, custom: f.custom}))).body.duplicate, true);
  assert.equal((await paymentsStore.setActive(true, tech.name, tech.role)).active, true);

  const started = await checkout.startCheckout(validCheckoutBody({idempotency_key: '9b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}), ctx());
  assert.equal(started.session.kind, 'form');
  const b = started.session.form.fields;
  // A notification claiming payment to another PayPal account is rejected.
  const wrong = await events.handlePayPalIpn(ipn({txn_id: '2AB23456CD7890123', payment_status: 'Completed', mc_gross: b.amount,
    mc_currency: 'EUR', receiver_email: 'attacker@example.com', invoice: b.invoice, custom: b.custom}));
  assert.equal(wrong.body.outcome, 'mismatch');
  paypal.state.ipnVerified = false;
  assert.equal((await events.handlePayPalIpn(ipn({txn_id: '3AB23456CD7890123', payment_status: 'Completed', mc_gross: b.amount,
    mc_currency: 'EUR', receiver_email: b.business, invoice: b.invoice, custom: b.custom}))).status, 400, 'unverified IPN ignored');
  paypal.state.ipnVerified = true;
  const paid = await events.handlePayPalIpn(ipn({txn_id: '4AB23456CD7890123', payment_status: 'Completed', mc_gross: b.amount,
    mc_currency: 'EUR', receiver_email: b.business, invoice: b.invoice, custom: b.custom}));
  assert.equal(paid.body.outcome, 'paid');
  assert.equal((await checkout.buyerReceipt(started.access_token)).status, 'paid');
});

test('13. owner console data hides nothing it should show and leaks no secrets', async () => {
  const status = await installation.providerStatusForPanel();
  const text = JSON.stringify(status);
  assert.ok(!text.includes('LIVESECRET'));
  assert.ok(!text.includes('0123456789abcdef0123456789abcdef'));
  const orders = await paymentsStore.ordersForOwner(100, true);
  assert.ok(orders.length >= 7);
  const audit = await paymentsStore.auditRecent(50);
  assert.ok(audit.some(a => a.action === 'payments_activated'));
  assert.ok(!JSON.stringify(audit).includes('LIVESECRET'));
});
