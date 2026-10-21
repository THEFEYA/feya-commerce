import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPayPalStandardIpnPostback} from '../../lib/sellerOnlinePayPalStandardIpn.ts';

test('IPN requires PayPal\'s own VERIFIED answer to the exact echoed message', async () => {
  let seenUrl = '', seenBody = '', seenMethod = '';
  const transport: typeof fetch = async (input, init) => {
    seenUrl = String(input); seenBody = String(init?.body || ''); seenMethod = String(init?.method || '');
    return new Response('VERIFIED', {status: 200});
  };
  const raw = 'txn_id=6PC23115WS341910B&payment_status=Completed';
  assert.equal((await verifyPayPalStandardIpnPostback(raw, 'sandbox', transport)).ok, true);
  assert.equal(seenUrl, 'https://www.sandbox.paypal.com/cgi-bin/webscr');
  assert.equal(seenMethod, 'POST');
  assert.equal(seenBody, 'cmd=_notify-validate&' + raw);
  const bad = await verifyPayPalStandardIpnPostback(raw, 'live', async () => new Response('INVALID', {status: 200}));
  assert.deepEqual(bad, {ok: false, verified: false, code: 'invalid'});
  const down = await verifyPayPalStandardIpnPostback(raw, 'live', async () => { throw Error('network'); });
  assert.deepEqual(down, {ok: false, verified: false, code: 'provider_unavailable'});
  assert.deepEqual(await verifyPayPalStandardIpnPostback('', 'sandbox', transport), {ok: false, verified: false, code: 'invalid_input'});
});
