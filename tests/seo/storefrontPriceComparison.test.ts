import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFullSetPriceComparison } from '../../lib/storefrontPriceComparison.ts';

test('uses the canonical component sum instead of double-counting an aggregate option', () => {
  const result = resolveFullSetPriceComparison({
    fullSetPrice: 295.09,
    storedComponentSum: 439.09,
    storedSavings: 144,
    fallbackSeparateTotal: 614.55,
  });

  assert.deepEqual(result, {
    separateRegularTotal: 439.09,
    fullSetSavings: 144,
  });
});

test('derives a consistent comparison total from canonical savings when the sum is absent', () => {
  const result = resolveFullSetPriceComparison({
    fullSetPrice: 282.77,
    storedComponentSum: null,
    storedSavings: 103.25,
    fallbackSeparateTotal: 530.78,
  });

  assert.deepEqual(result, {
    separateRegularTotal: 386.02,
    fullSetSavings: 103.25,
  });
});

test('keeps the legacy calculated comparison only when no canonical totals exist', () => {
  const result = resolveFullSetPriceComparison({
    fullSetPrice: 100,
    storedComponentSum: null,
    storedSavings: null,
    fallbackSeparateTotal: 150,
  });

  assert.deepEqual(result, {
    separateRegularTotal: 150,
    fullSetSavings: 50,
  });
});
