// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, FileText, ShieldAlert } from 'lucide-react';
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

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SEO_APPROVAL_PRODUCTS_LIMIT);
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

export default async function SeoApprovalPage() {
  const [{ products, error }, events] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const scores = buildSeoScores(products);
  const bySlug = new Map(products.map((product) => [productSlug(product), product]));
  const rows = scores.map((score) => ({ score, product: bySlug.get(score.productSlug) })).filter((row) => row.product);
  const approved = rows.filter((row) => hasSeoApproval(row.product, events));
  const pending = rows.filter((row) => !hasSeoApproval(row.product, events)).slice(0, 80);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · SEO Draft Approval</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO approval</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Approval queue for rule-based SEO draft suggestions. This records review events only; it does not publish content or mutate product data.</p></div><div className="flex gap-3"><Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link><Link href="/admin/indexation" className="btn-ghost">Indexation <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={FileText} label="Drafts" value={rows.length} note="Rule-based SEO drafts available." /><Metric icon={ShieldAlert} label="Pending" value={pending.length} note="Need approval or fix note." tone="danger" /><Metric icon={CheckCircle2} label="Approved" value={approved.length} note="Has SEO ready review event." tone="success" /><Metric icon={FileSearch} label="Visible" value={pending.length} note="Rows shown in this queue." /></div>
    <div className="space-y-4">{pending.map(({ product, score }) => { const draft = buildSeoDraftSuggestion(product); return <article key={score.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap gap-2 mb-3"><Chip>{score.stage}</Chip><Chip>score {score.overallScore}</Chip></div><Link href={`/admin/seo-lab/${score.productSlug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{score.title}</Link><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{score.productSlug}</div></div><div className="flex gap-2"><Link href={`/admin/seo-lab/${score.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Open score</Link><Link href={`/admin/products/${score.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Product</Link></div></div><div className="mt-5 grid lg:grid-cols-2 gap-3"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">SEO title draft</div><div className="text-[13px] leading-relaxed text-bone">{draft.titleDraft}</div></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">Meta description draft</div><div className="text-[13px] leading-relaxed text-bone">{draft.metaDescriptionDraft}</div></div></div><AdminQueueQuickReviewClient productSlug={score.productSlug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/seo-approval" approvedEventType="seo_ready_checked" subjectType="seo" approvedLabel="Approve SEO draft" /></article>; })}</div>
  </section></main>;
}
