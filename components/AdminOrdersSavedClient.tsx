'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, MessageSquarePlus, PackageCheck, ShieldCheck, type LucideIcon } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

type DraftItem = {
  order_draft_item_id?: string | null;
  product_title?: string | null;
  image_url?: string | null;
  public_label?: string | null;
  configuration_label?: string | null;
  component_code?: string | null;
  is_full_set?: boolean | null;
  is_bundle?: boolean | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  line_total_amount?: number | null;
  currency?: string | null;
  price_confidence_status?: string | null;
};

type DraftRow = {
  order_draft_id: string;
  draft_number?: string | null;
  full_name?: string | null;
  email?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  has_price_review_warning?: boolean | null;
  has_label_review_warning?: boolean | null;
  created_at?: string | null;
  items?: DraftItem[] | null;
};

type ApiPayload = { ok?: boolean; error?: string; drafts?: DraftRow[] };
type ReviewResponse = { ok?: boolean; error?: string };
type MetricProps = { label: string; value: string | number; note: string; icon: LucideIcon };
type OrderAction = { label: string; event_type: string; status: 'recorded' | 'needs_fix' | 'approved' };

const orderActions: OrderAction[] = [
  { label: 'Черновик проверен', event_type: 'order_draft_reviewed', status: 'approved' },
  { label: 'Нужны исправления', event_type: 'needs_fix', status: 'needs_fix' },
];

function statusLabel(status?: string | null) {
  if (status === 'draft_only') return 'Черновик';
  if (status === 'not_started') return 'Не начато';
  if (status === 'approved') return 'Одобрено';
  if (status === 'recorded') return 'Записано';
  if (status === 'needs_fix') return 'Нужны исправления';
  if (status === 'unverified') return 'Не проверено';
  return status || '—';
}

function Chip({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }: MetricProps) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export function AdminOrdersSavedClient() {
  const [payload, setPayload] = useState<ApiPayload>({ drafts: [] });
  const [loading, setLoading] = useState(true);
  const [noteByDraft, setNoteByDraft] = useState<Record<string, string>>({});
  const [statusByDraft, setStatusByDraft] = useState<Record<string, string>>({});
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/order-drafts', { cache: 'no-store' });
      const data = await response.json();
      setPayload(data);
    } catch (error) {
      setPayload({ ok: false, error: error instanceof Error ? error.message : 'Не удалось загрузить черновики заказов.', drafts: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const drafts = payload.drafts || [];
  const itemCount = drafts.reduce((sum, draft) => sum + (draft.items?.length || 0), 0);
  const warningCount = drafts.filter((draft) => draft.has_price_review_warning || draft.has_label_review_warning).length;

  function updateNote(draftId: string, value: string) {
    setNoteByDraft((current) => ({ ...current, [draftId]: value }));
  }

  async function recordOrderEvent(draft: DraftRow, action: OrderAction) {
    const note = noteByDraft[draft.order_draft_id] || '';
    setSavingDraftId(draft.order_draft_id);
    setStatusByDraft((current) => ({ ...current, [draft.order_draft_id]: 'Сохраняю событие проверки...' }));
    try {
      const response = await fetch('/api/admin/review-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: action.event_type,
          event_status: action.status,
          subject_type: 'order_draft',
          order_draft_id: draft.order_draft_id,
          admin_note: note || null,
          source_route: '/admin/orders',
          payload_json: {
            draft_number: draft.draft_number || null,
            email: draft.email || null,
            has_price_review_warning: draft.has_price_review_warning === true,
            has_label_review_warning: draft.has_label_review_warning === true,
          },
        }),
      });
      const result = await response.json() as ReviewResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || 'Не удалось сохранить событие проверки.');
      setStatusByDraft((current) => ({ ...current, [draft.order_draft_id]: 'Событие проверки сохранено.' }));
      setNoteByDraft((current) => ({ ...current, [draft.order_draft_id]: '' }));
    } catch (error) {
      setStatusByDraft((current) => ({ ...current, [draft.order_draft_id]: error instanceof Error ? error.message : 'Не удалось сохранить событие проверки.' }));
    } finally {
      setSavingDraftId(null);
    }
  }

  return <section className="container-feya pb-10">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Metric icon={ClipboardList} label="Черновики" value={loading ? '…' : drafts.length} note="Загружены из защищённого API админки." />
      <Metric icon={PackageCheck} label="Позиции" value={loading ? '…' : itemCount} note="Позиции черновиков сохранены в Supabase." />
      <Metric icon={ShieldCheck} label="Предупреждения" value={loading ? '…' : warningCount} note="Флаги проверки цены или названия." />
      <Metric icon={AlertTriangle} label="Оплата выключена" value="0" note="Создание оплаченного заказа отключено." />
    </div>

    {payload.error ? <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5 text-[13px] leading-relaxed text-[var(--gold-warm)] mb-5"><AlertTriangle size={15} className="inline mr-2" />{payload.error}</div> : null}

    <div className="flex items-center justify-between gap-4 mb-4">
      <div><div className="eyebrow-gold">Черновики заказов из Supabase</div><p className="mt-2 text-[12px] text-[var(--bone-dim)]">Защищённое чтение только через админку. Публичный доступ к таблицам закрыт.</p></div>
      <button type="button" onClick={load} className="btn-ghost px-4 py-2 text-[10px]" disabled={loading}>{loading ? 'Загрузка…' : 'Обновить'}</button>
    </div>

    <div className="space-y-4">
      {drafts.map((draft) => {
        const currency = draft.currency || draft.items?.[0]?.currency || 'EUR';
        const draftStatus = statusByDraft[draft.order_draft_id];
        return <article key={draft.order_draft_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="eyebrow-gold mb-2">{draft.draft_number || draft.order_draft_id}</div>
              <div className="text-bone text-[18px] leading-snug">{draft.full_name || 'Без имени'}</div>
              <div className="mt-1 text-[12px] text-[var(--bone-dim)]">{draft.email || 'Нет email'} · {draft.created_at ? new Date(draft.created_at).toLocaleString() : 'Нет даты'}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{statusLabel(draft.order_status)}</Chip>
                <Chip>{statusLabel(draft.payment_status)}</Chip>
                {draft.has_price_review_warning ? <Chip tone="warning">Проверить цену</Chip> : null}
                {draft.has_label_review_warning ? <Chip tone="warning">Проверить название</Chip> : null}
              </div>
            </div>
            <div className="text-right"><div className="eyebrow-dim mb-2">Сумма черновика</div><div className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(Number(draft.total_amount || 0), currency)}</div></div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(draft.items || []).map((item, index) => <div key={item.order_draft_item_id || `${draft.order_draft_id}-${index}`} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
              <div className="relative h-[76px] rounded-md overflow-hidden bg-black/30">{item.image_url ? <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
              <div>
                <div className="text-bone text-[13px] leading-snug line-clamp-2">{item.product_title || 'TheFEYA piece'}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.public_label || item.configuration_label || 'Опция'} · {item.color || 'Цвет'} · {item.size || 'Размер'} · Кол-во {item.quantity || 1}</div>
                <div className="mt-2 font-price text-gold-grad text-[20px] leading-none">{formatPrice(Number(item.line_total_amount || 0), item.currency || currency)}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{item.component_code ? <Chip>{item.component_code}</Chip> : null}{item.is_full_set ? <Chip tone="warning">Полный комплект</Chip> : null}{item.is_bundle ? <Chip tone="warning">Комплект</Chip> : null}{item.price_confidence_status ? <Chip tone={item.price_confidence_status === 'approved' ? 'neutral' : 'warning'}>{statusLabel(item.price_confidence_status)}</Chip> : null}</div>
              </div>
            </div>)}
          </div>

          <div className="mt-5 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
            <div className="eyebrow-gold mb-3 flex items-center gap-2"><ClipboardList size={13} /> Действия проверки заказа</div>
            <textarea value={noteByDraft[draft.order_draft_id] || ''} onChange={(event) => updateNote(draft.order_draft_id, event.target.value)} placeholder="Внутренняя заметка к этому черновику..." className="min-h-[78px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/20 px-4 py-3 text-[13px] text-bone outline-none focus:border-white/40 placeholder:text-[var(--smoke)]" />
            <div className="mt-3 flex flex-wrap gap-2">
              {orderActions.map((action) => <button key={action.event_type} type="button" onClick={() => recordOrderEvent(draft, action)} disabled={savingDraftId === draft.order_draft_id} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {savingDraftId === draft.order_draft_id ? 'Сохраняю...' : action.label}</button>)}
              <button type="button" onClick={() => recordOrderEvent(draft, { label: 'Добавить заметку', event_type: 'internal_note_added', status: 'recorded' })} disabled={savingDraftId === draft.order_draft_id || !(noteByDraft[draft.order_draft_id] || '').trim()} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50"><MessageSquarePlus size={13} /> Добавить заметку</button>
            </div>
            {draftStatus ? <div className="mt-3 text-[12px] leading-relaxed text-[var(--gold-warm)]">{draftStatus}</div> : null}
          </div>
        </article>;
      })}

      {!loading && !drafts.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">Сохранённых черновиков заказов пока нет. Создай тестовый черновик через checkout, затем обнови этот блок.</div> : null}
    </div>
  </section>;
}
