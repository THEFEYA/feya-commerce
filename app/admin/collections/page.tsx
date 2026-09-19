// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, ListTree } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionPlans, summarizeSeoCollectionPlans, type SeoCollectionPlanStage } from '@/lib/seo-collection-planning';
import { collectionStageLabel } from '@/lib/adminDisplayRu';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COLLECTION_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(COLLECTION_PRODUCTS_LIMIT);

  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function planSlug(key: string) {
  return key.split(':')[1] || key;
}

function toneForStage(stage: SeoCollectionPlanStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Needs More Products') return 'warning';
  if (stage === 'High Priority') return 'success';
  if (stage === 'Can Prepare Feed') return 'success';
  return 'neutral';
}

function planNoteLabel(stage: SeoCollectionPlanStage) {
  if (stage === 'Blocked') return 'Сначала нужно закрыть блокеры товаров — отдельную публичную коллекцию пока готовить рано.';
  if (stage === 'Needs More Products') return 'Для отдельной сильной посадочной пока недостаточно подходящих готовых товаров.';
  if (stage === 'High Priority') return 'Есть несколько готовых товаров без блокеров — хороший кандидат для первой очереди планирования.';
  if (stage === 'Can Prepare Feed') return 'Есть хотя бы один готовый товар; можно готовить структуру и контент, но не публиковать автоматически.';
  return 'Данных уже достаточно для чернового SEO-планирования, но до публикации остаются обязательные проверки.';
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

export default async function SeoCollectionPlanningPage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const plans = buildSeoCollectionPlans(products, reviewEvents);
  const summary = summarizeSeoCollectionPlans(plans);
  const visiblePlans = plans.slice(0, 100);

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Рост · будущие посадочные</div>
          <h1>Коллекции</h1>
          <p>Кандидаты будущих SEO-коллекций на основе реального состава каталога и готовности товаров. Экран ничего не публикует и не создаёт URL автоматически.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/graph" className="owner-button">Товарные связи <ArrowUpRight size={13} /></Link>
          <Link href="/admin/content" className="owner-button">Контент <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{summary['High Priority'] || 0}</strong><span>Сильных кандидатов первой очереди</span></div>
        <div className="owner-summary-cell"><strong>{summary.readyForFeed || 0}</strong><span>Имеют хотя бы один готовый товар</span></div>
        <div className="owner-summary-cell"><strong>{summary['Needs More Products'] || 0}</strong><span>Пока слишком мало товаров</span></div>
        <div className="owner-summary-cell"><strong>{summary.withBlockers || 0}</strong><span>Имеют товарные блокеры</span></div>
      </section>

      <section className="owner-section">
        <div className="owner-section-head"><div><h2>Кандидаты</h2><div className="owner-section-kicker">Сортировка рассчитана детерминированно по готовым товарам и блокерам; числовой внутренний score владельцу не нужен.</div></div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="sticky top-[64px] z-10 grid grid-cols-[1fr_.8fr_1.1fr_.8fr_1.3fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
          <div>Кандидат коллекции</div><div>Этап</div><div>Почему сейчас</div><div>Количество</div><div>Примеры</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {visiblePlans.map((plan) => <article key={plan.key} className="grid grid-cols-[1fr_.8fr_1.1fr_.8fr_1.3fr] gap-4 px-5 py-4 items-center">
            <div>
              <div className="flex items-center gap-2 eyebrow-gold mb-2"><ListTree size={13} /> {plan.axis}</div>
              <div className="text-bone text-[16px] leading-tight">{plan.label}</div>
              <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Будущий URL: {plan.href}</div>
              <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{planNoteLabel(plan.planStage)}</div>
              <Link href={`/admin/collections/${plan.axis}/${planSlug(plan.key)}`} className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)] hover:text-white">Открыть план <ArrowUpRight size={12} /></Link>
            </div>
            <div><Chip tone={toneForStage(plan.planStage)}>{collectionStageLabel(plan.planStage)}</Chip></div>
            <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{planNoteLabel(plan.planStage)}</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>{plan.productCount} товаров</Chip>
              <Chip tone="success">{plan.readyForFeedCount} для фида</Chip>
              <Chip>{plan.canPrepareSeoCount} для SEO</Chip>
              {plan.blockedCount ? <Chip tone="danger">{plan.blockedCount} заблокировано</Chip> : null}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {plan.sampleProducts.slice(0, 4).map((product) => <Link key={`${plan.key}-${product.slug}`} href={`/admin/products/${product.slug}`} className="relative aspect-square rounded-lg overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30 hover:border-[rgba(212,178,106,.36)]">
                {product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              </Link>)}
            </div>
          </article>)}
        </div>
      </div>
      </section>
    </div>
  </main>;
}
