// @ts-nocheck
import Link from 'next/link';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 1000;
const ROW_SELECT = 'product_slug,card_title,current_seo_title,current_meta_description,current_h1,current_primary_image_alt,applied_seo_title,applied_meta_description,applied_h1,applied_primary_image_alt';

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
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_storefront_seo_preview_v1')
    .select(ROW_SELECT)
    .limit(ROW_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function Pair({ label, current, approved }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-2">{label}</div><div className="grid gap-2 lg:grid-cols-2"><div className="text-[12px] text-[var(--bone-dim)]">Current: {current || '—'}</div><div className="text-[12px] text-bone">Approved: {approved || '—'}</div></div></div>;
}

export default async function SeoStorefrontPreviewPage() {
  const { rows, error } = await loadRows();
  const withTitle = rows.filter((row) => row.applied_seo_title).length;
  const withMeta = rows.filter((row) => row.applied_meta_description).length;

  return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16">
    <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-7"><div className="eyebrow-gold mb-3">Admin · Storefront SEO Preview</div><h1 className="text-bone text-[28px] font-medium leading-tight">SEO preview</h1><p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Internal comparison only. This screen does not publish storefront SEO.</p><div className="mt-5 flex gap-3"><Link href="/admin/seo-applied-values" className="btn-ghost">SEO Values</Link><Link href="/admin/seo-change-sets" className="btn-ghost">Change Sets</Link></div></div>
    {error ? <div className="mb-6 rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
    <div className="mb-8 grid grid-cols-3 gap-4"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Rows</div><div className="text-bone text-[28px]">{rows.length}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Titles</div><div className="text-bone text-[28px]">{withTitle}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Meta</div><div className="text-bone text-[28px]">{withMeta}</div></div></div>
    <div className="space-y-4">{rows.length ? rows.map((row) => <article key={row.product_slug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{row.card_title || row.product_slug}</Link><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{row.product_slug}</div></div><Link href={`/admin/seo-lab/${row.product_slug}`} className="btn-ghost px-4 py-2 text-[10px]">SEO Lab</Link></div><div className="space-y-2"><Pair label="SEO title" current={row.current_seo_title} approved={row.applied_seo_title} /><Pair label="Meta description" current={row.current_meta_description} approved={row.applied_meta_description} /><Pair label="H1" current={row.current_h1} approved={row.applied_h1} /><Pair label="Primary image alt" current={row.current_primary_image_alt} approved={row.applied_primary_image_alt} /></div></article>) : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No preview rows yet.</div>}</div>
  </section></main>;
}
