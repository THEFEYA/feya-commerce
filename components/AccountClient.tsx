'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Bell, CalendarDays, FileText, Heart, MapPin, MessageCircle, PackageCheck, Ruler, ShieldCheck, ShoppingBag, Sparkles, UserRound, WandSparkles } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

const DRAFT_KEY = 'feya_checkout_draft_v1';

type LocalDraft = {
  items?: Array<{ title?: string; qty?: number; price?: number; currency?: string }>;
  total?: number;
  currency?: string;
  delivery?: string;
  payment_status?: string;
  order_status?: string;
  created_at?: string;
  contact?: {
    email?: string;
    fullName?: string;
    eventDate?: string;
  };
};

const MODULES = [
  { title: 'Orders', status: 'Order history', description: 'Track payment, production, shipping, delivery and return status without exposing internal raw data.', icon: ShoppingBag },
  { title: 'Measurements', status: 'Custom sizing', description: 'Save body measurements and attach them to made-to-order pieces before production starts.', icon: Ruler },
  { title: 'Addresses', status: 'Delivery book', description: 'Store shipping contacts and addresses for faster repeat checkout.', icon: MapPin },
  { title: 'Saved looks', status: 'Wishlist', description: 'Save products, configurations, colors, sizes, styling notes and event dates.', icon: Heart },
  { title: 'Atelier notes', status: 'Production brief', description: 'Keep event date, sizing comments, styling wishes and custom requests connected to the order.', icon: MessageCircle },
  { title: 'Documents', status: 'Order files', description: 'Future place for invoices, payment receipts, care notes and production confirmations.', icon: FileText },
];

const CHECKOUT_FLOW = [
  { step: 'Bag', text: 'Customer selects piece, configuration, color, size and quantity.' },
  { step: 'Checkout draft', text: 'Contact, address, shipping method, event date and notes are captured before payment.' },
  { step: 'Secure payment', text: 'Payment provider handles card data. FEYA frontend never stores card numbers.' },
  { step: 'Atelier review', text: 'Admin checks price confidence, labels, measurements and production notes.' },
  { step: 'Production', text: 'Order moves through made-to-order status, ready-to-ship and tracking.' },
];

const SAFETY = [
  'Guest checkout first, account creation after purchase.',
  'No fake paid orders and no local card collection.',
  'Order snapshot must use English labels and v4 display prices.',
  'Fallback prices and untranslated labels must be blocked from paid checkout.',
];

const ADMIN_HANDOFF = [
  'Price confidence warning',
  'Label translation warning',
  'Measurement profile attached',
  'Customer event deadline',
  'Production status',
  'Shipping and tracking status',
];

function readLocalDraft(): LocalDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(DRAFT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AccountClient() {
  const [draft, setDraft] = useState<LocalDraft | null>(null);

  useEffect(() => {
    setDraft(readLocalDraft());
  }, []);

  const draftItems = Array.isArray(draft?.items) ? draft?.items || [] : [];
  const currency = draft?.currency || draftItems[0]?.currency || 'EUR';
  const unitCount = draftItems.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  return (
    <section className="container-feya pt-[170px] pb-20">
      <div className="grid grid-cols-12 gap-8 items-end border-b border-[rgba(216,214,211,.12)] pb-8 mb-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow-gold mb-3 flex items-center gap-2"><UserRound size={14} /> Customer cabinet</div>
          <h1 className="font-tall text-bone leading-[0.96] tracking-[0.035em]" style={{ fontSize: 'clamp(34px,5vw,72px)' }}>Your FEYA account</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Private space for orders, measurements, saved looks, delivery details and atelier communication. The visual shell is ready now; real data connection will use the approved v4 price/config contract so customer orders are created from clean labels and verified prices.</p>
        </div>
        <div className="col-span-12 lg:col-span-5 rounded-2xl border border-[rgba(216,214,211,.14)] bg-[linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
          <div className="eyebrow-gold mb-3 flex items-center gap-2"><ShieldCheck size={14} /> Safe checkout rules</div>
          <div className="space-y-2.5">
            {SAFETY.map((item) => <p key={item} className="text-[13px] leading-relaxed text-[var(--bone-dim)]">• {item}</p>)}
          </div>
          <Link href="/cart" className="btn-gold justify-center rounded-md h-11 w-full mt-5">Continue from bag <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="eyebrow-gold mb-3 flex items-center gap-2"><Bell size={14} /> Current order draft</div>
            {draft ? (
              <>
                <h2 className="product-card-title text-bone text-[28px] leading-tight">Draft in progress</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">{unitCount} unit(s), {draftItems.length} item line(s), {formatPrice(draft.total || 0, currency)} · payment status: {draft.payment_status || 'not_started'} · order status: {draft.order_status || 'draft_only'}</p>
                <p className="mt-1 text-[12px] text-[var(--smoke)]">{draft.contact?.email || 'No email yet'}{draft.contact?.eventDate ? ` · Event: ${draft.contact.eventDate}` : ''}</p>
              </>
            ) : (
              <>
                <h2 className="product-card-title text-bone text-[28px] leading-tight">No active draft</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">Start from the bag, prepare checkout details, then the draft will appear here before payment.</p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/checkout" className="btn-chrome justify-center rounded-md h-11 px-5">Open checkout <ArrowUpRight size={13} /></Link>
            <Link href="/studio/orders" className="btn-gold justify-center rounded-md h-11 px-5">Atelier review <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {MODULES.map(({ title, status, description, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 min-h-[230px] flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="h-11 w-11 rounded-full border border-[rgba(216,214,211,.18)] bg-black/20 flex items-center justify-center text-[var(--gold-warm)]"><Icon size={17} /></div>
              <span className="rounded-full border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.07)] px-3 py-1 text-[9px] uppercase tracking-[0.20em] text-[var(--gold-warm)]">{status}</span>
            </div>
            <h2 className="product-card-title text-bone text-[24px] leading-tight">{title}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{description}</p>
            <div className="mt-auto pt-5 text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">Backbone module</div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-7 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="eyebrow-gold mb-5 flex items-center gap-2"><PackageCheck size={14} /> Checkout to production flow</div>
          <div className="space-y-3">
            {CHECKOUT_FLOW.map((item, index) => (
              <div key={item.step} className="grid grid-cols-[42px_1fr] gap-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="h-9 w-9 rounded-full border border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] flex items-center justify-center text-[11px] font-semibold text-[var(--gold-warm)]">{index + 1}</div>
                <div>
                  <div className="text-bone font-medium">{item.step}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--bone-dim)]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><BadgeCheck size={14} /> Admin handoff</div>
            <div className="grid gap-2">
              {ADMIN_HANDOFF.map((item) => <div key={item} className="flex items-center gap-2 text-[13px] text-[var(--bone-dim)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gold-warm)]" />{item}</div>)}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[linear-gradient(180deg,rgba(212,178,106,.055),rgba(255,255,255,.018))] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><CalendarDays size={14} /> Event-first logic</div>
            <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">The account must remember event dates and delivery deadlines, because FEYA orders are often tied to performances, festivals, shoots and stage deadlines. This becomes part of order review before production.</p>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-gold mb-4 flex items-center gap-2"><WandSparkles size={14} /> Future automation</div>
            <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Saved looks, measurements and order notes create a foundation for AI-assisted recommendations, abandoned cart follow-up, repeat orders and custom styling suggestions later.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
