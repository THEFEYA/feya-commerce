// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, Layers3, ListTree, Sparkles, TriangleAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionPlans, summarizeSeoCollectionPlans, type SeoCollectionPlanStage } from '@/lib/seo-collection-planning';
import { collectionStageLabel } from '@/lib/adminDisplayRu';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COLLECTION_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

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

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function SeoCollectionPlanningPage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const plans = buildSeoCollectionPlans(products, reviewEvents);
  const summary = summarizeSeoCollectionPlans(plans);
  const visiblePlans = plans.slice(0, 100);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Планирование SEO-коллекций</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Планирование коллекций</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренний план будущих индексируемых SEO-коллекций. Этот экран не публикует URL, sitemap, фиды или контент автоматически.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/graph" className="btn-ghost">Товарные связи <ArrowUpRight size={13} /></Link>
          <Link href="/admin/content" className="btn-ghost">Подготовка контента <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Metric icon={Layers3} label="Планы" value={summary.total || 0} note="Кандидаты будущих SEO-коллекций." />
        <Metric icon={Sparkles} label="Высокий приоритет" value={summary['High Priority'] || 0} note="Сильные кандидаты для первой очереди." tone="success" />
        <Metric icon={CheckCircle2} label="Группы для фида" value={summary.readyForFeed || 0} note="Есть хотя бы один товар, готовый для фида." tone="success" />
        <Metric icon={FileSearch} label="Слабые группы" value={summary['Needs More Products'] || 0} note="Пока недостаточно товаров для отдельной публичной SEO-страницы." tone="warning" />
        <Metric icon={TriangleAlert} label="С блокировками" value={summary.withBlockers || 0} note="В группе есть заблокированные товары." tone="danger" />
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1fr_.8fr_.8fr_.8fr_1.3fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Кандидат коллекции</div><div>Этап</div><div>Оценка</div><div>Количество</div><div>Примеры</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {visiblePlans.map((plan) => <article key={plan.key} className="grid grid-cols-[1fr_.8fr_.8fr_.8fr_1.3fr] gap-4 px-5 py-4 items-center">
            <div>
              <div className="flex items-center gap-2 eyebrow-gold mb-2"><ListTree size={13} /> {plan.axis}</div>
              <div className="text-bone text-[16px] leading-tight">{plan.label}</div>
              <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Будущий URL: {plan.href}</div>
              <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{plan.planNote}</div>
              <Link href={`/admin/collections/${plan.axis}/${planSlug(plan.key)}`} className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)] hover:text-white">Открыть план <ArrowUpRight size={12} /></Link>
            </div>
            <div><Chip tone={toneForStage(plan.planStage)}>{collectionStageLabel(plan.planStage)}</Chip></div>
            <div className="font-price text-gold-grad text-[30px] leading-none">{plan.priorityScore}</div>
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
  </main>;
}
