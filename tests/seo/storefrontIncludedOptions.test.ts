import assert from 'node:assert/strict';
import test from 'node:test';
import { storefrontIncludedOptions } from '../../lib/storefrontIncludedOptions.ts';

test('preserves compound Etsy option labels and omits Full Set', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Choose Your Set',
      values: ['Top and Shoulders', 'Skirt', 'Full Set'],
    }],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Full Set' }), [
    'Top and Shoulders',
    'Skirt',
  ]);
});

test('shows the exact selected source option for an individual piece', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Configuration',
      values: ['Top and Shoulders', 'Skirt', 'Full Set'],
    }],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Top and Shoulders' }), [
    'Top and Shoulders',
  ]);
});

test('matches storefront configuration labels when raw source fields are absent', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Configuration',
      values: ['Top and Shoulders', 'Skirt', 'Full Set'],
    }],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, {
    public_label: 'Top and Shoulders',
  }), ['Top and Shoulders']);
  assert.deepEqual(storefrontIncludedOptions(product, {
    configuration_name: 'Full Set',
  }), ['Top and Shoulders', 'Skirt']);
});

test('honors the explicit full-set flag without reconstructing source wording', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Configuration',
      values: ['Top and Shoulders', 'Skirt', 'Full Set'],
    }],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, {
    is_full_set: true,
    public_label: 'Complete Look',
  }), ['Top and Shoulders', 'Skirt']);
});

test('uses raw option price rows without normalizing wording', () => {
  const product = {
    canonical_option_price_rows: [
      { raw_option_value: 'Shoulders + Top' },
      { raw_option_value: 'Ring Skirt' },
      { raw_option_value: 'Full Set' },
    ],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Full Set' }), [
    'Shoulders + Top',
    'Ring Skirt',
  ]);
});

test('never mixes canonical Etsy labels with split option-row labels', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Configuration',
      raw_variation_values: 'Full Set, Top and Shoulders, Skirt',
      values: ['Full Set', 'Top and Shoulders', 'Skirt'],
    }],
    canonical_option_price_rows: [
      { raw_option_value: 'Harness Top' },
      { raw_option_value: 'Shoulders' },
      { raw_option_value: 'Top' },
      { raw_option_value: 'Skirt' },
    ],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product), ['Top and Shoulders', 'Skirt']);
});

test('omits a redundant combination choice from Full Set but preserves it when selected', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Choose Your Set',
      values: ['Shoulders', 'Skirt', 'Bracelets', 'Shoulders & Skirt', 'Full Set'],
    }],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Full Set' }), [
    'Shoulders',
    'Skirt',
    'Bracelets',
  ]);
  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Shoulders & Skirt' }), [
    'Shoulders & Skirt',
  ]);
});

test('fails closed instead of leaking translated fallback labels into the English storefront', () => {
  const product = {
    canonical_option_price_rows: [
      { raw_option_value: 'Плечи' },
      { raw_option_value: 'Полный комплект' },
      { raw_option_value: 'Юбка' },
    ],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product), []);
});

test('fails closed when only inferred DNA or normalized component codes exist', () => {
  const product = {
    canonical_included_components: ['shoulders', 'top', 'skirt'],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, {
    public_label: 'Full Set',
    bundle_component_codes: ['shoulders', 'top', 'skirt'],
  }), []);
});
