import type {StorefrontProduct} from '../../lib/types.ts';

export const PRODUCT_A_ID = '11111111-1111-4111-8111-111111111111';
export const PRODUCT_B_ID = '22222222-2222-4222-8222-222222222222';
export const CONFIG_FULL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const CONFIG_TOP = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const CONFIG_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

export function productA(): StorefrontProduct {
  return {
    canonical_product_id: PRODUCT_A_ID,
    product_slug: 'mirror-festival-set',
    card_title: 'Mirror Festival Set',
    currency: 'EUR',
    primary_image_url: 'https://i.etsystatic.com/a.jpg',
    color_options: ['Silver', 'Gold'],
    media_gallery: [],
    configurations: [
      {configuration_id: CONFIG_FULL, public_label: 'Full Set', display_price_amount: 189, currency: 'EUR', is_full_set: true, sort_order: 1},
      {configuration_id: CONFIG_TOP, public_label: 'Top', display_price_amount: 89.5, currency: 'EUR', sort_order: 2},
    ],
  } as unknown as StorefrontProduct;
}

export function productB(): StorefrontProduct {
  return {
    canonical_product_id: PRODUCT_B_ID,
    product_slug: 'chrome-mask',
    card_title: 'Chrome Mask',
    currency: 'EUR',
    primary_image_url: 'https://i.etsystatic.com/b.jpg',
    color_options: ['Silver'],
    media_gallery: [],
    configurations: [
      {configuration_id: CONFIG_B, public_label: 'Mask', display_price_amount: 45, currency: 'EUR', sort_order: 1},
    ],
  } as unknown as StorefrontProduct;
}

export function lineA(overrides: Record<string, unknown> = {}) {
  return {
    id: `${PRODUCT_A_ID}-${CONFIG_FULL}-M-Silver`, slug: 'mirror-festival-set', configuration_id: CONFIG_FULL,
    size: 'M', color: 'Silver', quantity: 1, wearer: 'women', made_to_measure: false, client_unit_minor: 18900,
    ...overrides,
  };
}

export function validCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: '0b1f2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
    lines: [lineA()],
    method: 'standard',
    gift_card: false, gift_message: '', gift_box: false,
    buyer: {first_name: 'Ann', last_name: 'Buyer', email: 'Ann@Example.com', phone: '+49 151 2345678'},
    address: {country: 'DE', region: '', city: 'Berlin', postal_code: '10115', line1: 'Unter den Linden 1', line2: ''},
    note: 'Event on 14 Nov',
    accepted_terms: true,
    marketing_opt_in: false,
    ...overrides,
  };
}
