import {OWNER_CART_COUNTRIES, ownerCartAddressRegions} from '../commerceOwnerCartReview.ts';
import {CHECKOUT_PRICING_V1, type DeliveryMethod} from './pricing.ts';
import type {CartLineInput} from './catalogLinePricing.ts';
import {parsePairedSetSelection} from './pairedSetSelection.ts';

/** Strict parser for the buyer's checkout request. Money in the request is ignored. */
export type CheckoutBuyer = {first_name: string; last_name: string; email: string; phone: string};
export type CheckoutAddress = {
  country: string; region: string | null; city: string; postal_code: string;
  line1: string; line2: string | null;
};
export type CheckoutRequestV1 = {
  idempotency_key: string;
  lines: CartLineInput[];
  method: DeliveryMethod;
  gift_card: boolean;
  gift_message: string | null;
  gift_box: boolean;
  buyer: CheckoutBuyer;
  address: CheckoutAddress;
  note: string | null;
  accepted_terms: true;
  marketing_opt_in: boolean;
};
export type CheckoutQuoteRequestV1 = Pick<CheckoutRequestV1, 'lines' | 'method' | 'gift_card' | 'gift_box'> & {country: string};

export class CheckoutRequestError extends Error {
  readonly field?: string;
  constructor(code: string, field?: string) { super(code); this.name = 'CheckoutRequestError'; this.field = field; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,240}$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/;
const COUNTRIES = new Set<string>(OWNER_CART_COUNTRIES);

const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));

function text(v: unknown, field: string, max: number, opts: {required?: boolean; multiline?: boolean} = {}): string | null {
  if (v == null || v === '') {
    if (opts.required) throw new CheckoutRequestError('checkout_field_required', field);
    return null;
  }
  if (typeof v !== 'string') throw new CheckoutRequestError('checkout_field_invalid', field);
  const value = v.normalize('NFC').trim();
  if (!value) {
    if (opts.required) throw new CheckoutRequestError('checkout_field_required', field);
    return null;
  }
  if (value.length > max || CONTROL.test(value) || (!opts.multiline && /[\r\n\t]/.test(value)))
    throw new CheckoutRequestError('checkout_field_invalid', field);
  return value;
}

function bool(v: unknown, field: string): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') throw new CheckoutRequestError('checkout_field_invalid', field);
  return v;
}

function parseLines(raw: unknown): CartLineInput[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > CHECKOUT_PRICING_V1.maxLines)
    throw new CheckoutRequestError('checkout_lines_invalid', 'lines');
  const seen = new Set<string>();
  return raw.map((item, i) => {
    if (!record(item)) throw new CheckoutRequestError('checkout_lines_invalid', `lines.${i}`);
    const id = text(item.id, `lines.${i}.id`, 450, {required: true})!;
    if (seen.has(id) || !UUID.test(id.slice(0, 36))) throw new CheckoutRequestError('checkout_lines_invalid', `lines.${i}.id`);
    seen.add(id);
    const slug = text(item.slug, `lines.${i}.slug`, 240, {required: true})!;
    if (!SLUG.test(slug)) throw new CheckoutRequestError('checkout_lines_invalid', `lines.${i}.slug`);
    const configuration = text(item.configuration_id, `lines.${i}.configuration_id`, 80, {required: true})!;
    if (!UUID.test(configuration)) throw new CheckoutRequestError('checkout_option_unavailable', `lines.${i}.configuration_id`);
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > CHECKOUT_PRICING_V1.maxQuantityPerLine)
      throw new CheckoutRequestError('checkout_line_quantity_invalid', `lines.${i}.quantity`);
    const wearer = item.wearer == null ? null : item.wearer;
    if (wearer !== null && wearer !== 'men' && wearer !== 'women')
      throw new CheckoutRequestError('checkout_field_invalid', `lines.${i}.wearer`);
    const paired = item.paired_selection == null ? null : parsePairedSetSelection(item.paired_selection);
    if (item.paired_selection != null && !paired)
      throw new CheckoutRequestError('checkout_paired_selection_invalid', `lines.${i}.paired_selection`);
    const client = item.client_unit_minor;
    if (client != null && (typeof client !== 'number' || !Number.isSafeInteger(client) || client < 0))
      throw new CheckoutRequestError('checkout_field_invalid', `lines.${i}.client_unit_minor`);
    return {
      id, slug, configuration_id: configuration.toLowerCase(),
      size: text(item.size, `lines.${i}.size`, 20, {required: true})!,
      color: text(item.color, `lines.${i}.color`, 100, {required: true})!,
      paired_selection: paired,
      quantity, wearer, made_to_measure: bool(item.made_to_measure, `lines.${i}.made_to_measure`),
      client_unit_minor: typeof client === 'number' ? client : null,
    };
  });
}

function parseMethod(v: unknown): DeliveryMethod {
  if (v !== 'standard' && v !== 'express') throw new CheckoutRequestError('checkout_method_invalid', 'method');
  return v;
}

function parseCountry(v: unknown): string {
  if (typeof v !== 'string' || !COUNTRIES.has(v)) throw new CheckoutRequestError('checkout_country_unavailable', 'address.country');
  return v;
}

export function parseCheckoutQuoteRequest(raw: unknown): CheckoutQuoteRequestV1 {
  if (!record(raw)) throw new CheckoutRequestError('checkout_request_invalid');
  const allowed = new Set(['lines', 'method', 'gift_card', 'gift_box', 'country']);
  if (Object.keys(raw).some(k => !allowed.has(k))) throw new CheckoutRequestError('checkout_request_invalid');
  return {
    lines: parseLines(raw.lines),
    method: parseMethod(raw.method),
    gift_card: bool(raw.gift_card, 'gift_card'),
    gift_box: bool(raw.gift_box, 'gift_box'),
    country: raw.country == null || raw.country === '' ? '' : parseCountry(raw.country),
  };
}

export function parseCheckoutRequest(raw: unknown): CheckoutRequestV1 {
  if (!record(raw)) throw new CheckoutRequestError('checkout_request_invalid');
  const allowed = new Set(['idempotency_key', 'lines', 'method', 'gift_card', 'gift_message', 'gift_box',
    'buyer', 'address', 'note', 'accepted_terms', 'marketing_opt_in']);
  if (Object.keys(raw).some(k => !allowed.has(k))) throw new CheckoutRequestError('checkout_request_invalid');
  if (typeof raw.idempotency_key !== 'string' || !UUID.test(raw.idempotency_key))
    throw new CheckoutRequestError('checkout_request_invalid', 'idempotency_key');
  if (raw.accepted_terms !== true) throw new CheckoutRequestError('checkout_terms_required', 'accepted_terms');
  if (!record(raw.buyer) || !record(raw.address)) throw new CheckoutRequestError('checkout_request_invalid');

  const buyer: CheckoutBuyer = {
    first_name: text(raw.buyer.first_name, 'buyer.first_name', 100, {required: true})!,
    last_name: text(raw.buyer.last_name, 'buyer.last_name', 100, {required: true})!,
    email: text(raw.buyer.email, 'buyer.email', 254, {required: true})!.toLowerCase(),
    phone: text(raw.buyer.phone, 'buyer.phone', 40, {required: true})!,
  };
  if (!EMAIL.test(buyer.email)) throw new CheckoutRequestError('checkout_email_invalid', 'buyer.email');
  if (!/^[+0-9 ()./-]{5,40}$/.test(buyer.phone) || (buyer.phone.match(/\d/g) || []).length < 5)
    throw new CheckoutRequestError('checkout_phone_invalid', 'buyer.phone');

  const country = parseCountry(raw.address.country);
  const regions = ownerCartAddressRegions(country);
  const regionRaw = text(raw.address.region, 'address.region', 80);
  let region: string | null = null;
  if (regions.length) {
    if (!regionRaw || !regions.some(([code]) => code === regionRaw))
      throw new CheckoutRequestError('checkout_region_required', 'address.region');
    region = regionRaw;
  } else if (regionRaw) {
    region = regionRaw;
  }
  const address: CheckoutAddress = {
    country, region,
    city: text(raw.address.city, 'address.city', 120, {required: true})!,
    postal_code: text(raw.address.postal_code, 'address.postal_code', 32, {required: true})!,
    line1: text(raw.address.line1, 'address.line1', 250, {required: true})!,
    line2: text(raw.address.line2, 'address.line2', 250),
  };
  const giftCard = bool(raw.gift_card, 'gift_card');
  return {
    idempotency_key: raw.idempotency_key.toLowerCase(),
    lines: parseLines(raw.lines),
    method: parseMethod(raw.method),
    gift_card: giftCard,
    gift_message: giftCard ? text(raw.gift_message, 'gift_message', 250, {multiline: true}) : null,
    gift_box: bool(raw.gift_box, 'gift_box'),
    buyer, address,
    note: text(raw.note, 'note', 1200, {multiline: true}),
    accepted_terms: true,
    marketing_opt_in: bool(raw.marketing_opt_in, 'marketing_opt_in'),
  };
}

/** Buyer-facing English messages for request/pricing error codes. */
export const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  checkout_request_invalid: 'Your checkout request could not be read. Please refresh the page and try again.',
  checkout_lines_invalid: 'Your bag contains an item that can no longer be ordered. Please remove it and add it again from the product page.',
  checkout_product_mismatch: 'One of the pieces in your bag has changed. Please open it again from the product page.',
  checkout_option_unavailable: 'One of the selected options is no longer available. Please choose it again on the product page.',
  checkout_option_unpriced: 'One of the selected options cannot be priced right now. Please contact us.',
  checkout_size_invalid: 'Please choose a size again on the product page.',
  checkout_color_invalid: 'Please choose a colour again on the product page.',
  checkout_paired_selection_invalid: 'Please select both outfits again on the product page.',
  checkout_paired_selection_required: 'Please choose the women’s and men’s sizes and colours on the product page.',
  checkout_custom_measurements_required: 'Choose custom measurements in your bag to continue with the Custom size.',
  checkout_line_quantity_invalid: 'Please check the quantities in your bag.',
  checkout_quantity_too_large: 'This order is too large for online checkout. Please contact us.',
  checkout_method_invalid: 'Please choose Standard or Express delivery.',
  checkout_country_unavailable: 'We cannot deliver to the selected country through online checkout yet.',
  checkout_region_required: 'Please choose your state, province or territory.',
  checkout_field_required: 'Please complete all required contact and delivery details.',
  checkout_field_invalid: 'Some of the details contain characters we cannot accept.',
  checkout_email_invalid: 'Please enter a valid email address.',
  checkout_phone_invalid: 'Please enter a valid phone number for the courier.',
  checkout_terms_required: 'Please confirm that you have read the terms, returns and shipping policy.',
  checkout_total_out_of_range: 'This order total cannot be paid online. Please contact us.',
  checkout_currency_unsupported: 'This item cannot be paid online in euros. Please contact us.',
  payments_not_active: 'Online payment is not available at the moment. Please try again later or contact us.',
  provider_configuration_changed: 'Our payment settings were just updated. Please try again.',
  rate_limited: 'Too many checkout attempts. Please wait a few minutes and try again.',
  idempotency_conflict: 'Please refresh the page and try again.',
  provider_rejected_address: 'PayPal could not accept this delivery address. Please check the postal code, city and state.',
  provider_unavailable: 'PayPal is not responding right now. Your payment status may be unknown. Please check your order status before trying again.',
  provider_rejected: 'PayPal could not start this payment. Please check your order status before trying again or contact us.',
  order_already_paid: 'This order has already been paid. Please check your email for the PayPal receipt.',
  checkout_unavailable: 'Checkout is temporarily unavailable. Please try again shortly.',
};
export function checkoutErrorMessage(code: string) {
  return CHECKOUT_ERROR_MESSAGES[code] || CHECKOUT_ERROR_MESSAGES.checkout_unavailable;
}
