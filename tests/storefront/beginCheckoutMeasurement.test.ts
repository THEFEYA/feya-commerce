import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cart = readFileSync('components/CartOwnerLiveReviewClient.tsx', 'utf8');

test('bag emits GA4 begin_checkout once, from server-confirmed EUR merchandise value', () => {
  assert.match(cart, /import \{trackMeasurementEvent\} from '@\/lib\/measurementClient'/);
  assert.match(cart, /const beginCheckoutTracked=useRef\(false\)/);
  assert.match(cart, /if\(!beginCheckoutTracked\.current&&serverAmounts\)\{/);
  assert.match(cart, /trackMeasurementEvent\('begin_checkout',\{/);
  assert.match(cart, /currency:'EUR',value:serverAmounts\.merchandise_minor\/100/);
  assert.match(cart, /canonical_product_id:item\.canonical_product_id/);
  assert.match(cart, /sku_id:item\.configuration_id/);
});

test('begin_checkout fires inside pay() before the PayPal hand-off and can never block it', () => {
  const pay = cart.slice(cart.indexOf('async function pay(){'), cart.indexOf('const change=('));
  const track = pay.indexOf("trackMeasurementEvent('begin_checkout'");
  const start = pay.indexOf('checkoutApi.start(request)');
  assert.ok(track > 0 && start > track, 'event is sent before checkout start');
  assert.match(pay, /try\{\s*trackMeasurementEvent\('begin_checkout'[\s\S]*?\}catch\{\/\* measurement is optional \*\/\}/);
  assert.ok(pay.indexOf('if(!canPay)return;') < track, 'only a payable bag is measured');
});

test('consent and production gates stay in the shared client (no direct gtag in the bag)', () => {
  assert.doesNotMatch(cart, /window\.gtag/);
  const client = readFileSync('lib/measurementClient.ts', 'utf8');
  assert.match(client, /if\(getAnalyticsConsent\(\)!=='granted'\)\{/);
  assert.match(client, /if\(!currentContext\.measurement_enabled\|\|pageContext\.environment!=='production'/);
});
