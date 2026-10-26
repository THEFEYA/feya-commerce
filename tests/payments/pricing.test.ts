import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExtraLines, computeCheckoutAmounts, decimalToMinor, minorToDecimal, CheckoutPricingError,
} from '../../lib/payments/pricing.ts';
import {priceCartLine} from '../../lib/payments/catalogLinePricing.ts';
import {CONFIG_TOP, PRODUCT_A_ID, lineA, productA, productB, CONFIG_B, PRODUCT_B_ID} from './fixtures.ts';

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


test('a confirmed paired set stores both fits but charges the published set price only once', () => {
  const product = productA() as unknown as {configurations: Record<string, unknown>[]};
  product.configurations[0] = {
    ...product.configurations[0],
    source_confirmed_bundle_members: true,
    bundle_component_codes: ['women_outfit', 'men_outfit'],
  };
  const selection = {women: {size: 'S', color: 'Gold'}, men: {size: 'XL', color: 'Silver'}};
  const valid = {wearer: null, size: 'S', color: 'Gold', paired_selection: selection};
  const pricedPair = priced(product as never, valid);
  assert.equal(pricedPair.unit_minor, 18900);
  assert.deepEqual(pricedPair.paired_selection, selection);
  assert.equal(computeCheckoutAmounts({lines: [pricedPair], extras: [], method: 'standard', country: 'US'}).total_minor, 20800);
  assert.throws(() => priced(product as never, {wearer: null}), /checkout_paired_selection_required/);
  assert.throws(() => priced(product as never, {...valid, size: 'XL'}), /checkout_paired_selection_invalid/);
  assert.throws(() => priced(product as never, {...valid, paired_selection: {...selection, men: {size: 'XL', color: 'Purple'}}}), /checkout_color_invalid/);
  assert.throws(() => priced(productA(), valid), /checkout_paired_selection_invalid/);
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
