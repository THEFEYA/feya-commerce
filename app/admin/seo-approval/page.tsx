// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Clock3, Database, ShieldAlert } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabase';
import SeoDraftReviewActionsClient from './SeoDraftReviewActionsClient';
import SeoDraftSimilarityCheckClient from './SeoDraftSimilarityCheckClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAVED_DRAFT_QUEUE_LIMIT = 100;
const DRAFT_EVENTS_LIMIT = 300;

async function loadSavedDraftQueue() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { drafts: [], error: 'Нет service-role доступа для чтения очереди SEO-черновиков.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_seo_pack_review_queue_v1')
    .select('id,canonical_product_id,matched_etsy_listing_id,product_slug,status,review_status,source_mode,seo_title,h1,meta_description,metrics_status,validation_status,similarity_status,image_alt_status,created_at,updated_at,reviewed_at')
    .limit(SAVED_DRAFT_QUEUE_LIMIT);
  if (error) return { drafts: [], error: error.message };
  return { drafts: data || [], error: null };
}

async function loadDraftEvents(draftIds) {
  if (!draftIds.length) return { eventsByDraft: new Map(), error: null };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { eventsByDraft: new Map(), error: 'Нет service-role доступа для чтения истории SEO-черновиков.' };
  const { data, error } = await supabase
    .from('feya_commerce_seo_pack_draft_events_v1')
    .select('id,draft_id,canonical_product_id,event_type,from_status,to_status,actor,note,payload,created_at')
    .in('draft_id', draftIds)
    .limit(DRAFT_EVENTS_LIMIT);
  if (error) return { eventsByDraft: new Map(), error: error.message };
  const eventsByDraft = new Map();
  for (const event of data || []) {
    const key = event.draft_id;
    if (!eventsByDraft.has(key)) eventsByDraft.set(key, []);
    eventsByDraft.get(key).push(event);
  }
  for (const events of eventsByDraft.values()) {
    events.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  }
  return { eventsByDraft, error: null };
}

function draftTone(value) {
  const status = String(value || '').toLowerCase();
  if (status.includes('approved') || status === 'valid' || status === 'pass' || status === 'validated') return 'success';
  if (status.includes('reject') || status.includes('block')) return 'danger';
  return 'warning';
}

function statusLabel(value) {
  const map = {
    draft_generated: 'черновик создан',
    needs_human_review: 'нужна проверка',
    changes_requested: 'нужны правки',
    rejected: 'отклонён',
    approved_draft: 'черновик одобрен',
    needs_similarity_check: 'нужна проверка похожести',
    needs_image_alt_review: 'нужна проверка ALT',
    ready_for_publish: 'готов к публикации',
    not_reviewed: 'не проверен',
    approved: 'одобрен',
    valid: 'valid',
    validated: 'validated',
    warning: 'проверить',
    missing: 'нет данных',
    not_checked: 'не проверено',
    pass: 'готово',
  };
  return map[String(value || '').toLowerCase()] || String(value || '—');
}

function eventLabel(value) {
  const map = {
    draft_created: 'черновик создан',
    draft_updated: 'черновик обновлён',
    validation_checked: 'validator проверен',
    human_review_requested: 'запрошена human review',
    human_approved: 'черновик одобрен человеком',
    changes_requested: 'запрошены правки',
    rejected: 'черновик отклонён',
    similarity_checked: 'похожесть проверена',
    image_alt_checked: 'image ALT проверен',
    ready_for_publish_marked: 'отмечен ready for publish',
    archived: 'архивирован',
  };
  return map[String(value || '').toLowerCase()] || String(value || 'event');
}

function dateLabel(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function MiniFact({ label, value, tone = 'neutral' }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className={`text-[12px] leading-snug ${tone === 'success' ? 'text-[#a9dfbd]' : tone === 'danger' ? 'text-[var(--ruby-soft)]' : 'text-bone'}`}>{value || '—'}</div>
  </div>;
}

function EventTimeline({ events = [] }) {
  return <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">История черновика</div><div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">Audit trail: каждое review-действие должно оставлять событие.</div></div>
      <Chip tone={events.length ? 'success' : 'warning'}>{events.length} событий</Chip>
    </div>
    {events.length ? <div className="space-y-2">{events.map((event) => <div key={event.id} className="grid gap-2 md:grid-cols-[170px_1fr] rounded-lg border border-[rgba(216,214,211,.08)] bg-black/20 p-2.5">
      <div><div className="text-[11px] text-bone">{eventLabel(event.event_type)}</div><div className="mt-1 text-[10px] text-[var(--smoke)]">{dateLabel(event.created_at)}</div></div>
      <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]">
        <div><span className="text-[var(--gold-warm)]">{statusLabel(event.from_status) || '—'}</span> → <span className="text-[#a9dfbd]">{statusLabel(event.to_status) || '—'}</span></div>
        {event.note ? <div className="mt-1">{event.note}</div> : null}
        {event.actor ? <div className="mt-1 text-[10px] text-[var(--smoke)]">actor: {event.actor}</div> : null}
      </div>
    </div>)}</div> : <div className="rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.06)] p-2.5 text-[11px] leading-relaxed text-[var(--bone-dim)]">Событий пока нет. Это не блокирует отображение, но перед publish readiness история должна быть полной.</div>}
  </div>;
}

function SavedDraftCard({ draft, events }) {
  const title = draft.h1 || draft.seo_title || draft.product_slug || 'SEO-черновик';
  const isFinalReviewState = ['approved', 'changes_requested', 'rejected'].includes(String(draft.review_status || '').toLowerCase());
  const needsSimilarityGate = String(draft.review_status || '').toLowerCase() === 'approved' && ['warning', 'not_checked', 'missing', 'проверить'].includes(String(draft.similarity_status || '').toLowerCase());
  return <article className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="grid sm:grid-cols-[92px_1fr] gap-4 min-w-0">
        <div className="h-24 rounded-xl overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30 flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">фото позже</div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <Chip tone={draftTone(draft.status)}>{statusLabel(draft.status)}</Chip>
            <Chip tone={draftTone(draft.review_status)}>{statusLabel(draft.review_status)}</Chip>
            <Chip>{draft.source_mode || 'source'}</Chip>
          </div>
          <h2 className="text-bone text-[18px] leading-snug">{title}</h2>
          <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">/{draft.product_slug || 'no-slug'} · draft {String(draft.id).slice(0, 8)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Link href={`/admin/seo-engine/draft-preview?product_id=${draft.canonical_product_id}`} className="btn-ghost px-4 py-2 text-[10px]">Открыть проверку <ArrowUpRight size={13} /></Link>
        {draft.product_slug ? <Link href={`/shop/${draft.product_slug}`} className="btn-ghost px-4 py-2 text-[10px]">Товар <ArrowUpRight size={13} /></Link> : null}
      </div>
    </div>
    <div className="mt-5 grid lg:grid-cols-2 gap-3">
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">SEO title</div><div className="text-[13px] leading-relaxed text-bone">{draft.seo_title || '—'}</div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">Meta description</div><div className="text-[13px] leading-relaxed text-bone">{draft.meta_description || '—'}</div></div>
    </div>
    <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <MiniFact label="Validator" value={statusLabel(draft.validation_status)} tone={draftTone(draft.validation_status)} />
      <MiniFact label="Метрики" value={statusLabel(draft.metrics_status)} tone={draftTone(draft.metrics_status)} />
      <MiniFact label="Похожесть" value={statusLabel(draft.similarity_status)} tone={draftTone(draft.similarity_status)} />
      <MiniFact label="Image ALT" value={statusLabel(draft.image_alt_status)} tone={draftTone(draft.image_alt_status)} />
      <MiniFact label="Обновлён" value={dateLabel(draft.updated_at)} />
    </div>
    <EventTimeline events={events || []} />
    {needsSimilarityGate ? <SeoDraftSimilarityCheckClient draftId={draft.id} /> : null}
    {isFinalReviewState ? <div className="mt-4 rounded-xl border border-[rgba(108,183,138,.22)] bg-[rgba(108,183,138,.06)] p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Review status уже изменён: <span className="text-[#a9dfbd]">{statusLabel(draft.review_status)}</span>. Это не публикация; publish readiness всё ещё требует similarity/cannibalization gate.</div> : <SeoDraftReviewActionsClient draftId={draft.id} />}
  </article>;
}

export default async function SeoApprovalPage() {
  const savedDraftQueue = await loadSavedDraftQueue();
  const savedDrafts = savedDraftQueue.drafts || [];
  const draftIds = savedDrafts.map((draft) => draft.id).filter(Boolean);
  const draftEvents = await loadDraftEvents(draftIds);
  const notReviewed = savedDrafts.filter((draft) => draft.review_status === 'not_reviewed').length;
  const validatorReady = savedDrafts.filter((draft) => draft.validation_status === 'valid').length;
  const needsSimilarity = savedDrafts.filter((draft) => ['warning', 'not_checked', 'missing'].includes(String(draft.similarity_status || '').toLowerCase())).length;
  const totalEvents = Array.from(draftEvents.eventsByDraft.values()).reduce((sum, events) => sum + events.length, 0);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · проверка SEO</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Проверка SEO</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Быстрая очередь сохранённых SEO-черновиков из storage layer. Здесь мы проверяем drafts, но не публикуем и не меняем storefront/product tables.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/seo-engine/briefs" className="btn-ghost">SEO-бриф <ArrowUpRight size={13} /></Link><Link href="/admin/indexation" className="btn-ghost">Индексация <ArrowUpRight size={13} /></Link></div></div>
    {savedDraftQueue.error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{savedDraftQueue.error}</div> : null}
    {draftEvents.error ? <div className="rounded-2xl border border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] p-5 text-[var(--bone-dim)] mb-7">История событий не загрузилась: {draftEvents.error}. Очередь черновиков продолжает работать.</div> : null}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={Database} label="Сохранённые" value={savedDrafts.length} note="Новые SEO-pack drafts из storage layer." tone="success" /><Metric icon={ShieldAlert} label="На проверке" value={notReviewed} note="Ждут human review." tone="danger" /><Metric icon={CheckCircle2} label="Validator OK" value={validatorReady} note="Черновики проходят output validator." tone="success" /><Metric icon={Clock3} label="События" value={totalEvents} note="Audit trail по сохранённым черновикам." /></div>

    <div className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4"><div><div className="eyebrow-gold mb-2">Новые сохранённые SEO-черновики</div><h2 className="text-bone text-[24px] leading-tight">Очередь из storage contract</h2></div><Chip tone="success">{savedDrafts.length} строк</Chip></div>
      {savedDrafts.length ? <div className="space-y-4">{savedDrafts.map((draft) => <SavedDraftCard key={draft.id} draft={draft} events={draftEvents.eventsByDraft.get(draft.id) || []} />)}</div> : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 text-[var(--bone-dim)]">Сохранённых SEO-черновиков пока нет. Открой проверку черновика и нажми “Сохранить черновик для проверки”.</div>}
    </div>

    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
      <div className="eyebrow-gold mb-2">Legacy fallback</div>
      <h2 className="text-bone text-[24px] leading-tight">Старые rule-based drafts временно отключены</h2>
      <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Этот блок раньше тянул тяжёлые product views и мог вызывать Supabase statement timeout. Чтобы новая очередь SEO-черновиков работала стабильно, legacy fallback будет возвращён позже отдельным лёгким API с пагинацией и лимитами.</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/seo-lab" className="btn-ghost">Открыть SEO-лабораторию <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/briefs" className="btn-ghost">Создать новый SEO-бриф <ArrowUpRight size={13} /></Link></div>
    </div>
  </section></main>;
}
