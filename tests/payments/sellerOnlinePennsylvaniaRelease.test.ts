import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiresPennsylvaniaTaxReview} from '../../lib/payments/destinationTaxReview.ts';
import {checkoutErrorMessage,parseCheckoutRequest} from '../../lib/payments/checkoutRequest.ts';
import {validCheckoutBody} from './fixtures.ts';
import {CHECKOUT_POLICY_BUNDLE_V1} from '../../lib/payments/checkoutPolicyEvidence.ts';
import {SELLER_ONLINE_CHECKOUT_DISCLOSURE} from '../../lib/payments/orderSnapshot.ts';

test('Only US Pennsylvania shipments require an individual verified sales-tax quote',()=>{
  for(const code of ['PA','pa',' PA '])assert.equal(requiresPennsylvaniaTaxReview('US',code),true);
  for(const [country,region] of [['US','TX'],['US','NY'],['US',null],['CA','PA'],['FR',null],['DE','PA']]) {
    assert.equal(requiresPennsylvaniaTaxReview(country,region),false);
  }
  assert.equal(parseCheckoutRequest(validCheckoutBody({address:{
    country:'US',region:'PA',city:'Pittsburgh',postal_code:'15222',line1:'1 Main St'
  }})).address.region,'PA');
  assert.match(checkoutErrorMessage('checkout_pa_tax_quote_required'),/Pennsylvania.*tax.*quote/);
});

test('The server prevents a Pennsylvania PayPal order before the database create call',()=>{
  const code=readFileSync('lib/payments/checkoutService.ts','utf8');
  const gate=code.indexOf("requiresPennsylvaniaTaxReview(request.address.country, request.address.region)");
  const store=code.indexOf("const stored = await paymentsStore.createOrder(");
  assert.ok(gate>0 && store>0 && gate<store,'PA guard must come before order creation');
  assert.match(code,/throw new CheckoutFlowError\('checkout_pa_tax_quote_required', 422\)/);
});

test('Buyer UI prevents Pennsylvania payment and offers support while leaving other destinations available',()=>{
  const ui=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  assert.match(ui,/!needsPennsylvaniaQuote&&Boolean\(serverAmounts\)/);
  assert.match(ui,/Contact us for a Pennsylvania tax quote/);
  assert.match(ui,/needsPennsylvaniaQuote\?'—'/);
});

test('The exact legal seller is disclosed in terms, bag and payment record; policy version pinned',()=>{
  const terms=readFileSync('app/terms/page.tsx','utf8');
  const bag=readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8');
  assert.match(terms,/Legal seller for orders placed through this checkout/);
  assert.match(terms,/Seller support:/);
  assert.match(bag,/Legal seller: Seller-Online LLC/);
  assert.match(SELLER_ONLINE_CHECKOUT_DISCLOSURE,/Legal seller: Seller-Online LLC/);
  assert.equal(CHECKOUT_POLICY_BUNDLE_V1.version,'thefeya-sale-policy-20261029-v3');
});
