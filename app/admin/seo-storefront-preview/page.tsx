// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const revalidate = 300;

type Row = {
  product_slug: string;
  card_title: string | null;
  current_seo_title: string | null;
  current_meta_description: string | null;
  current_h1: string | null;
  current_primary_image_alt: string | null;
  applied_seo_title: string | null;
  applied_meta_description: string | null;
  applied_h1: string | null;
  applied_primary_image_alt: string | null;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Missing admin database client.' };
  const { data, error } = await supabase.from('feya_commerce_v_admin_storefront_seo_preview_v1').select('*').limit(300);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

function ValuePair({ label, current, applied }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">{label}</div><div className="grid gap-2 lg:grid-cols-2"><div className="text-[12px] leading-relaxed text-[var(--bone-dim)]"><span className="text-[var(--smoke)]">Current:</span> {current || '—'}</div><div className="text-[12px] leading-relaxed text-bone"><span className="text-[var(--smoke)]">Approved:</span> {applied || '—'}</div></div></div>;
}

export default async function SeoStorefrontPreviewPage() {
  const { rows, error } = await loadRows();
  const rowsWithTitle = rows.filter((row) => row.applied_seo_title);
  const rowsWithMeta = rows.filter((row) => row.applied_meta_description);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · Storefront SEO Preview</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO preview</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Internal comparison between current storefront SEO values and approved SEO values. This page does not publish SEO.</p></div><div className="flex gap-3"><Link href="/admin/seo-applied-values" className="btn-ghost">SEO Values <ArrowUpRight size={13} /></Link><Link href="/admin/seo-change-sets" className="btn-ghost">Change Sets <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)] mb-7">Preview view is not available yet: {error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"><Metric icon={FileText} label="Rows" value={rows.length} note="Products in preview." /><Metric icon={CheckCircle2} label="SEO titles" value={rowsWithTitle.length} note="Approved title values." /><Metric icon={CheckCircle2} label="Meta" value={rowsWithMeta.length} note="Approved meta values." /></div>
    <div className="space-y-4">{rows.length ? rows.map((row) => <article key={row.product_slug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between mb-4"><div><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{row.card_title || row.product_slug}</Link><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{row.product_slug}</div></div><Link href={`/admin/seo-lab/${row.product_slug}`} className="btn-ghost px-4 py-2 text-[10px]">SEO Lab</Link></div><div className="space-y-2"><ValuePair label="SEO title" current={row.current_seo_title} applied={row.applied_seo_title} /><ValuePair label="Meta description" current={row.current_meta_description} applied={row.applied_meta_description} /><ValuePair label="H1" current={row.current_h1} applied={row.applied_h1} /><ValuePair label="Primary image alt" current={row.current_primary_image_alt} applied={row.applied_primary_image_alt} /></div></article>) : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] leading-relaxed text-[var(--bone-dim)]">No storefront SEO preview rows yet.</div>}</div>
  </section></main>;
}
