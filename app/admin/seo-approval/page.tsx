// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Clock3, Database, FileSearch, FileText, ShieldAlert } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { productSlug, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoDraftSuggestion } from '@/lib/seo-draft-suggestions';
import { buildSeoScores } from '@/lib/seo-scoring';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_APPROVAL_PRODUCTS_LIMIT = 500;
const SAVED_DRAFT_QUEUE_LIMIT = 100;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SEO_APPROVAL_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

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

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('feya_commerce_v_admin_review_events_v1').select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at').limit(1000);
  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function hasSeoApproval(product: StorefrontProduct, events: AdminReviewEvent[]) {
  const slug = productSlug(product);
  return events.some((event) => event.product_slug === slug && event.event_type === 'seo_ready_checked' && event.event_status === 'approved');
}

function titleOf(product) {
  return product?.card_title || product?.h1 || product?.seo_title || product?.product_slug || 'Товар без названия';
}

function draftTone(value) {
  const status = String(value || '').toLowerCase();
  if (status.includes('approved') || status === 'valid' || status === 'pass') return 'success';
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
    missing: 'нет данных',
    not_checked: 'не проверено',
    pass: 'готово',
  };
  return map[String(value || '').toLowerCase()] || String(value || '—');
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

function SavedDraftCard({ draft, product }) {
  const title = product ? titleOf(product) : draft.h1 || draft.seo_title || draft.product_slug || 'SEO-черновик';
  const imageUrl = product?.primary_image_url;
  const alt = product?.primary_image_alt || title;
  return <article className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="grid sm:grid-cols-[92px_1fr] gap-4 min-w-0">
        <div className="h-24 rounded-xl overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30">
          {imageUrl ? <img src={imageUrl} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">нет фото</div>}
        </div>
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
      <MiniFact label="Метрики" value={statusLabel(draft.metrics_status)} />
      <MiniFact label="Похожесть" value={statusLabel(draft.similarity_status)} />
      <MiniFact label="Image ALT" value={statusLabel(draft.image_alt_status)} />
      <MiniFact label="Обновлён" value={dateLabel(draft.updated_at)} />
    </div>
  </article>;
}

export default async function SeoApprovalPage() {
  const [{ products, error }, events, savedDraftQueue] = await Promise.all([loadProducts(), loadReviewEvents(), loadSavedDraftQueue()]);
  const scores = buildSeoScores(products);
  const bySlug = new Map(products.map((product) => [productSlug(product), product]));
  const byId = new Map(products.map((product) => [product.canonical_product_id, product]));
  const rows = scores.map((score) => ({ score, product: bySlug.get(score.productSlug) })).filter((row) => row.product);
  const approved = rows.filter((row) => hasSeoApproval(row.product, events));
  const pending = rows.filter((row) => !hasSeoApproval(row.product, events)).slice(0, 40);
  const savedDrafts = savedDraftQueue.drafts || [];

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · проверка SEO</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Проверка SEO</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь сохранённых SEO-черновиков и старых rule-based предложений. Здесь мы проверяем drafts, но не публикуем и не меняем storefront/product tables.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/seo-engine/briefs" className="btn-ghost">SEO-бриф <ArrowUpRight size={13} /></Link><Link href="/admin/indexation" className="btn-ghost">Индексация <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    {savedDraftQueue.error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{savedDraftQueue.error}</div> : null}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={Database} label="Сохранённые" value={savedDrafts.length} note="Новые SEO-pack drafts из storage layer." tone="success" /><Metric icon={ShieldAlert} label="На проверке" value={savedDrafts.filter((draft) => draft.review_status === 'not_reviewed').length} note="Ждут human review." tone="danger" /><Metric icon={CheckCircle2} label="Approved legacy" value={approved.length} note="Старые review events." tone="success" /><Metric icon={Clock3} label="Legacy fallback" value={pending.length} note="Старые rule-based drafts ниже." /></div>

    <div className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4"><div><div className="eyebrow-gold mb-2">Новые сохранённые SEO-черновики</div><h2 className="text-bone text-[24px] leading-tight">Очередь из storage contract</h2></div><Chip tone="success">{savedDrafts.length} строк</Chip></div>
      {savedDrafts.length ? <div className="space-y-4">{savedDrafts.map((draft) => <SavedDraftCard key={draft.id} draft={draft} product={byId.get(draft.canonical_product_id) || bySlug.get(draft.product_slug)} />)}</div> : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 text-[var(--bone-dim)]">Сохранённых SEO-черновиков пока нет. Открой проверку черновика и нажми “Сохранить черновик для проверки”.</div>}
    </div>

    <div>
      <div className="flex items-end justify-between gap-4 mb-4"><div><div className="eyebrow-gold mb-2">Legacy fallback</div><h2 className="text-bone text-[24px] leading-tight">Старые rule-based SEO drafts</h2></div><Chip>{pending.length} строк</Chip></div>
      <div className="space-y-4">{pending.map(({ product, score }) => { const draft = buildSeoDraftSuggestion(product); return <article key={score.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap gap-2 mb-3"><Chip>{score.stage}</Chip><Chip>score {score.overallScore}</Chip></div><Link href={`/admin/seo-lab/${score.productSlug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{score.title}</Link><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{score.productSlug}</div></div><div className="flex gap-2"><Link href={`/admin/seo-lab/${score.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Открыть score</Link><Link href={`/admin/products/${score.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Товар</Link></div></div><div className="mt-5 grid lg:grid-cols-2 gap-3"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">SEO title draft</div><div className="text-[13px] leading-relaxed text-bone">{draft.titleDraft}</div></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">Meta description draft</div><div className="text-[13px] leading-relaxed text-bone">{draft.metaDescriptionDraft}</div></div></div><AdminQueueQuickReviewClient productSlug={score.productSlug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/seo-approval" approvedEventType="seo_ready_checked" subjectType="seo" approvedLabel="Одобрить legacy SEO draft" /></article>; })}</div>
    </div>
  </section></main>;
}
