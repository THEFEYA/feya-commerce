import assert from 'node:assert/strict';
import test from 'node:test';
import { storefrontIncludedOptions } from '../../lib/storefrontIncludedOptions.ts';
import {
  resolveStorefrontSellableOffer,
  sellableOfferAllowsComponentFocus,
  sellableOfferAvailabilitySentence,
} from '../../lib/storefrontSellableOffer.ts';

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

test('current v4 selector overrides stale Etsy variations for the current 4340584466 product', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Choose Your Set',
      values: ['Shoulders', 'Skirt', 'Bracelets', 'Shoulders & Skirt', 'Full Set'],
    }],
    canonical_option_price_rows: [
      { raw_option_value: 'Harness Top' },
      { raw_option_value: 'Shoulders' },
      { raw_option_value: 'Top' },
      { raw_option_value: 'Skirt' },
    ],
    configurations: [
      { configuration_id: 'skirt', sort_order: 1, public_label: 'Skirt', component_code: 'skirt', is_full_set: false },
      { configuration_id: 'shoulders', sort_order: 2, public_label: 'Shoulders', component_code: 'shoulders', is_full_set: false },
      { configuration_id: 'full-set', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', is_full_set: true, bundle_component_codes: [] },
    ],
  } as any;

  assert.deepEqual(storefrontIncludedOptions(product, { raw_option_value: 'Full Set' }), [
    'Shoulders',
    'Skirt',
  ]);
  assert.deepEqual(storefrontIncludedOptions(product, { configuration_id: 'skirt' }), [
    'Skirt',
  ]);
  assert.equal(
    sellableOfferAvailabilitySentence(resolveStorefrontSellableOffer(product)),
    'Each piece can be ordered separately or as a full set.',
  );
});

test('uses the reduced public v4 PDP selector without legacy Etsy fallback', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Choose Your Set',
      values: ['Shoulders', 'Skirt', 'Bracelets', 'Shoulders & Skirt', 'Full Set'],
    }],
    configurations: [
      {
        configuration_id: 'skirt',
        sort_order: 1,
        option_value: 'Skirt',
        configuration_name: 'Skirt',
        configuration_label: 'Skirt',
      },
      {
        configuration_id: 'shoulders',
        sort_order: 2,
        option_value: 'Shoulders',
        configuration_name: 'Shoulders',
        configuration_label: 'Shoulders',
      },
      {
        configuration_id: 'full-set',
        sort_order: 3,
        option_value: 'Full Set',
        configuration_name: 'Full Set',
        configuration_label: 'Full Set',
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);

  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['shoulders', 'skirt']);
  assert.deepEqual(storefrontIncludedOptions(product, {
    configuration_id: 'full-set',
  }), ['Shoulders', 'Skirt']);
  assert.equal(
    sellableOfferAvailabilitySentence(offer),
    'Each piece can be ordered separately or as a full set.',
  );
});

test('fails closed when an aggregate option has no deterministic current members', () => {
  const product = {
    canonical_source_variations: [{
      raw_variation_name: 'Choose Your Set',
      values: ['Top', 'Skirt', 'Full Set'],
    }],
    configurations: [
      { configuration_id: 'top', public_label: 'Top', component_code: 'top' },
      { configuration_id: 'mystery', public_label: 'Mystery Bundle', component_code: 'mystery_bundle', is_bundle: true },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);
  assert.equal(offer.status, 'hold');
  assert.equal(offer.blockers.includes('aggregate_members_unknown:mystery_bundle'), true);
  assert.deepEqual(storefrontIncludedOptions(product, { configuration_id: 'mystery' }), []);
});

test('allows a focus alias only when it is a current v4 component family', () => {
  const offer = resolveStorefrontSellableOffer({
    configurations: [{
      configuration_id: 'bracers',
      public_label: 'Forearm Bracers',
      component_code: 'forearm_bracers',
      component_family: 'arms',
    }],
  });

  assert.equal(sellableOfferAllowsComponentFocus(offer, 'arms'), true);
  assert.equal(sellableOfferAllowsComponentFocus(offer, 'top'), false);
});

test('canonicalizes every arm leaf to the arms SEO axis', () => {
  for (const [code, label] of [
    ['bracelet', 'Arm Bracelet'],
    ['gloves', 'Gloves'],
    ['forearm_bracers', 'Forearm Bracers'],
    ['bicep_cuffs', 'Bicep Cuffs'],
  ]) {
    const offer = resolveStorefrontSellableOffer({
      configurations: [{
        configuration_id: code,
        public_label: label,
        component_code: code,
      }],
    });
    assert.equal(offer.status, 'ready');
    assert.equal(sellableOfferAllowsComponentFocus(offer, 'arm'), true);
    assert.equal(sellableOfferAllowsComponentFocus(offer, 'arms'), true);
  }
});

test('keeps one-leg and two-leg selector choices distinct on one legs axis', () => {
  const product = {
    configurations: [
      { configuration_id: 'single-leg', sort_order: 1, public_label: 'Single Leg Cover', component_code: 'legs', component_family: 'Legs' },
      { configuration_id: 'pair-legs', sort_order: 2, public_label: 'Pair of Leg Covers', component_code: 'legs', component_family: 'Legs' },
      { configuration_id: 'bodysuit', sort_order: 3, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit' },
      {
        configuration_id: 'full-single',
        sort_order: 4,
        public_label: 'Full Set — 1 Leg Cover',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_full_set: true,
        bundle_component_codes: ['legs', 'bodysuit'],
        bundle_component_labels: ['Single Leg Cover', 'Bodysuit'],
      },
      {
        configuration_id: 'full-pair',
        sort_order: 5,
        public_label: 'Full Set — 2 Leg Covers',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_full_set: true,
        bundle_component_codes: ['legs', 'bodysuit'],
        bundle_component_labels: ['Pair of Leg Covers', 'Bodysuit'],
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['bodysuit', 'legs']);
  assert.equal(sellableOfferAllowsComponentFocus(offer, 'leg'), true);
  assert.equal(sellableOfferAllowsComponentFocus(offer, 'legs'), true);
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'full-single' }),
    ['Single Leg Cover', 'Bodysuit'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'full-pair' }),
    ['Pair of Leg Covers', 'Bodysuit'],
  );
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
