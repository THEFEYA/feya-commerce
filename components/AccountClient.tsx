'use client';

import Link from 'next/link';
import { ArrowUpRight, Heart, MapPin, Ruler, ShoppingBag, Sparkles, UserRound } from 'lucide-react';

const MODULES = [
  { title: 'Orders', description: 'Track order status, production stage, shipping and delivery dates.', icon: ShoppingBag },
  { title: 'Measurements', description: 'Save bust, waist, hips, height and custom sizing notes for made-to-order pieces.', icon: Ruler },
  { title: 'Addresses', description: 'Keep shipping addresses ready for faster checkout.', icon: MapPin },
  { title: 'Saved looks', description: 'Wishlist pieces, selected configurations and styling notes for future events.', icon: Heart },
];

const FLOW = [
  'Guest checkout stays available first.',
  'Account creation can happen after purchase.',
  'No card data is stored by FEYA frontend.',
  'Order snapshots will use approved English labels and v4 prices.',
];

export function AccountClient() {
  return (
    <section className="container-feya pt-[170px] pb-20">
      <div className="grid grid-cols-12 gap-8 items-end border-b border-[rgba(216,214,211,.12)] pb-8 mb-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow-gold mb-3 flex items-center gap-2"><UserRound size={14} /> Customer cabinet</div>
          <h1 className="font-tall text-bone leading-[0.96] tracking-[0.035em]" style={{ fontSize: 'clamp(34px,5vw,72px)' }}>Your FEYA account</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--bone-dim)]">A future private space for orders, measurements, saved looks and delivery details. This page is prepared as the customer-account backbone and will connect to the secure checkout flow after the v4 price/config contract is approved.</p>
        </div>
        <div className="col-span-12 lg:col-span-5 rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
          <div className="eyebrow-gold mb-3 flex items-center gap-2"><Sparkles size={14} /> Safe checkout rule</div>
          <div className="space-y-2.5">
            {FLOW.map((item) => <p key={item} className="text-[13px] leading-relaxed text-[var(--bone-dim)]">• {item}</p>)}
          </div>
          <Link href="/cart" className="btn-gold justify-center rounded-md h-11 w-full mt-5">Continue from bag <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MODULES.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 min-h-[210px] flex flex-col">
            <div className="h-11 w-11 rounded-full border border-[rgba(216,214,211,.18)] bg-black/20 flex items-center justify-center text-[var(--gold-warm)] mb-5"><Icon size={17} /></div>
            <h2 className="product-card-title text-bone text-[24px] leading-tight">{title}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{description}</p>
            <div className="mt-auto pt-5 text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">Planned module</div>
          </article>
        ))}
      </div>
    </section>
  );
}
