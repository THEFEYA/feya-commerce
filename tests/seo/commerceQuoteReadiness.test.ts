import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyConfigurationQuoteReadiness,
  requireConfigurationQuoteReady,
  type ConfigurationQuoteEvidence,
} from '../../lib/commerceQuoteReadiness.ts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ready = (): ConfigurationQuoteEvidence => ({
  configuration_price_id: id(1),
  canonical_product_id: id(2),
  sellable_configuration_id: id(3),
  configuration_review_status: 'approved',
  configuration_is_public_candidate: true,
  configuration_is_sampler: false,
  price_status: 'approved',
  price_review_status: 'approved',
  fallback_flag: false,
  public_price_amount: '199.39',
  source_currency: 'EUR',
});

test('only reviewed non-fallback public configurations enter quote-ready stage', () => {
  const result = classifyConfigurationQuoteReadiness(ready());
  assert.equal(result.ready, true);
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.approved_major_amount, '199.39');
  assert.equal(result.currency, 'EUR');
});

test('owner-reviewed exact price is eligible only when every other configuration gate also passes', () => {
  const row = ready();
  row.price_status = 'owner_reviewed';
  assert.equal(classifyConfigurationQuoteReadiness(row).ready, true);
  row.configuration_review_status = 'not_reviewed';
  const blocked = classifyConfigurationQuoteReadiness(row);
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.reason_codes, ['CONFIGURATION_NOT_APPROVED']);
});

test('draft, unreviewed and fallback price evidence cannot become a server quote', () => {
  const row = ready();
  row.price_status = 'draft';
  row.price_review_status = 'needs_review';
  row.fallback_flag = true;
  assert.deepEqual(classifyConfigurationQuoteReadiness(row).reason_codes, [
    'PRICE_REVIEW_NOT_APPROVED',
    'PRICE_STATUS_NOT_EXACT',
    'FALLBACK_PRICE_FORBIDDEN',
  ]);
});

test('a display amount is mandatory; source/manual provenance is never guessed into a quote', () => {
  const row = ready();
  row.public_price_amount = null;
  const result = classifyConfigurationQuoteReadiness(row);
  assert.equal(result.ready, false);
  assert.deepEqual(result.reason_codes, ['PUBLIC_PRICE_INVALID']);
  assert.equal(result.approved_major_amount, null);
});

test('sampler, non-public, missing sellable configuration and malformed currency fail closed', () => {
  const row = ready();
  row.sellable_configuration_id = null;
  row.configuration_is_public_candidate = false;
  row.configuration_is_sampler = true;
  row.source_currency = 'eur';
  assert.deepEqual(classifyConfigurationQuoteReadiness(row).reason_codes, [
    'SELLABLE_CONFIGURATION_MISSING',
    'CONFIGURATION_NOT_PUBLIC',
    'SAMPLER_NOT_ORDERABLE',
    'CURRENCY_INVALID',
  ]);
});

test('invalid identity and non-positive or malformed price are reported deterministically', () => {
  const row = ready();
  row.canonical_product_id = 'not-a-uuid';
  row.public_price_amount = '0';
  assert.deepEqual(classifyConfigurationQuoteReadiness(row).reason_codes, [
    'QUOTE_IDENTITY_INVALID',
    'PUBLIC_PRICE_INVALID',
  ]);
  row.public_price_amount = '12,50';
  assert.match(() => requireConfigurationQuoteReady(row), /configuration_quote_not_ready/);
});

test('the readiness gate never activates variants or claims checkout capability', () => {
  const result = requireConfigurationQuoteReady(ready()) as Record<string, unknown>;
  assert.equal('variant_id' in result, false);
  assert.equal('can_checkout' in result, false);
  assert.equal('orderability' in result, false);
});
