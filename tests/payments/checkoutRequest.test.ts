import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCheckoutQuoteRequest, parseCheckoutRequest, checkoutErrorMessage} from '../../lib/payments/checkoutRequest.ts';
import {checkoutRequestFingerprint} from '../../lib/payments/orderSnapshot.ts';
import {lineA, validCheckoutBody} from './fixtures.ts';

test('valid checkout request is normalised', () => {
  const r = parseCheckoutRequest(validCheckoutBody());
  assert.equal(r.buyer.email, 'ann@example.com');
  assert.equal(r.address.country, 'DE');
  assert.equal(r.address.region, null);
  assert.equal(r.address.line2, null);
  assert.equal(r.lines.length, 1);
  assert.equal(r.gift_message, null);
});

test('money or unknown fields in the request are rejected, not trusted', () => {
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({total_minor: 1})), /checkout_request_invalid/);
  assert.throws(() => parseCheckoutRequest({...validCheckoutBody(), amount: '1.00'}), /checkout_request_invalid/);
});

test('terms, contact and address are required', () => {
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({accepted_terms: false})), /checkout_terms_required/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({buyer: {first_name: 'A', last_name: 'B', email: 'nope', phone: '+4915123'}})), /checkout_email_invalid/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({buyer: {first_name: 'A', last_name: 'B', email: 'a@b.co', phone: 'call me'}})), /checkout_phone_invalid/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({address: {country: 'DE', city: '', postal_code: '1', line1: 'x'}})), /checkout_field_required/);
});

test('US/CA/AU require a valid state; blocked or unknown countries refused', () => {
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({address: {country: 'US', region: '', city: 'Austin', postal_code: '73301', line1: '1 Main St'}})), /checkout_region_required/);
  assert.equal(parseCheckoutRequest(validCheckoutBody({address: {country: 'US', region: 'TX', city: 'Austin', postal_code: '73301', line1: '1 Main St'}})).address.region, 'TX');
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({address: {country: 'UA', city: 'Kyiv', postal_code: '01001', line1: 'x'}})), /checkout_country_unavailable/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({address: {country: 'ZZ', city: 'x', postal_code: '1', line1: 'x'}})), /checkout_country_unavailable/);
});

test('line validation: duplicates, quantities, ids', () => {
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({lines: [lineA(), lineA()]})), /checkout_lines_invalid/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({lines: [lineA({quantity: 0})]})), /checkout_line_quantity_invalid/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({lines: [lineA({configuration_id: 'not-a-uuid'})]})), /checkout_option_unavailable/);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({lines: []})), /checkout_lines_invalid/);
});

test('gift message only kept with gift card; control characters refused', () => {
  assert.equal(parseCheckoutRequest(validCheckoutBody({gift_card: true, gift_message: 'Happy birthday!\nLove'})).gift_message, 'Happy birthday!\nLove');
  assert.equal(parseCheckoutRequest(validCheckoutBody({gift_card: false, gift_message: 'ignored'})).gift_message, null);
  assert.throws(() => parseCheckoutRequest(validCheckoutBody({note: 'bad\u0000'})), /checkout_field_invalid/);
});

test('quote request needs no personal data', () => {
  const q = parseCheckoutQuoteRequest({lines: [lineA()], method: 'express', gift_card: true, gift_box: false, country: 'AU'});
  assert.equal(q.country, 'AU');
  assert.equal(parseCheckoutQuoteRequest({lines: [lineA()], method: 'standard'}).country, '');
  assert.throws(() => parseCheckoutQuoteRequest({lines: [lineA()], method: 'standard', email: 'x@y.z'}), /checkout_request_invalid/);
});

test('idempotency fingerprint ignores the key but not the content', () => {
  const a = parseCheckoutRequest(validCheckoutBody());
  const b = parseCheckoutRequest(validCheckoutBody({idempotency_key: '1b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}));
  const c = parseCheckoutRequest(validCheckoutBody({method: 'express'}));
  assert.equal(checkoutRequestFingerprint(a), checkoutRequestFingerprint(b));
  assert.notEqual(checkoutRequestFingerprint(a), checkoutRequestFingerprint(c));
});

test('every error code has buyer-friendly English text', () => {
  assert.match(checkoutErrorMessage('checkout_terms_required'), /terms/);
  assert.match(checkoutErrorMessage('something_new'), /temporarily unavailable/);
});
