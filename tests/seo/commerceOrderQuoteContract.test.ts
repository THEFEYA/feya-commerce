import assert from 'node:assert/strict';
import test from 'node:test';
import type { VariantSnapshot } from '../../lib/commerceVariantContract.ts';
import {
  parseOrderQuoteRequest,
  resolveOrderQuoteBasis,
  validateOrderableOfferSnapshot,
  type OrderableOfferSnapshot,
} from '../../lib/commerceOrderQuoteContract.ts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const snapshot = (): VariantSnapshot => ({
  canonical_product_id: id(1),
  product_revision: 7,
  pricing_policy_ref: 'synthetic-c4.3-test',
  configurations: [{
    configuration_price_id: id(2),
    sellable_configuration_id: id(3),
    base_price: {
      quote_id: id(4),
      price_revision: 2,
      status: 'verified_exact',
      amount_minor: 19939,
      currency: 'EUR',
      evidence_ref: 'synthetic-approved-evidence',
    },
  }],
  colors: [{ id: id(5), label: 'Gold', state: 'confirmed' }],
  sizes: [{ id: id(6), label: 'M', state: 'confirmed' }],
  variants: [{
    variant_id: id(7),
    configuration_price_id: id(2),
    color_id: id(5),
    size_id: id(6),
    state: 'active',
    pricing: { mode: 'configuration_base' },
  }],
});

const offer = (): OrderableOfferSnapshot => ({
  offer_revision_id: id(8),
  offer_revision: 3,
  release_ref: 'synthetic-release',
  approval_ref: 'synthetic-owner-approval',
  status: 'active',
  max_quantity_per_line: 4,
  variant_snapshot: snapshot(),
});

const request = () => ({
  request_id: id(9),
  canonical_product_id: id(1),
  variant_id: id(7),
  configuration_price_id: id(2),
  color_id: id(5),
  size_id: id(6),
  expected_product_revision: 7,
  expected_offer_revision: 3,
  quantity: 2,
});

test('server quote basis resolves exact active tuple and computes line amount from server evidence', () => {
  const result = resolveOrderQuoteBasis(offer(), request());
  assert.equal(result.unit_amount_minor, 19939);
  assert.equal(result.line_amount_minor, 39878);
  assert.equal(result.currency, 'EUR');
  assert.equal(result.price_quote_id, id(4));
  assert.equal(result.variant_id, id(7));
  assert.equal(result.quantity, 2);
});

test('caller cannot smuggle browser price, currency or orderability fields', () => {
  assert.throws(() => parseOrderQuoteRequest({ ...request(), amount_minor: 1 }), /request_invalid/);
  assert.throws(() => parseOrderQuoteRequest({ ...request(), currency: 'USD' }), /request_invalid/);
  assert.throws(() => parseOrderQuoteRequest({ ...request(), orderable: true }), /request_invalid/);
});

test('offer and product revisions are compare-and-swap gates', () => {
  assert.throws(() => resolveOrderQuoteBasis(offer(), { ...request(), expected_offer_revision: 2 }), /offer_revision_conflict/);
  assert.throws(() => resolveOrderQuoteBasis(offer(), { ...request(), expected_product_revision: 6 }), /variant_revision_conflict/);
});

test('variant id must identify the same exact tuple rather than another product option', () => {
  assert.throws(() => resolveOrderQuoteBasis(offer(), { ...request(), variant_id: id(10) }), /offer_variant_conflict/);
  assert.throws(() => resolveOrderQuoteBasis(offer(), { ...request(), color_id: null }), /variant_not_orderable/);
});

test('hold or retired offer revisions cannot quote even when historical price is exact', () => {
  for (const status of ['hold', 'retired'] as const) {
    const o = offer();
    o.status = status;
    assert.throws(() => resolveOrderQuoteBasis(o, request()), /offer_not_orderable/);
  }
});

test('quantity is server-bounded and line arithmetic must remain a safe integer', () => {
  assert.throws(() => resolveOrderQuoteBasis(offer(), { ...request(), quantity: 5 }), /quantity_exceeds/);
  const o = offer();
  o.max_quantity_per_line = Number.MAX_SAFE_INTEGER;
  o.variant_snapshot.configurations[0].base_price.amount_minor = Number.MAX_SAFE_INTEGER;
  assert.throws(() => resolveOrderQuoteBasis(o, { ...request(), quantity: 2 }), /amount_overflow/);
});

test('explicit exception remains isolated to the exact tuple and is returned as quote source', () => {
  const o = offer();
  o.variant_snapshot.variants[0].pricing = {
    mode: 'exception_override',
    exception_id: id(10),
    reason: 'Synthetic exception',
    price: {
      quote_id: id(11),
      price_revision: 1,
      status: 'verified_exact',
      amount_minor: 25000,
      currency: 'EUR',
      evidence_ref: 'synthetic-exception-evidence',
    },
  };
  const result = resolveOrderQuoteBasis(o, request());
  assert.equal(result.unit_amount_minor, 25000);
  assert.equal(result.price_quote_id, id(11));
  assert.equal(result.price_source, 'exception_override');
});

test('offer snapshot itself must be governed and quantity policy cannot be omitted', () => {
  const o = offer();
  o.approval_ref = '';
  assert.throws(() => validateOrderableOfferSnapshot(o), /orderable_offer_invalid/);
  o.approval_ref = 'ok';
  o.max_quantity_per_line = 0;
  assert.throws(() => validateOrderableOfferSnapshot(o), /orderable_offer_invalid/);
});
