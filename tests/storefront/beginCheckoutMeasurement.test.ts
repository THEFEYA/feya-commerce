import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBeginCheckoutMeasurement} from '../../lib/measurementContract.ts';

const cart = readFileSync('components/CartOwnerLiveReviewClient.tsx', 'utf8');

const product='11111111-1111-4111-8111-111111111111';
const configuration='22222222-2222-4222-8222-222222222222';
const bagLine={id:'bag-a',canonical_product_id:product,configuration_id:configuration,qty:2,price:1};
const confirmedQuote={
  ok:true,amounts:{merchandise_minor:39080,total_minor:40980,shipping_minor:1900},
  lines:[{line_id:'bag-a',unit_minor:19540,line_minor:39080}],
};

test('a stale browser price never enters checkout item money; quoted cents reconcile exactly',()=>{
  const event=buildBeginCheckoutMeasurement([bagLine],confirmedQuote);
  assert.deepEqual(event,{
    currency:'EUR',value:390.8,
    items:[{canonical_product_id:product,sku_id:configuration,quantity:2,
      item_price:195.4,item_value:390.8,currency:'EUR'}],
  });
});

test('quote lines join by bag line identity, including multiple selections of one configuration',()=>{
  const items=[{...bagLine,id:'size-s',qty:2},{...bagLine,id:'size-m',qty:1}];
  const event=buildBeginCheckoutMeasurement(items,{
    ok:true,amounts:{merchandise_minor:4002},
    lines:[{line_id:'size-m',unit_minor:2000,line_minor:2000},
      {line_id:'size-s',unit_minor:1001,line_minor:2002}],
  });
  assert.deepEqual(event?.items.map(item=>[item.quantity,item.item_price,item.item_value]),
    [[2,10.01,20.02],[1,20,20]]);
  assert.equal(event?.value,40.02);
});

test('missing, duplicated, mismatched or fractional quote money suppresses only the optional payload',()=>{
  const invalidQuotes=[
    null,
    {...confirmedQuote,ok:false},
    {...confirmedQuote,lines:undefined},
    {...confirmedQuote,lines:[]},
    {...confirmedQuote,lines:[{line_id:'wrong-line',unit_minor:19540,line_minor:39080}]},
    {...confirmedQuote,lines:[{line_id:'bag-a',unit_minor:19540.5,line_minor:39081}]},
    {...confirmedQuote,lines:[{line_id:'bag-a',unit_minor:19540,line_minor:19540}]},
    {...confirmedQuote,amounts:{merchandise_minor:39081}},
    {...confirmedQuote,amounts:{merchandise_minor:Number.NaN}},
  ];
  for(const quote of invalidQuotes){
    assert.equal(buildBeginCheckoutMeasurement([bagLine],quote),null);
  }
  const repeatedQuote={ok:true,amounts:{merchandise_minor:78160},
    lines:[confirmedQuote.lines[0],confirmedQuote.lines[0]]};
  assert.equal(buildBeginCheckoutMeasurement([bagLine,{...bagLine,id:'bag-b'}],repeatedQuote),null);
  assert.equal(buildBeginCheckoutMeasurement([bagLine,{...bagLine}],{
    ...repeatedQuote,lines:[confirmedQuote.lines[0],{...confirmedQuote.lines[0],line_id:'bag-b'}],
  }),null);
});

test('changed quantity or absent configuration cannot reuse a stale quoted line',()=>{
  assert.equal(buildBeginCheckoutMeasurement([{...bagLine,qty:3}],confirmedQuote),null);
  assert.equal(buildBeginCheckoutMeasurement([{...bagLine,configuration_id:null}],confirmedQuote),null);
});


test('bag emits GA4 begin_checkout once, from server-confirmed EUR merchandise value', () => {
  assert.match(cart, /import \{trackMeasurementEvent\} from '@\/lib\/measurementClient'/);
  assert.match(cart, /const beginCheckoutTracked=useRef\(false\)/);
  assert.match(cart, /if\(!beginCheckoutTracked\.current&&serverAmounts\)\{/);
  assert.match(cart, /const measurement=buildBeginCheckoutMeasurement\(items,quote\)/);
  assert.match(cart, /trackMeasurementEvent\('begin_checkout',measurement\)/);
  assert.doesNotMatch(cart, /item_price:item\.price/);
});

test('begin_checkout fires inside pay() before the PayPal hand-off and can never block it', () => {
  const pay = cart.slice(cart.indexOf('async function pay(){'), cart.indexOf('const change=('));
  const track = pay.indexOf("trackMeasurementEvent('begin_checkout'");
  const start = pay.indexOf('checkoutApi.start(request)');
  assert.ok(track > 0 && start > track, 'event is sent before checkout start');
  assert.match(pay, /try\{[\s\S]*?buildBeginCheckoutMeasurement[\s\S]*?trackMeasurementEvent\('begin_checkout'[\s\S]*?\}catch\{\/\* measurement is optional \*\/\}/);
  assert.ok(pay.indexOf('if(!canPay)return;') < track, 'only a payable bag is measured');
});

test('consent and production gates stay in the shared client (no direct gtag in the bag)', () => {
  assert.doesNotMatch(cart, /window\.gtag/);
  const client = readFileSync('lib/measurementClient.ts', 'utf8');
  assert.match(client, /if\(getAnalyticsConsent\(\)!=='granted'\)\{/);
  assert.match(client, /if\(!currentContext\.measurement_enabled\|\|pageContext\.environment!=='production'/);
});

