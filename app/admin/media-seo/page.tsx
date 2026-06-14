// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileImage, ImageIcon, RefreshCw, Scaling } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildMediaSeoPlans, summarizeMediaSeoPlans } from '@/lib/media-seo';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(250);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'warning'
    ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function MediaSeoPipelinePage() {
  const { products, error } = await loadProducts();
  const plans = buildMediaSeoPlans(products);
  const summary = summarizeMediaSeoPlans(plans);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · Media SEO Pipeline</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Media SEO</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Image publishing planning layer for filenames, alt text, web export status, image sitemap and Pinterest readiness.</p></div><div className="flex gap-3"><Link href="/admin/media" className="btn-ghost">Media QA <ArrowUpRight size={13} /></Link><Link href="/admin/collections" className="btn-ghost">Collections <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><Metric icon={ImageIcon} label="Images" value={summary.total || 0} note="Primary images in current v4 slice." /><Metric icon={RefreshCw} label="Needs Export" value={summary.exportRequired || 0} note="Needs controlled image export pass." tone="warning" /><Metric icon={Scaling} label="Resize" value={summary.resizeRecommended || 0} note="Resize or format recommended." tone="warning" /><Metric icon={CheckCircle2} label="Image Sitemap" value={summary.imageSitemapEligible || 0} note="Ready for image sitemap." tone="success" /><Metric icon={FileImage} label="Pinterest" value={summary.pinterestExportEligible || 0} note="Ready for Pinterest." tone="success" /></div>
  </section></main>;
}
