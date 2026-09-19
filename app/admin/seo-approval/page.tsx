// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Clock3, Database, ShieldAlert } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabase';
import SeoDraftReviewActionsClient from './SeoDraftReviewActionsClient';
import SeoDraftSimilarityCheckClient from './SeoDraftSimilarityCheckClient';
import SeoDraftSourceOverlapCheckClient from './SeoDraftSourceOverlapCheckClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAVED_DRAFT_QUEUE_LIMIT = 100;
const DRAFT_EVENTS_LIMIT = 300;
const DRAFT_DETAILS_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const DRAFT_DETAILS_SELECT = [
  'id',
  'intro',
  'image_alt_candidates',
  'product_truth_snapshot',
  'qa_self_report',
  'agent_output_snapshot',
  'validation_result_snapshot',
].join(',');

async function loadSavedDraftQueue() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { drafts: [], error: 'Нет service-role доступа для чтения очереди SEO-черновиков.', detailError: null };
  const { data, error } = await supabase
    .from('feya_commerce_v_seo_pack_review_queue_v1')
    .select('id,canonical_product_id,matched_etsy_listing_id,product_slug,status,review_status,source_mode,seo_title,h1,meta_description,metrics_status,validation_status,similarity_status,image_alt_status,created_at,updated_at,reviewed_at')
    .limit(SAVED_DRAFT_QUEUE_LIMIT);
  if (error) return { drafts: [], error: error.message, detailError: null };

  const queueDrafts = data || [];
  const draftIds = queueDrafts.map((draft) => draft.id).filter(Boolean);
  if (!draftIds.length) return { drafts: queueDrafts, error: null, detailError: null };

  const detailResult = await supabase
    .from(DRAFT_DETAILS_TABLE)
    .select(DRAFT_DETAILS_SELECT)
    .in('id', draftIds);
  if (detailResult.error) {
    return { drafts: queueDrafts, error: null, detailError: detailResult.error.message };
  }

  const detailsById = new Map((detailResult.data || []).map((detail) => [detail.id, detail]));
  return {
    drafts: queueDrafts.map((draft) => ({ ...draft, ...(detailsById.get(draft.id) || {}) })),
    error: null,
    detailError: null,
  };
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
    needs_similarity_check: 'нужна проверка портфеля',
    needs_image_alt_review: 'нужна проверка ALT',
    ready_for_publish: 'готов к публикации',
    not_reviewed: 'не проверен',
    approved: 'одобрен',
    valid: 'валидно',
    validated: 'проверено',
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
    validation_checked: 'валидатор проверен',
    human_review_requested: 'запрошена проверка человеком',
    human_approved: 'черновик одобрен человеком',
    changes_requested: 'запрошены правки',
    rejected: 'черновик отклонён',
    similarity_checked: 'портфель и источник проверены',
    image_alt_checked: 'ALT изображений проверен',
    ready_for_publish_marked: 'отмечен как готовый к публикации',
    archived: 'архивирован',
  };
  return map[String(value || '').toLowerCase()] || String(value || 'событие');
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

function StoredPackDetails({ draft }) {
  const agentOutput = draft.agent_output_snapshot && typeof draft.agent_output_snapshot === 'object'
    ? draft.agent_output_snapshot
    : {};
  const productTruth = draft.product_truth_snapshot && typeof draft.product_truth_snapshot === 'object'
    ? draft.product_truth_snapshot
    : {};
  const validation = draft.validation_result_snapshot && typeof draft.validation_result_snapshot === 'object'
    ? draft.validation_result_snapshot
    : {};
  const pdpBlocks = Array.isArray(agentOutput.pdp_blocks) ? agentOutput.pdp_blocks : [];
  const imageAlts = Array.isArray(agentOutput.image_alt_candidates)
    ? agentOutput.image_alt_candidates
    : Array.isArray(draft.image_alt_candidates) ? draft.image_alt_candidates : [];
  const includedComponents = Array.isArray(productTruth.included_components)
    ? productTruth.included_components
    : [];
  const intro = agentOutput.intro || draft.intro || '';
  const structuralStatus = validation.structural_validation?.status || validation.status || 'not_checked';
  const commercialStatus = validation.commercial_validation?.status || 'not_checked';
  const keywordStatus = validation.keyword_placement_validation?.status || 'not_checked';

  return <details open={draft.review_status === 'not_reviewed'} className="mt-4 rounded-xl border border-[rgba(108,183,138,.24)] bg-[rgba(108,183,138,.045)] p-3">
    <summary className="cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[#a9dfbd]">
      Полный сохранённый SEO Pack · {pdpBlocks.length} PDP-блока
    </summary>
    <div className="mt-4 space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <MiniFact label="Структура" value={statusLabel(structuralStatus)} tone={draftTone(structuralStatus)} />
        <MiniFact label="Коммерческий текст" value={statusLabel(commercialStatus)} tone={draftTone(commercialStatus)} />
        <MiniFact label="Ключи" value={statusLabel(keywordStatus)} tone={draftTone(keywordStatus)} />
      </div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
        <div className="eyebrow-dim mb-2">Вступление</div>
        <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-bone">{intro || '—'}</div>
      </div>
      <div>
        <div className="eyebrow-dim mb-2">Левый PDP-текст</div>
        {pdpBlocks.length ? <div className="space-y-2">{pdpBlocks.map((block, index) => <div key={`${block.block_key || block.heading || 'block'}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
          <div className="mb-1.5 text-[12px] text-[var(--gold-warm)]">{block.heading || block.block_key || 'Блок страницы товара'}</div>
          <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-bone">{block.body || '—'}</div>
        </div>)}</div> : <div className="rounded-xl border border-[rgba(196,64,88,.28)] bg-[rgba(160,32,56,.08)] p-3 text-[12px] text-[var(--ruby-soft)]">В сохранённом snapshot нет PDP-блоков. Такой черновик нельзя считать полным.</div>}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
          <div className="eyebrow-dim mb-2">Что входит · из фактов товара</div>
          {includedComponents.length ? <ul className="space-y-1.5 text-[12px] text-bone">{includedComponents.map((component) => <li key={String(component)}>✓ {String(component)}</li>)}</ul> : <div className="text-[12px] text-[var(--ruby-soft)]">Состав не найден в сохранённых фактах товара.</div>}
        </div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
          <div className="eyebrow-dim mb-2">ALT для изображений</div>
          {imageAlts.length ? <ul className="space-y-2 text-[12px] text-bone">{imageAlts.map((item, index) => <li key={`${item.image_role || 'image'}-${index}`}>{item.alt_text || 'ALT не найден'}</li>)}</ul> : <div className="text-[12px] text-[var(--ruby-soft)]">ALT-кандидаты не найдены.</div>}
        </div>
      </div>
      <div className="text-[10px] leading-relaxed text-[var(--smoke)]">Это сохранённый черновик только для просмотра {draft.id}. Раскрытие блока не выполняет OpenAI-вызов, не меняет товар и не публикует текст.</div>
    </div>
  </details>;
}

function EventTimeline({ events = [] }) {
  return <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">История черновика</div><div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">История аудита: каждое действие проверки должно оставлять событие.</div></div>
      <Chip tone={events.length ? 'success' : 'warning'}>{events.length} событий</Chip>
    </div>
    {events.length ? <div className="space-y-2">{events.map((event) => <div key={event.id} className="grid gap-2 md:grid-cols-[170px_1fr] rounded-lg border border-[rgba(216,214,211,.08)] bg-black/20 p-2.5">
      <div><div className="text-[11px] text-bone">{eventLabel(event.event_type)}</div><div className="mt-1 text-[10px] text-[var(--smoke)]">{dateLabel(event.created_at)}</div></div>
      <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]">
        <div><span className="text-[var(--gold-warm)]">{statusLabel(event.from_status) || '—'}</span> → <span className="text-[#a9dfbd]">{statusLabel(event.to_status) || '—'}</span></div>
        {event.note ? <div className="mt-1">{event.note}</div> : null}
        {event.actor ? <div className="mt-1 text-[10px] text-[var(--smoke)]">исполнитель: {event.actor}</div> : null}
      </div>
    </div>)}</div> : <div className="rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.06)] p-2.5 text-[11px] leading-relaxed text-[var(--bone-dim)]">Событий пока нет. Это не блокирует отображение, но перед готовностью к публикации история должна быть полной.</div>}
  </div>;
}

function SavedDraftCard({ draft, events }) {
  const title = draft.h1 || draft.seo_title || draft.product_slug || 'SEO-черновик';
  const isFinalReviewState = ['approved', 'changes_requested', 'rejected'].includes(String(draft.review_status || '').toLowerCase());
  const needsSimilarityGate = String(draft.review_status || '').toLowerCase() === 'approved' && ['warning', 'not_checked', 'missing', 'проверить'].includes(String(draft.similarity_status || '').toLowerCase());
  const canRunSourceCatalogGate = String(draft.review_status || '').toLowerCase() === 'approved' && !needsSimilarityGate;
  const attentionNeeded = String(draft.review_status || '').toLowerCase() === 'not_reviewed';

  return <details className={`owner-disclosure owner-disclosure-section${attentionNeeded ? ' is-attention' : ''}`}>
    <summary>
      <span>
        <strong>{title}</strong>
        <small>/{draft.product_slug || 'no-slug'} · обновлён {dateLabel(draft.updated_at)}</small>
      </span>
      <span className="owner-card-meta" style={{ marginBottom: 0 }}>
        <Chip tone={draftTone(draft.review_status)}>{statusLabel(draft.review_status)}</Chip>
        <Chip tone={draftTone(draft.validation_status)}>{statusLabel(draft.validation_status)}</Chip>
      </span>
    </summary>

    <div className="owner-disclosure-body">
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href={`/admin/seo-engine/draft-preview?product_id=${draft.canonical_product_id}`} className="owner-button primary">Открыть проверку <ArrowUpRight size={13} /></Link>
        {draft.product_slug ? <Link href={`/shop/${draft.product_slug}`} className="owner-button">Товар <ArrowUpRight size={13} /></Link> : null}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">SEO-заголовок</div><div className="text-[13px] leading-relaxed text-bone">{draft.seo_title || '—'}</div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">Meta description</div><div className="text-[13px] leading-relaxed text-bone">{draft.meta_description || '—'}</div></div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <MiniFact label="Валидатор" value={statusLabel(draft.validation_status)} tone={draftTone(draft.validation_status)} />
        <MiniFact label="Метрики" value={statusLabel(draft.metrics_status)} tone={draftTone(draft.metrics_status)} />
        <MiniFact label="Портфель" value={statusLabel(draft.similarity_status)} tone={draftTone(draft.similarity_status)} />
        <MiniFact label="ALT изображений" value={statusLabel(draft.image_alt_status)} tone={draftTone(draft.image_alt_status)} />
        <MiniFact label="Обновлён" value={dateLabel(draft.updated_at)} />
      </div>

      <StoredPackDetails draft={draft} />
      <EventTimeline events={events || []} />
      {needsSimilarityGate ? <SeoDraftSimilarityCheckClient draftId={draft.id} /> : null}
      {canRunSourceCatalogGate ? <SeoDraftSourceOverlapCheckClient draftId={draft.id} /> : null}
      {isFinalReviewState ? <div className="mt-4 rounded-xl border border-[rgba(108,183,138,.22)] bg-[rgba(108,183,138,.06)] p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Статус проверки уже изменён: <span className="text-[#a9dfbd]">{statusLabel(draft.review_status)}</span>. Это не публикация; готовность к публикации всё ещё требует остальных контрольных этапов.</div> : <SeoDraftReviewActionsClient draftId={draft.id} />}
    </div>
  </details>;
}

export default async function SeoApprovalPage() {
  const savedDraftQueue = await loadSavedDraftQueue();
  const savedDrafts = savedDraftQueue.drafts || [];
  const draftIds = savedDrafts.map((draft) => draft.id).filter(Boolean);
  const draftEvents = await loadDraftEvents(draftIds);
  const notReviewed = savedDrafts.filter((draft) => draft.review_status === 'not_reviewed').length;
  const validatorReady = savedDrafts.filter((draft) => draft.validation_status === 'valid').length;
  const totalEvents = Array.from(draftEvents.eventsByDraft.values()).reduce((sum, events) => sum + events.length, 0);

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · проверка черновиков</div>
          <h1>Проверка SEO</h1>
          <p>Очередь сохранённых SEO-черновиков. Здесь проверяем качество и историю без публикации и без прямого изменения товара.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-engine/briefs" className="owner-button">SEO-бриф <ArrowUpRight size={13} /></Link>
          <Link href="/admin/indexation" className="owner-button">Индексация <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {savedDraftQueue.error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{savedDraftQueue.error}</div> : null}
    {savedDraftQueue.detailError ? <div className="rounded-2xl border border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] p-5 text-[var(--bone-dim)] mb-7">Очередь загружена, но полный snapshot черновика недоступен: {savedDraftQueue.detailError}</div> : null}
    {draftEvents.error ? <div className="rounded-2xl border border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] p-5 text-[var(--bone-dim)] mb-7">История событий не загрузилась: {draftEvents.error}. Очередь черновиков продолжает работать.</div> : null}

    <section className="owner-section" style={{ marginTop: 0 }}>
      <div className="owner-summary-strip">
        <div className="owner-summary-cell"><strong>{savedDrafts.length}</strong><span>Сохранённых черновиков</span></div>
        <div className="owner-summary-cell"><strong>{notReviewed}</strong><span>Ждут проверки человеком</span></div>
        <div className="owner-summary-cell"><strong>{validatorReady}</strong><span>Валидатор пройден</span></div>
        <div className="owner-summary-cell"><strong>{totalEvents}</strong><span>Событий в истории</span></div>
      </div>
    </section>

    <section className="owner-section">
      <div className="owner-section-head"><div><h2>Очередь сохранённых черновиков</h2><div className="owner-section-kicker">Сначала проверка человеком, затем отдельные quality gates.</div></div><Chip tone="success">{savedDrafts.length} строк</Chip></div>
      {savedDrafts.length ? <div className="space-y-4">{savedDrafts.map((draft) => <SavedDraftCard key={draft.id} draft={draft} events={draftEvents.eventsByDraft.get(draft.id) || []} />)}</div> : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 text-[var(--bone-dim)]">Сохранённых SEO-черновиков пока нет. Открой проверку черновика и нажми “Сохранить черновик для проверки”.</div>}
    </section>

    <section className="owner-section">
      <details className="owner-disclosure owner-disclosure-section">
        <summary><span><strong>Старый резервный режим</strong><small>Технический fallback временно отключён</small></span><span className="owner-section-kicker">Подробнее</span></summary>
        <div className="owner-disclosure-body">
      <h2 className="text-bone text-[18px] leading-tight">Старые шаблонные черновики временно отключены</h2>
      <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Этот блок раньше загружал тяжёлые представления товаров и мог вызывать тайм-ауты Supabase. Чтобы новая очередь работала стабильно, старый резервный режим вернётся позже через лёгкий API с пагинацией и лимитами.</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/seo-lab" className="owner-button">Открыть SEO-лабораторию <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/briefs" className="owner-button">Создать новый SEO-бриф <ArrowUpRight size={13} /></Link></div>
        </div>
      </details>
    </section>
    </div>
  </main>;
}
