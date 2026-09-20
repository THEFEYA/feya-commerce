// @ts-nocheck
import Link from 'next/link';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 1000;

type Row = {
  change_set_id: string;
  product_slug: string;
  target_field: string;
  applied_value: string | null;
  status: string;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Missing admin database client.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_seo_applied_values_v1')
    .select('change_set_id,product_slug,target_field,applied_value,status')
    .limit(ROW_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

export default async function SeoAppliedValuesPage() {
  const { rows, error } = await loadRows();
  const products = new Set(rows.map((row) => row.product_slug));
  const fields = new Set(rows.map((row) => row.target_field));

  return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16">
    <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-7">
      <div className="eyebrow-gold mb-3">Admin · SEO Applied Values</div>
      <h1 className="text-bone text-[28px] font-medium leading-tight">Applied SEO values</h1>
      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Internal read model. This screen does not publish storefront SEO.</p>
      <div className="mt-5 flex gap-3"><Link href="/admin/seo-change-sets" className="btn-ghost">Change Sets</Link><Link href="/admin/seo-apply" className="btn-ghost">SEO Apply</Link></div>
    </div>
    {error ? <div className="mb-6 rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
    <div className="mb-8 grid grid-cols-3 gap-4">
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Rows</div><div className="text-bone text-[28px]">{rows.length}</div></div>
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Products</div><div className="text-bone text-[28px]">{products.size}</div></div>
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Fields</div><div className="text-bone text-[28px]">{fields.size}</div></div>
    </div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
      <div className="grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Product</div><div>Status</div><div>Field</div><div>Value</div></div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row) => <div key={`${row.change_set_id}-${row.target_field}`} className="grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-4"><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[13px] hover:text-[var(--gold-warm)]">/{row.product_slug}</Link><div className="text-[12px] text-[var(--bone-dim)]">{row.status}</div><div className="text-[12px] text-[var(--bone-dim)]">{row.target_field}</div><div className="text-[12px] leading-relaxed text-bone line-clamp-4">{row.applied_value || '—'}</div></div>) : <div className="p-6 text-[13px] text-[var(--bone-dim)]">No values yet.</div>}</div>
    </div>
  </section></main>;
}
