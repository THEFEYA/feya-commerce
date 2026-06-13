import { AlertTriangle, ArrowUpRight, ClipboardList, PackageCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { AtelierOrdersClient } from '@/components/AtelierOrdersClient';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/storefront';

export const revalidate = 60;

type DraftRow = {
  order_draft_id: string;
  draft_number?: string | null;
  email?: string | null;
  full_name?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  production_status?: string | null;
  shipping_status?: string | null;
  created_at?: string | null;
  has_price_review_warning?: boolean | null;
  has_label_review_warning?: boolean | null;
};

type DraftItemRow = {
  order_draft_id: string;
  product_title?: string | null;
  image_url?: string | null;
  configuration_label?: string | null;
  component_code?: string | null;
  component_family?: string | null;
  is_full_set?: boolean | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  unit_price_amount?: number | null;
  line_total_amount?: number | null;
  currency?: string | null;
  price_confidence_status?: string | null;
  label_confidence_status?: string | null;
};

async function loadSavedDrafts(): Promise<{ drafts: DraftRow[]; itemsByDraft: Record<string, DraftItemRow[]>; error?: string }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { drafts: [], itemsByDraft: {}, error: getMissingSupabaseServiceEnvMessage() };

  const { data: draftData, error: draftError } = await supabase
    .from('feya_commerce_order_drafts')
    .select('order_draft_id,draft_number,email,full_name,total_amount,currency,payment_status,order_status,production_status,shipping_status,created_at,has_price_review_warning,has_label_review_warning')
    .limit(25);

  if (draftError) return { drafts: [], itemsByDraft: {}, error: draftError.message };

  const drafts = ((draftData || []) as DraftRow[]).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const ids = drafts.map((draft) => draft.order_draft_id).filter(Boolean);
  if (!ids.length) return { drafts, itemsByDraft: {} };

  const { data: itemData, error: itemError } = await supabase
    .from('feya_commerce_order_draft_items')
    .select('order_draft_id,product_title,image_url,configuration_label,component_code,component_family,is_full_set,color,size,quantity,unit_price_amount,line_total_amount,currency,price_confidence_status,label_confidence_status')
    .in('order_draft_id', ids);

  if (itemError) return { drafts, itemsByDraft: {}, error: itemError.message };

  const itemsByDraft = ((itemData || []) as DraftItemRow[]).reduce((acc, item) => {
    acc[item.order_draft_id] = acc[item.order_draft_id] || [];
    acc[item.order_draft_id].push(item);
    return acc;
  }, {} as Record<string, DraftItemRow[]>);

  return { drafts, itemsByDraft };
}

function Chip({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

export default async function AdminOrdersPage() {
  const { drafts, itemsByDraft, error } = await loadSavedDrafts();
  const warningCount = drafts.filter((draft) => draft.has_price_review_warning || draft.has_label_review_warning).length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Orders</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Order drafts</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Saved checkout requests from Supabase plus local preview fallback. Payment remains off; this is review and production-prep only.</p>
        </div>
        <Link href="/checkout" className="btn-ghost">Create test draft <ArrowUpRight size={13} /></Link>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5 text-[13px] leading-relaxed text-[var(--gold-warm)] mb-7"><AlertTriangle size={15} className="inline mr-2" />{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={ClipboardList} label="Saved drafts" value={drafts.length} note="Read from Supabase order draft tables." />
        <Metric icon={ShieldCheck} label="Warnings" value={warningCount} note="Price or label review flags on draft." />
        <Metric icon={PackageCheck} label="Production" value={drafts.filter((draft) => draft.production_status && draft.production_status !== 'not_started').length} note="Drafts that moved past initial review." />
        <Metric icon={AlertTriangle} label="Payment off" value="0" note="Paid order finalization remains disabled." />
      </div>

      <div className="space-y-4">
        {drafts.map((draft) => {
          const items = itemsByDraft[draft.order_draft_id] || [];
          const currency = draft.currency || items[0]?.currency || 'EUR';
          return <article key={draft.order_draft_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="eyebrow-gold mb-2">{draft.draft_number || draft.order_draft_id}</div>
                <div className="text-bone text-[18px] leading-snug">{draft.full_name || 'Unnamed customer'}</div>
                <div className="mt-1 text-[12px] text-[var(--bone-dim)]">{draft.email || 'No email'} · {draft.created_at ? new Date(draft.created_at).toLocaleString() : 'No date'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip>{draft.order_status || 'draft_only'}</Chip>
                  <Chip>{draft.payment_status || 'not_started'}</Chip>
                  {draft.has_price_review_warning ? <Chip tone="warning">Price warning</Chip> : null}
                  {draft.has_label_review_warning ? <Chip tone="warning">Label warning</Chip> : null}
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow-dim mb-2">Draft total</div>
                <div className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(Number(draft.total_amount || 0), currency)}</div>
              </div>
            </div>

            <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((item, index) => <div key={`${draft.order_draft_id}-${index}`} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
                <div className="relative h-[76px] rounded-md overflow-hidden bg-black/30">{item.image_url ? <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                <div>
                  <div className="text-bone text-[13px] leading-snug line-clamp-2">{item.product_title || 'TheFEYA piece'}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.configuration_label || 'Option'} · {item.color || 'Color'} · {item.size || 'Size'} · Qty {item.quantity || 1}</div>
                  <div className="mt-2 font-price text-gold-grad text-[20px] leading-none">{formatPrice(Number(item.line_total_amount || 0), item.currency || currency)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.component_code ? <Chip>{item.component_code}</Chip> : null}
                    {item.is_full_set ? <Chip tone="warning">Full set</Chip> : null}
                    {item.price_confidence_status ? <Chip tone={item.price_confidence_status === 'approved' ? 'neutral' : 'warning'}>{item.price_confidence_status}</Chip> : null}
                  </div>
                </div>
              </div>)}
              {!items.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">No draft items returned.</div> : null}
            </div>
          </article>;
        })}
      </div>
    </section>

    {!drafts.length ? <AtelierOrdersClient /> : null}
  </main>;
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: any }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[38px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}
