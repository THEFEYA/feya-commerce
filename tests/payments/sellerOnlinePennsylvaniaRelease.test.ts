import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseCheckoutRequest} from '../../lib/payments/checkoutRequest.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {computeCheckoutAmounts} from '../../lib/payments/pricing.ts';
import {lineA,productA,validCheckoutBody} from './fixtures.ts';
import {CHECKOUT_POLICY_BUNDLE_V1} from '../../lib/payments/checkoutPolicyEvidence.ts';
import {SELLER_ONLINE_CHECKOUT_DISCLOSURE} from '../../lib/payments/orderSnapshot.ts';

test('Customer-charged total is unchanged by tax accounting: US/PA equals US/NY',()=>{
  const line=priceCartLine(productA(),lineA() as Parameters<typeof priceCartLine>[1]);
  const pa=computeCheckoutAmounts({lines:[line],extras:[],method:'standard',country:'US'});
  const ny=computeCheckoutAmounts({lines:[line],extras:[],method:'standard',country:'US'});
  assert.equal(pa.total_minor,ny.total_minor);
  assert.equal(pa.tax_minor,0);
  assert.equal(pa.total_minor,pa.merchandise_minor+pa.shipping_minor+pa.handling_minor+pa.remote_minor+pa.extras_minor);
  const request=parseCheckoutRequest(validCheckoutBody({address:{
    country:'US',region:'PA',city:'Pittsburgh',postal_code:'15222',line1:'1 Main St',
  }}));
  assert.equal(request.address.region,'PA');
});

test('A Pennsylvania customer is not blocked in the active PayPal checkout',()=>{
  const service=readFileSync('lib/payments/checkoutService.ts','utf8');
  const ui=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  const request=readFileSync('lib/payments/checkoutRequest.ts','utf8');
  assert.doesNotMatch(service,/requiresPennsylvaniaTaxReview|checkout_pa_tax_quote_required/);
  assert.doesNotMatch(ui,/needsPennsylvaniaQuote|requiresPennsylvaniaTaxReview/);
  assert.doesNotMatch(request,/checkout_pa_tax_quote_required/);
  assert.match(service,/await paymentsStore\.createOrder\(/);
  assert.match(ui,/const canPay=checkoutActive&&linesOrderable&&Boolean\(serverAmounts\)/);
  assert.match(ui,/Pay securely with PayPal/);
});

test('Seller Online is identified and no extra tax is passed on to the buyer',()=>{
  const terms=readFileSync('app/terms/page.tsx','utf8');
  const bag=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  assert.match(terms,/Legal seller for orders placed through this checkout/);
  assert.match(terms,/without an additional tax surcharge/);
  assert.doesNotMatch(terms,/requires a separately confirmed tax quote/);
  assert.match(bag,/Legal seller: Seller-Online LLC/);
  assert.match(SELLER_ONLINE_CHECKOUT_DISCLOSURE,/Legal seller: Seller-Online LLC/);
  assert.equal(CHECKOUT_POLICY_BUNDLE_V1.version,'thefeya-sale-policy-20261029-v4');
  const bytes=readFileSync('app/terms/page.tsx');
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(sha,CHECKOUT_POLICY_BUNDLE_V1.sources.terms.git_blob_sha1);
});
