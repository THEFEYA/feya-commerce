// In-memory PayPal REST + IPN double that follows the documented Orders v2 contract
// closely enough to exercise TheFEYA's integration logic end to end.
let seq = 0;
const id = (prefix) => `${prefix}${String(++seq).padStart(10, '0')}`.toUpperCase().slice(0, 17);

export function createFakePayPal({accounts = ['payments@seller-online.example'], merchantIds = {}} = {}) {
  const state = {
    orders: new Map(), webhooks: [], requests: [], captureRequestIds: new Map(),
    nextCaptureOverride: null, declineNext: false, ipnVerified: true,
  };
  const money = (v) => Math.round(Number(v) * 100);
  const reply = (status, body, headers = {}) => new Response(body === undefined ? '' : JSON.stringify(body), {status, headers: {'content-type': 'application/json', ...headers}});
  const unprocessable = (issue) => reply(422, {name: 'UNPROCESSABLE_ENTITY', message: 'The requested action could not be performed.', details: [{issue}], debug_id: 'dbg' + seq});

  function orderView(o) {
    const unit = {
      reference_id: o.unit.reference_id, invoice_id: o.unit.invoice_id, custom_id: o.unit.custom_id,
      amount: o.unit.amount, payee: {email_address: o.payee, merchant_id: merchantIds[o.payee] || 'MERCHANTSO1'},
      ...(o.capture ? {payments: {captures: [o.capture]}} : {}),
    };
    return {
      id: o.id, status: o.status, purchase_units: [unit],
      links: [{rel: 'self', href: `https://api-m.paypal.com/v2/checkout/orders/${o.id}`, method: 'GET'},
        ...(o.status === 'PAYER_ACTION_REQUIRED' || o.status === 'APPROVED' ? [{rel: 'payer-action', href: `https://www.paypal.com/checkoutnow?token=${o.id}`, method: 'GET'}] : [])],
    };
  }

  async function fetchImpl(input, init = {}) {
    const url = new URL(String(input));
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? String(init.body) : '';
    state.requests.push({method, path: url.pathname, body, headers: init.headers || {}});

    if (url.hostname.endsWith('paypal.com') && url.pathname === '/cgi-bin/webscr') {
      return new Response(state.ipnVerified && body.startsWith('cmd=_notify-validate&') && !body.includes('FEYAPROBE') ? 'VERIFIED' : 'INVALID', {status: 200});
    }
    if (url.pathname === '/v1/oauth2/token') {
      const auth = String(init.headers?.Authorization || '');
      if (!auth.startsWith('Basic ') || Buffer.from(auth.slice(6), 'base64').toString().includes(':WRONG'))
        return reply(401, {error: 'invalid_client', error_description: 'Client Authentication failed'});
      return reply(200, {access_token: 'A21AA' + seq, expires_in: 32400, app_id: 'APP-80W284485P519543T', scope: 'openid'});
    }
    if (!String(init.headers?.Authorization || '').startsWith('Bearer ')) return reply(401, {name: 'AUTHENTICATION_FAILURE'});

    if (url.pathname === '/v2/checkout/orders' && method === 'POST') {
      const payload = JSON.parse(body);
      const unit = payload.purchase_units[0];
      const payee = String(unit.payee?.email_address || accounts[0]).toLowerCase();
      if (!accounts.includes(payee)) return unprocessable('PAYEE_ACCOUNT_INVALID');
      if (unit.amount.currency_code !== 'EUR') return unprocessable('CURRENCY_NOT_SUPPORTED');
      const b = unit.amount.breakdown;
      if (b) {
        const sum = ['item_total', 'shipping', 'handling', 'tax_total', 'insurance'].reduce((n, k) => n + (b[k] ? money(b[k].value) : 0), 0)
          - ['shipping_discount', 'discount'].reduce((n, k) => n + (b[k] ? money(b[k].value) : 0), 0);
        if (sum !== money(unit.amount.value)) return unprocessable('AMOUNT_MISMATCH');
        if (unit.items) {
          const items = unit.items.reduce((n, i) => n + money(i.unit_amount.value) * Number(i.quantity), 0);
          if (items !== money(b.item_total.value)) return unprocessable('ITEM_TOTAL_MISMATCH');
        }
      }
      if (unit.shipping?.address && !/^\w[\w -]{1,20}$/.test(unit.shipping.address.postal_code)) return unprocessable('POSTAL_CODE_REQUIRED');
      const o = {id: id('ORD'), status: payload.payment_source ? 'PAYER_ACTION_REQUIRED' : 'CREATED', unit, payee, payload, capture: null};
      state.orders.set(o.id, o);
      return reply(201, orderView(o));
    }
    const orderMatch = /^\/v2\/checkout\/orders\/([A-Z0-9-]+)(\/capture)?$/.exec(url.pathname);
    if (orderMatch) {
      const o = state.orders.get(orderMatch[1]);
      if (!o) return reply(404, {name: 'RESOURCE_NOT_FOUND'});
      if (!orderMatch[2]) return reply(200, orderView(o));
      const requestId = init.headers?.['PayPal-Request-Id'];
      if (requestId && state.captureRequestIds.get(requestId) === o.id && o.capture) return reply(200, orderView(o));
      if (o.status === 'COMPLETED') return unprocessable('ORDER_ALREADY_CAPTURED');
      if (o.status !== 'APPROVED') return unprocessable('ORDER_NOT_APPROVED');
      if (state.declineNext) { state.declineNext = false; return unprocessable('INSTRUMENT_DECLINED'); }
      const amount = state.nextCaptureOverride?.amount ?? o.unit.amount.value;
      o.capture = {id: id('CAP'), status: state.nextCaptureOverride?.status ?? 'COMPLETED',
        amount: {currency_code: 'EUR', value: amount}, invoice_id: o.unit.invoice_id, custom_id: o.unit.custom_id, final_capture: true};
      state.nextCaptureOverride = null;
      o.status = 'COMPLETED';
      if (requestId) state.captureRequestIds.set(requestId, o.id);
      return reply(201, orderView(o));
    }
    if (url.pathname === '/v1/notifications/webhooks' && method === 'GET') {
      return reply(200, {webhooks: state.webhooks.map(w => ({id: w.id, url: w.url, event_types: w.events.map(name => ({name}))}))});
    }
    if (url.pathname === '/v1/notifications/webhooks' && method === 'POST') {
      const payload = JSON.parse(body);
      const w = {id: 'WH-' + id('HOOK'), url: payload.url, events: payload.event_types.map(e => e.name)};
      state.webhooks.push(w);
      return reply(201, {id: w.id, url: w.url, event_types: payload.event_types});
    }
    if (url.pathname.startsWith('/v1/notifications/webhooks/') && method === 'PATCH') return reply(200, {});
    if (url.pathname === '/v1/notifications/verify-webhook-signature') {
      const payload = JSON.parse(body);
      const ok = payload.transmission_sig === 'valid-signature' && state.webhooks.some(w => w.id === payload.webhook_id);
      return reply(200, {verification_status: ok ? 'SUCCESS' : 'FAILURE'});
    }
    return reply(404, {name: 'RESOURCE_NOT_FOUND', path: url.pathname});
  }

  return {
    state,
    fetch: fetchImpl,
    /** Buyer approves on PayPal's page. */
    approve(orderId) { const o = state.orders.get(orderId); o.status = 'APPROVED'; return o; },
    order(orderId) { return state.orders.get(orderId); },
    webhookEvent(type, resource, eventId = 'WH-EVT-' + id('E')) {
      return {id: eventId, event_type: type, resource, create_time: new Date().toISOString()};
    },
    signatureHeaders(valid = true) {
      return new Headers({
        'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/CERT-1',
        'paypal-transmission-id': 'tx-' + seq, 'paypal-transmission-sig': valid ? 'valid-signature' : 'forged',
        'paypal-transmission-time': new Date().toISOString(),
      });
    },
  };
}
