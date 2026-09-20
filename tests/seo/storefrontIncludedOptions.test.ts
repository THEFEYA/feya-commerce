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

test('expands one Full Set through a current grouped option without inventing atomic choices', () => {
  const product = {
    canonical_product_id: '7e743440-3e9f-490c-b306-5c8c87969973',
    configurations: [
      {
        configuration_id: 'bracelet',
        sort_order: 1,
        public_label: 'Bracelet',
        component_code: 'arms',
        component_family: 'Arms',
      },
      {
        configuration_id: 'skirt',
        sort_order: 2,
        public_label: 'Skirt',
        component_code: 'skirt',
        component_family: 'Bottom',
      },
      {
        configuration_id: 'top-shoulders',
        sort_order: 3,
        public_label: 'Top + Shoulders',
        component_code: 'bundle',
        component_family: 'Bundle',
        is_bundle: true,
        bundle_component_codes: ['shoulders', 'top'],
      },
      {
        configuration_id: 'full-set',
        sort_order: 4,
        public_label: 'Full Set',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_bundle: false,
        is_full_set: true,
        bundle_component_codes: ['arms', 'skirt'],
        bundle_component_labels: ['Bracelet', 'Skirt'],
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);

  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.blockers, []);
  assert.deepEqual(offer.component_codes, ['arms', 'shoulders', 'skirt', 'top']);
  assert.deepEqual(offer.default_included_components, [
    'Bracelet',
    'Skirt',
    'Shoulders',
    'Top',
  ]);
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'full-set' }),
    ['Bracelet', 'Skirt', 'Top + Shoulders'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'top-shoulders' }),
    ['Top + Shoulders'],
  );
  assert.equal(sellableOfferAllowsComponentFocus(offer, 'shoulders'), true);
  assert.equal(sellableOfferAllowsComponentFocus(offer, 'top'), true);
  assert.equal(
    sellableOfferAvailabilitySentence(offer),
    'Choose from individual pieces, grouped options, or the full set.',
  );
});

test('sellable offer signature treats full-set members as an unordered set', () => {
  const configurations = [
    { configuration_id: 'top', public_label: 'Top', component_code: 'top' },
    { configuration_id: 'skirt', public_label: 'Skirt', component_code: 'skirt' },
    {
      configuration_id: 'full-set',
      public_label: 'Full Set',
      component_code: 'full_set',
      is_full_set: true,
      bundle_component_codes: ['top', 'skirt'],
    },
  ];
  const reversed = configurations.map((row) => (
    row.configuration_id === 'full-set'
      ? { ...row, bundle_component_codes: ['skirt', 'top'] }
      : row
  ));

  const left = resolveStorefrontSellableOffer({ configurations });
  const right = resolveStorefrontSellableOffer({ configurations: reversed });
  assert.equal(left.status, 'ready');
  assert.equal(right.status, 'ready');
  assert.equal(left.signature, right.signature);
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

test('fails closed when unresolved variation rows are anonymous Option placeholders', () => {
  const offer = resolveStorefrontSellableOffer({
    configurations: [
      { configuration_id: 'green', public_label: 'Option', component_code: null, component_family: null, needs_label_review: true },
      { configuration_id: 'brown', public_label: 'Option 2', component_code: null, component_family: null, needs_label_review: true },
      { configuration_id: 'black', public_label: 'Option 3', component_code: null, component_family: null, needs_label_review: true },
    ],
  });

  assert.equal(offer.status, 'hold');
  assert.deepEqual(offer.atomic_options, []);
  assert.deepEqual(offer.component_codes, []);
  assert.deepEqual(offer.component_labels, []);
  assert.equal(
    offer.blockers.includes('sellable_option_unresolved_component_identity:0'),
    true,
  );
  assert.equal(offer.blockers.includes('sellable_offer_missing_atomic_options'), true);
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


test('keeps Top + Shoulders as one buyer-facing line inside Full Set', () => {
  const product = {
    configurations: [
      {
        configuration_id: 'skirt',
        sort_order: 1,
        public_label: 'Skirt',
        component_code: 'skirt',
      },
      {
        configuration_id: 'top-shoulders',
        sort_order: 2,
        public_label: 'Top + Shoulders',
        component_code: 'bundle',
        component_family: 'Bundle',
        is_bundle: true,
        bundle_component_codes: ['shoulders', 'top'],
      },
      {
        configuration_id: 'full-set',
        sort_order: 3,
        public_label: 'Full Set',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_full_set: true,
        bundle_component_codes: ['skirt', 'top', 'shoulders'],
        bundle_component_labels: ['Skirt', 'Top', 'Shoulders'],
      },
    ],
  } as any;

  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'full-set' }),
    ['Skirt', 'Top + Shoulders'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'top-shoulders' }),
    ['Top + Shoulders'],
  );
});

test('prefers a real Shoulders + Skirt selector over separate internal members', () => {
  const product = {
    configurations: [
      { configuration_id: 'bracelet', sort_order: 1, public_label: 'Bracelet', component_code: 'arms' },
      { configuration_id: 'skirt', sort_order: 2, public_label: 'Skirt', component_code: 'skirt' },
      { configuration_id: 'shoulders', sort_order: 3, public_label: 'Shoulders', component_code: 'shoulders' },
      {
        configuration_id: 'shoulders-skirt',
        sort_order: 4,
        public_label: 'Shoulders + Skirt',
        component_code: 'bundle',
        is_bundle: true,
        bundle_component_codes: ['shoulders', 'skirt'],
      },
      {
        configuration_id: 'full-set',
        sort_order: 5,
        public_label: 'Full Set',
        component_code: 'full_set',
        is_full_set: true,
        bundle_component_codes: ['arms', 'skirt', 'shoulders'],
        bundle_component_labels: ['Bracelet', 'Skirt', 'Shoulders'],
      },
    ],
  } as any;

  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'full-set' }),
    ['Bracelet', 'Shoulders + Skirt'],
  );
});


test('restores Single Arm Piece and Pair of Arm Pieces from exact source quantities', () => {
  const product = {
    canonical_product_id: '3a006050-ab78-4b4d-9964-ed8c9f32e923',
    configurations: [
      {
        configuration_id: 'fca12d8b-7be7-49ac-a35b-ca41f6bc0d79',
        sort_order: 1,
        public_label: 'Arm Pieces',
        component_code: 'arms',
        component_family: 'Arms',
        display_price_amount: 295.09,
      },
      {
        configuration_id: '098a025b-5437-460f-b640-3e57b94e7619',
        sort_order: 2,
        public_label: 'Arm Pieces',
        component_code: 'arms',
        component_family: 'Arms',
        display_price_amount: 159.51,
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(
    offer.atomic_options.map((option) => option.label),
    ['Single Arm Piece', 'Pair of Arm Pieces'],
  );
});

test('restores Bra and Full Set membership for silver bra and skirt set', () => {
  const product = {
    canonical_product_id: '81fc83de-76aa-4733-9a88-f631e7699fa6',
    configurations: [
      {
        configuration_id: '1a2bcbf2-8354-43c8-92b8-c4a4c09274e7',
        sort_order: 1,
        public_label: 'Option',
        component_code: null,
        component_family: null,
        needs_label_review: true,
        display_price_amount: 96.55,
      },
      {
        configuration_id: 'ba7b364f-1b1e-4432-aa87-30287071087e',
        sort_order: 2,
        public_label: 'Skirt',
        component_code: 'skirt',
        component_family: 'Bottom',
        display_price_amount: 135.17,
      },
      {
        configuration_id: '87538880-4abc-4dbb-9be7-8f600d612b2a',
        sort_order: 3,
        public_label: 'Full Set',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_full_set: true,
        bundle_component_codes: ['skirt'],
        bundle_component_labels: ['Skirt'],
        display_price_amount: 175.55,
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['skirt', 'top']);
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: '87538880-4abc-4dbb-9be7-8f600d612b2a' }),
    ['Bra', 'Skirt'],
  );
});


test('restores Sleeves + Leg Covers as one grouped option for the pink rave bodysuit', () => {
  const product = {
    canonical_product_id: 'a97ca78f-ed0d-4f17-a18d-8d54efd2679a',
    configurations: [
      {
        configuration_id: '099731eb-a253-4bdc-81a5-28f8295d93d3',
        sort_order: 1,
        public_label: 'Arm Pieces',
        component_code: 'arms',
        component_family: 'Arms',
        display_price_amount: 95.59,
      },
      {
        configuration_id: '2d7ae103-2aec-4113-9fe1-e6282f3f3a32',
        sort_order: 2,
        public_label: 'Shoulders',
        component_code: 'shoulders',
        component_family: 'Shoulders',
        display_price_amount: 106.21,
      },
      {
        configuration_id: '49312166-a743-45e9-acee-20919b8f6759',
        sort_order: 3,
        public_label: 'Bodysuit',
        component_code: 'bodysuit',
        component_family: 'Bodysuit',
        display_price_amount: 228.22,
      },
      {
        configuration_id: 'b23fa19a-fab6-42c7-95e5-c5056f274fae',
        sort_order: 4,
        public_label: 'Full Set',
        component_code: 'full_set',
        component_family: 'Bundle',
        is_full_set: true,
        bundle_component_codes: ['arms', 'shoulders', 'bodysuit'],
        bundle_component_labels: ['Arm Pieces', 'Shoulders', 'Bodysuit'],
        display_price_amount: 307.21,
      },
    ],
  } as any;

  const offer = resolveStorefrontSellableOffer(product);
  assert.equal(offer.status, 'ready');
  assert.deepEqual(offer.component_codes, ['arms', 'bodysuit', 'legs', 'shoulders']);
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: '099731eb-a253-4bdc-81a5-28f8295d93d3' }),
    ['Sleeves + Leg Covers'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(product, { configuration_id: 'b23fa19a-fab6-42c7-95e5-c5056f274fae' }),
    ['Sleeves + Leg Covers', 'Shoulders', 'Bodysuit'],
  );
});


test('restores Batch28 source-confirmed selectors and bundle members', () => {
  const harness = {
    canonical_product_id: '88d4332c-95bc-4859-a31e-33d6ee89fb4d',
    configurations: [
      { configuration_id: 'dc3b0fea-fc8e-4154-852e-dbdbcc3f6fbf', public_label: 'Option', needs_label_review: true, display_price_amount: 86.9 },
      { configuration_id: 'ee10b92e-397e-41a9-931e-0b398f840591', public_label: 'Option', needs_label_review: true, display_price_amount: 125.52 },
    ],
  } as any;
  const hOffer = resolveStorefrontSellableOffer(harness);
  assert.equal(hOffer.status, 'ready');
  assert.deepEqual(hOffer.atomic_options.map((o) => o.label), ['Vegan Leather Harness', 'Natural Leather Harness']);

  const womens = {
    canonical_product_id: 'c3f1018e-665b-44a8-90db-ecc5bb64eedc',
    configurations: [
      { configuration_id: 'fb7391f0-1a05-4229-8f8f-a6d2c476e5c7', sort_order: 1, public_label: 'Garters', component_code: 'legs', component_family: 'Legs', display_price_amount: 77.24 },
      { configuration_id: '5909c2fb-f536-48e8-a576-b02a2d26f510', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 86.9 },
      { configuration_id: '02c3b18e-eb67-4bb4-aa1a-b4201f8da9c2', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['legs'], bundle_component_labels: ['Garters'], display_price_amount: 140.01 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(womens, { configuration_id: '02c3b18e-eb67-4bb4-aa1a-b4201f8da9c2' }),
    ['Garters', 'Harness'],
  );

  const braPanty = {
    canonical_product_id: 'fdd42158-087b-4190-9eb8-fda7f7460258',
    configurations: [
      { configuration_id: '613184e3-0f00-43ec-8c83-12d97a8b93d1', sort_order: 1, public_label: 'Panties', component_code: 'panties', component_family: 'Bottom', display_price_amount: 106.16 },
      { configuration_id: '5c1081e5-b25b-4fec-9f97-229cdacd46e1', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 120.63 },
      { configuration_id: '8515103f-a153-44c9-a19a-5f4ce76488e2', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['panties'], bundle_component_labels: ['Panties'], display_price_amount: 171.47 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(braPanty, { configuration_id: '8515103f-a153-44c9-a19a-5f4ce76488e2' }),
    ['Panties', 'Top Bra'],
  );

  const corsetSkirt = {
    canonical_product_id: '665296a0-f5ad-422c-837c-868f611c45c6',
    configurations: [
      { configuration_id: '94c75b43-867a-492b-bc03-bb11ef04807e', sort_order: 1, public_label: 'Choker', component_code: 'choker', component_family: 'Neck', display_price_amount: 96.5 },
      { configuration_id: '5925744d-4f17-4c73-b0b8-062f2c702b0d', sort_order: 2, public_label: 'Corset', component_code: 'corset', component_family: 'Top', display_price_amount: 159.23 },
      { configuration_id: 'bc5d078e-6a54-4270-9f17-52c0b55a3dd8', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['choker', 'corset'], bundle_component_labels: ['Choker', 'Corset'], display_price_amount: 183.44 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(corsetSkirt, { configuration_id: 'bc5d078e-6a54-4270-9f17-52c0b55a3dd8' }),
    ['Choker', 'Corset + Skirt'],
  );

  const spineTail = {
    canonical_product_id: 'd17c17b6-76dd-429d-bf5c-ccd432cd1e0f',
    configurations: [
      { configuration_id: '2499f3fb-056f-4d21-bab5-27dad44f9906', sort_order: 1, public_label: 'Tail', component_code: 'tail', component_family: 'Back', display_price_amount: 131.32 },
      { configuration_id: 'faddd671-9041-4c1b-803e-61ac293eee58', sort_order: 2, public_label: 'Belt + Garters', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['belt','legs'], display_price_amount: 97.51 },
      { configuration_id: 'a1fd1a9a-95df-4e1f-be85-51c9f823c889', sort_order: 3, public_label: 'Bra + Shoulders', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['shoulders','top'], display_price_amount: 107.17 },
      { configuration_id: 'bdf66ecc-1c4b-4b40-ba3d-bebcbc230a4f', sort_order: 4, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['tail','belt','legs','top','shoulders'], display_price_amount: 256.15 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(spineTail, { configuration_id: 'bdf66ecc-1c4b-4b40-ba3d-bebcbc230a4f' }),
    ['Spine + Tail', 'Belt + Garters', 'Bra + Shoulders'],
  );
});
