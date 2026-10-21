import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cart = readFileSync('components/CartOwnerLiveReviewClient.tsx', 'utf8');
const browser = readFileSync('lib/payments/checkoutBrowser.ts', 'utf8');

test('bag shows a server-confirmed total and keeps the disabled state when payments are off', () => {
  assert.match(cart, /checkoutApi\.status\(\)/);
  assert.match(cart, /checkoutApi\.quote\(/);
  assert.match(cart, /serverAmounts\.total_minor/);
  assert.match(cart, /Checkout not active/);
  assert.match(cart, /Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner\./);
});

test('buyer details are never stored in the browser; only sent to TheFEYA checkout on Pay', () => {
  assert.doesNotMatch(cart, /localStorage\.setItem\([^\n]*(email|phone|address|first_name)/);
  assert.doesNotMatch(cart, /sessionStorage/);
  const paths = [...browser.matchAll(/'(\/api\/[a-z/-]+)'/g)].map(m => m[1]);
  assert.ok(paths.length >= 5);
  for (const path of paths) assert.match(path, /^\/api\/checkout(\/|$)/);
  // Redirects/forms may only go to PayPal.
  assert.match(browser, /\['www\.paypal\.com', 'www\.sandbox\.paypal\.com'\]\.includes\(url\.hostname\)/);
  assert.doesNotMatch(browser, /card_number|cvv|cvc/i);
});
