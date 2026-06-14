'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert } from 'lucide-react';

type ReviewEvent = {
  review_event_id: string;
  event_type: string;
  event_status?: string | null;
  product_slug?: string | null;
  canonical_product_id?: string | null;
  order_draft_id?: string | null;
  created_at?: string | null;
};

type ApiPayload = { ok?: boolean; error?: string; events?: ReviewEvent[] };

type Props = {
  products: number;
  labelReview: number;
  priceReview: number;
  componentIssues: number;
  mediaReview: number;
};

function uniqueCount(events: ReviewEvent[], key: 'product_slug' | 'order_draft_id') {
  const values = new Set<string>();
  for (const event of events) {
    const value = event[key];
    if (value) values.add(value);
  }
  return values.size;
}

function Metric({ label, value, note, tone = 'neutral' }: { label: string; value: string | number; note: string; tone?: 'neutral' | 'warning' | 'danger' | 'success' }) {
  const className = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
      : tone === 'warning'
        ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
        : 'border-[rgba(216,214,211,.12)] bg-black/15';
  return <div className={`rounded-xl border ${className} p-4`}>
    <div className="eyebrow-dim mb-2">{label}</div>
    <div className="font-price text-gold-grad text-[32px] leading-none">{value}</div>
    <div className="mt-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export function AdminReadinessOverviewClient({ products, labelReview, priceReview, componentIssues, mediaReview }: Props) {
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/review-events', { cache: 'no-store' });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load review events.');
      setEvents(payload.events || []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load review events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const productEvents = events.filter((event) => event.product_slug || event.canonical_product_id);
    return {
      actionEvents: events.length,
      reviewedProducts: uniqueCount(productEvents, 'product_slug'),
      orderDraftReviews: uniqueCount(events, 'order_draft_id'),
      blockedEvents: events.filter((event) => event.event_type === 'needs_fix').length,
      seoReadyEvents: events.filter((event) => event.event_type === 'seo_ready_checked').length,
    };
  }, [events]);

  return <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
      <div>
        <div className="eyebrow-gold mb-2 flex items-center gap-2"><ClipboardCheck size={14} /> Control Tower readiness</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] max-w-3xl">Combines v4 blocker counts with saved admin review events. This is not payment logic and does not mutate product data.</p>
      </div>
      <button type="button" onClick={load} className="btn-ghost px-4 py-2 text-[10px]" disabled={loading}><RefreshCw size={12} /> {loading ? 'Loading' : 'Refresh events'}</button>
    </div>

    {error ? <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] text-[var(--gold-warm)] mb-4"><AlertTriangle size={13} className="inline mr-2" />{error}</div> : null}

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Metric label="v4 Products" value={products} note="Current safe storefront contract slice." />
      <Metric label="Open blockers" value={labelReview + priceReview + componentIssues + mediaReview} tone="warning" note="Label, price, component and media issues from v4." />
      <Metric label="Reviewed products" value={stats.reviewedProducts} tone="success" note="Products with at least one admin review event." />
      <Metric label="SEO ready events" value={stats.seoReadyEvents} tone="success" note="Products marked with SEO ready events." />
      <Metric label="Blocked events" value={stats.blockedEvents} tone={stats.blockedEvents ? 'danger' : 'neutral'} note="Needs-fix review events. These block launch." />
    </div>

    <div className="mt-4 grid md:grid-cols-3 gap-3">
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><CheckCircle2 size={14} className="text-[#a9dfbd] mb-2" /><div className="text-bone text-[13px]">{stats.actionEvents} total review events</div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><ShieldAlert size={14} className="text-[var(--gold-warm)] mb-2" /><div className="text-bone text-[13px]">{stats.orderDraftReviews} order drafts reviewed</div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><AlertTriangle size={14} className="text-[var(--gold-warm)] mb-2" /><div className="text-bone text-[13px]">Payment stays off until provider + webhook are verified.</div></div>
    </div>
  </section>;
}
