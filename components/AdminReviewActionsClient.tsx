'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, MessageSquarePlus, RefreshCw, ShieldAlert } from 'lucide-react';

type ReviewEvent = {
  review_event_id: string;
  event_type: string;
  event_status?: string | null;
  subject_type?: string | null;
  product_slug?: string | null;
  canonical_product_id?: string | null;
  configuration_id?: string | null;
  admin_note?: string | null;
  source_route?: string | null;
  created_at?: string | null;
};

type ApiPayload = { ok?: boolean; error?: string; events?: ReviewEvent[]; event?: ReviewEvent };

type InitialBlockers = {
  label: boolean;
  price: boolean;
  component: boolean;
  media: boolean;
};

type Props = {
  productSlug: string;
  canonicalProductId?: string | null;
  sourceRoute: string;
  initialBlockers: InitialBlockers;
};

type Readiness = {
  status: 'Draft' | 'Needs Label Review' | 'Needs Price Review' | 'Needs Component Mapping' | 'Needs Media QA' | 'SEO Ready' | 'Ready for Storefront' | 'Blocked';
  tone: 'neutral' | 'warning' | 'danger' | 'success';
  note: string;
};

const actions = [
  { label: 'Название проверено', event_type: 'label_review_approved', subject_type: 'label', status: 'approved' },
  { label: 'Цена проверена', event_type: 'price_review_approved', subject_type: 'price', status: 'approved' },
  { label: 'Компоненты проверены', event_type: 'component_mapping_checked', subject_type: 'component', status: 'approved' },
  { label: 'Медиа проверены', event_type: 'media_checked', subject_type: 'media', status: 'approved' },
  { label: 'SEO проверено', event_type: 'seo_ready_checked', subject_type: 'seo', status: 'approved' },
  { label: 'Нужны исправления', event_type: 'needs_fix', subject_type: 'product', status: 'needs_fix' },
];

function readinessLabel(status: Readiness['status']) {
  if (status === 'Draft') return 'Черновик';
  if (status === 'Needs Label Review') return 'Проверить название';
  if (status === 'Needs Price Review') return 'Проверить цену';
  if (status === 'Needs Component Mapping') return 'Проверить компоненты';
  if (status === 'Needs Media QA') return 'Проверить медиа';
  if (status === 'SEO Ready') return 'Проверить SEO';
  if (status === 'Ready for Storefront') return 'Готово для витрины';
  if (status === 'Blocked') return 'Заблокировано';
  return status;
}

function eventLabel(eventType: string) {
  if (eventType === 'label_review_approved') return 'Название проверено';
  if (eventType === 'price_review_approved') return 'Цена проверена';
  if (eventType === 'component_mapping_checked') return 'Компоненты проверены';
  if (eventType === 'media_checked') return 'Медиа проверены';
  if (eventType === 'seo_ready_checked') return 'SEO проверено';
  if (eventType === 'needs_fix') return 'Нужны исправления';
  if (eventType === 'internal_note_added') return 'Внутренняя заметка';
  return eventType.replaceAll('_', ' ');
}

function eventTone(eventType: string) {
  return eventType === 'needs_fix' ? 'text-[var(--ruby-soft)] border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]' : 'text-[var(--gold-warm)] border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)]';
}

function readinessTone(tone: Readiness['tone']) {
  if (tone === 'success') return 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]';
  if (tone === 'danger') return 'border-[rgba(196,64,88,.36)] bg-[rgba(160,32,56,.08)] text-[var(--ruby-soft)]';
  if (tone === 'warning') return 'border-[rgba(212,178,106,.32)] bg-[rgba(212,178,106,.07)] text-[var(--gold-warm)]';
  return 'border-[rgba(216,214,211,.14)] bg-black/15 text-[var(--bone-dim)]';
}

function computeReadiness(initialBlockers: InitialBlockers, latestByType: Map<string, ReviewEvent>, eventCount: number): Readiness {
  if (latestByType.has('needs_fix')) {
    return { status: 'Blocked', tone: 'danger', note: 'По товару есть событие “нужны исправления”.' };
  }

  if (!eventCount) {
    return { status: 'Draft', tone: 'neutral', note: 'Проверочные события по этому товару ещё не записаны.' };
  }

  const labelOk = !initialBlockers.label || latestByType.has('label_review_approved');
  const priceOk = !initialBlockers.price || latestByType.has('price_review_approved');
  const componentOk = !initialBlockers.component || latestByType.has('component_mapping_checked');
  const mediaOk = !initialBlockers.media || latestByType.has('media_checked');
  const seoOk = latestByType.has('seo_ready_checked');

  if (!labelOk) return { status: 'Needs Label Review', tone: 'warning', note: 'Название ещё требует проверки.' };
  if (!priceOk) return { status: 'Needs Price Review', tone: 'warning', note: 'Цена ещё не подтверждена.' };
  if (!componentOk) return { status: 'Needs Component Mapping', tone: 'warning', note: 'Компоненты ещё не подтверждены.' };
  if (!mediaOk) return { status: 'Needs Media QA', tone: 'warning', note: 'Медиа ещё требуют проверки.' };
  if (!seoOk) return { status: 'SEO Ready', tone: 'warning', note: 'Операционные проверки закрыты, осталось подтвердить SEO.' };

  return { status: 'Ready for Storefront', tone: 'success', note: 'Все обязательные проверки записаны, блокирующих событий нет.' };
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(216,214,211,.08)] bg-black/15 px-3 py-2">
    <span className="text-[12px] text-[var(--bone-dim)]">{label}</span>
    <span className={done ? 'text-[10px] uppercase tracking-[0.16em] text-[#a9dfbd]' : 'text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]'}>{done ? 'Готово' : 'Открыто'}</span>
  </div>;
}

export function AdminReviewActionsClient({ productSlug, canonicalProductId, sourceRoute, initialBlockers }: Props) {
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/review-events?product_slug=${encodeURIComponent(productSlug)}`, { cache: 'no-store' });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось загрузить события проверки.');
      const filtered = (payload.events || []).filter((event) => event.product_slug === productSlug || event.canonical_product_id === canonicalProductId);
      setEvents(filtered);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось загрузить события проверки.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEvents(); }, [productSlug, canonicalProductId]);

  const latestByType = useMemo(() => {
    const map = new Map<string, ReviewEvent>();
    for (const event of events) {
      if (!map.has(event.event_type)) map.set(event.event_type, event);
    }
    return map;
  }, [events]);

  const readiness = useMemo(() => computeReadiness(initialBlockers, latestByType, events.length), [initialBlockers, latestByType, events.length]);
  const labelOk = !initialBlockers.label || latestByType.has('label_review_approved');
  const priceOk = !initialBlockers.price || latestByType.has('price_review_approved');
  const componentOk = !initialBlockers.component || latestByType.has('component_mapping_checked');
  const mediaOk = !initialBlockers.media || latestByType.has('media_checked');
  const seoOk = latestByType.has('seo_ready_checked');

  async function recordAction(action: typeof actions[number]) {
    setSaving(action.event_type);
    setStatus('Сохраняю событие проверки...');
    try {
      const response = await fetch('/api/admin/review-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: action.event_type,
          event_status: action.status,
          subject_type: action.subject_type,
          canonical_product_id: canonicalProductId || null,
          product_slug: productSlug,
          admin_note: note || null,
          source_route: sourceRoute,
          payload_json: { product_slug: productSlug, source_route: sourceRoute },
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось сохранить событие проверки.');
      setStatus('Событие проверки сохранено.');
      setNote('');
      await loadEvents();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось сохранить событие проверки.');
    } finally {
      setSaving(null);
    }
  }

  return <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="eyebrow-gold mb-3 flex items-center gap-2"><ClipboardCheck size={14} /> Действия проверки товара</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] max-w-2xl">Действия записываются как проверочные события. Товар, цены, названия, медиа, SEO и оплата здесь напрямую не меняются.</p>
      </div>
      <button type="button" onClick={loadEvents} className="btn-ghost px-4 py-2 text-[10px]" disabled={loading}><RefreshCw size={12} /> {loading ? 'Загрузка' : 'Обновить'}</button>
    </div>

    <div className={`mt-5 rounded-xl border p-4 ${readinessTone(readiness.tone)}`}>
      <div className="eyebrow-dim mb-2">Единый статус готовности</div>
      <div className="text-[24px] leading-none font-price">{readinessLabel(readiness.status)}</div>
      <p className="mt-3 text-[12px] leading-relaxed opacity-85">{readiness.note}</p>
    </div>

    <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-5 gap-2">
      <CheckRow label="Название" done={labelOk} />
      <CheckRow label="Цена" done={priceOk} />
      <CheckRow label="Компоненты" done={componentOk} />
      <CheckRow label="Медиа" done={mediaOk} />
      <CheckRow label="SEO" done={seoOk} />
    </div>

    <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
      {actions.map((action) => {
        const saved = latestByType.get(action.event_type);
        return <button key={action.event_type} type="button" onClick={() => recordAction(action)} disabled={Boolean(saving)} className="rounded-xl border border-[rgba(216,214,211,.12)] bg-black/15 px-4 py-3 text-left hover:border-[rgba(212,178,106,.40)] transition disabled:opacity-60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-bone text-[13px]">{action.label}</span>
            {saved ? <CheckCircle2 size={15} className="text-[var(--gold-warm)]" /> : null}
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{saved?.created_at ? new Date(saved.created_at).toLocaleDateString() : 'События ещё нет'}</div>
        </button>;
      })}
    </div>

    <div className="mt-4 grid gap-3">
      <label className="grid gap-2">
        <span className="eyebrow-dim flex items-center gap-2"><MessageSquarePlus size={12} /> Внутренняя заметка для следующего действия</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательная внутренняя заметка..." className="min-h-[92px] rounded-xl border border-[rgba(216,214,211,.12)] bg-black/20 px-4 py-3 text-[13px] text-bone outline-none focus:border-white/40 placeholder:text-[var(--smoke)]" />
      </label>
      <button type="button" onClick={() => recordAction({ label: 'Добавить заметку', event_type: 'internal_note_added', subject_type: 'product', status: 'recorded' })} disabled={Boolean(saving) || !note.trim()} className="btn-ghost justify-center disabled:opacity-50"><MessageSquarePlus size={13} /> Добавить заметку</button>
    </div>

    {status ? <div className="mt-4 rounded-xl border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.055)] p-3 text-[12px] leading-relaxed text-[var(--gold-warm)]"><ShieldAlert size={13} className="inline mr-2" />{status}</div> : null}

    <div className="mt-5 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
      <div className="eyebrow-dim mb-3">Последние события</div>
      <div className="space-y-2">
        {events.slice(0, 8).map((event) => <div key={event.review_event_id} className="flex flex-col gap-1 rounded-lg border border-[rgba(216,214,211,.08)] bg-black/15 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${eventTone(event.event_type)}`}>{eventLabel(event.event_type)}</span>
          <span className="text-[11px] text-[var(--bone-dim)]">{event.created_at ? new Date(event.created_at).toLocaleString() : 'Нет даты'}</span>
        </div>)}
        {!events.length ? <div className="text-[12px] text-[var(--bone-dim)]">Проверочных событий по этому товару пока нет.</div> : null}
      </div>
    </div>
  </section>;
}
