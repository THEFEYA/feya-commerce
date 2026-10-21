import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayPalStandardForm,
  parseVerifiedPayPalIpn,
} from '../../lib/sellerOnlinePayPalStandardContract.ts';
import {verifyPayPalStandardIpnPostback} from '../../lib/sellerOnlinePayPalStandardIpn.ts';

const order={
  orderReference:'f59e0c24-2e25-4c65-8315-681bdcb45ddd',
  approvedAmountMinor:36300,
  currency:'EUR' as const,
  itemTitle:'Silver Futuristic Couple Costume',
  recipientEmail:'seller-payments@example.org',
  storeReference:'a25d2a4d3f57a31cf51d5ce4b8f0c62a',
  environment:'sandbox' as const,
};

test('Seller Online PayPal Standard builds hosted PayPal form from approved receipt only',()=>{
  const form=buildPayPalStandardForm(order);
  assert.equal(form.action,'https://www.sandbox.paypal.com/cgi-bin/webscr');
  assert.equal(form.method,'POST');
  assert.deepEqual({
    cmd:form.fields.cmd,
    recipient:form.fields.business,
    currency:form.fields.currency_code,
    amount:form.fields.amount,
    invoice:form.fields.invoice,
  },{
    cmd:'_xclick',recipient:order.recipientEmail,currency:'EUR',
    amount:'363.00',invoice:order.orderReference,
  });
  assert.equal(form.fields.custom,
    order.orderReference+';opencart:'+order.storeReference);
  assert.equal(form.fields.notify_url,'https://thefeya.com/api/commerce/paypal/ipn');
  assert.equal(form.fields.return,'https://thefeya.com/checkout/return');
  assert.ok(!('card_number' in form.fields));
  assert.ok(!('cvv' in form.fields));
  assert.ok(!('payer_password' in form.fields));
  assert.equal(buildPayPalStandardForm({...order,environment:'live'}).action,
    'https://www.paypal.com/cgi-bin/webscr');
});

test('PayPal Standard cannot be redirected using invalid amount, email or invoice',()=>{
  for(const x of [
    {...order,approvedAmountMinor:NaN},
    {...order,approvedAmountMinor:0},
    {...order,approvedAmountMinor:363.99},
    {...order,recipientEmail:'other@example.org@attacker.net'},
    {...order,storeReference:'invalid;one_more'},
    {...order,orderReference:'------------------------------------'},
    {...order,orderReference:'a'},
  ]) assert.throws(()=>buildPayPalStandardForm(x),/not_authorized/);
});

test('IPN must match canonical amount/currency/receiver/order after VERIFIED postback',()=>{
  const expected={orderReference:order.orderReference,
    grossMinor:36300,receiverEmail:order.recipientEmail,custom:
    order.orderReference+';opencart:'+order.storeReference};
  const ipn={
    txn_id:'6PC23115WS341910B',
    mc_gross:'363.00',
    mc_currency:'EUR',
    receiver_email:'SELLER-PAYMENTS@example.org',
    payment_status:'Completed',
    invoice:order.orderReference,
    custom:expected.custom,
  };
  const receipt=parseVerifiedPayPalIpn(ipn,expected);
  assert.equal(receipt.grossMinor,36300);
  assert.equal(receipt.currency,'EUR');
  assert.equal(receipt.paymentStatus,'Completed');
  for(const variation of [
    {...ipn,mc_gross:'363.01'},
    {...ipn,mc_currency:'USD'},
    {...ipn,receiver_email:'attacker@example.org'},
    {...ipn,payment_status:'Pending'},
    {...ipn,invoice:'45c34b1f-18e4-4a9b-8a13-a45c235a8cf1'},
    {...ipn,custom:'different'},
  ]) assert.throws(()=>parseVerifiedPayPalIpn(variation,expected),/mismatch/);
});

test('IPN requires official PayPal postback VERIFIED text before checking payment details',async()=>{
  let seenUrl='',seenBody='',seenMethod='';
  const transport:typeof fetch=async(input,init)=>{
    seenUrl=String(input);seenBody=String(init?.body||'');
    seenMethod=String(init?.method||'');
    return new Response('VERIFIED',{status:200});
  };
  const raw='txn_id=6PC23115WS341910B&payment_status=Completed';
  const good=await verifyPayPalStandardIpnPostback(raw,'sandbox',transport);
  assert.equal(good.ok,true);
  assert.equal(seenUrl,'https://www.sandbox.paypal.com/cgi-bin/webscr');
  assert.equal(seenMethod,'POST');
  assert.equal(seenBody,'cmd=_notify-validate&'+raw);
  const bad=await verifyPayPalStandardIpnPostback(raw,'live',async()=>new Response('INVALID',{status:200}));
  assert.equal(bad.verified,false);
  assert.equal(bad.ok,false);
  const failure=await verifyPayPalStandardIpnPostback(raw,'live',async()=>{
    throw Error('network');
  });
  assert.equal(failure.ok,false);
  assert.deepEqual(await verifyPayPalStandardIpnPostback('', 'sandbox',transport),
    {ok:false,verified:false,code:'invalid_input'});
});
