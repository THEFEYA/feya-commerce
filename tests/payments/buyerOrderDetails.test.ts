import assert from 'node:assert/strict';
import test from 'node:test';
import {buyerOrderDetails, type BuyerOrderReceipt} from '../../lib/payments/buyerOrderDetails.ts';

const order: BuyerOrderReceipt = {
  order_number:'FEYA-123456', kind:'customer', status:'paid', currency:'EUR',
  created_at:'2026-11-23T11:20:00+02:00', paid_at:'2026-11-23T09:22:00Z',
  merchandise_minor:90000, extras_minor:2500, shipping_minor:3500, remote_minor:2000,
  handling_minor:500, total_minor:98500, shipping_method:'express',
  lines:[{title:'Mirror set', option:'Full set', color:'Silver', size:'M', quantity:2, line_minor:90000}],
  extras:[{label:'Gift box', quantity:1, amount_minor:2500}],
};

test('download records the selected items, fees, currency, paid time and seller, without private fields',()=>{
  const wireResult={...order,access_token:'private-token',buyer_email:'private@example.com',address:'private-street'};
  const text=buyerOrderDetails(wireResult);
  for(const part of ['FEYA-123456','Payment status: Paid','09:22 UTC','Mirror set ×2 — €900.00',
    'Full set · Silver · M','Gift box ×1 — €25.00','Express Shipping: €35.00',
    'Remote destination delivery: €20.00','Additional packaging: €5.00',
    'Original order total (EUR): €985.00','Seller-Online LLC','https://thefeya.com/returns']){
    assert.ok(text.includes(part),part);
  }
  assert.doesNotMatch(text,/private-token|private@example\.com|private-street|production queue|#t=/);
});

test('an unpaid legacy or test record never shows payment, shipping service, or production as confirmed',()=>{
  const text=buyerOrderDetails({...order,kind:'test',status:'payment_pending',paid_at:null,
    shipping_method:null,shipping_minor:0,remote_minor:0,handling_minor:0,extras:[],lines:[]});
  assert.match(text,/TheFEYA · Test order FEYA-123456/);
  assert.match(text,/Awaiting PayPal confirmation/);
  assert.match(text,/\nShipping: €0\.00/);
  assert.doesNotMatch(text,/\nPaid:|Express Shipping|Standard Shipping|Additional packaging|Remote destination/);
  assert.match(buyerOrderDetails({...order,status:'partially_refunded'}),/Payment status: Partially refunded/);
});
