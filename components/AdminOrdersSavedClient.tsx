'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, PackageCheck, ShieldCheck, type LucideIcon } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

type DraftItem = {
  order_draft_item_id?: string | null;
  product_title?: string | null;
  image_url?: string | null;
  public_label?: string | null;
  configuration_label?: string | null;
  component_code?: string | null;
  is_full_set?: boolean | null;
  is_bundle?: boolean | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  line_total_amount?: number | null;
  currency?: string | null;
  price_confidence_status?: string | null;
};

type DraftRow = {
  order_draft_id: string;
  draft_number?: string | null;
  full_name?: string | null;
  email?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  has_price_review_warning?: boolean | null;
  has_label_review_warning?: boolean | null;
  created_at?: string | null;
  items?: DraftItem[] | null;
};

type ApiPayload = { ok?: boolean; error?: string; drafts?: DraftRow[] };

type MetricProps = { label: string; value: string | number; note: string; icon: LucideIcon };

function Chip({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }: MetricProps) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export function AdminOrdersSavedClient() {
  const [payload, setPayload] = useState<ApiPayload>({ drafts: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/order-drafts', { cache: 'no-store' });
      const data = await response.json();
      setPayload(data);
    } catch (error) {
      setPayload({ ok: false, error: error instanceof Error ? error.message : 'Could not load saved drafts.', drafts: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const drafts = payload.drafts || [];
  const itemCount = drafts.reduce((sum, draft) => sum + (draft.items?.length || 0), 0);
  const warningCount = drafts.filter((draft) => draft.has_price_review_warning || draft.has_label_review_warning).length;

  return <section className="container-feya pb-10">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Metric icon={ClipboardList} label="Saved drafts" value={loading ? '…' : drafts.length} note="Loaded from protected admin API." />
      <Metric icon={PackageCheck} label="Items" value={loading ? '…' : itemCount} note="Draft items stored in Supabase." />
      <Metric icon={ShieldCheck} label="Warnings" value={loading ? '…' : warningCount} note="Price or label warning flags." />
      <Metric icon={AlertTriangle} label="Payment off" value="0" note="Paid order finalization remains disabled." />
    </div>

    {payload.error ? <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5 text-[13px] leading-relaxed text-[var(--gold-warm)] mb-5"><AlertTriangle size={15} className="inline mr-2" />{payload.error}</div> : null}

    <div className="flex items-center justify-between gap-4 mb-4">
      <div><div className="eyebrow-gold">Supabase saved drafts</div><p className="mt-2 text-[12px] text-[var(--bone-dim)]">Protected read-only view. Public table grants stay closed.</p></div>
      <button type="button" onClick={load} className="btn-ghost px-4 py-2 text-[10px]" disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>

    <div className="space-y-4">
      {drafts.map((draft) => {
        const currency = draft.currency || draft.items?.[0]?.currency || 'EUR';
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
            <div className="text-right"><div className="eyebrow-dim mb-2">Draft total</div><div className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(Number(draft.total_amount || 0), currency)}</div></div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(draft.items || []).map((item, index) => <div key={item.order_draft_item_id || `${draft.order_draft_id}-${index}`} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
              <div className="relative h-[76px] rounded-md overflow-hidden bg-black/30">{item.image_url ? <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
              <div>
                <div className="text-bone text-[13px] leading-snug line-clamp-2">{item.product_title || 'TheFEYA piece'}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.public_label || item.configuration_label || 'Option'} · {item.color || 'Color'} · {item.size || 'Size'} · Qty {item.quantity || 1}</div>
                <div className="mt-2 font-price text-gold-grad text-[20px] leading-none">{formatPrice(Number(item.line_total_amount || 0), item.currency || currency)}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{item.component_code ? <Chip>{item.component_code}</Chip> : null}{item.is_full_set ? <Chip tone="warning">Full set</Chip> : null}{item.is_bundle ? <Chip tone="warning">Bundle</Chip> : null}{item.price_confidence_status ? <Chip tone={item.price_confidence_status === 'approved' ? 'neutral' : 'warning'}>{item.price_confidence_status}</Chip> : null}</div>
              </div>
            </div>)}
          </div>
        </article>;
      })}

      {!loading && !drafts.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No saved Supabase drafts yet. Create one from checkout, then refresh this block.</div> : null}
    </div>
  </section>;
}
