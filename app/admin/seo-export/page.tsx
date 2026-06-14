// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, FileText, ShieldAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { productSlug, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoDraftSuggestion } from '@/lib/seo-draft-suggestions';
import { getSeoScore } from '@/lib/seo-scoring';
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

function DraftCell({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">{label}</div><div className="text-[13px] leading-relaxed text-bone">{value}</div></div>;
}

export default async function SeoExportQueuePage() {
  const [{ products, error }, events] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const approvedProducts = products.filter((product) => hasSeoApproval(product, events));
  const readyRows = approvedProducts.map((product) => ({ score: getSeoScore(product), draft: buildSeoDraftSuggestion(product) })).slice(0, 100);
  const blockedRows = readyRows.filter((row) => row.score.stage === 'Blocked');

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · SEO Export Queue</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO export</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Approved SEO drafts collected for future apply/export workflow. This is still read-only: no sitemap, product data, public SEO fields or feeds are changed.</p></div><div className="flex gap-3"><Link href="/admin/seo-approval" className="btn-ghost">SEO Approval <ArrowUpRight size={13} /></Link><Link href="/admin/indexation" className="btn-ghost">Indexation <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={FileText} label="Approved drafts" value={approvedProducts.length} note="SEO drafts approved for queueing." tone="success" /><Metric icon={FileSearch} label="Visible" value={readyRows.length} note="Rows shown in this export queue." /><Metric icon={ShieldAlert} label="Blocked" value={blockedRows.length} note="Approved but still blocked by baseline scoring." tone={blockedRows.length ? 'danger' : 'neutral'} /><Metric icon={CheckCircle2} label="Read-only" value="0" note="No automatic product or SEO writes." tone="success" /></div>
    <div className="space-y-4">{readyRows.map(({ score, draft }) => <article key={draft.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-bone text-[18px] leading-snug">{score.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{draft.productSlug} · score {score.overallScore} · {score.stage}</div></div><div className="flex gap-2"><Link href={`/admin/seo-lab/${draft.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Open score</Link><Link href={`/admin/products/${draft.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Product</Link></div></div><div className="mt-5 grid lg:grid-cols-2 gap-3"><DraftCell label="SEO title" value={draft.titleDraft} /><DraftCell label="Meta description" value={draft.metaDescriptionDraft} /><DraftCell label="H1" value={draft.h1Draft} /><DraftCell label="Image alt" value={draft.altTextDraft} /></div><div className="mt-4 rounded-xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">Prepared for future export/apply step only. Requires a separate apply mechanism and change log before writing to public SEO fields.</div></article>)}</div>
  </section></main>;
}
