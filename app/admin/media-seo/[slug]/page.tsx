// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileImage, ImageIcon, RefreshCw, Scaling, TriangleAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildMediaSeoPlans, type MediaSeoStage } from '@/lib/media-seo';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MEDIA_SEO_DETAIL_PRODUCTS_LIMIT = 500;

type PageProps = { params: Promise<{ slug: string }> };

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(MEDIA_SEO_DETAIL_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function toneForStage(stage: MediaSeoStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Ready for Image Sitemap') return 'success';
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
  const toneClass = tone === 'warning'
    ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[28px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function MediaSeoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { products, error } = await loadProducts();
  const plan = buildMediaSeoPlans(products).find((item) => item.productSlug === slug);

  if (error || !plan) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Media SEO plan not found.'}</div><Link href="/admin/media-seo" className="btn-ghost mt-5">Back to Media SEO</Link></section></main>;
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · Media SEO Detail</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Image plan</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">{plan.title}</p><div className="mt-4 flex flex-wrap gap-1.5"><Chip tone={toneForStage(plan.stage)}>{plan.stage}</Chip>{plan.exportRequired ? <Chip tone="warning">Needs Export</Chip> : null}{plan.resizeRecommended ? <Chip tone="warning">Resize</Chip> : null}{plan.imageSitemapEligible ? <Chip tone="success">Image Sitemap</Chip> : null}{plan.pinterestExportEligible ? <Chip tone="success">Pinterest</Chip> : null}</div></div><div className="flex gap-3"><Link href="/admin/media-seo" className="btn-ghost">Media SEO <ArrowUpRight size={13} /></Link><Link href={`/admin/products/${plan.productSlug}`} className="btn-ghost">Product card <ArrowUpRight size={13} /></Link></div></div>

    <div className="grid lg:grid-cols-[360px_1fr] gap-6 mb-8"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-4"><div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{plan.imageUrl ? <img src={plan.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <TriangleAlert size={24} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--ruby-soft)]" />}</div></div><div className="grid sm:grid-cols-2 gap-4"><Metric icon={ImageIcon} label="Current" value={plan.currentFilename ? 'File' : 'Missing'} note={plan.currentFilename || 'No current image file detected.'} /><Metric icon={FileImage} label="Target" value="SEO" note={plan.suggestedFilename} tone="success" /><Metric icon={RefreshCw} label="Export" value={plan.exportRequired ? 'Yes' : 'No'} note="Controlled image export status." tone={plan.exportRequired ? 'warning' : 'success'} /><Metric icon={Scaling} label="Resize" value={plan.resizeRecommended ? 'Yes' : 'No'} note="Resize or format normalization recommendation." tone={plan.resizeRecommended ? 'warning' : 'success'} /><Metric icon={CheckCircle2} label="Image sitemap" value={plan.imageSitemapEligible ? 'Ready' : 'Hold'} note="Eligibility for image sitemap." tone={plan.imageSitemapEligible ? 'success' : 'warning'} /><Metric icon={CheckCircle2} label="Pinterest" value={plan.pinterestExportEligible ? 'Ready' : 'Hold'} note="Eligibility for Pinterest publishing workflow." tone={plan.pinterestExportEligible ? 'success' : 'warning'} /></div></div>

    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-gold mb-4">Action notes</div><div className="space-y-2">{plan.notes.length ? plan.notes.map((note, index) => <div key={index} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{note}</div>) : <div className="rounded-xl border border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] p-3 text-[13px] leading-relaxed text-[#a9dfbd]">No open media SEO actions.</div>}</div></div>
  </section></main>;
}
