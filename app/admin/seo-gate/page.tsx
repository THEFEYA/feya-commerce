// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const revalidate = 300;

type ChangeSetRow = { status: string };
type AppliedRow = { product_slug: string; target_field: string };
type PreviewRow = {
  product_slug: string;
  has_applied_seo_title?: boolean | null;
  has_applied_meta_description?: boolean | null;
  has_applied_h1?: boolean | null;
  has_applied_primary_image_alt?: boolean | null;
};

async function loadGateData() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { changeSets: [] as ChangeSetRow[], applied: [] as AppliedRow[], preview: [] as PreviewRow[], error: 'Missing admin database client.' };

  const [changeSets, applied, preview] = await Promise.all([
    supabase.from('feya_commerce_v_admin_seo_change_sets_v1').select('status').limit(1000),
    supabase.from('feya_commerce_v_admin_seo_applied_values_v1').select('product_slug,target_field').limit(1000),
    supabase.from('feya_commerce_v_admin_storefront_seo_preview_v1').select('product_slug,has_applied_seo_title,has_applied_meta_description,has_applied_h1,has_applied_primary_image_alt').limit(1000),
  ]);

  const error = changeSets.error?.message || applied.error?.message || preview.error?.message || null;
  return {
    changeSets: (changeSets.data || []) as ChangeSetRow[],
    applied: (applied.data || []) as AppliedRow[],
    preview: (preview.data || []) as PreviewRow[],
    error,
  };
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]' : tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function SeoGatePage() {
  const { changeSets, applied, preview, error } = await loadGateData();
  const pending = changeSets.filter((row) => row.status === 'pending').length;
  const approved = changeSets.filter((row) => row.status === 'approved').length;
  const appliedChangeSets = changeSets.filter((row) => row.status === 'applied').length;
  const rowsWithTitle = preview.filter((row) => row.has_applied_seo_title).length;
  const rowsWithMeta = preview.filter((row) => row.has_applied_meta_description).length;
  const rowsWithH1 = preview.filter((row) => row.has_applied_h1).length;
  const rowsWithAlt = preview.filter((row) => row.has_applied_primary_image_alt).length;
  const locked = true;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · SEO Gate</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO gate</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Internal control screen for the SEO pipeline. It does not change storefront data.</p></div><div className="flex gap-3"><Link href="/admin/seo-storefront-preview" className="btn-ghost">SEO Preview <ArrowUpRight size={13} /></Link><Link href="/admin/seo-change-sets" className="btn-ghost">Change Sets <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)] mb-7">Gate data is not fully available: {error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={ShieldAlert} label="Gate" value={locked ? 'LOCKED' : 'OPEN'} note="Locked until a later reviewed storefront SEO contract." tone="danger" /><Metric icon={FileText} label="Pending" value={pending} note="Rows still waiting for review." /><Metric icon={CheckCircle2} label="Approved" value={approved} note="Approved rows not marked applied." tone="success" /><Metric icon={CheckCircle2} label="Applied" value={appliedChangeSets} note="Rows marked applied." tone="success" /></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><Metric icon={FileText} label="Preview rows" value={preview.length} note="Storefront rows in preview." /><Metric icon={FileText} label="Applied values" value={applied.length} note="Approved/applied field values." /><Metric icon={FileText} label="Title" value={rowsWithTitle} note="Rows with applied title." /><Metric icon={FileText} label="Meta" value={rowsWithMeta} note="Rows with applied meta." /><Metric icon={FileText} label="H1/Alt" value={`${rowsWithH1}/${rowsWithAlt}`} note="Rows with applied H1 / image alt." /></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Current decision</div><div className="text-[15px] leading-relaxed text-bone">Keep SEO pipeline internal. Continue creating, reviewing, and marking applied SEO change sets before any later storefront SEO contract.</div></div>
  </section></main>;
}
