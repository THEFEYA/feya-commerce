'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, PackageCheck, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/storefront';

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
  is_full_set?: boolean | null;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  line_total_amount?: number | null;
  currency?: string | null;
  price_confidence_status?: string | null;
};

type Payload = {
  ok?: boolean;
  error?: string;
  drafts?: DraftRow[];
  itemsByDraft?: Record<string, DraftItemRow[]>;
};

function Chip({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'warning' | 'danger' }) {
  const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: any }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[38px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export function AdminOrdersSavedClient() {
  const [payload, setPayload] = useState<Payload>({ drafts: [], itemsByDraft: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/order-drafts')
      .then((response) => response.json())
      .then((data) => { if (active) setPayload(data); })
      .catch((error) => { if (active) setPayload({ ok: false, error: error?.message || 'Could not load saved drafts.', drafts: [], itemsByDraft: {} }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const drafts = payload.drafts || [];
  const itemsByDraft = payload.itemsByDraft || {};
  const warningCount = drafts.filter((draft) => draft.has_price_review_warning || draft.has_label_review_warning).length;

  if (loading) {
    return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">Loading saved order drafts...</div>;
  }

  return <div className="space-y-6">
    {payload.error ? <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5 text-[13px] leading-relaxed text-[var(--gold-warm)]"><AlertTriangle size={15} className="inline mr-2" />{payload.error}</div> : null}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="text-right"><div className="eyebrow-dim mb-2">Draft total</div><div className="font-price text-gold-grad text-[34px] leading-none">{formatPrice(Number(draft.total_amount || 0), currency)}</div></div>
          </div>

          <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((item, index) => <div key={`${draft.order_draft_id}-${index}`} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
              <div className="relative h-[76px] rounded-md overflow-hidden bg-black/30">{item.image_url ? <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
              <div>
                <div className="text-bone text-[13px] leading-snug line-clamp-2">{item.product_title || 'TheFEYA piece'}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{item.configuration_label || 'Option'} · {item.color || 'Color'} · {item.size || 'Size'} · Qty {item.quantity || 1}</div>
                <div className="mt-2 font-price text-gold-grad text-[20px] leading-none">{formatPrice(Number(item.line_total_amount || 0), item.currency || currency)}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{item.component_code ? <Chip>{item.component_code}</Chip> : null}{item.is_full_set ? <Chip tone="warning">Full set</Chip> : null}{item.price_confidence_status ? <Chip tone={item.price_confidence_status === 'approved' ? 'neutral' : 'warning'}>{item.price_confidence_status}</Chip> : null}</div>
              </div>
            </div>)}
          </div>
        </article>;
      })}
      {!drafts.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No saved order drafts yet. Use the local preview below to create one.</div> : null}
    </div>
  </div>;
}
