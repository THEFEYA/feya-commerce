'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {checkoutApi} from '@/lib/payments/checkoutBrowser';

type Receipt = {
  order_number: string; status: string; total_minor: number; merchandise_minor: number; extras_minor: number;
  shipping_minor: number; remote_minor: number; handling_minor: number; created_at: string; paid_at: string | null;
  shipping_method: string | null;
  lines: {title: string; option: string; color: string; size: string; quantity: number; line_minor: number}[];
  extras: {label: string; quantity: number; amount_minor: number}[];
};

const STATUS: Record<string, string> = {
  paid: 'Paid — in production queue',
  pending_payment: 'Awaiting payment',
  payment_pending: 'Payment received — awaiting PayPal confirmation',
  payment_failed: 'Payment not completed',
  cancelled: 'Cancelled before payment',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  reversed: 'Payment reversed',
  needs_review: 'Being reviewed by TheFEYA',
};
const money = (minor: number) => new Intl.NumberFormat('en-IE', {style: 'currency', currency: 'EUR'}).format(minor / 100);

export function OrderReceiptClient() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#t=') ? window.location.hash.slice(3) : '';
    if (!hash) { setMissing(true); return; }
    checkoutApi.receipt(hash).then(result => {
      if (result.ok && result.order) setReceipt(result.order as unknown as Receipt);
      else setMissing(true);
    }).catch(() => setMissing(true));
  }, []);

  return <section className="container-feya pt-32 pb-20 lg:pt-40 lg:pb-28">
    <div className="mx-auto max-w-3xl rounded-[18px] border border-[rgba(216,214,211,.15)] bg-[rgba(255,255,255,.025)] p-7 sm:p-10">
      <p className="eyebrow-gold">TheFEYA · Order</p>
      {!receipt && !missing && <p className="mt-6 text-[14px] text-[var(--bone-dim)]" role="status">Loading your order…</p>}
      {missing && <>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] text-[#f7f3ec]">Order not found</h1>
        <p className="mt-4 text-[14px] leading-7 text-[var(--bone-dim)]">Open this page from the link shown after payment, or contact us with your order number.</p>
        <Link className="btn-ghost mt-6" href="/contact">Contact TheFEYA</Link>
      </>}
      {receipt && <>
        <h1 className="visual-display mt-4 text-[clamp(30px,4vw,44px)] text-[#f7f3ec]">Order {receipt.order_number}</h1>
        <p className="mt-3 text-[14px] text-[#e4c87d]">{STATUS[receipt.status] || receipt.status}</p>
        <div className="mt-7 divide-y divide-[rgba(216,214,211,.12)] text-[14px]">
          {receipt.lines.map((line, i) => <div key={i} className="flex justify-between gap-4 py-3">
            <div><p className="text-[#f7f3ec]">{line.title}</p>
              <p className="mt-1 text-[12px] text-[var(--bone-dim)]">{line.option} · {line.color} · {line.size} · ×{line.quantity}</p></div>
            <span className="text-[#f7f3ec]">{money(line.line_minor)}</span>
          </div>)}
          {receipt.extras.map((extra, i) => <div key={'x' + i} className="flex justify-between gap-4 py-3 text-[var(--bone-dim)]">
            <span>{extra.label}{extra.quantity > 1 ? ` ×${extra.quantity}` : ''}</span><span>{money(extra.amount_minor)}</span>
          </div>)}
          <div className="flex justify-between gap-4 py-3 text-[var(--bone-dim)]">
            <span>{receipt.shipping_method === 'express' ? 'Express Shipping' : 'Standard Shipping'}</span><span>{money(receipt.shipping_minor)}</span>
          </div>
          {receipt.remote_minor > 0 && <div className="flex justify-between gap-4 py-3 text-[var(--bone-dim)]"><span>Remote destination delivery</span><span>{money(receipt.remote_minor)}</span></div>}
          {receipt.handling_minor > 0 && <div className="flex justify-between gap-4 py-3 text-[var(--bone-dim)]"><span>Additional packaging for multiple items</span><span>{money(receipt.handling_minor)}</span></div>}
          <div className="flex justify-between gap-4 py-4 text-[16px]"><strong className="font-medium text-[#f7f3ec]">Total</strong><strong className="font-medium text-[#e4c87d]">{money(receipt.total_minor)}</strong></div>
        </div>
        <p className="mt-4 text-[12px] leading-6 text-[var(--bone-dim)]">Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner. Questions about this order: <a className="underline underline-offset-4" href="mailto:manager.feya@gmail.com">manager.feya@gmail.com</a>.</p>
      </>}
    </div>
  </section>;
}
