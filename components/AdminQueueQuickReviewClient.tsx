'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

type Props = {
  productSlug: string;
  canonicalProductId?: string | null;
  sourceRoute: string;
  approvedEventType: string;
  subjectType: 'label' | 'price' | 'component' | 'media' | 'seo' | 'product';
  approvedLabel?: string;
};

type ReviewResponse = { ok?: boolean; error?: string };

export function AdminQueueQuickReviewClient({ productSlug, canonicalProductId, sourceRoute, approvedEventType, subjectType, approvedLabel = 'Mark reviewed' }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  async function record(eventType: string, eventStatus: 'approved' | 'needs_fix') {
    setSaving(eventType);
    setStatus('Saving...');
    try {
      const response = await fetch('/api/admin/review-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          event_status: eventStatus,
          subject_type: eventType === 'needs_fix' ? 'product' : subjectType,
          canonical_product_id: canonicalProductId || null,
          product_slug: productSlug,
          source_route: sourceRoute,
          payload_json: { product_slug: productSlug, source_route: sourceRoute, quick_queue_action: true },
        }),
      });
      const payload = await response.json() as ReviewResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save review event.');
      setStatus(eventStatus === 'approved' ? 'Saved as reviewed.' : 'Saved as needs fix.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save review event.');
    } finally {
      setSaving(null);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => record(approvedEventType, 'approved')} disabled={Boolean(saving)} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {saving === approvedEventType ? 'Saving...' : approvedLabel}</button>
    <button type="button" onClick={() => record('needs_fix', 'needs_fix')} disabled={Boolean(saving)} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-60"><ShieldAlert size={13} /> {saving === 'needs_fix' ? 'Saving...' : 'Needs fix'}</button>
    {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
  </div>;
}
