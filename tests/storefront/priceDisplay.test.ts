import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPrice} from '../../lib/storefront.ts';

test('whole euro prices keep the approved V13 display', () => {
  assert.equal(formatPrice(195), '€195');
  assert.equal(formatPrice(19), '€19');
});

test('prices with cents are shown exactly as charged, never rounded away', () => {
  // Merchant pilot Full Set examples (config aead53be…, 579e883a…).
  assert.equal(formatPrice(195.4), '€195.40');
  assert.equal(formatPrice(239.27), '€239.27');
  assert.equal(formatPrice(125.45), '€125.45');
  assert.equal(formatPrice(0.99), '€0.99');
});

test('floating point noise does not create fake cents', () => {
  assert.equal(formatPrice(0.1 + 0.2), '€0.30');
  assert.equal(formatPrice(195.00000000001), '€195');
});

test('missing amounts keep the existing placeholder', () => {
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(undefined), '—');
  assert.equal(formatPrice(Number.NaN), '—');
});
