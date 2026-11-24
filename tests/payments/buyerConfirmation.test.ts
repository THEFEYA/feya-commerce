import test from 'node:test';
import assert from 'node:assert/strict';
import { buyerConfirmation } from '../../scripts/checkout/buyer-confirmation.ts';
import { buildCustomerSnapshot } from '../../lib/payments/orderSnapshot.ts';
import { parseCheckoutRequest } from '../../lib/payments/checkoutRequest.ts';
import { validCheckoutBody } from './fixtures.ts';

function paidOrder() {
  const request = parseCheckoutRequest(validCheckoutBody());
  const amounts = { currency: 'EUR' as const, merchandise_minor: 18900, extras_minor: 0, shipping_minor: 1900,
    remote_minor: 0, handling_minor: 0, tax_minor: 0 as const, total_minor: 20800, distinct_listing_count: 1, item_quantity: 1 };
  const snapshot = buildCustomerSnapshot({ request, lines: [{ line_id: 'sample-1', canonical_product_id: 'sample',
    slug: 'sample', title: 'Silver stage costume', option_label: 'Full Set', configuration_id: 'sample',
    color: 'Silver', size: 'M', wearer: null, made_to_measure: false, quantity: 1, unit_minor: 18900, line_minor: 18900, image: null }],
    extras: [], amounts, now: new Date('2026-11-24T09:01:00Z') });
  return { order_number: 'FEYA-900001', kind: 'customer', status: 'paid', environment: 'live', currency: 'EUR',
    created_at: snapshot.created_at, paid_at: '2026-11-24T09:02:00Z', paid_minor: 20800, total_minor: 20800, snapshot };
}

test('renders the buyer, exact order, all four accepted texts and withdrawal form in one offline copy', () => {
  const order = paidOrder();
  const result = buyerConfirmation(order);
  assert.equal(result.to, order.snapshot.buyer!.email);
  assert.equal(result.filename, 'TheFEYA-FEYA-900001.txt');
  for (const fragment of ['Silver stage costume', 'Full Set', '€208.00', 'Standard Shipping', '10–14 business days',
    'Terms of Use & Sale', 'Returns & Exchanges', 'Optional withdrawal form and postal address', 'Shipping & Delivery',
    'Privacy Policy', '635 Somers Ave', 'Ann Buyer', '10115', 'Event on 14 Nov']) assert.ok(result.text.includes(fragment), fragment);
  assert.ok(!result.text.includes('idempotency_key'));
});

test('does not substitute current terms for an unknown edition or altered source', () => {
  const order = paidOrder();
  order.snapshot.policies.accepted_bundle_version = 'unarchived';
  assert.throws(() => buyerConfirmation(order), /edition/);
  const changed = paidOrder();
  changed.snapshot.policies.source_blob_sha1!.returns = 'unknown';
  assert.throws(() => buyerConfirmation(changed), /policy sources/);
});

test('requires paid and reconciled funds, matching quantities and live production for a genuine copy', () => {
  assert.throws(() => buyerConfirmation({ ...paidOrder(), status: 'pending_payment' }), /confirmed paid/);
  assert.throws(() => buyerConfirmation({ ...paidOrder(), environment: 'sandbox' }), /confirmed paid/);
  assert.throws(() => buyerConfirmation({ ...paidOrder(), paid_minor: 1 }), /reconcile/);
  const order = paidOrder();
  order.snapshot.lines[0].quantity = 2;
  assert.throws(() => buyerConfirmation(order), /reconcile/);
});

test('renders an unmistakable sample only with the special reference and sandbox flag', () => {
  const order = { ...paidOrder(), environment: 'sandbox', order_number: 'SAMPLE-NOT-AN-ORDER' };
  assert.throws(() => buyerConfirmation(order), /confirmed paid/);
  assert.throws(() => buyerConfirmation(paidOrder(), { sample: true }), /confirmed paid/);
  assert.match(buyerConfirmation(order, { sample: true }).text, /^DELIVERY TEST/);
});
