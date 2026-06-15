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
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось загрузить проверочные события.');
      setEvents(payload.events || []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить проверочные события.');
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
        <div className="eyebrow-gold mb-2 flex items-center gap-2"><ClipboardCheck size={14} /> Сводка готовности</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] max-w-3xl">Объединяет блокеры из v4-контракта и сохранённые проверочные события. Это не логика оплаты и не прямое изменение товара.</p>
      </div>
      <button type="button" onClick={load} className="btn-ghost px-4 py-2 text-[10px]" disabled={loading}><RefreshCw size={12} /> {loading ? 'Загрузка' : 'Обновить события'}</button>
    </div>

    {error ? <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] text-[var(--gold-warm)] mb-4"><AlertTriangle size={13} className="inline mr-2" />{error}</div> : null}

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Metric label="Товары v4" value={products} note="Текущий срез storefront-контракта." />
      <Metric label="Открытые блокеры" value={labelReview + priceReview + componentIssues + mediaReview} tone="warning" note="Названия, цены, компоненты и медиа из v4." />
      <Metric label="Проверенные товары" value={stats.reviewedProducts} tone="success" note="Товары, где уже есть хотя бы одно проверочное событие." />
      <Metric label="SEO готово" value={stats.seoReadyEvents} tone="success" note="Товары, отмеченные как готовые по SEO." />
      <Metric label="Блокеры" value={stats.blockedEvents} tone={stats.blockedEvents ? 'danger' : 'neutral'} note="События “нужны исправления”, которые блокируют запуск." />
    </div>

    <div className="mt-4 grid md:grid-cols-3 gap-3">
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><CheckCircle2 size={14} className="text-[#a9dfbd] mb-2" /><div className="text-bone text-[13px]">Всего проверочных событий: {stats.actionEvents}</div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><ShieldAlert size={14} className="text-[var(--gold-warm)] mb-2" /><div className="text-bone text-[13px]">Проверено черновиков заказов: {stats.orderDraftReviews}</div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><AlertTriangle size={14} className="text-[var(--gold-warm)] mb-2" /><div className="text-bone text-[13px]">Оплата остаётся выключенной до проверки провайдера и webhook.</div></div>
    </div>
  </section>;
}
