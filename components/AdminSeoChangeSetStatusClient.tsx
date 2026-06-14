'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

type Props = {
  changeSetId: string;
  currentStatus: string;
};

type ApiResponse = { ok?: boolean; error?: string };

export function AdminSeoChangeSetStatusClient({ changeSetId, currentStatus }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const isPending = currentStatus === 'pending';
  const isApproved = currentStatus === 'approved';

  async function updateStatus(nextStatus: 'approved' | 'rejected') {
    setSaving(nextStatus);
    setStatus('Saving...');
    try {
      const response = await fetch('/api/admin/seo-change-sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_set_id: changeSetId, status: nextStatus }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not update change set.');
      setStatus(`Saved as ${nextStatus}. Refresh to update the queue.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update change set.');
    } finally {
      setSaving(null);
    }
  }

  async function markApplied() {
    setSaving('applied');
    setStatus('Saving...');
    try {
      const response = await fetch('/api/admin/seo-change-sets-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_set_id: changeSetId }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not mark as applied.');
      setStatus('Saved as applied. Refresh to update the queue.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not mark as applied.');
    } finally {
      setSaving(null);
    }
  }

  if (isApproved) {
    return <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={markApplied} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {saving === 'applied' ? 'Saving...' : 'Mark applied'}</button>
      {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
    </div>;
  }

  if (!isPending) {
    return <div className="text-[11px] leading-relaxed text-[var(--smoke)]">Reviewed</div>;
  }

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => updateStatus('approved')} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {saving === 'approved' ? 'Saving...' : 'Approve'}</button>
    <button type="button" onClick={() => updateStatus('rejected')} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><ShieldAlert size={13} /> {saving === 'rejected' ? 'Saving...' : 'Reject'}</button>
    {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
  </div>;
}
