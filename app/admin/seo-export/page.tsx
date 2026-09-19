// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { productSlug, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoDraftSuggestion } from '@/lib/seo-draft-suggestions';
import { getSeoScore } from '@/lib/seo-scoring';
import { seoScoreStageLabel } from '@/lib/adminDisplayRu';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_EXPORT_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SEO_EXPORT_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
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

function DraftCell({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">{label}</div><div className="text-[13px] leading-relaxed text-bone">{value}</div></div>;
}

export default async function SeoExportQueuePage() {
  const [{ products, error }, events] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const approvedProducts = products.filter((product) => hasSeoApproval(product, events));
  const readyRows = approvedProducts.map((product) => ({ score: getSeoScore(product), draft: buildSeoDraftSuggestion(product) })).slice(0, 100);
  const blockedRows = readyRows.filter((row) => row.score.stage === 'Blocked');

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · экспорт</div>
          <h1>SEO-экспорт</h1>
          <p>Одобренные SEO-черновики, подготовленные для будущего контролируемого экспорта или применения. Этот экран не меняет витрину, sitemap, фиды или товарные данные.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-approval" className="owner-button primary">Проверка SEO <ArrowUpRight size={13} /></Link>
          <Link href="/admin/indexation" className="owner-button">Индексация <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
      <div className="owner-summary-cell"><strong>{approvedProducts.length}</strong><span>Одобренных черновиков</span></div>
      <div className="owner-summary-cell"><strong>{readyRows.length}</strong><span>Показано в очереди экспорта</span></div>
      <div className="owner-summary-cell"><strong>{blockedRows.length}</strong><span>Не проходят внутренние проверки</span></div>
      <div className="owner-summary-cell"><strong>Выкл.</strong><span>Автоматическая запись на витрину</span></div>
    </section>
    <div className="space-y-4">{readyRows.map(({ score, draft }) => <article key={draft.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-bone text-[18px] leading-snug">{score.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{draft.productSlug} · {seoScoreStageLabel(score.stage)}</div></div><div className="flex gap-2"><Link href={`/admin/seo-lab/${draft.productSlug}`} className="owner-button">Открыть оценку</Link><Link href={`/admin/products/${draft.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Товар</Link></div></div><div className="mt-5 grid lg:grid-cols-2 gap-3"><DraftCell label="SEO-заголовок" value={draft.titleDraft} /><DraftCell label="Meta description" value={draft.metaDescriptionDraft} /><DraftCell label="H1" value={draft.h1Draft} /><DraftCell label="ALT изображения" value={draft.altTextDraft} /></div><div className="mt-4 rounded-xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">Подготовлено только для будущего экспорта или применения. Перед записью в публичные SEO-поля нужен отдельный механизм применения и журнал изменений.</div></article>)}</div>
    </div>
  </main>;
}
