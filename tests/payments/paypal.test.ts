import test from 'node:test';
import assert from 'node:assert/strict';
import {PayPalClient, PayPalApiError, PayPalNetworkError, payerActionUrl, resetPayPalTokenCacheForTests} from '../../lib/payments/paypalRest.ts';
import {buildPayPalOrderRequest, normalizePayPalOrder, refundParentCaptureId, captureRelatedOrderId} from '../../lib/payments/paypalOrder.ts';
import {buildCustomerSnapshot, buildTestSnapshot} from '../../lib/payments/orderSnapshot.ts';
import {buildPayPalStandardForm, parseIpn} from '../../lib/payments/paypalStandard.ts';
import {parseCheckoutRequest} from '../../lib/payments/checkoutRequest.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {buildExtraLines, computeCheckoutAmounts} from '../../lib/payments/pricing.ts';
import {productA, validCheckoutBody, lineA} from './fixtures.ts';

function customerOrder(overrides: Record<string, unknown> = {}) {
  const request = parseCheckoutRequest(validCheckoutBody({
    gift_box: true,
    lines: [lineA({made_to_measure: true, quantity: 2})],
    address: {country: 'US', region: 'TX', city: 'Austin', postal_code: '73301', line1: '1 Main St', line2: 'Apt 2'},
    ...overrides,
  }));
  const lines = request.lines.map(l => priceCartLine(productA(), l));
  const extras = buildExtraLines(lines, {giftCard: request.gift_card, giftBox: request.gift_box});
  const amounts = computeCheckoutAmounts({lines, extras, method: request.method, country: request.address.country});
  const snapshot = buildCustomerSnapshot({request, lines, extras, amounts, now: new Date('2026-10-21T10:00:00Z')});
  const expected = {
    order_number: 'FEYA-100001', invoice_id: 'FEYA-100001', custom_id: 'FEYA-100001;opencart:0123456789abcdef0123456789abcdef',
    total_minor: amounts.total_minor, merchandise_minor: amounts.merchandise_minor, extras_minor: amounts.extras_minor,
    shipping_minor: amounts.shipping_minor, remote_minor: amounts.remote_minor, handling_minor: amounts.handling_minor,
    payee_email: 'payments@seller-online.example',
  };
  return {request, snapshot, expected, amounts};
}

test('PayPal order: exact breakdown, items, payee = Seller Online, buyer address', () => {
  const {expected, snapshot, amounts} = customerOrder();
  const body = buildPayPalOrderRequest({expected, snapshot, returnUrl: 'https://thefeya.com/checkout/return', cancelUrl: 'https://thefeya.com/checkout/return?cancelled=1'});
  const unit = body.purchase_units[0] as Record<string, any>;
  assert.equal(body.intent, 'CAPTURE');
  assert.equal(unit.payee.email_address, 'payments@seller-online.example');
  assert.equal(unit.invoice_id, 'FEYA-100001');
  assert.equal(unit.custom_id, 'FEYA-100001;opencart:0123456789abcdef0123456789abcdef');
  assert.equal(unit.amount.value, (amounts.total_minor / 100).toFixed(2));
  assert.equal(unit.amount.breakdown.item_total.value, '433.00'); // 2 x 189 + 2 x 15 + 25
  assert.equal(unit.amount.breakdown.shipping.value, '19.00');
  assert.equal(unit.amount.breakdown.handling, undefined);
  const itemSum = unit.items.reduce((n: number, i: any) => n + Math.round(Number(i.unit_amount.value) * 100) * Number(i.quantity), 0);
  assert.equal(itemSum, 43300);
  assert.equal(unit.shipping.address.admin_area_1, 'TX');
  assert.equal(unit.shipping.address.country_code, 'US');
  const ctx = (body.payment_source.paypal as any).experience_context;
  assert.equal(ctx.shipping_preference, 'SET_PROVIDED_ADDRESS');
  assert.equal(ctx.user_action, 'PAY_NOW');
  assert.equal(ctx.return_url, 'https://thefeya.com/checkout/return');
  assert.ok(!JSON.stringify(body).includes('card_number'));
});

test('PayPal order refuses inconsistent totals', () => {
  const {expected, snapshot} = customerOrder();
  assert.throws(() => buildPayPalOrderRequest({expected: {...expected, total_minor: expected.total_minor + 1}, snapshot, returnUrl: 'https://x', cancelUrl: 'https://x'}), /paypal_total_mismatch/);
  assert.throws(() => buildPayPalOrderRequest({expected: {...expected, extras_minor: 0}, snapshot, returnUrl: 'https://x', cancelUrl: 'https://x'}), /paypal_item_total_mismatch/);
});

test('connection test order has no shipping and digital category', () => {
  const snapshot = buildTestSnapshot();
  const body = buildPayPalOrderRequest({snapshot, returnUrl: 'https://x', cancelUrl: 'https://x', expected: {
    order_number: 'FEYA-100002', invoice_id: 'FEYA-100002', custom_id: 'FEYA-100002;opencart:k', total_minor: 100,
    merchandise_minor: 100, extras_minor: 0, shipping_minor: 0, remote_minor: 0, handling_minor: 0, payee_email: 'p@s.example'}});
  const unit = body.purchase_units[0] as any;
  assert.equal(unit.amount.value, '1.00');
  assert.equal(unit.shipping, undefined);
  assert.equal((body.payment_source.paypal as any).experience_context.shipping_preference, 'NO_SHIPPING');
});

const captureResponse = {
  id: '5O190127TN364715T', status: 'COMPLETED',
  purchase_units: [{
    reference_id: 'FEYA-100001',
    payee: {email_address: 'Payments@Seller-Online.example', merchant_id: 'MERCHANT123'},
    payments: {captures: [{
      id: '3C679366HH908993F', status: 'COMPLETED', amount: {currency_code: 'EUR', value: '452.00'},
      invoice_id: 'FEYA-100001', custom_id: 'FEYA-100001;opencart:key', final_capture: true,
    }]},
  }],
};

test('capture response is normalised from PayPal data only', () => {
  const n = normalizePayPalOrder(captureResponse);
  assert.deepEqual(n, {
    provider_order_id: '5O190127TN364715T', order_status: 'COMPLETED', capture_id: '3C679366HH908993F',
    capture_status: 'COMPLETED', amount_minor: 45200, currency: 'EUR', payee_email: 'payments@seller-online.example',
    payee_merchant_id: 'MERCHANT123', invoice_id: 'FEYA-100001', custom_id: 'FEYA-100001;opencart:key',
  });
  const approved = normalizePayPalOrder({id: '5O190127TN364715T', status: 'APPROVED', purchase_units: [{invoice_id: 'FEYA-1', custom_id: 'c', payee: {}}]});
  assert.equal(approved.capture_id, null);
  assert.equal(approved.invoice_id, 'FEYA-1');
  assert.throws(() => normalizePayPalOrder({id: '../x'}), /paypal_order_response_invalid/);
});

test('webhook helpers: refund parent capture and capture related order', () => {
  assert.equal(refundParentCaptureId({links: [{rel: 'self', href: 'https://api-m.paypal.com/v2/payments/refunds/1JU08902781691411'},
    {rel: 'up', href: 'https://api-m.paypal.com/v2/payments/captures/2GG279541U471931P'}]}), '2GG279541U471931P');
  assert.equal(refundParentCaptureId({links: []}), null);
  assert.equal(captureRelatedOrderId({supplementary_data: {related_ids: {order_id: '5O190127TN364715T'}}}), '5O190127TN364715T');
  assert.equal(captureRelatedOrderId({}), null);
});

test('payer action link must point to PayPal', () => {
  assert.equal(payerActionUrl({links: [{rel: 'payer-action', href: 'https://www.paypal.com/checkoutnow?token=5O19'}]}), 'https://www.paypal.com/checkoutnow?token=5O19');
  assert.equal(payerActionUrl({links: [{rel: 'payer-action', href: 'https://evil.example/checkoutnow'}]}), null);
});

type Call = {url: string; init: RequestInit};
function mockFetch(responses: ((call: Call) => {status: number; body?: unknown; headers?: Record<string, string>})[]) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    const call = {url: String(url), init};
    calls.push(call);
    const next = responses.shift();
    if (!next) throw new Error('unexpected request ' + url);
    const r = next(call);
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), {status: r.status, headers: r.headers});
  }) as unknown as typeof fetch;
  return {fn, calls};
}
const token = () => ({status: 200, body: {access_token: 'A21AA-token', expires_in: 32400, app_id: 'APP-80W284485P519543T', scope: 'https://uri.paypal.com/services/payments/payment'}});

test('REST client: OAuth, idempotent order creation, representation, token cache', async () => {
  resetPayPalTokenCacheForTests();
  const {fn, calls} = mockFetch([token, () => ({status: 201, body: {id: 'ORDER12345', status: 'PAYER_ACTION_REQUIRED'}}),
    () => ({status: 200, body: {id: 'ORDER12345', status: 'APPROVED', purchase_units: [{}]}})]);
  const client = new PayPalClient({clientId: 'client-id-xxxxxxxxxxxxxxxx', clientSecret: 'secret', environment: 'sandbox'}, fn);
  const created = await client.createOrder({intent: 'CAPTURE'}, 'feya-order-1');
  assert.equal(created.id, 'ORDER12345');
  assert.equal(calls[0].url, 'https://api-m.sandbox.paypal.com/v1/oauth2/token');
  assert.match(String((calls[0].init.headers as Record<string, string>).Authorization), /^Basic /);
  assert.equal(calls[1].url, 'https://api-m.sandbox.paypal.com/v2/checkout/orders');
  const h = calls[1].init.headers as Record<string, string>;
  assert.equal(h['PayPal-Request-Id'], 'feya-order-1');
  assert.equal(h.Prefer, 'return=representation');
  assert.equal(h.Authorization, 'Bearer A21AA-token');
  await client.getOrder('ORDER12345');
  assert.equal(calls.length, 3, 'token reused from cache');
});

test('REST client: PayPal errors keep name, issues and debug id', async () => {
  resetPayPalTokenCacheForTests();
  const {fn} = mockFetch([token, () => ({status: 422, headers: {'paypal-debug-id': 'f00d'}, body: {
    name: 'UNPROCESSABLE_ENTITY', message: 'The requested action could not be performed',
    details: [{issue: 'PAYEE_ACCOUNT_INVALID', description: 'Payee account is invalid.'}]}})]);
  const client = new PayPalClient({clientId: 'client-id-yyyyyyyyyyyyyyyy', clientSecret: 'secret', environment: 'live'}, fn);
  await assert.rejects(client.createOrder({}, 'r1'), (error: unknown) => {
    assert.ok(error instanceof PayPalApiError);
    assert.equal(error.info.status, 422);
    assert.ok(error.hasIssue('PAYEE_ACCOUNT_INVALID'));
    assert.equal(error.info.debugId, 'f00d');
    return true;
  });
});

test('REST client: invalid credentials and network failure are distinguished', async () => {
  resetPayPalTokenCacheForTests();
  const bad = mockFetch([() => ({status: 401, body: {error: 'invalid_client', error_description: 'Client Authentication failed'}})]);
  await assert.rejects(new PayPalClient({clientId: 'client-id-zzzzzzzzzzzzzzzz', clientSecret: 'x', environment: 'live'}, bad.fn).accessToken(),
    (e: unknown) => e instanceof PayPalApiError && e.info.name === 'invalid_client');
  const down = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
  await assert.rejects(new PayPalClient({clientId: 'client-id-wwwwwwwwwwwwwwww', clientSecret: 'x', environment: 'live'}, down).accessToken(), PayPalNetworkError);
});

test('REST client: webhook install creates or repairs subscription; signature verification', async () => {
  resetPayPalTokenCacheForTests();
  const {fn, calls} = mockFetch([token,
    () => ({status: 200, body: {webhooks: [{id: 'WH-OTHER', url: 'https://other.example/hook', event_types: []}]}}),
    () => ({status: 201, body: {id: 'WH-NEW-0001'}}),
    () => ({status: 200, body: {webhooks: [{id: 'WH-NEW-0001', url: 'https://thefeya.com/api/payments/paypal/webhook', event_types: [{name: 'PAYMENT.CAPTURE.COMPLETED'}]}]}}),
    () => ({status: 200, body: {id: 'WH-NEW-0001'}}),
    () => ({status: 200, body: {verification_status: 'SUCCESS'}}),
    () => ({status: 200, body: {verification_status: 'FAILURE'}}),
  ]);
  const client = new PayPalClient({clientId: 'client-id-vvvvvvvvvvvvvvvv', clientSecret: 'secret', environment: 'live'}, fn);
  const url = 'https://thefeya.com/api/payments/paypal/webhook';
  assert.deepEqual(await client.ensureWebhook(url), {id: 'WH-NEW-0001', created: true, updated: false});
  assert.match(String(calls[2].init.body), /CHECKOUT\.ORDER\.APPROVED/);
  assert.deepEqual(await client.ensureWebhook(url), {id: 'WH-NEW-0001', created: false, updated: true});
  assert.equal(calls[4].init.method, 'PATCH');
  const headers = {authAlgo: 'SHA256withRSA', certUrl: 'https://api.paypal.com/cert', transmissionId: 't', transmissionSig: 's', transmissionTime: '2026-10-21T10:00:00Z'};
  assert.equal(await client.verifyWebhookSignature({webhookId: 'WH-NEW-0001', headers, event: {id: 'WH-EV'}}), true);
  assert.equal(await client.verifyWebhookSignature({webhookId: 'WH-NEW-0001', headers, event: {id: 'WH-EV'}}), false);
  const verifyBody = JSON.parse(String(calls[5].init.body));
  assert.equal(verifyBody.webhook_id, 'WH-NEW-0001');
  assert.deepEqual(verifyBody.webhook_event, {id: 'WH-EV'});
});

test('PayPal Standard fallback form uses Seller Online documented fields', () => {
  const {expected, snapshot} = customerOrder();
  const form = buildPayPalStandardForm({expected, snapshot, environment: 'live', notifyUrl: 'https://thefeya.com/api/commerce/paypal/ipn',
    returnUrl: 'https://thefeya.com/checkout/return?engine=standard', cancelUrl: 'https://thefeya.com/checkout/return?cancelled=1'});
  assert.equal(form.action, 'https://www.paypal.com/cgi-bin/webscr');
  assert.equal(form.fields.business, 'payments@seller-online.example');
  assert.equal(form.fields.custom, 'FEYA-100001;opencart:0123456789abcdef0123456789abcdef');
  assert.equal(form.fields.invoice, 'FEYA-100001');
  assert.equal(form.fields.amount, (expected.total_minor / 100).toFixed(2));
  assert.equal(form.fields.state, 'TX');
});

test('IPN parsing (after PayPal VERIFIED)', () => {
  const ipn = parseIpn('txn_id=61E67681CH3238416&payment_status=Completed&mc_gross=452.00&mc_currency=EUR&receiver_email=Payments%40Seller-Online.example&invoice=FEYA-100001&custom=FEYA-100001%3Bopencart%3Akey&test_ipn=1');
  assert.equal(ipn.amount_minor, 45200);
  assert.equal(ipn.environment, 'sandbox');
  assert.equal(ipn.receiver_email, 'payments@seller-online.example');
  assert.equal(ipn.custom, 'FEYA-100001;opencart:key');
  const refund = parseIpn('txn_id=7RF12345AB6789012&parent_txn_id=61E67681CH3238416&payment_status=Refunded&mc_gross=-452.00&mc_currency=EUR');
  assert.equal(refund.amount_minor, 45200);
  assert.equal(refund.parent_txn_id, '61E67681CH3238416');
  assert.throws(() => parseIpn('txn_id=1&txn_id=2&mc_gross=1.00'), /ipn_txn_invalid/);
});
