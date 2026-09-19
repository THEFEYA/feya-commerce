// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionPlans, type SeoCollectionPlanStage } from '@/lib/seo-collection-planning';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';
import { adminReadinessLabel, collectionAxisLabel, collectionStageLabel, launchStageLabel } from '@/lib/adminDisplayRu';

export const revalidate = 300;

type PageProps = { params: Promise<{ axis: string; slug: string }> };

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(250);

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

function keySlug(key: string) {
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
  if (stage === 'Blocked') return 'Сначала нужно закрыть блокеры товаров. Публичную коллекцию пока не готовим.';
  if (stage === 'Needs More Products') return 'Для отдельной сильной посадочной пока недостаточно подходящих готовых товаров.';
  if (stage === 'High Priority') return 'Есть несколько готовых товаров без блокеров — хороший кандидат для первой очереди планирования.';
  if (stage === 'Can Prepare Feed') return 'Есть готовые товары: можно подготовить структуру, SEO и фид, но не публиковать автоматически.';
  return 'Можно начинать черновое SEO-планирование; до публикации остаются обязательные проверки.';
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

export default async function AdminCollectionPlanDetailPage({ params }: PageProps) {
  const { axis, slug } = await params;
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const plans = buildSeoCollectionPlans(products, reviewEvents);
  const plan = plans.find((item) => item.axis === axis && keySlug(item.key) === slug);

  if (error || !plan) {
    return <main className="owner-page"><div className="owner-page-inner"><div className="owner-card is-danger">{error || 'План коллекции не найден.'}</div><Link href="/admin/collections" className="owner-button" style={{ marginTop: '14px' }}>Назад к коллекциям</Link></div></main>;
  }

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Рост · план коллекции</div>
          <h1>{plan.label}</h1>
          <p>Внутренний план SEO-коллекции. Публичный маршрут остаётся noindex-предпросмотром и не попадает в sitemap или фиды без отдельного допуска.</p>
          <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}><Chip>{collectionAxisLabel(plan.axis)}</Chip><Chip tone={toneForStage(plan.planStage)}>{collectionStageLabel(plan.planStage)}</Chip><span>{plan.href}</span></div>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/collections" className="owner-button">Коллекции <ArrowUpRight size={13} /></Link>
          <Link href={plan.href} className="owner-button primary">Предпросмотр noindex <ArrowUpRight size={13} /></Link>
          <Link href="/admin/graph" className="owner-button">Товарные связи <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{plan.productCount}</strong><span>Товаров в группе</span></div>
        <div className="owner-summary-cell"><strong>{plan.readyForFeedCount}</strong><span>Готовы для фида</span></div>
        <div className="owner-summary-cell"><strong>{plan.canPrepareSeoCount}</strong><span>Готовы для SEO-подготовки</span></div>
        <div className="owner-summary-cell"><strong>{plan.blockedCount}</strong><span>Имеют товарные блокеры</span></div>
      </section>

      <div className="owner-card is-info" style={{ marginBottom: '20px' }}>
        <div className="owner-status is-info">Что делать дальше</div>
        <p className="owner-card-copy">{planNoteLabel(plan.planStage)}</p>
      </div>

      <section className="owner-section">
        <div className="owner-section-head"><div><h2>Товары группы</h2><div className="owner-section-kicker">Примеры товаров, на которых построен этот кандидат коллекции.</div></div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="sticky top-[64px] z-10 grid grid-cols-[76px_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
          <div>Фото</div><div>Товар</div><div>Этап запуска</div><div>Готовность</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {plan.sampleProducts.map((product) => <Link key={product.slug} href={`/admin/products/${product.slug}`} className="grid grid-cols-[76px_1.5fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors">
            <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
            <div><div className="text-bone text-[15px] leading-snug line-clamp-2">{product.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{product.slug}</div></div>
            <div><Chip tone={product.launchStage === 'Blocked' ? 'danger' : product.launchStage === 'Can Prepare Feed' ? 'success' : 'warning'}>{launchStageLabel(product.launchStage)}</Chip></div>
            <div><Chip>{adminReadinessLabel(product.readiness)}</Chip></div>
          </Link>)}
        </div>
      </div>
      </section>
    </div>
  </main>;
}
