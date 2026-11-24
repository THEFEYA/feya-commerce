import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { OrderSnapshotV1 } from '../../lib/payments/orderSnapshot.ts';

type PaidOrder = {
  order_number: string; kind: string; status: string; environment: string; currency: string;
  created_at: string; paid_at: string | null; total_minor: number; paid_minor: number; snapshot: OrderSnapshotV1;
};

const editions = new Map([
  ['thefeya-sale-policy-20261123-v5', new URL('../../docs/checkout-confirmations/thefeya-sale-policy-20261123-v5/', import.meta.url)],
]);

function acceptedPolicies(snapshot: OrderSnapshotV1) {
  const agreement = snapshot.policies;
  const directory = editions.get(agreement?.accepted_bundle_version ?? '');
  if (!snapshot.accepted_terms || !directory || !agreement.accepted_at) {
    throw new Error('The accepted policy edition is missing or has no archived copy.');
  }
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  const hashes = Object.entries(manifest.sources);
  if (manifest.version !== agreement.accepted_bundle_version || hashes.length !== 4 ||
      hashes.some(([name, hash]) => agreement.source_blob_sha1?.[name] !== hash)) {
    throw new Error('The recorded policy sources differ from the archive.');
  }
  const bytes = readFileSync(new URL('policies.txt', directory));
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.textSha256) {
    throw new Error('The archived policy text failed its integrity check.');
  }
  return { version: manifest.version as string, text: bytes.toString('utf8').trimEnd() };
}

const currency = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
function money(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid amount in order.');
  return currency.format(cents / 100);
}
function utc(instant: string | null | undefined) {
  if (!instant || !Number.isFinite(Date.parse(instant))) throw new Error('Invalid order date.');
  return new Date(instant).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}
function itemTotal(entry: {quantity: number; unit_minor: number}, amount: number) {
  if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 1 ||
      amount !== entry.unit_minor * entry.quantity) throw new Error('A line amount does not reconcile.');
  money(entry.unit_minor);
  money(amount);
  return amount;
}

// This renderer is private to the studio. It accepts an immutable paid order
// projection on stdin and has no database, network, email or payment side effects.
export function buyerConfirmation(order: PaidOrder, { sample = false } = {}) {
  const s = order.snapshot;
  const validReference = sample ? order.order_number === 'SAMPLE-NOT-AN-ORDER' : /^FEYA-[0-9]{6,9}$/.test(order.order_number);
  if (!validReference || order.environment !== (sample ? 'sandbox' : 'live') || order.kind !== 'customer' ||
      s?.kind !== 'customer' || order.status !== 'paid' || s.contract !== 'feya_order_snapshot_v1' ||
      s.currency !== 'EUR' || order.currency !== 'EUR' || s.amounts?.currency !== 'EUR') {
    throw new Error('A confirmed paid customer order in EUR is required.');
  }
  const policy = acceptedPolicies(s);
  const { buyer, address, delivery, amounts: a } = s;
  if (!buyer?.first_name || !buyer.last_name || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(buyer.email) ||
      !address?.line1 || !address.city || !address.country || !delivery?.label || !delivery.window) {
    throw new Error('Buyer or delivery information is incomplete.');
  }
  if (!s.lines.length || !s.lines.every(line => line.title && line.option_label && line.size)) {
    throw new Error('Order items are incomplete.');
  }
  const goods = s.lines.reduce((sum, line) => sum + itemTotal(line, line.line_minor), 0);
  const extras = s.extras.reduce((sum, extra) => sum + itemTotal(extra, extra.amount_minor), 0);
  const components = ['merchandise_minor', 'extras_minor', 'shipping_minor', 'remote_minor', 'handling_minor', 'tax_minor'] as const;
  const total = components.reduce((sum, field) => {
    money(a[field]);
    return sum + a[field];
  }, 0);
  if (goods !== a.merchandise_minor || extras !== a.extras_minor || total !== a.total_minor ||
      total !== order.total_minor || total !== order.paid_minor) throw new Error('Paid total or subtotals do not reconcile.');

  const lines = [sample ? 'DELIVERY TEST — fictional order and payment' : 'TheFEYA order confirmation',
    '', 'Order reference     ' + order.order_number, 'Ordered             ' + utc(order.created_at),
    'Payment confirmed   ' + utc(order.paid_at), 'Terms accepted      ' + utc(s.policies.accepted_at),
    '', 'Customer', buyer.first_name + ' ' + buyer.last_name, buyer.email, '', 'Ship to',
    ...[address.line1, address.line2, address.city, address.region, address.postal_code, address.country].filter(Boolean),
    '', 'Items'];
  for (const item of s.lines) {
    const selection = [item.option_label, item.size, item.color, item.wearer, item.made_to_measure && 'Made to measure'].filter(Boolean);
    lines.push(item.title, selection.join(' · '), item.quantity + ' × ' + money(item.unit_minor) + ' = ' + money(item.line_minor), '');
  }
  for (const extra of s.extras) lines.push(extra.label + ' · ' + extra.quantity + ' × ' + money(extra.unit_minor) + ' = ' + money(extra.amount_minor));
  lines.push('', 'Payment breakdown', 'Items                   ' + money(goods));
  if (extras) lines.push('Options                 ' + money(extras));
  lines.push(delivery.label + ' · ' + money(a.shipping_minor));
  if (a.remote_minor) lines.push('Remote delivery         ' + money(a.remote_minor));
  if (a.handling_minor) lines.push('Additional packaging    ' + money(a.handling_minor));
  lines.push('Tax collected at checkout    ' + money(a.tax_minor), 'Total paid in euros          ' + money(total),
    '', 'Delivery after dispatch', delivery.window);
  if (s.note) lines.push('', 'Your order note', s.note);
  if (s.gift_message) lines.push('', 'Your gift message', s.gift_message);
  lines.push('', s.disclosure, 'Studio and order enquiries    manager.feya@gmail.com',
    '', 'Terms supplied with your order', policy.version, '', policy.text, '');
  return { to: buyer.email, filename: 'TheFEYA-' + order.order_number + '.txt', text: lines.join('\n') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = buyerConfirmation(JSON.parse(readFileSync(0, 'utf8')), { sample: process.argv.includes('--sample') });
    process.stdout.write(result.text);
  } catch (error) {
    process.stderr.write('Confirmation could not be generated. ' + (error instanceof Error ? error.message : 'Invalid input') + '\n');
    process.exitCode = 1;
  }
}
