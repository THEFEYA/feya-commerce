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


test('restores Batch29 source-confirmed selectors and Full Set members', () => {
  const captain = {
    canonical_product_id: 'e51e0a66-8358-41f9-bd51-2ab4833b24b3',
    configurations: [
      { configuration_id: '833647ea-bee6-400d-b798-0f6d0b0657d9', sort_order: 1, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 115.81 },
      { configuration_id: '39186d61-fe2e-4cdb-934a-931ec3cdd452', sort_order: 2, public_label: 'Belt', component_code: 'belt', component_family: 'Belt', display_price_amount: 144.76 },
      { configuration_id: '851f004d-6942-4ce8-9250-0e3d1af7687d', sort_order: 3, public_label: 'Choker', component_code: 'choker', component_family: 'Neck', display_price_amount: 144.76 },
      { configuration_id: 'c7277bb1-350a-466b-9074-07e6ca5aecd8', sort_order: 4, public_label: 'Option', needs_label_review: true, display_price_amount: 199.39 },
      { configuration_id: '9b1052a5-83d3-40ce-a402-4dba22ee0edb', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','belt','choker'], display_price_amount: 470.56 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(captain, { configuration_id: '9b1052a5-83d3-40ce-a402-4dba22ee0edb' }),
    ['Bracelet', 'Belt', 'Choker', 'Chest Armor'],
  );

  const whiteMens = {
    canonical_product_id: 'b0b2a75c-f301-45d6-857c-dd6575862619',
    configurations: [
      { configuration_id: '86121b07-a7c8-4836-bf2b-2c5528ddaca5', sort_order: 1, public_label: 'Gloves', component_code: 'arms', component_family: 'Arms', display_price_amount: 115.81 },
      { configuration_id: 'a7aa21cf-cf0e-4975-92f0-0c21cdf84f59', sort_order: 2, public_label: 'Panties', component_code: 'panties', component_family: 'Bottom', display_price_amount: 120.63 },
      { configuration_id: '3450d3fb-3d5a-4237-9408-04e26bc8372e', sort_order: 3, public_label: 'Shoulders', component_code: 'arms', component_family: 'Arms', display_price_amount: 164.06 },
      { configuration_id: 'da2b43a3-d0ca-409c-86a9-da2802265bb4', sort_order: 4, public_label: 'Leg Covers', component_code: 'legs', component_family: 'Legs', display_price_amount: 173.70 },
      { configuration_id: 'b734518a-b6c3-423d-b958-e850f177f16b', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','panties','legs'], display_price_amount: 398.78 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(whiteMens, { configuration_id: 'b734518a-b6c3-423d-b958-e850f177f16b' }),
    ['Gloves', 'Panties', 'Shoulder + Arm', 'Leg Covers'],
  );

  const plague = {
    canonical_product_id: '98600aa8-307b-4165-a8ae-38e347c114bd',
    configurations: [
      { configuration_id: '13e9270d-ee80-4d75-bf19-0e615e41106c', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 263.33 },
      { configuration_id: '5bd65d9b-4a5c-4ccc-8b2b-7c2f86bc6c14', sort_order: 2, public_label: 'Skirt Only', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 159.59 },
      { configuration_id: '44f68b45-228f-4a68-bbf9-dc0651c3376d', sort_order: 3, public_label: 'Mask', component_code: 'mask', component_family: 'Headpiece', display_price_amount: 183.53 },
      { configuration_id: '503f6911-329b-462e-aff6-5285f4800c09', sort_order: 4, public_label: 'Collar', component_code: 'collar', component_family: 'Neck', display_price_amount: 154.49 },
      { configuration_id: '7ce46a04-57e2-4dc1-8437-663b025fe216', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['mask','collar','skirt'], display_price_amount: 414.94 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(plague, { configuration_id: '7ce46a04-57e2-4dc1-8437-663b025fe216' }),
    ['Mask', 'Collar + Skirt'],
  );

  const dragon = {
    canonical_product_id: '27786636-7021-4809-8e81-7f566a3436ae',
    configurations: [
      { configuration_id: 'edfc3ca4-f4f3-418f-82d8-7118ce7eeb3e', sort_order: 1, public_label: 'Gloves', component_code: 'arms', component_family: 'Arms', display_price_amount: 96.55 },
      { configuration_id: 'dcb90a35-4f84-4ac9-8266-95d378b0daec', sort_order: 2, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 101.39 },
      { configuration_id: '30497b10-c3af-48ab-9cc7-c93ecb7abc74', sort_order: 3, public_label: 'Spine', component_code: 'spine', component_family: 'Back', display_price_amount: 144.83 },
      { configuration_id: 'aa191cfa-b741-4978-b957-d44556735457', sort_order: 4, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 239.39 },
      { configuration_id: '89aa265a-8c2e-4e25-a56f-ec72b4f39644', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','shoulders','spine','bodysuit'], display_price_amount: 462.82 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(dragon, { configuration_id: '89aa265a-8c2e-4e25-a56f-ec72b4f39644' }),
    ['Gloves', 'Shoulders', 'Spine + Tail', 'Bodysuit'],
  );
});


test('restores Batch30 source-confirmed selectors', () => {
  const necklaceBelt = {
    canonical_product_id: 'abf11fbb-9794-484d-b93c-1449fa3a9a44',
    configurations: [
      { configuration_id: '8995c12a-4d56-4fd8-b656-9cec86e108f7', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 86.9 },
      { configuration_id: 'fec2875f-7f6e-4c29-9119-bb2d8f899d83', sort_order: 2, public_label: 'Belt', component_code: 'belt', component_family: 'Belt', display_price_amount: 108.03 },
      { configuration_id: '1f004691-a2d9-4af9-9d4f-98d44fc361f6', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['belt'], display_price_amount: 171.41 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(necklaceBelt, { configuration_id: '1f004691-a2d9-4af9-9d4f-98d44fc361f6' }),
    ['Necklace', 'Belt'],
  );

  const silver = {
    canonical_product_id: 'f27fdb4d-d007-4d4c-899c-a50728c1ea4d',
    configurations: [
      { configuration_id: '89124658-8255-45ee-8321-f17f19283251', sort_order: 1, public_label: 'Top', component_code: 'top', component_family: 'Top', display_price_amount: 144.76 },
      { configuration_id: '335deb18-22fe-45b1-99d5-89916a336f52', sort_order: 2, public_label: 'Panties', component_code: 'panties', component_family: 'Bottom', display_price_amount: 159.51 },
      { configuration_id: 'c93f9e36-0295-4595-8ff0-ab8889f335f5', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['top','panties'], display_price_amount: 255.22 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(silver, { configuration_id: 'c93f9e36-0295-4595-8ff0-ab8889f335f5' }),
    ['Top', 'Belt + Panties'],
  );

  const harness = {
    canonical_product_id: '11bb0057-8c1f-4347-8c03-46856df0653c',
    configurations: [
      { configuration_id: 'e0aff685-a16a-4c69-991d-d6e60d6e9021', sort_order: 1, public_label: 'Garters', component_code: 'legs', component_family: 'Legs', display_price_amount: 67.56 },
      { configuration_id: '4f3d2d7a-e230-4180-880b-5f9e7719d25e', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 77.2 },
      { configuration_id: '4a3527f6-9140-4309-b380-5d033a66bc01', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['legs'], display_price_amount: 125.45 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(harness, { configuration_id: '4a3527f6-9140-4309-b380-5d033a66bc01' }),
    ['Top Harness', 'Garters'],
  );

  const wings = {
    canonical_product_id: '12a0faf1-9c3c-44e2-bbf1-1583ac309a46',
    configurations: [
      { configuration_id: '0ff29db2-de7e-4c99-8ea0-7911dff6a4a8', sort_order: 1, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 77.24 },
      { configuration_id: '9aa6c030-60d2-431d-91f2-a811d2f6d6cd', sort_order: 2, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 77.24 },
      { configuration_id: 'cc57ca5d-0a9d-4303-801d-bf4c40434f82', sort_order: 3, public_label: 'Headpiece', component_code: 'headpiece', component_family: 'Headpiece', display_price_amount: 106.21 },
      { configuration_id: '1e6858cb-4d81-41b5-81f0-eecc3cff4715', sort_order: 4, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 144.83 },
      { configuration_id: 'f3544426-4ebb-4aca-b0f7-f37251e2aa63', sort_order: 5, public_label: 'Wings', component_code: 'wings', component_family: 'Wings', display_price_amount: 199.49 },
      { configuration_id: 'b5c06f4a-4de8-4183-9e0a-6c1fb997ca62', sort_order: 6, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','headpiece','bodysuit','wings'], display_price_amount: 446.86 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(wings, { configuration_id: 'b5c06f4a-4de8-4183-9e0a-6c1fb997ca62' }),
    ['Hand Bracelets', 'Leg Bracelets', 'Headpiece', 'Bodysuit', 'Wings'],
  );

  const warrior = {
    canonical_product_id: '7bf47f01-8114-4e8f-ba96-632f0fdd8d7d',
    configurations: [
      { configuration_id: '077e7c8b-0eda-4ae0-a52c-18a05f91c897', sort_order: 1, public_label: 'Gloves', component_code: 'arms', component_family: 'Arms', display_price_amount: 86.85 },
      { configuration_id: 'c1483d69-73cc-4876-8359-d5eb16e3166d', sort_order: 2, public_label: 'Mask', component_code: 'mask', component_family: 'Headpiece', display_price_amount: 96.5 },
      { configuration_id: '2002c029-1cd2-4717-b3d7-744ad1203baf', sort_order: 3, public_label: 'Option', needs_label_review: true, display_price_amount: 106.16 },
      { configuration_id: '77b75eaf-5cee-4e17-966f-485a2cced59f', sort_order: 4, public_label: 'Option', needs_label_review: true, display_price_amount: 115.81 },
      { configuration_id: 'c97fc92a-2ac8-4c99-8fd5-54fba1e1a055', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','mask'], display_price_amount: 239.27 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(warrior, { configuration_id: 'c97fc92a-2ac8-4c99-8fd5-54fba1e1a055' }),
    ['Gloves', 'Mask', 'Hood', 'Pants'],
  );
});


test('restores Batch31 source-confirmed selectors', () => {
  const goldBraSkirt = {
    canonical_product_id: '9c845a5a-666a-47b4-99d6-9f0a393bfa1c',
    configurations: [
      { configuration_id: '9961e3f9-37b1-4e2e-9d0e-b670cdc67b62', sort_order: 1, public_label: 'Choker', component_code: 'choker', component_family: 'Neck', display_price_amount: 91.68 },
      { configuration_id: '818451e6-b589-4d96-8628-0e4e3ceb9395', sort_order: 2, public_label: 'Skirt', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 139.93 },
      { configuration_id: 'bb0a0060-bbea-41af-8271-5d3552996539', sort_order: 3, public_label: 'Option', needs_label_review: true, display_price_amount: 164.06 },
      { configuration_id: '436d2875-a50e-4c10-b8a4-cc06e17d620d', sort_order: 4, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['choker','skirt'], display_price_amount: 327 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(goldBraSkirt, { configuration_id: '436d2875-a50e-4c10-b8a4-cc06e17d620d' }),
    ['Choker', 'Skirt', 'Bra'],
  );

  const silverCorset = {
    canonical_product_id: 'f36acd08-1591-4e15-8ad2-96bc22ec4b77',
    configurations: [
      { configuration_id: 'ab79b367-2ed4-491a-bfc0-b362641a7fd0', sort_order: 1, public_label: 'Garters', component_code: 'legs', component_family: 'Legs', display_price_amount: 86.9 },
      { configuration_id: '61cc3a4e-68c5-49c3-8bc8-8ad821a62d31', sort_order: 2, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 96.55 },
      { configuration_id: '0c5a6e8e-9af6-4aeb-8ad8-901553f6b29d', sort_order: 3, public_label: 'Corset', component_code: 'corset', component_family: 'Top', display_price_amount: 178.63 },
      { configuration_id: 'c9751d15-d524-4194-a99d-b1bf7fd74f32', sort_order: 4, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['legs','arms','corset'], display_price_amount: 255.35 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(silverCorset, { configuration_id: 'c9751d15-d524-4194-a99d-b1bf7fd74f32' }),
    ['Garters', 'Leg Bracelets', 'Corset'],
  );

  const butterfly = {
    canonical_product_id: '8242d255-f77f-4e9f-88a2-a5db326fa297',
    configurations: [
      { configuration_id: 'e39a252e-b943-40b7-984f-11645c92d22a', sort_order: 1, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 96.55 },
      { configuration_id: '608e71bb-dfcd-407d-9cd1-b3a51689f984', sort_order: 2, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 96.55 },
      { configuration_id: '0cfd7bdb-9515-4f40-97bf-9539f0b21241', sort_order: 3, public_label: 'Spine', component_code: 'spine', component_family: 'Back', display_price_amount: 101.39 },
      { configuration_id: 'b9c93906-4408-4a88-9dfb-83193e2c726c', sort_order: 4, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 178.63 },
      { configuration_id: '2a88b9d4-efda-4bb1-a567-c42902e170ab', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','spine','bodysuit'], display_price_amount: 319.18 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(butterfly, { configuration_id: '2a88b9d4-efda-4bb1-a567-c42902e170ab' }),
    ['Hand Bracelets', 'Leg Bracelets', 'Spine', 'Bodysuit'],
  );

  const horns = {
    canonical_product_id: '8b4e23fd-456e-462b-a6b3-8aaa0333debe',
    configurations: [
      { configuration_id: 'ca3cfea5-3c0e-4da8-a0fa-c5e265517816', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 144.76 },
      { configuration_id: '2dfdd6fd-9e1b-4a6c-8238-fc887d8318ba', sort_order: 2, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 151.54 },
      { configuration_id: 'b89c570d-4bee-4b03-85cb-b8b63cde02d2', sort_order: 3, public_label: 'Horns', component_code: 'horns', component_family: 'Headpiece', display_price_amount: 187.43 },
      { configuration_id: '49d804d9-5a42-4700-8dff-6758ad32646c', sort_order: 4, public_label: 'Leg Covers', component_code: 'legs', component_family: 'Legs', display_price_amount: 159.51 },
      { configuration_id: 'a2c35e0d-65fc-4906-8096-eb1a4042aba0', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['shoulders','horns','legs'], display_price_amount: 546.32 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(horns, { configuration_id: 'a2c35e0d-65fc-4906-8096-eb1a4042aba0' }),
    ['Chest', 'Shoulders', 'Horns', 'Leg Covers'],
  );

  const goddess = {
    canonical_product_id: '5e034423-6c04-459b-b7d7-0d10ad564c4e',
    configurations: [
      { configuration_id: '90665dc5-1860-4f1d-8c02-f10511ff7f0f', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 77.2 },
      { configuration_id: 'b85fe542-6eaa-489c-99cd-ef8a54ea9a9d', sort_order: 2, public_label: 'Skirt', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 139.93 },
      { configuration_id: '43c218a1-a524-4a3b-96cd-78f9b4b8a52b', sort_order: 3, public_label: 'Top + Shoulders', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['shoulders','top'], display_price_amount: 159.51 },
      { configuration_id: 'ce965e08-8741-442a-a490-ea9a01251148', sort_order: 4, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['skirt','top','shoulders'], display_price_amount: 287.12 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(goddess, { configuration_id: 'ce965e08-8741-442a-a490-ea9a01251148' }),
    ['Headpiece', 'Skirt', 'Top + Shoulders'],
  );
});


test('restores Batch32 source-confirmed selectors', () => {
  const silverArmor = {
    canonical_product_id: '85752f94-b2d7-465e-ace2-40bb77977461',
    configurations: [
      { configuration_id: '3c110b4c-789b-4259-84d2-6b9724dc7ca3', sort_order: 1, public_label: 'Arm Pieces', component_code: 'arms', component_family: 'Arms', display_price_amount: 114.05 },
      { configuration_id: 'c0fcd4b1-e2fe-4823-902e-22abab90e0c7', sort_order: 2, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 149.14 },
      { configuration_id: '0a8924ce-fa3b-48d4-9206-2c5436da4efb', sort_order: 3, public_label: 'Leg Covers', component_code: 'legs', component_family: 'Legs', display_price_amount: 166.76 },
      { configuration_id: '4c68e492-284e-489c-9107-97abb09d067e', sort_order: 4, public_label: 'Belt', component_code: 'belt', component_family: 'Belt', display_price_amount: 175.46 },
      { configuration_id: 'e1840e34-e7ea-417d-9f2f-9fefc30bfd34', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','shoulders','legs','belt'], bundle_component_labels: ['Arm Pieces','Shoulders','Leg Covers','Belt'], display_price_amount: 435.03 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(silverArmor, { configuration_id: '3c110b4c-789b-4259-84d2-6b9724dc7ca3' }),
    ['Arm Covers'],
  );

  const femaleWarrior = {
    canonical_product_id: 'ec204df6-13b6-4deb-b493-04391501d72d',
    configurations: [
      { configuration_id: '8f4d5900-a373-4721-804c-a9741aba9067', sort_order: 1, public_label: 'Choker', component_code: 'choker', component_family: 'Neck', display_price_amount: 57.93 },
      { configuration_id: '0a628744-de0b-466a-8345-73d96b1aa411', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 86.90 },
      { configuration_id: '38d57f4d-0cb4-4d41-962e-1022aa2d4f75', sort_order: 3, public_label: 'Arm Guards', component_code: 'arms', component_family: 'Arms', display_price_amount: 115.87 },
      { configuration_id: '970e0500-8f89-4c6b-ac34-b9832bbc6ae7', sort_order: 4, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 125.52 },
      { configuration_id: '776ff6d5-2910-45af-a949-9b2b29dac7cb', sort_order: 5, public_label: 'Belt + Garters', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['belt','legs'], display_price_amount: 115.87 },
      { configuration_id: '791c60df-1bdf-44ef-b851-70da0b483f34', sort_order: 6, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['choker','arms','shoulders','belt','legs'], display_price_amount: 319.18 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(femaleWarrior, { configuration_id: '791c60df-1bdf-44ef-b851-70da0b483f34' }),
    ['Choker', 'Bra', 'Arm Guards', 'Shoulders', 'Belt + Garters'],
  );

  const catCostume = {
    canonical_product_id: 'c7b07eb1-d003-471b-a3f9-40b1c98edc19',
    configurations: [
      { configuration_id: 'aee72315-b8b1-42ca-8886-e231bc85008c', sort_order: 1, public_label: 'Bracelet', component_code: 'arms', component_family: 'Arms', display_price_amount: 77.24 },
      { configuration_id: '9b311634-c1fb-4219-8de4-cc9cf343b683', sort_order: 2, public_label: 'Mask', component_code: 'mask', component_family: 'Headpiece', display_price_amount: 96.55 },
      { configuration_id: 'd721e11e-2a8c-4b14-9911-db477659b69b', sort_order: 3, public_label: 'Option', needs_label_review: true, display_price_amount: 144.83 },
      { configuration_id: '0d4d3fd4-96c2-4a97-86c1-21238c723c0f', sort_order: 4, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['arms','mask'], display_price_amount: 223.43 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(catCostume, { configuration_id: '0d4d3fd4-96c2-4a97-86c1-21238c723c0f' }),
    ['Bracelets', 'Cat Mask', 'Metallic Top'],
  );

  const corsetSkirt = {
    canonical_product_id: 'fba170e8-582d-45fa-b954-f9136e733950',
    configurations: [
      { configuration_id: '59389c1f-eac0-417a-b795-32c64999d4ea', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 82.07 },
      { configuration_id: 'b2c4dde9-1dff-471a-b4fd-8c7584e597dd', sort_order: 2, public_label: 'Corset', component_code: 'corset', component_family: 'Top', display_price_amount: 159.31 },
      { configuration_id: '8055183e-7d31-4ff2-8526-5de87920c9c4', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['corset'], display_price_amount: 175.55 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(corsetSkirt, { configuration_id: '8055183e-7d31-4ff2-8526-5de87920c9c4' }),
    ['Necklace', 'Corset + Skirt'],
  );

  const goldArms = {
    canonical_product_id: '0395cb11-424f-407f-a849-7ee3b617ab57',
    configurations: [
      { configuration_id: '725e27b2-5598-4802-b7e0-abcc568212c6', sort_order: 1, public_label: 'Choker', component_code: 'choker', component_family: 'Neck', display_price_amount: 78.96 },
      { configuration_id: 'f5cf58e2-1faf-47a9-8e01-94dedf29f96e', sort_order: 2, public_label: 'Arm Guards', component_code: 'arms', component_family: 'Arms', display_price_amount: 105.28 },
      { configuration_id: '437e08e1-7d01-4b39-9c8e-98f7fc2349d5', sort_order: 3, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 122.82 },
      { configuration_id: '3dfe2387-06f1-479c-9750-f2cd5946b27c', sort_order: 4, public_label: 'Arm Pieces', component_code: 'arms', component_family: 'Arms', display_price_amount: 144.76 },
      { configuration_id: '92c052c7-85a6-47db-a4b8-f4e651990122', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['choker','arms','shoulders'], display_price_amount: 308.15 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(goldArms, { configuration_id: '92c052c7-85a6-47db-a4b8-f4e651990122' }),
    ['Choker', 'Forearm Bracers', 'Shoulders', 'Bicep Armor'],
  );
});


test('restores Batch33 source-confirmed selectors', () => {
  const gogo = {
    canonical_product_id: '09f51ad4-6b90-4311-aa5a-54f91cf4b7bf',
    configurations: [
      { configuration_id: 'fc29dc91-5b12-4afc-8975-bf70564b477b', sort_order: 1, public_label: 'Skirt', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 86.85 },
      { configuration_id: '2484dd66-949f-4802-bbd4-98b4ac15038e', sort_order: 2, public_label: 'Leg Covers', component_code: 'legs', component_family: 'Legs', display_price_amount: 144.76 },
      { configuration_id: '013bdda3-6988-4cc5-9132-c7be6f6ab0d2', sort_order: 3, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 175.46 },
      { configuration_id: 'b1368ad3-bf47-4b33-85de-075f9e3b59d4', sort_order: 4, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 271.17 },
      { configuration_id: '7869ea43-14f0-4ec0-93f3-5e27aeca61d3', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['skirt','legs','bodysuit'], display_price_amount: 334.97 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(gogo, { configuration_id: 'b1368ad3-bf47-4b33-85de-075f9e3b59d4' }),
    ['Bodysuit + Leg Covers'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(gogo, { configuration_id: '7869ea43-14f0-4ec0-93f3-5e27aeca61d3' }),
    ['Bodysuit + Leg Covers', 'Skirt'],
  );

  const goldSet = {
    canonical_product_id: 'a9fa4b69-4f79-4669-bd60-783a05d12296',
    configurations: [
      { configuration_id: '97bdbe7e-6459-47f0-a7a3-52d02e6717c6', sort_order: 1, public_label: 'Skirt Only', component_code: 'skirt', component_family: 'Bottom', display_price_amount: 135.10 },
      { configuration_id: '95a37f98-fd4a-4d58-856a-0aae63cfc356', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 173.70 },
      { configuration_id: '8eaecdf5-89d4-48bb-89de-d6b00199a86d', sort_order: 3, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['skirt'], display_price_amount: 231.29 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(goldSet, { configuration_id: '8eaecdf5-89d4-48bb-89de-d6b00199a86d' }),
    ['Skirt Only', 'Bra'],
  );

  const punk = {
    canonical_product_id: 'a606be83-50aa-462d-ae54-04e9ce7aeb3b',
    configurations: [
      { configuration_id: 'fe58da32-305d-430a-9716-011ada8d0e11', sort_order: 1, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 72.41 },
      { configuration_id: '4bf170d2-fb03-4779-9396-f0ba6fc37c5d', sort_order: 2, public_label: 'Headpiece', component_code: 'headpiece', component_family: 'Headpiece', display_price_amount: 111.04 },
      { configuration_id: '89910e30-41ce-443b-a804-61ce04dd6b7e', sort_order: 3, public_label: 'Bodysuit', component_code: 'bodysuit', component_family: 'Bodysuit', display_price_amount: 164.14 },
      { configuration_id: '157067db-2982-4f1f-9f0b-37cab846a51a', sort_order: 4, public_label: 'Shoulders', component_code: 'shoulders', component_family: 'Shoulders', display_price_amount: 167.57 },
      { configuration_id: '1c064cd6-426e-47ea-8286-257694320da6', sort_order: 5, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['shoulders','headpiece','bodysuit'], display_price_amount: 255.35 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(punk, { configuration_id: '157067db-2982-4f1f-9f0b-37cab846a51a' }),
    ['Bodysuit + Shoulders'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(punk, { configuration_id: '1c064cd6-426e-47ea-8286-257694320da6' }),
    ['Headpiece', 'Bodysuit + Shoulders'],
  );

  const suspenders = {
    canonical_product_id: '882793f6-15ca-4617-a579-5cd47290ce72',
    configurations: [
      { configuration_id: 'ac83c38f-b1b7-420f-b0a9-7ff5b7eb3b4a', sort_order: 1, public_label: 'Option', needs_label_review: true, display_price_amount: 120.69 },
      { configuration_id: '86d29b33-ef45-49cf-8682-a7685f4596bf', sort_order: 2, public_label: 'Option', needs_label_review: true, display_price_amount: 131.25 },
      { configuration_id: '9cf4b355-2c03-4c05-b5ba-2ca8c49ab572', sort_order: 3, public_label: 'Option', needs_label_review: true, display_price_amount: 147.11 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(suspenders, { configuration_id: 'ac83c38f-b1b7-420f-b0a9-7ff5b7eb3b4a' }),
    ['Black Suspenders'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(suspenders, { configuration_id: '9cf4b355-2c03-4c05-b5ba-2ca8c49ab572' }),
    ['Brown Suspenders'],
  );

  const witch = {
    canonical_product_id: '340b160f-93e3-4389-866f-df79cc14dea8',
    configurations: [
      { configuration_id: '72607ec1-b1c0-4ed9-9c72-a2b9995d26ad', sort_order: 1, public_label: 'Corset', component_code: 'corset', component_family: 'Top', display_price_amount: 106.21 },
      { configuration_id: '9953f1b1-5070-4548-9e85-30515c4d6d0c', sort_order: 2, public_label: 'Spine', component_code: 'spine', component_family: 'Back', display_price_amount: 125.52 },
      { configuration_id: '4250b01d-b53b-4254-b6d1-177d1f81a177', sort_order: 3, public_label: 'Horns', component_code: 'horns', component_family: 'Headpiece', display_price_amount: 159.59 },
      { configuration_id: '5c021829-cffc-4374-ab4e-d252b5485732', sort_order: 4, public_label: 'Corset', component_code: 'corset', component_family: 'Top', display_price_amount: 175.55 },
      { configuration_id: 'cd7ad222-27cb-4747-a024-b544b352195d', sort_order: 5, public_label: 'Horns', component_code: 'horns', component_family: 'Headpiece', display_price_amount: 247.37 },
      { configuration_id: '5357d9c4-e0a7-4324-9562-43a98d301872', sort_order: 6, public_label: 'Horns + Corset', component_code: 'bundle', component_family: 'Bundle', is_bundle: true, bundle_component_codes: ['corset','horns'], display_price_amount: 231.41 },
      { configuration_id: '81abfb43-d889-41cf-a70c-577ef1f51ebf', sort_order: 7, public_label: 'Full Set', component_code: 'full_set', component_family: 'Bundle', is_full_set: true, bundle_component_codes: ['corset','spine','horns'], display_price_amount: 311.20 },
    ],
  } as any;
  assert.deepEqual(
    storefrontIncludedOptions(witch, { configuration_id: '5c021829-cffc-4374-ab4e-d252b5485732' }),
    ['Corset + Spine'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(witch, { configuration_id: 'cd7ad222-27cb-4747-a024-b544b352195d' }),
    ['Horns + Spine'],
  );
  assert.deepEqual(
    storefrontIncludedOptions(witch, { configuration_id: '81abfb43-d889-41cf-a70c-577ef1f51ebf' }),
    ['Horns', 'Corset + Spine'],
  );
});
