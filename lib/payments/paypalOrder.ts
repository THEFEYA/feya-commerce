import {decimalToMinor, minorToDecimal} from './pricing.ts';
import type {OrderSnapshotV1} from './orderSnapshot.ts';

/** Facts stored with the TheFEYA order that a PayPal payment must match exactly. */
export type ExpectedPayment = {
  order_number: string;
  invoice_id: string;
  custom_id: string;
  total_minor: number;
  merchandise_minor: number;
  extras_minor: number;
  shipping_minor: number;
  remote_minor: number;
  handling_minor: number;
  payee_email: string;
};

const money = (minor: number) => ({currency_code: 'EUR', value: minorToDecimal(minor)});
const clip = (value: string, max: number) => value.length <= max ? value : value.slice(0, max - 1) + '…';

/**
 * PayPal Checkout (Orders v2) request for a TheFEYA order. The money goes to the
 * Seller Online PayPal account (payee); PayPal's hosted page collects card/PayPal
 * details, never TheFEYA.
 */
export function buildPayPalOrderRequest(input: {
  expected: ExpectedPayment;
  snapshot: OrderSnapshotV1;
  returnUrl: string;
  cancelUrl: string;
}) {
  const {expected, snapshot} = input;
  const items: Record<string, unknown>[] = [];
  let itemTotal = 0;
  for (const line of snapshot.lines) {
    const description = [line.option_label, line.color, `Size ${line.size}`, line.made_to_measure ? 'made to measure' : '']
      .filter(Boolean).join(' · ');
    items.push({
      name: clip(line.title, 127),
      description: clip(description, 127),
      sku: clip(line.configuration_id, 127),
      quantity: String(line.quantity),
      unit_amount: money(line.unit_minor),
      category: snapshot.kind === 'test' ? 'DIGITAL_GOODS' : 'PHYSICAL_GOODS',
    });
    itemTotal += line.unit_minor * line.quantity;
  }
  for (const extra of snapshot.extras) {
    items.push({
      name: clip(extra.label, 127),
      sku: 'feya-extra-' + extra.code,
      quantity: String(extra.quantity),
      unit_amount: money(extra.unit_minor),
      category: 'PHYSICAL_GOODS',
    });
    itemTotal += extra.unit_minor * extra.quantity;
  }
  if (itemTotal !== expected.merchandise_minor + expected.extras_minor) throw new Error('paypal_item_total_mismatch');
  const shipping = expected.shipping_minor + expected.remote_minor;
  if (itemTotal + shipping + expected.handling_minor !== expected.total_minor) throw new Error('paypal_total_mismatch');

  const breakdown: Record<string, unknown> = {item_total: money(itemTotal)};
  if (shipping > 0) breakdown.shipping = money(shipping);
  if (expected.handling_minor > 0) breakdown.handling = money(expected.handling_minor);

  const unit: Record<string, unknown> = {
    reference_id: expected.order_number,
    description: clip(snapshot.kind === 'test' ? `Seller Online connection test ${expected.order_number}` : `TheFEYA order ${expected.order_number}`, 127),
    invoice_id: expected.invoice_id,
    custom_id: expected.custom_id,
    amount: {...money(expected.total_minor), breakdown},
    items,
    payee: {email_address: expected.payee_email},
  };
  const physical = snapshot.kind === 'customer' && snapshot.address && snapshot.buyer;
  if (physical) {
    const a = snapshot.address!;
    unit.shipping = {
      type: 'SHIPPING',
      name: {full_name: clip(`${snapshot.buyer!.first_name} ${snapshot.buyer!.last_name}`, 300)},
      address: {
        address_line_1: clip(a.line1, 300),
        ...(a.line2 ? {address_line_2: clip(a.line2, 300)} : {}),
        admin_area_2: clip(a.city, 120),
        ...(a.region ? {admin_area_1: clip(a.region, 300)} : {}),
        postal_code: clip(a.postal_code, 60),
        country_code: a.country,
      },
    };
  }
  const paypal: Record<string, unknown> = {
    experience_context: {
      brand_name: 'TheFEYA',
      locale: 'en-US',
      landing_page: 'NO_PREFERENCE',
      shipping_preference: physical ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    },
  };
  if (physical) {
    paypal.email_address = snapshot.buyer!.email;
    paypal.name = {given_name: clip(snapshot.buyer!.first_name, 140), surname: clip(snapshot.buyer!.last_name, 140)};
  }
  return {intent: 'CAPTURE', purchase_units: [unit], payment_source: {paypal}};
}

export type NormalizedCapture = {
  provider_order_id: string;
  order_status: string;
  capture_id: string | null;
  capture_status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'FAILED' | null;
  amount_minor: number | null;
  currency: string | null;
  payee_email: string | null;
  payee_merchant_id: string | null;
  invoice_id: string | null;
  custom_id: string | null;
};

/** Normalizes a PayPal order (GET) or capture (POST) response. Never trusts the browser. */
export function normalizePayPalOrder(body: Record<string, unknown> | null | undefined): NormalizedCapture {
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[A-Za-z0-9-]{6,64}$/.test(id)) throw new Error('paypal_order_response_invalid');
  const units = Array.isArray(body!.purchase_units) ? body!.purchase_units as Record<string, unknown>[] : [];
  if (units.length !== 1) throw new Error('paypal_order_units_invalid');
  const unit = units[0];
  const payee = (unit.payee && typeof unit.payee === 'object' ? unit.payee : {}) as Record<string, unknown>;
  const payments = (unit.payments && typeof unit.payments === 'object' ? unit.payments : {}) as Record<string, unknown>;
  const captures = Array.isArray(payments.captures) ? payments.captures as Record<string, unknown>[] : [];
  // A single-capture order: the most relevant capture is a completed one, else the latest.
  const capture = captures.find(c => c.status === 'COMPLETED') || captures[captures.length - 1] || null;
  const amount = (capture?.amount && typeof capture.amount === 'object' ? capture.amount : null) as Record<string, unknown> | null;
  const rawStatus = typeof capture?.status === 'string' ? capture.status.toUpperCase() : null;
  const captureStatus = rawStatus === 'COMPLETED' || rawStatus === 'PENDING' || rawStatus === 'DECLINED' || rawStatus === 'FAILED'
    ? rawStatus : null;
  const text = (v: unknown) => typeof v === 'string' && v ? v : null;
  return {
    provider_order_id: id,
    order_status: typeof body!.status === 'string' ? body!.status : 'UNKNOWN',
    capture_id: text(capture?.id),
    capture_status: captureStatus,
    amount_minor: amount ? decimalToMinor(amount.value) : null,
    currency: amount && typeof amount.currency_code === 'string' ? amount.currency_code : null,
    payee_email: text(payee.email_address)?.toLowerCase() ?? null,
    payee_merchant_id: text(payee.merchant_id),
    invoice_id: text(capture?.invoice_id) ?? text(unit.invoice_id),
    custom_id: text(capture?.custom_id) ?? text(unit.custom_id),
  };
}

/** Capture id from a refund/reversal resource ("up" link → /v2/payments/captures/{id}). */
export function refundParentCaptureId(resource: Record<string, unknown> | null | undefined): string | null {
  const links = Array.isArray(resource?.links) ? resource!.links as Record<string, unknown>[] : [];
  for (const link of links) {
    if (link.rel !== 'up' || typeof link.href !== 'string') continue;
    const match = /\/v2\/payments\/captures\/([A-Za-z0-9-]{6,64})(?:$|[/?#])/.exec(link.href);
    if (match) return match[1];
  }
  return null;
}

/** PayPal order id that a capture webhook resource belongs to. */
export function captureRelatedOrderId(resource: Record<string, unknown> | null | undefined): string | null {
  const supplementary = (resource?.supplementary_data && typeof resource.supplementary_data === 'object'
    ? resource.supplementary_data : {}) as Record<string, unknown>;
  const related = (supplementary.related_ids && typeof supplementary.related_ids === 'object'
    ? supplementary.related_ids : {}) as Record<string, unknown>;
  const id = related.order_id;
  return typeof id === 'string' && /^[A-Za-z0-9-]{6,64}$/.test(id) ? id : null;
}
