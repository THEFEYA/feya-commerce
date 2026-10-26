import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCustomerSnapshot} from '../../lib/payments/orderSnapshot.ts';
import {buildPayPalOrderRequest} from '../../lib/payments/paypalOrder.ts';
import {parseCheckoutRequest} from '../../lib/payments/checkoutRequest.ts';
import {computeCheckoutAmounts, type PricedLine} from '../../lib/payments/pricing.ts';
import {CONFIG_FULL, PRODUCT_A_ID, validCheckoutBody, lineA} from './fixtures.ts';

test('paired customer order and PayPal preserve both colours and both sizes at the ORIGINAL one-set price',()=>{
  const pair={women:{size:'S',color:'gold'},men:{size:'XL',color:'silver'}};
  const request=parseCheckoutRequest(validCheckoutBody({lines:[lineA({
    size:'S',color:'Gold',wearer:null,paired_selection:pair,configuration_id:CONFIG_FULL,
  })]}));
  const lines:PricedLine[]=[{
    line_id:'one-pair',canonical_product_id:PRODUCT_A_ID,slug:'mirror-festival-set',
    title:'Paired Festival Set',option_label:'Paired Set',configuration_id:CONFIG_FULL,
    color:'Gold',size:'S',wearer:null,made_to_measure:false,paired_selection:pair,
    quantity:1,unit_minor:18900,line_minor:18900,image:null,
  }];
  const amounts=computeCheckoutAmounts({lines,extras:[],method:'standard',country:'DE'});
  const snapshot=buildCustomerSnapshot({request,lines,extras:[],amounts,now:new Date('2026-10-26T12:00:00Z')});
  assert.equal(snapshot.policies.accepted_bundle_version,'thefeya-sale-policy-20261027-v2');
  assert.equal(snapshot.policies.accepted_at,snapshot.created_at);
  assert.equal(Object.keys(snapshot.policies.source_blob_sha1||{}).length,4);
  assert.equal(snapshot.lines[0].size,'Women S / Men XL');
  assert.equal(snapshot.lines[0].color,'Women Gold / Men Silver');
  assert.deepEqual(snapshot.lines[0].paired_selection,pair);
  assert.equal(amounts.total_minor,20800);
  const payment=buildPayPalOrderRequest({
    expected:{order_number:'FEYA-100010',invoice_id:'FEYA-100010',custom_id:'FEYA-100010;opencart:SOURCEKEY',
      total_minor:amounts.total_minor,merchandise_minor:amounts.merchandise_minor,
      extras_minor:0,shipping_minor:amounts.shipping_minor,remote_minor:0,handling_minor:0,
      payee_email:'payments@seller-online.example'},
    snapshot,returnUrl:'https://thefeya.com/checkout/return',cancelUrl:'https://thefeya.com/checkout/return?cancelled=1',
  });
  const unit=payment.purchase_units[0] as Record<string,any>;
  assert.equal(unit.items.length,1);
  assert.equal(unit.items[0].unit_amount.value,'189.00');
  assert.match(unit.items[0].description,/Women S\/Gold/);
  assert.match(unit.items[0].description,/Men XL\/Silver/);
  assert.equal(unit.amount.value,'208.00');
});
