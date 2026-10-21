import {decimalToMinor, minorToDecimal} from './pricing.ts';
import type {ExpectedPayment} from './paypalOrder.ts';
import type {OrderSnapshotV1} from './orderSnapshot.ts';

/**
 * Legacy fallback: PayPal Payments Standard hosted redirect, exactly the mechanism
 * Seller Online documents for WooCommerce/OpenCart (payee e-mail + custom
 * "<order>;opencart:<store key>"). PayPal deprecated these buttons in January 2026;
 * TheFEYA uses it only when Seller Online cannot provide PayPal REST access.
 */
export const PAYPAL_STANDARD_ENDPOINT = {
  sandbox: 'https://www.sandbox.paypal.com/cgi-bin/webscr',
  live: 'https://www.paypal.com/cgi-bin/webscr',
} as const;

export function buildPayPalStandardForm(input: {
  expected: ExpectedPayment;
  snapshot: OrderSnapshotV1;
  environment: 'sandbox' | 'live';
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const {expected, snapshot} = input;
  const fields: Record<string, string> = {
    cmd: '_xclick',
    charset: 'utf-8',
    business: expected.payee_email,
    currency_code: 'EUR',
    amount: minorToDecimal(expected.total_minor),
    item_name: snapshot.kind === 'test' ? `Seller Online connection test ${expected.order_number}` : `TheFEYA order ${expected.order_number}`,
    item_number: expected.order_number,
    invoice: expected.invoice_id,
    custom: expected.custom_id,
    notify_url: input.notifyUrl,
    return: input.returnUrl,
    cancel_return: input.cancelUrl,
    rm: '1',
    no_note: '1',
    no_shipping: snapshot.kind === 'test' ? '1' : '2',
  };
  if (snapshot.kind === 'customer' && snapshot.buyer && snapshot.address) {
    Object.assign(fields, {
      first_name: snapshot.buyer.first_name.slice(0, 64),
      last_name: snapshot.buyer.last_name.slice(0, 64),
      email: snapshot.buyer.email,
      address1: snapshot.address.line1.slice(0, 100),
      ...(snapshot.address.line2 ? {address2: snapshot.address.line2.slice(0, 100)} : {}),
      city: snapshot.address.city.slice(0, 40),
      ...(snapshot.address.region ? {state: snapshot.address.region} : {}),
      zip: snapshot.address.postal_code.slice(0, 32),
      country: snapshot.address.country,
    });
  }
  return {action: PAYPAL_STANDARD_ENDPOINT[input.environment], method: 'POST' as const, fields};
}

export type ParsedIpn = {
  txn_id: string;
  parent_txn_id: string | null;
  payment_status: string;
  amount_minor: number;
  currency: string;
  receiver_email: string | null;
  receiver_id: string | null;
  invoice: string | null;
  custom: string | null;
  environment: 'sandbox' | 'live';
};

/** Parses an IPN body that PayPal has ALREADY confirmed as VERIFIED. */
export function parseIpn(rawBody: string): ParsedIpn {
  const pairs = new URLSearchParams(rawBody);
  const one = (key: string) => {
    const values = pairs.getAll(key);
    return values.length === 1 ? values[0] : null;
  };
  const txn = one('txn_id');
  if (!txn || !/^[A-Za-z0-9-]{6,64}$/.test(txn)) throw new Error('ipn_txn_invalid');
  const gross = one('mc_gross');
  const amount = gross == null ? null : decimalToMinor(gross.replace(/^-/, ''));
  if (amount == null) throw new Error('ipn_amount_invalid');
  const test = one('test_ipn');
  const parent = one('parent_txn_id');
  return {
    txn_id: txn,
    parent_txn_id: parent && /^[A-Za-z0-9-]{6,64}$/.test(parent) ? parent : null,
    payment_status: one('payment_status') || '',
    amount_minor: amount,
    currency: one('mc_currency') || '',
    receiver_email: one('receiver_email')?.toLowerCase() || null,
    receiver_id: one('receiver_id'),
    invoice: one('invoice'),
    custom: one('custom'),
    environment: test === '1' ? 'sandbox' : 'live',
  };
}
