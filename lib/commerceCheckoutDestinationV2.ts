import { createHash } from 'node:crypto';
import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';

/**
 * Private M2 checkout successor groundwork. A destination is buyer-provided
 * PII, but it carries NO tariff, tax, price, rate category, or promise.
 * A valid ISO country does not mean a delivery service is available.
 *
 * This pure check is a precondition, NOT a DB transaction, payable order,
 * shipping quote, personal-data collection route, or provider authorization.
 * Before future checkout persistence an atomic service-only SQL recheck must
 * compare the actual unexpired immutable shipping v2 row and current catalog.
 */
export const COMMERCE_CHECKOUT_DESTINATION_V2 = 'commerce_checkout_destination_v2' as const;

export type CheckoutDestinationV2 = {
  contract_version: typeof COMMERCE_CHECKOUT_DESTINATION_V2;
  country: string;
  postal_code: string;
  recipient_full_name: string;
  contact_email: string;
  contact_phone: string | null;
  region: string | null;
  city: string;
  address_line1: string;
  address_line2: string | null;
};

type ShippingV2TrustedBinding = {
  destination_country: string;
  destination_postal_code: string;
  destination_sha256: string;
  expires_at: string;
  shipping_method: 'standard' | 'express';
  currency: 'EUR';
  payable: false;
  payment_enabled: false;
  provider_session_enabled: false;
};

const countryCodes = new Set(DELIVERY_COUNTRIES);
const keys = ['address_line1','address_line2','city','contact_email','contact_phone','contract_version',
  'country','postal_code','recipient_full_name','region'];
const controlChars = /[\x00-\x1F\x7F]/u;

export class CheckoutDestinationV2Error extends Error {
  constructor(code: string) { super(code); }
}
function fail(code: string): never { throw new CheckoutDestinationV2Error(code); }
const record = (v: unknown): v is Record<string, unknown> =>
  Boolean(v && typeof v === 'object' && !Array.isArray(v));

function requiredLine(value: unknown, max: number, name: string): string {
  if (typeof value !== 'string') return fail('checkout_destination_' + name + '_invalid');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > max || controlChars.test(value.replace(/[ \t]/g, ''))) {
    return fail('checkout_destination_' + name + '_invalid');
  }
  return normalized;
}
function optionalLine(value: unknown, max: number, name: string): string | null {
  if (value === null) return null;
  return requiredLine(value, max, name);
}

export function normalizeCheckoutDestinationV2(input: unknown): CheckoutDestinationV2 {
  if (!record(input) || JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(keys)
    || input.contract_version !== COMMERCE_CHECKOUT_DESTINATION_V2) fail('checkout_destination_request_invalid');

  const country = String(input.country ?? '').toUpperCase();
  if (typeof input.country !== 'string' || input.country !== country || !countryCodes.has(country)) {
    fail('checkout_destination_country_invalid');
  }
  const rawPostal = input.postal_code;
  if (typeof rawPostal !== 'string' || rawPostal.length > 32
    || !/^[A-Za-z0-9 -]+$/.test(rawPostal)) fail('checkout_destination_postal_invalid');
  const postal_code = rawPostal.toUpperCase().replace(/[ -]/g, '');
  if (!postal_code || postal_code.length > 32) fail('checkout_destination_postal_invalid');
  const contact_email = requiredLine(input.contact_email, 320, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) fail('checkout_destination_email_invalid');

  return {
    contract_version: COMMERCE_CHECKOUT_DESTINATION_V2,
    country, postal_code,
    recipient_full_name: requiredLine(input.recipient_full_name, 200, 'name'),
    contact_email: contact_email.toLowerCase(),
    contact_phone: optionalLine(input.contact_phone, 100, 'phone'),
    region: optionalLine(input.region, 150, 'region'),
    city: requiredLine(input.city, 150, 'city'),
    address_line1: requiredLine(input.address_line1, 250, 'address'),
    address_line2: optionalLine(input.address_line2, 250, 'address'),
  };
}

/** Compare exactly with a *trusted* shipping-v2 DB row and a *server/DB* clock.
 * These checks cannot replace a later DB transaction lock and approval/offer recheck. */
export function verifyCheckoutDestinationV2Binding(
  destination: CheckoutDestinationV2,
  shipping: ShippingV2TrustedBinding,
  authoritativeNow: string,
  method: 'standard' | 'express',
): { destination_sha256: string; country: string; postal_code: string; valid: true; payable: false } {
  if (!Number.isFinite(Date.parse(authoritativeNow)) || !Number.isFinite(Date.parse(shipping.expires_at))) {
    fail('checkout_destination_time_invalid');
  }
  if (Date.parse(shipping.expires_at) <= Date.parse(authoritativeNow)) fail('checkout_destination_shipping_expired');
  if (shipping.currency !== 'EUR' || shipping.payable !== false
    || shipping.payment_enabled !== false || shipping.provider_session_enabled !== false) {
    fail('checkout_destination_authority_invalid');
  }
  const destination_sha256 = createHash('sha256')
    .update(JSON.stringify({ country: destination.country, postal_code: destination.postal_code }))
    .digest('hex');
  if (shipping.destination_country !== destination.country
    || shipping.destination_postal_code !== destination.postal_code
    || shipping.destination_sha256 !== destination_sha256
    || shipping.shipping_method !== method) fail('checkout_destination_shipping_mismatch');
  return { destination_sha256, country: destination.country, postal_code: destination.postal_code, valid: true, payable: false };
}
