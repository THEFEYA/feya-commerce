import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExtraLines, computeCheckoutAmounts, decimalToMinor, minorToDecimal, CheckoutPricingError,
} from '../../lib/payments/pricing.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {CONFIG_FULL, CONFIG_TOP, PRODUCT_A_ID, lineA, productA, productB, CONFIG_B, PRODUCT_B_ID} from './fixtures.ts';

const priced = (product = productA(), overrides: Record<string, unknown> = {}) =>
  priceCartLine(product, lineA(overrides) as Parameters<typeof priceCartLine>[1]);

test('server price comes from the published product, not from the browser', () => {
  const line = priced(productA(), {client_unit_minor: 1});
  assert.equal(line.unit_minor, 18900);
  assert.equal(line.line_minor, 18900);
  assert.equal(line.price_changed, true);
  assert.equal(line.title, 'Mirror Festival Set');
  assert.match(line.option_label, /Full Set/);
});

test('fractional euro prices are converted exactly to cents', () => {
  const line = priced(productA(), {id: `${PRODUCT_A_ID}-${CONFIG_TOP}-S-Gold`, configuration_id: CONFIG_TOP,
    size: 'S', color: 'Gold', quantity: 3, client_unit_minor: 8950});
  assert.equal(line.unit_minor, 8950);
  assert.equal(line.line_minor, 26850);
  assert.equal(line.price_changed, false);
});

test('tampered or stale bag lines are refused', () => {
  assert.throws(() => priced(productA(), {configuration_id: CONFIG_B}), /checkout_option_unavailable/);
  assert.throws(() => priced(productA(), {slug: 'other-product'}), /checkout_product_mismatch/);
  assert.throws(() => priced(productA(), {id: `${PRODUCT_B_ID}-x`}), /checkout_product_mismatch/);
  assert.throws(() => priced(productA(), {size: 'XXXXL'}), /checkout_size_invalid/);
  assert.throws(() => priced(productA(), {color: 'Purple'}), /checkout_color_invalid/);
  const unpriced = productA() as unknown as {configurations: Record<string, unknown>[]};
  unpriced.configurations[0].display_price_amount = null;
  assert.throws(() => priced(unpriced as never), /checkout_option_unpriced/);
  const usd = productA() as unknown as {configurations: Record<string, unknown>[]};
  usd.configurations[0].currency = 'USD';
  assert.throws(() => priced(usd as never), /checkout_currency_unsupported/);
});

test('one listing in several variants pays no extra packaging', () => {
  const a = priced();
  const b = priced(productA(), {id: `${PRODUCT_A_ID}-${CONFIG_TOP}-S-Gold`, configuration_id: CONFIG_TOP, size: 'S', color: 'Gold'});
  const amounts = computeCheckoutAmounts({lines: [a, b], extras: [], method: 'standard', country: 'DE'});
  assert.equal(amounts.handling_minor, 0);
  assert.equal(amounts.shipping_minor, 1900);
  assert.equal(amounts.total_minor, 18900 + 8950 + 1900);
});

test('€5 per additional distinct listing, Express €35, remote AU/MX/NZ +€20 once', () => {
  const a = priced();
  const b = priceCartLine(productB(), {id: `${PRODUCT_B_ID}-${CONFIG_B}-M-Silver`, slug: 'chrome-mask', configuration_id: CONFIG_B,
    size: 'M', color: 'Silver', quantity: 2, wearer: null, made_to_measure: false, client_unit_minor: null});
  const amounts = computeCheckoutAmounts({lines: [a, b], extras: [], method: 'express', country: 'AU'});
  assert.equal(amounts.handling_minor, 500);
  assert.equal(amounts.shipping_minor, 3500);
  assert.equal(amounts.remote_minor, 2000);
  assert.equal(amounts.total_minor, 18900 + 9000 + 3500 + 2000 + 500);
  assert.equal(computeCheckoutAmounts({lines: [a], extras: [], method: 'standard', country: 'US'}).remote_minor, 0);
  assert.equal(computeCheckoutAmounts({lines: [a], extras: [], method: 'standard', country: 'NZ'}).remote_minor, 2000);
});

test('extras: €15 per made-to-measure piece, gift card €10, gift box €25', () => {
  const a = priced(productA(), {made_to_measure: true, quantity: 2});
  const extras = buildExtraLines([a], {giftCard: true, giftBox: true});
  assert.deepEqual(extras.map(e => [e.code, e.quantity, e.amount_minor]), [
    ['made_to_measure', 2, 3000], ['gift_card', 1, 1000], ['gift_box', 1, 2500]]);
  const amounts = computeCheckoutAmounts({lines: [a], extras, method: 'standard', country: 'FR'});
  assert.equal(amounts.extras_minor, 6500);
  assert.equal(amounts.total_minor, 37800 + 6500 + 1900);
  assert.equal(amounts.tax_minor, 0);
});

test('invalid arithmetic or ranges are rejected', () => {
  const a = priced();
  assert.throws(() => computeCheckoutAmounts({lines: [{...a, line_minor: 1}], extras: [], method: 'standard', country: 'DE'}), CheckoutPricingError);
  assert.throws(() => computeCheckoutAmounts({lines: [], extras: [], method: 'standard', country: 'DE'}), /checkout_lines_invalid/);
  assert.throws(() => computeCheckoutAmounts({lines: [a], extras: [], method: 'overnight' as never, country: 'DE'}), /checkout_method_invalid/);
});

test('money formatting is exact', () => {
  assert.equal(minorToDecimal(0), '0.00');
  assert.equal(minorToDecimal(5), '0.05');
  assert.equal(minorToDecimal(21400), '214.00');
  assert.equal(minorToDecimal(8950), '89.50');
  assert.equal(decimalToMinor('214.00'), 21400);
  assert.equal(decimalToMinor('89.5'), 8950);
  assert.equal(decimalToMinor('19'), 1900);
  assert.equal(decimalToMinor('1.005'), null);
  assert.equal(decimalToMinor('-1.00'), null);
  assert.equal(decimalToMinor(12 as unknown as string), null);
});


test('a source-confirmed paired set preserves two owner-approved fits at one list price', () => {
  const ownerId = 'a759b44e-1329-47a6-a444-0c9feabcc0ce';
  const product = {...productA(), canonical_product_id: ownerId} as unknown as {configurations: Record<string, unknown>[]};
  product.configurations[0] = {
    ...product.configurations[0],
    source_confirmed_bundle_members: true,
    bundle_component_codes: ['women_outfit', 'men_outfit'],
  };
  const selection = {women: {size: 'S', color: 'gold'}, men: {size: 'XL', color: 'silver'}};
  const valid = {
    ...lineA(), id: `${ownerId}-${CONFIG_FULL}-S-Gold-XL-Silver`, wearer: null,
    size: 'S', color: 'Gold', color_code: 'gold', paired_selection: selection,
  };
  const pricedPair = priceCartLine(product as never, valid);
  assert.equal(pricedPair.unit_minor, 18900);
  assert.deepEqual(pricedPair.paired_selection, selection);
  assert.equal(computeCheckoutAmounts({lines: [pricedPair], extras: [], method: 'standard', country: 'US'}).total_minor, 20800);
  assert.throws(() => priceCartLine(product as never, {...valid, paired_selection: null}), /checkout_paired_selection_required/);
  assert.throws(() => priceCartLine(product as never, {...valid, size: 'XL'}), /checkout_paired_selection_invalid/);
  assert.throws(() => priceCartLine(product as never, {...valid, paired_selection: {...selection, men: {size: 'XL', color: 'purple'}}}), /checkout_color_invalid/);
  const fakePair = {...product, configurations: [{...product.configurations[0], source_confirmed_bundle_members: false}]};
  assert.throws(() => priceCartLine(fakePair as never, valid), /checkout_paired_selection_invalid/);
});

test('exact source-color price exception refuses unpriced White or switched Brown price', () => {
  const id = 'de38a842-37c4-40a7-86b4-393341c4c9aa';
  const brown = '4b56be10-1771-4a5c-9daa-6ae70e8650f0';
  const variants = [
    {configuration_id: brown, public_label: 'Brown', configuration_color: 'Brown', display_price_amount: 140},
    {configuration_id: 'e689d3b4-acc1-4fa2-ad12-4463207fcdd9', public_label: 'Black', configuration_color: 'Black', display_price_amount: 160},
    {configuration_id: '9a3cd61f-e87f-4590-b39f-b143e75ca0f7', public_label: 'Green', configuration_color: 'Green', display_price_amount: 170},
  ];
  const product = {...productA(), canonical_product_id:id, color_options:['Brown','Black','Green'], configurations: variants};
  const input = {...lineA(), id: `${id}-${brown}-M-Brown`, slug:'mirror-festival-set', configuration_id:brown,
    size:'M', color:'Brown', color_code:'brown', wearer:'women' as const};
  assert.equal(priceCartLine(product as never, input).unit_minor, 14000);
  assert.throws(() => priceCartLine(product as never, {...input, color:'White', color_code:'white'}), /checkout_option_unpriced/);
  assert.throws(() => priceCartLine(product as never, {...input, color:'Brown', color_code:'black'}), /checkout_color_invalid/);
});

test('custom measurements charge once per actual customized outfit, including two people in one set', () => {
  const base = priced();
  const pair = {
    women: {size: 'Custom', color: 'Gold'},
    men: {size: 'XL', color: 'Silver'},
  };
  const oneCustom = {...base, size: 'Custom', color: 'Gold', paired_selection: pair, made_to_measure: true, quantity: 2};
  assert.deepEqual(buildExtraLines([oneCustom], {giftCard: false, giftBox: false})
    .map(extra => [extra.code, extra.quantity, extra.amount_minor]), [['made_to_measure', 2, 3000]]);
  const bothCustom = {...oneCustom, paired_selection: {...pair, men: {size: 'Custom', color: 'Silver'}}};
  assert.deepEqual(buildExtraLines([bothCustom], {giftCard: false, giftBox: false})
    .map(extra => [extra.code, extra.quantity, extra.amount_minor]), [['made_to_measure', 4, 6000]]);
  assert.throws(() => buildExtraLines([{...oneCustom, made_to_measure: false}], {giftCard: false, giftBox: false}),
    /checkout_custom_measurements_required/);
  assert.throws(() => buildExtraLines([{...base, size: 'Custom', made_to_measure: false}], {giftCard: false, giftBox: false}),
    /checkout_custom_measurements_required/);
  const paidSingle = buildExtraLines([{...base, size: 'Custom', made_to_measure: true}], {giftCard: false, giftBox: false});
  assert.equal(paidSingle[0].amount_minor, 1500);
});
