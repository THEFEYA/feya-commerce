// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, FileText } from 'lucide-react';
import { AdminSeoChangeSetStatusClient } from '@/components/AdminSeoChangeSetStatusClient';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const revalidate = 300;

type Row = {
  change_set_id: string;
  product_slug: string;
  target_field: string;
  current_value: string | null;
  proposed_value: string;
  status: string;
  created_at: string;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Missing admin database client.' };
  const { data, error } = await supabase.from('feya_commerce_v_admin_seo_change_sets_v1').select('change_set_id,product_slug,target_field,current_value,proposed_value,status,created_at').limit(300);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function Chip({ children }) {
  return <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{children}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function SeoChangeSetsPage() {
  const { rows, error } = await loadRows();
  const pending = rows.filter((row) => row.status === 'pending');
  const approved = rows.filter((row) => row.status === 'approved');
  const rejected = rows.filter((row) => row.status === 'rejected');

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · SEO Change Sets</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Change sets</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Review stored SEO field change previews. Approval here still does not publish SEO content.</p></div><div className="flex gap-3"><Link href="/admin/seo-apply" className="btn-ghost">SEO Apply <ArrowUpRight size={13} /></Link><Link href="/admin/seo-export" className="btn-ghost">SEO Export <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)] mb-7">Storage view is not available yet: {error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={Database} label="Rows" value={rows.length} note="Stored rows." /><Metric icon={FileText} label="Pending" value={pending.length} note="Needs review." /><Metric icon={FileText} label="Approved" value={approved.length} note="Approved rows." /><Metric icon={FileText} label="Rejected" value={rejected.length} note="Rejected rows." /></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1fr_.65fr_.8fr_1fr_1fr_1.2fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Product</div><div>Status</div><div>Field</div><div>Current</div><div>Proposed</div><div>Review</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row) => <div key={row.change_set_id} className="grid grid-cols-[1fr_.65fr_.8fr_1fr_1fr_1.2fr] gap-4 px-5 py-4"><div><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[14px] leading-snug hover:text-[var(--gold-warm)]">/{row.product_slug}</Link><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{row.change_set_id}</div></div><div><Chip>{row.status}</Chip></div><div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{row.target_field}</div><div className="text-[12px] leading-relaxed text-[var(--bone-dim)] line-clamp-3">{row.current_value || '—'}</div><div className="text-[12px] leading-relaxed text-bone line-clamp-3">{row.proposed_value || '—'}</div><AdminSeoChangeSetStatusClient changeSetId={row.change_set_id} currentStatus={row.status} /></div>) : <div className="p-6 text-[13px] leading-relaxed text-[var(--bone-dim)]">No stored change sets yet.</div>}</div></div>
  </section></main>;
}
