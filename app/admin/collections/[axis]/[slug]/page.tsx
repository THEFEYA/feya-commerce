// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, Layers3, ListTree, ShieldAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionPlans, type SeoCollectionPlanStage } from '@/lib/seo-collection-planning';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

type PageProps = { params: Promise<{ axis: string; slug: string }> };

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

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
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminCollectionPlanDetailPage({ params }: PageProps) {
  const { axis, slug } = await params;
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const plans = buildSeoCollectionPlans(products, reviewEvents);
  const plan = plans.find((item) => item.axis === axis && keySlug(item.key) === slug);

  if (error || !plan) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Collection plan not found.'}</div><Link href="/admin/collections" className="btn-ghost mt-5">Back to collections</Link></section></main>;
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Collection Plan Detail</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>{plan.label}</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Internal collection planning detail. This is not a public collection page and does not create sitemap, feed or publish actions.</p>
          <div className="mt-4 flex flex-wrap gap-1.5"><Chip>{plan.axis}</Chip><Chip tone={toneForStage(plan.planStage)}>{plan.planStage}</Chip><Chip>{plan.href}</Chip></div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/collections" className="btn-ghost">Collections <ArrowUpRight size={13} /></Link>
          <Link href="/admin/graph" className="btn-ghost">Product graph <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Metric icon={ListTree} label="Products" value={plan.productCount} note="Products in this candidate group." />
        <Metric icon={CheckCircle2} label="Feed-ready" value={plan.readyForFeedCount} note="Products safe for feed planning." tone="success" />
        <Metric icon={FileSearch} label="SEO-ready" value={plan.canPrepareSeoCount} note="Products safe for SEO draft work." />
        <Metric icon={ShieldAlert} label="Blocked" value={plan.blockedCount} note="Blocked product-level issues." tone={plan.blockedCount ? 'danger' : 'neutral'} />
        <Metric icon={Layers3} label="Priority score" value={plan.priorityScore} note="Internal planning score." />
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-8">
        <div className="eyebrow-gold mb-3">Planning note</div>
        <div className="text-[15px] leading-relaxed text-[var(--bone-dim)]">{plan.planNote}</div>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[76px_1.5fr_1fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Image</div><div>Product</div><div>Launch stage</div><div>Readiness</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {plan.sampleProducts.map((product) => <Link key={product.slug} href={`/admin/products/${product.slug}`} className="grid grid-cols-[76px_1.5fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors">
            <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
            <div><div className="text-bone text-[15px] leading-snug line-clamp-2">{product.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{product.slug}</div></div>
            <div><Chip tone={product.launchStage === 'Blocked' ? 'danger' : product.launchStage === 'Can Prepare Feed' ? 'success' : 'warning'}>{product.launchStage}</Chip></div>
            <div><Chip>{product.readiness}</Chip></div>
          </Link>)}
        </div>
      </div>
    </section>
  </main>;
}
