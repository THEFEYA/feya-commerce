// TheFEYA payments: real HTTP checks against the public production origin.
// Never creates a payable order and never touches a payment method.
//   PAYMENTS_SMOKE_EXPECTED_SHA=<sha> → first wait until production serves that commit.
import {mkdir, writeFile} from 'node:fs/promises';

const origin = 'https://thefeya.com';
const expectedSha = (process.env.PAYMENTS_SMOKE_EXPECTED_SHA || '').trim().toLowerCase();
const UA = 'TheFEYA-payments-smoke/1.0';
const results = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function http(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: 'manual', cache: 'no-store', signal: controller.signal, ...init,
      headers: {'user-agent': UA, 'cache-control': 'no-cache', ...(init.headers || {})},
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return {status: response.status, text, json};
  } finally { clearTimeout(timer); }
}
const sameOrigin = {'content-type': 'application/json', origin};

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({name, ok: true, ...(detail && typeof detail === 'object' ? detail : {detail})});
  } catch (error) {
    results.push({name, ok: false, error: String(error?.message || error)});
  }
}
function expect(cond, message) { if (!cond) throw new Error(message); }

if (/^[a-f0-9]{40}$/.test(expectedSha)) {
  let observed = null;
  for (let i = 0; i < 36; i++) {
    const r = await http('/api/production-revision', {headers: {accept: 'application/json'}}).catch(() => null);
    observed = r?.json?.sha?.toLowerCase?.() || null;
    if (observed === expectedSha) break;
    await sleep(10000);
  }
  results.push({name: 'production serves expected commit', ok: observed === expectedSha, expected: expectedSha, observed});
}

let checkoutActive = null;
let realLine = null;
let storageReady = false;
await check('checkout availability endpoint', async () => {
  const r = await http('/api/checkout/status');
  expect(r.status === 200 && r.json?.ok === true && typeof r.json.checkout_active === 'boolean', `status ${r.status}`);
  checkoutActive = r.json.checkout_active;
  storageReady = r.json.storage_ready === true;
  return {checkout_active: checkoutActive, engine: r.json.engine, storage_ready: storageReady};
});

await check('payments database installed (migration 20261021200000 applied)', async () => {
  expect(storageReady, 'payments tables/functions are not available in Supabase yet');
});

await check('installation panel is public but invitation-only', async () => {
  const page = await http('/partner/seller-online', {headers: {accept: 'text/html'}});
  expect(page.status === 200 && page.text.includes('Подключение оплаты'), `page status ${page.status}`);
  const api = await http('/api/partner/seller-online');
  expect(api.status === 401 && api.json?.code === 'invitation_required', `api ${api.status} ${api.json?.code}`);
  return {page: page.status, api: api.status};
});

await check('cross-site POSTs are refused (CSRF)', async () => {
  for (const path of ['/api/checkout', '/api/checkout/quote', '/api/partner/seller-online', '/api/partner/seller-online/activate']) {
    const r = await http(path, {method: 'POST', headers: {'content-type': 'application/json', origin: 'https://evil.example'}, body: '{}'});
    expect(r.status === 403, `${path} answered ${r.status}`);
  }
});

await check('quote refuses unknown products (server price authority)', async () => {
  const r = await http('/api/checkout/quote', {method: 'POST', headers: sameOrigin, body: JSON.stringify({
    lines: [{id: '11111111-1111-4111-8111-111111111111-x', slug: 'feya-smoke-missing-product', configuration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      size: 'M', color: 'Silver', quantity: 1}], method: 'standard'})});
  expect(r.status === 422 && r.json?.code === 'checkout_product_mismatch', `${r.status} ${r.json?.code}`);
});

await check('quote re-prices a real published product', async () => {
  const shop = await http('/shop', {headers: {accept: 'text/html'}});
  const slugs = [...new Set([...shop.text.matchAll(/href="\/shop\/([a-z0-9-]{3,240})"/g)].map(m => m[1]))].slice(0, 6);
  for (const slug of slugs) {
    const pdp = await http('/shop/' + slug, {headers: {accept: 'text/html'}});
    const flight = pdp.text.replace(/\\"/g, '"');
    const productId = /"canonical_product_id":"([0-9a-f-]{36})"/.exec(flight)?.[1];
    const config = /"configuration_id":"([0-9a-f-]{36})"[^{}]*?"display_price_amount":(\d+(?:\.\d+)?)/.exec(flight)
      || /"display_price_amount":(\d+(?:\.\d+)?)[^{}]*?"configuration_id":"([0-9a-f-]{36})"/.exec(flight);
    if (!productId || !config) continue;
    const [configurationId, price] = config[1].length === 36 ? [config[1], Number(config[2])] : [config[2], Number(config[1])];
    const colors = /"color_options":\["([^"]+)"/.exec(flight)?.[1];
    const configColor = new RegExp(`"configuration_id":"${configurationId}"[^{}]*?"configuration_color":"([^"]+)"`).exec(flight)?.[1];
    const color = configColor || colors;
    if (!color) continue;
    const r = await http('/api/checkout/quote', {method: 'POST', headers: sameOrigin, body: JSON.stringify({
      lines: [{id: `${productId}-${configurationId}-M-${color}`, slug, configuration_id: configurationId, size: 'M', color, quantity: 2, client_unit_minor: 1}],
      method: 'express', gift_card: true, gift_box: false, country: 'NZ'})});
    if (r.status !== 200) continue;
    const a = r.json.amounts;
    const unit = r.json.lines?.[0]?.unit_minor;
    expect(r.json.lines[0].price_changed === true, 'browser price must be ignored');
    expect(a.shipping_minor === 3500 && a.remote_minor === 2000 && a.extras_minor === 1000 && a.handling_minor === 0, 'fees');
    expect(a.total_minor === unit * 2 + 3500 + 2000 + 1000, 'total arithmetic');
    realLine = {id: `${productId}-${configurationId}-M-${color}`, slug, configuration_id: configurationId, size: 'M', color, quantity: 1};
    return {slug, unit_minor: unit, displayed_price: price, total_minor: a.total_minor};
  }
  return {skipped: 'no parsable product option found in public HTML'};
});

await check('webhook endpoint never accepts unsigned events', async () => {
  const r = await http('/api/payments/paypal/webhook', {method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({id: 'WH-SMOKE-0000000000', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {}})});
  expect(r.status !== 200 && r.json?.ok !== true, `unsigned webhook accepted (${r.status})`);
  return {status: r.status, code: r.json?.code};
});

await check('IPN endpoint verifies with PayPal and rejects forgeries', async () => {
  const body = new URLSearchParams({txn_id: 'FEYASMOKE00000001', payment_status: 'Completed', mc_gross: '1.00',
    mc_currency: 'EUR', receiver_email: 'smoke@example.com', invoice: 'FEYA-000000', custom: 'smoke'}).toString();
  const r = await http('/api/commerce/paypal/ipn', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body});
  expect(r.status === 400 && r.json?.code === 'provider_verification_failed', `${r.status} ${r.json?.code}`);
  return {status: r.status, code: r.json.code, meaning: 'production asked PayPal; PayPal answered INVALID'};
});

await check('buyer pages render', async () => {
  for (const path of ['/cart', '/checkout/return', '/order']) {
    const r = await http(path, {headers: {accept: 'text/html'}});
    expect(r.status === 200, `${path} ${r.status}`);
  }
});

await check('checkout cannot start while payments are not active', async () => {
  if (checkoutActive !== false) return {skipped: 'payments active — no order is created by smoke tests'};
  if (!realLine) return {skipped: 'no real product line available'};
  if (!storageReady) return {skipped: 'payments database not installed yet'};
  const r = await http('/api/checkout', {method: 'POST', headers: sameOrigin, body: JSON.stringify({
    idempotency_key: crypto.randomUUID(), lines: [realLine],
    method: 'standard', buyer: {first_name: 'Smoke', last_name: 'Test', email: 'smoke@example.com', phone: '+10000000000'},
    address: {country: 'DE', city: 'Berlin', postal_code: '10115', line1: 'Test 1'}, accepted_terms: true})});
  expect(r.status === 423 && r.json?.code === 'payments_not_active', `status ${r.status} ${r.json?.code}`);
  return {status: r.status, code: r.json?.code};
});

const failed = results.filter(r => !r.ok);
await mkdir('runtime-results', {recursive: true});
await writeFile('runtime-results/payments-production-smoke.json', JSON.stringify({contract: 'feya_payments_production_smoke_v1', origin, at: new Date().toISOString(), results}, null, 2) + '\n');
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : ' — ' + r.error}`);
for (const r of failed) console.log(`::error title=payments smoke::${r.name}: ${r.error || JSON.stringify(r)}`);
for (const r of results.filter(x => x.ok)) console.log(`::notice title=payments smoke::${r.name}: ${JSON.stringify(r)}`);
process.exit(failed.length ? 1 : 0);
