'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BadgeCheck, ClipboardList, PackageCheck, Ruler, ShieldCheck, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

type DraftItem = {
  title?: string;
  image?: string;
  config?: string;
  color?: string;
  size?: string;
  qty?: number;
  price?: number;
  currency?: string;
};

type CheckoutDraft = {
  items?: DraftItem[];
  delivery?: 'standard' | 'express';
  shipping?: number;
  subtotal?: number;
  total?: number;
  currency?: string;
  contact?: {
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    eventDate?: string;
    measurements?: string;
    note?: string;
  };
  payment_status?: string;
  order_status?: string;
  created_at?: string;
};

const DRAFT_KEY = 'feya_checkout_draft_v1';

const PIPELINE = [
  { label: 'Draft received', icon: ClipboardList },
  { label: 'Price / label review', icon: ShieldCheck },
  { label: 'Measurements check', icon: Ruler },
  { label: 'Production queue', icon: PackageCheck },
  { label: 'Shipping / tracking', icon: Truck },
];

function readDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(DRAFT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AtelierOrdersClient() {
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  const items = Array.isArray(draft?.items) ? draft?.items || [] : [];
  const currency = draft?.currency || items[0]?.currency || 'EUR';
  const warnings = useMemo(() => {
    const list = ['Price contract: frontend_temp_v1 until Supabase v4 is active'];
    if (!draft?.contact?.email) list.push('Missing customer email');
    if (!draft?.contact?.address) list.push('Missing shipping address');
    if (!draft?.contact?.measurements) list.push('No measurement profile attached');
    return list;
  }, [draft]);

  if (!draft) {
    return (
      <section className="container-feya pt-[170px] pb-20">
        <div className="glass rounded-2xl p-8">
          <div className="eyebrow-gold mb-3">Atelier orders</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,68px)' }}>No local draft yet</h1>
          <p className="mt-4 text-[var(--bone-dim)] max-w-xl">Create a checkout draft first. This internal preview reads only the local checkout draft until the Supabase order-draft API is connected in production.</p>
          <Link href="/checkout" className="btn-chrome mt-6">Go to checkout draft <ArrowUpRight size={13} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-feya pt-[170px] pb-20">
      <div className="border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div className="eyebrow-gold mb-3 flex items-center gap-2"><BadgeCheck size={14} /> Atelier order review</div>
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.035em]" style={{ fontSize: 'clamp(32px,4.5vw,62px)' }}>Internal draft review</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--bone-dim)]">This is the production-side view of a checkout draft. It is designed to become the internal order dashboard after Supabase order drafts, auth and payment provider webhook are connected.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-5">
          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Customer brief</div>
            <div className="grid md:grid-cols-2 gap-3 text-[13px] text-[var(--bone-dim)]">
              <Info label="Name" value={draft.contact?.fullName} />
              <Info label="Email" value={draft.contact?.email} />
              <Info label="Phone" value={draft.contact?.phone} />
              <Info label="Event / deadline" value={draft.contact?.eventDate} />
              <Info label="Shipping address" value={draft.contact?.address} wide />
              <Info label="Shipping method" value={draft.delivery === 'express' ? 'Express DHL' : 'Standard UPS'} />
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Items for production</div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="grid grid-cols-[68px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
                  <div className="relative h-[86px] rounded-md overflow-hidden bg-black/30">{item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                  <div>
                    <div className="text-bone text-[14px] leading-snug">{item.title || 'Atelier piece'}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.config || 'Option'} · {item.color || 'Color'} · {item.size || 'Size'} · Qty {item.qty || 1}</div>
                    <div className="mt-2 font-price text-gold-grad text-[22px] leading-none">{formatPrice((item.price || 0) * (item.qty || 1), item.currency || currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Measurements & notes</div>
            <div className="space-y-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">{draft.contact?.measurements || 'No measurements added yet.'}</div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">{draft.contact?.note || 'No extra atelier note added yet.'}</div>
            </div>
          </section>
        </div>

        <aside className="col-span-12 lg:col-span-5 space-y-5">
          <section className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
            <div className="eyebrow-gold mb-4">Draft summary</div>
            <div className="space-y-2 text-[13px] text-[var(--bone-dim)]">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(draft.subtotal || 0, currency)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{draft.shipping ? formatPrice(draft.shipping, currency) : 'Included'}</span></div>
              <div className="pt-4 border-t border-[rgba(216,214,211,.12)] flex justify-between items-end"><span className="eyebrow">Draft total</span><span className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(draft.total || 0, currency)}</span></div>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Review warnings</div>
            <div className="space-y-2">
              {warnings.map((warning) => <div key={warning} className="rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.055)] px-3 py-2 text-[12px] leading-relaxed text-[var(--gold-warm)]">{warning}</div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Production pipeline</div>
            <div className="space-y-3">
              {PIPELINE.map(({ label, icon: Icon }, index) => (
                <div key={label} className="flex items-center gap-3 text-[13px] text-[var(--bone-dim)]">
                  <div className="h-8 w-8 rounded-full border border-[rgba(216,214,211,.14)] bg-black/20 flex items-center justify-center text-[var(--gold-warm)]"><Icon size={14} /></div>
                  <span>{index + 1}. {label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="eyebrow-dim mb-1">{label}</div>
      <div className="text-bone">{value || 'Not provided'}</div>
    </div>
  );
}
