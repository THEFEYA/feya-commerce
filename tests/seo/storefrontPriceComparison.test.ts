import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveFullSetPriceComparison,
  resolveMinimumSeparatePurchaseTotal,
} from '../../lib/storefrontPriceComparison.ts';

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
    displayedFullSetSavings: 144,
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
    displayedFullSetSavings: 103,
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
    displayedFullSetSavings: 50,
  });
});

test('keeps the displayed saving consistent with zero-decimal storefront prices', () => {
  const result = resolveFullSetPriceComparison({
    fullSetPrice: 239.39,
    storedComponentSum: 294.76,
    storedSavings: 55.37,
    fallbackSeparateTotal: 294.76,
  });

  assert.deepEqual(result, {
    separateRegularTotal: 294.76,
    fullSetSavings: 55.37,
    displayedFullSetSavings: 56,
  });
});


test('uses an exact current-selector coverage total over a stale stored component sum', () => {
  const result = resolveFullSetPriceComparison({
    fullSetPrice: 164.06,
    storedComponentSum: 135.10,
    storedSavings: null,
    fallbackSeparateTotal: 289.51,
    exactSeparateTotal: 289.51,
  });

  assert.deepEqual(result, {
    separateRegularTotal: 289.51,
    fullSetSavings: 125.45,
    displayedFullSetSavings: 126,
  });
});

test('finds the minimum-cost separate choices needed to cover a grouped Full Set', () => {
  const total = resolveMinimumSeparatePurchaseTotal({
    targetMemberCodes: ['skirt', 'top', 'shoulders'],
    candidates: [
      { price: 135.10, memberCodes: ['skirt'] },
      { price: 154.41, memberCodes: ['top', 'shoulders'] },
    ],
  });

  assert.equal(total, 289.51);
});

test('does not double-count overlapping atomic and grouped selector choices', () => {
  const total = resolveMinimumSeparatePurchaseTotal({
    targetMemberCodes: ['skirt', 'arms', 'shoulders'],
    candidates: [
      { price: 115.81, memberCodes: ['skirt'] },
      { price: 125.45, memberCodes: ['arms'] },
      { price: 135.10, memberCodes: ['shoulders'] },
      { price: 167.49, memberCodes: ['shoulders', 'skirt'] },
    ],
  });

  assert.equal(total, 292.94);
});
