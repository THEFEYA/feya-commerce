'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, FileText, Mail, MapPin, Phone, ShieldCheck, Truck, User } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

type CartItem = {
  id: string;
  slug: string;
  title: string;
  image?: string;
  config: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  currency: string;
};

const CART_KEY = 'feya_visual_cart_v1';
const DRAFT_KEY = 'feya_checkout_draft_v1';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = window.localStorage.getItem(CART_KEY);
    const value = parsed ? JSON.parse(parsed) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function CheckoutClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    address: '',
    eventDate: '',
    measurements: '',
    note: '',
  });

  useEffect(() => {
    setItems(readCart());
  }, []);

  const currency = items[0]?.currency || 'EUR';
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const shipping = delivery === 'express' && items.length ? 45 : 0;
  const total = subtotal + shipping;

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const saveDraft = () => {
    const draft = {
      version: 1,
      items,
      delivery,
      shipping,
      subtotal,
      total,
      currency,
      contact: form,
      payment_status: 'not_started',
      order_status: 'draft_only',
      created_at: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (!items.length) {
    return (
      <section className="container-feya pt-[170px] pb-20">
        <div className="glass rounded-2xl p-8">
          <div className="eyebrow-gold mb-3">Checkout draft</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,68px)' }}>Your bag is empty</h1>
          <p className="mt-4 text-[var(--bone-dim)]">Add a piece before preparing checkout.</p>
          <Link href="/shop" className="btn-chrome mt-6">Continue shopping <ArrowUpRight size={13} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-feya pt-[170px] pb-20">
      <div className="border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div className="eyebrow-gold mb-3 flex items-center gap-2"><ShieldCheck size={14} /> Secure checkout draft</div>
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.035em]" style={{ fontSize: 'clamp(32px,4.5vw,62px)' }}>Prepare your order</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--bone-dim)]">This is the safe order-draft layer before payment provider connection. It collects customer details, event deadline and production notes without creating a paid order or storing card data.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-5">
          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4">Contact & delivery</div>
            <div className="grid gap-3">
              <Field icon={<Mail size={14} />} placeholder="Email" value={form.email} onChange={(value) => update('email', value)} />
              <Field icon={<User size={14} />} placeholder="Full name" value={form.fullName} onChange={(value) => update('fullName', value)} />
              <Field icon={<Phone size={14} />} placeholder="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
              <Field icon={<MapPin size={14} />} placeholder="Country, city, street, ZIP" value={form.address} onChange={(value) => update('address', value)} />
              <Field icon={<CalendarDays size={14} />} placeholder="Event date or delivery deadline" value={form.eventDate} onChange={(value) => update('eventDate', value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><FileText size={14} /> Measurements & atelier notes</div>
            <textarea value={form.measurements} onChange={(event) => update('measurements', event.target.value)} placeholder="Measurements: height, bust, waist, hips, shoulder width, arm length, thigh, custom notes..." className="min-h-[115px] w-full rounded-lg border border-[rgba(216,214,211,.14)] bg-black/20 px-4 py-3 text-[14px] text-bone outline-none focus:border-white/50" />
            <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Extra note: event, styling wishes, color concerns, rush timing, custom request..." className="mt-3 min-h-[95px] w-full rounded-lg border border-[rgba(216,214,211,.14)] bg-black/20 px-4 py-3 text-[14px] text-bone outline-none focus:border-white/50" />
          </section>
        </div>

        <aside className="col-span-12 lg:col-span-5 lg:sticky lg:top-[104px] self-start space-y-4">
          <section className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
            <div className="eyebrow-gold mb-4">Order review</div>
            <div className="space-y-3 max-h-[330px] overflow-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
                  <div className="relative h-[72px] rounded-md overflow-hidden bg-black/30">{item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                  <div>
                    <div className="text-bone text-[14px] leading-snug line-clamp-2">{item.title}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.config} · {item.color} · {item.size} · Qty {item.qty}</div>
                    <div className="mt-2 font-price text-gold-grad text-[21px] leading-none">{formatPrice(item.price * item.qty, item.currency)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
              <div className="eyebrow-gold mb-3 flex items-center gap-2"><Truck size={14} /> Shipping</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDelivery('standard')} className={`rounded-lg border px-3 py-2 text-left text-[12px] ${delivery === 'standard' ? 'border-white text-white bg-white/[.055]' : 'border-[rgba(216,214,211,.14)] text-[var(--bone-dim)]'}`}>Standard UPS<br /><span className="text-[10px]">Included</span></button>
                <button onClick={() => setDelivery('express')} className={`rounded-lg border px-3 py-2 text-left text-[12px] ${delivery === 'express' ? 'border-[var(--gold)] text-white bg-[rgba(212,178,106,.08)]' : 'border-[rgba(216,214,211,.14)] text-[var(--bone-dim)]'}`}>Express DHL<br /><span className="text-[10px]">+ $45</span></button>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-[13px] text-[var(--bone-dim)]">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping ? formatPrice(shipping, currency) : 'Included'}</span></div>
              <div className="pt-4 border-t border-[rgba(216,214,211,.12)] flex justify-between items-end"><span className="eyebrow">Draft total</span><span className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(total, currency)}</span></div>
            </div>

            <button onClick={saveDraft} className="btn-gold justify-center rounded-md h-11 w-full mt-5">{saved ? 'Draft saved' : 'Save checkout draft'} <ArrowUpRight size={13} /></button>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--smoke)]">Payment is intentionally not active yet. Final paid order creation will be connected only after the secure provider and v4 price contract are ready.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Field({ icon, placeholder, value, onChange }: { icon: React.ReactNode; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center gap-3 rounded-lg border border-[rgba(216,214,211,.13)] bg-black/20 px-3 h-11 text-[var(--bone-dim)]">{icon}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none text-[13px] text-bone placeholder:text-[var(--smoke)]" /></label>;
}
