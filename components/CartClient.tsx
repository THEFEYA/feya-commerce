'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Mail, MapPin, MessageSquareText, Minus, Phone, Plus, Truck, User, Zap } from 'lucide-react';
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
const COUNT_KEY = 'feya_visual_bag';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(CART_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.localStorage.setItem(COUNT_KEY, String(items.reduce((sum, item) => sum + item.qty, 0)));
  window.dispatchEvent(new Event('storage'));
}

function deliveryRange(mode: 'standard' | 'express') {
  return mode === 'express' ? 'Jul 03 – Jul 10' : 'Jul 10 – Jul 24';
}

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard');
  const [comment, setComment] = useState('');

  useEffect(() => {
    setItems(readCart());
  }, []);

  const currency = items[0]?.currency || 'EUR';
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const shipping = delivery === 'express' && items.length ? 45 : 0;
  const total = subtotal + shipping;

  const updateQty = (id: string, qty: number) => {
    const next = items.map((item) => item.id === id ? { ...item, qty: Math.max(1, qty) } : item);
    setItems(next);
    writeCart(next);
  };

  const removeItem = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    writeCart(next);
  };

  return (
    <section className="container-feya pt-[230px] lg:pt-[218px] pb-20">
      <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-5">
        <div className="eyebrow-gold mb-3">Atelier checkout</div>
        <h1 className="font-tall text-bone leading-[1.05] tracking-[0.035em]" style={{ fontSize: 'clamp(28px,2.6vw,38px)' }}>Your atelier bag</h1>
      </div>

      {!items.length ? (
        <div className="glass rounded-2xl p-8">
          <p className="text-[var(--bone-dim)] mb-6">Your bag is empty. Add a piece from the catalog to continue.</p>
          <Link href="/shop" className="btn-chrome">Continue shopping <ArrowUpRight size={13} /></Link>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr]">
                <Link href={`/shop/${item.slug}`} className="relative min-h-[150px] bg-black/30">
                  {item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                </Link>
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/shop/${item.slug}`} className="product-card-title text-[21px] leading-tight text-bone hover:text-white transition-colors">{item.title}</Link>
                      <p className="mt-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)]">{item.config} · {item.color} · {item.size}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)] hover:text-white">Remove</button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-4">
                    <div className="h-10 rounded-md border border-[rgba(216,214,211,0.18)] grid grid-cols-3 items-center min-w-[112px]"><button onClick={() => updateQty(item.id, item.qty - 1)}><Minus size={13} className="mx-auto" /></button><span className="text-center text-sm">{item.qty}</span><button onClick={() => updateQty(item.id, item.qty + 1)}><Plus size={13} className="mx-auto" /></button></div>
                    <div className="font-price text-gold-grad text-[28px] leading-none">{formatPrice(item.price * item.qty, item.currency)}</div>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.02)] p-5">
              <div className="eyebrow-gold mb-3 flex items-center gap-2"><MessageSquareText size={14} /> Optional comment</div>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave sizing notes, event date, styling wishes or delivery comments..." className="min-h-[110px] w-full rounded-lg border border-[rgba(216,214,211,.14)] bg-black/20 px-4 py-3 text-[14px] text-bone outline-none focus:border-white/50" />
            </div>
          </div>

          <aside className="col-span-12 lg:col-span-5 lg:sticky lg:top-[104px] self-start space-y-4">
            <div className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
              <div className="eyebrow-gold mb-4">Shipping method</div>
              <div className="grid gap-3">
                <button onClick={() => setDelivery('standard')} className={`rounded-xl px-4 py-3 text-left border transition-all ${delivery === 'standard' ? 'border-white bg-white/[.055] shadow-[0_0_0_1px_rgba(255,255,255,.28)]' : 'border-[rgba(216,214,211,.14)] hover:border-white/40'}`}>
                  <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full border border-white/25 flex items-center justify-center"><Truck size={15} /></span><span><strong className="block">Standard UPS</strong><span className="text-[12px] text-[var(--bone-dim)]">14–21 business days · Included</span></span></div>
                </button>
                <button onClick={() => setDelivery('express')} className={`rounded-xl px-4 py-3 text-left border transition-all ${delivery === 'express' ? 'border-[var(--gold)] bg-[rgba(212,178,106,.08)] shadow-[0_0_0_1px_rgba(212,178,106,.30)]' : 'border-[rgba(216,214,211,.14)] hover:border-[rgba(212,178,106,.45)]'}`}>
                  <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full border border-[rgba(212,178,106,.45)] text-[var(--gold)] flex items-center justify-center"><Zap size={15} /></span><span><strong className="block">Express DHL</strong><span className="text-[12px] text-[var(--bone-dim)]">7–10 business days · +$45</span></span></div>
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4 grid grid-cols-3 gap-3">
                <div><div className="eyebrow-dim">Ordered</div><strong className="text-[13px]">Jun 12</strong></div>
                <div><div className="eyebrow-dim">Ready</div><strong className="text-[13px]">Jun 26 – Jul 03</strong></div>
                <div><div className="eyebrow-dim">Delivered</div><strong className="text-[13px] text-[var(--gold-warm)]">{deliveryRange(delivery)}</strong></div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-5">
              <div className="eyebrow-gold mb-4">Contact & delivery details</div>
              <div className="grid gap-3">
                <Field icon={<User size={14} />} placeholder="Full name" />
                <Field icon={<Mail size={14} />} placeholder="Email" />
                <Field icon={<Phone size={14} />} placeholder="Phone" />
                <Field icon={<MapPin size={14} />} placeholder="Country, city, street, ZIP" />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] p-5">
              <div className="flex justify-between text-[13px] text-[var(--bone-dim)]"><span>Subtotal</span><span>{formatPrice(subtotal, currency)}</span></div>
              <div className="flex justify-between text-[13px] text-[var(--bone-dim)] mt-2"><span>Shipping</span><span>{shipping ? formatPrice(shipping, currency) : 'Included'}</span></div>
              <div className="mt-4 pt-4 border-t border-[rgba(216,214,211,.12)] flex justify-between items-end"><span className="eyebrow">Total</span><span className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(total, currency)}</span></div>
              <Link href="/checkout" className="btn-gold justify-center rounded-md h-11 w-full mt-5">Continue to checkout draft <ArrowUpRight size={13} /></Link>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--smoke)]">Payment gateway is not connected yet. This is a safe checkout preview; no card data is collected here.</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function Field({ icon, placeholder }: { icon: React.ReactNode; placeholder: string }) {
  return <label className="flex items-center gap-3 rounded-lg border border-[rgba(216,214,211,.13)] bg-black/20 px-3 h-11 text-[var(--bone-dim)]">{icon}<input placeholder={placeholder} className="w-full bg-transparent outline-none text-[13px] text-bone placeholder:text-[var(--smoke)]" /></label>;
}
