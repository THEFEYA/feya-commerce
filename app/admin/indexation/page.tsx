// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, ImageIcon, Rocket, ShieldAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSearchPlans, summarizeSearchPlans, type SearchStage } from '@/lib/search-readiness';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(250);
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

function toneForStage(stage: SearchStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Ready for Preview' || stage === 'Ready for Search') return 'success';
  return 'warning';
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
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function IndexationReadinessPage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const plans = buildSearchPlans(products, reviewEvents);
  const summary = summarizeSearchPlans(plans);
  const visiblePlans = plans.slice(0, 140);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · Indexation Readiness</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Indexation</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Control center for product readiness before search visibility. Combines product review, SEO approval and media SEO status.</p></div><div className="flex gap-3"><Link href="/admin/media-seo" className="btn-ghost">Media SEO <ArrowUpRight size={13} /></Link><Link href="/admin/collections" className="btn-ghost">Collections <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><Metric icon={Rocket} label="Products" value={summary.total || 0} note="Current v4 product slice." /><Metric icon={ShieldAlert} label="Blocked" value={summary.Blocked || 0} note="Must not be opened to search." tone="danger" /><Metric icon={FileSearch} label="SEO approved" value={summary.seoApproved || 0} note="Has SEO approval event." tone="success" /><Metric icon={ImageIcon} label="Media ready" value={summary.mediaReady || 0} note="Image sitemap media-ready." tone="success" /><Metric icon={CheckCircle2} label="Preview-ready" value={summary['Ready for Preview'] || 0} note="Can move to noindex preview." tone="success" /></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[76px_1.2fr_.9fr_.9fr_.9fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Image</div><div>Product</div><div>Stage</div><div>Product</div><div>Media</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{visiblePlans.map((plan) => <Link key={plan.productSlug} href={`/admin/products/${plan.productSlug}`} className="grid grid-cols-[76px_1.2fr_.9fr_.9fr_.9fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors"><div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{plan.imageUrl ? <img src={plan.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div><div><div className="text-bone text-[15px] leading-snug line-clamp-2">{plan.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{plan.productSlug}</div></div><div><Chip tone={toneForStage(plan.stage)}>{plan.stage}</Chip></div><div><Chip tone={plan.readiness.tone}>{plan.readiness.label}</Chip></div><div><Chip tone={plan.media.stage === 'Ready for Image Sitemap' ? 'success' : 'warning'}>{plan.media.stage}</Chip></div></Link>)}</div></div>
  </section></main>;
}
