import {SELLER_ONLINE_PROVIDER} from '../sellerOnlineProvider.ts';

/** The public projection returned by feya_pay_order_for_buyer_v1 for one guest order. */
export type BuyerOrderReceipt = {
  order_number: string; kind: 'customer' | 'test'; status: string; currency: 'EUR';
  total_minor: number; merchandise_minor: number; extras_minor: number;
  shipping_minor: number; remote_minor: number; handling_minor: number;
  created_at: string; paid_at: string | null; shipping_method: string | null;
  lines: {title: string; option: string | null; color: string | null; size: string | null; quantity: number; line_minor: number}[];
  extras: {label: string; quantity: number; amount_minor: number}[];
};

const paymentStatuses: Record<string, string> = {
  paid: 'Paid',
  pending_payment: 'Awaiting payment',
  payment_pending: 'Awaiting PayPal confirmation',
  payment_failed: 'Payment not completed',
  cancelled: 'Cancelled before payment',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  reversed: 'Payment reversed',
  needs_review: 'Being reviewed by TheFEYA',
};

const euros = new Intl.NumberFormat('en-IE', {style: 'currency', currency: 'EUR'});
const utcDate = new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'});

export const receiptMoney = (minor: number) => euros.format(minor / 100);
export const paymentStatusLabel = (status: string) => paymentStatuses[status] ?? status;
export function receiptDeliveryLabel(method: string | null) {
  if (method === 'express') return 'Express Shipping';
  if (method === 'standard') return 'Standard Shipping';
  return 'Shipping';
}

/** A portable order record contains only the buyer-visible fields selected here. */
export function buyerOrderDetails(receipt: BuyerOrderReceipt): string {
  const text = [
    `TheFEYA · ${receipt.kind === 'test' ? 'Test order' : 'Order'} ${receipt.order_number}`,
    `Ordered: ${utcDate.format(new Date(receipt.created_at))} UTC`,
    `Payment status: ${paymentStatusLabel(receipt.status)}`,
  ];
  if (receipt.paid_at) text.push(`Paid: ${utcDate.format(new Date(receipt.paid_at))} UTC`);
  text.push('', 'Order details');
  for (const line of receipt.lines) {
    const selection = [line.option, line.color, line.size].filter(Boolean).join(' · ');
    text.push(`${line.title} ×${line.quantity} — ${receiptMoney(line.line_minor)}`);
    if (selection) text.push(selection);
  }
  for (const extra of receipt.extras) {
    text.push(`${extra.label} ×${extra.quantity} — ${receiptMoney(extra.amount_minor)}`);
  }
  text.push('', `${receiptDeliveryLabel(receipt.shipping_method)}: ${receiptMoney(receipt.shipping_minor)}`);
  if (receipt.remote_minor > 0) text.push(`Remote destination delivery: ${receiptMoney(receipt.remote_minor)}`);
  if (receipt.handling_minor > 0) text.push(`Additional packaging: ${receiptMoney(receipt.handling_minor)}`);
  text.push(
    `Original order total (${receipt.currency}): ${receiptMoney(receipt.total_minor)}`,
    '', `Legal seller: ${SELLER_ONLINE_PROVIDER.legalName}`, `Seller contact: ${SELLER_ONLINE_PROVIDER.usOfficeEmail}`,
    'Order support: manager.feya@gmail.com', 'Returns and withdrawal: https://thefeya.com/returns',
  );
  return text.join('\n') + '\n';
}
