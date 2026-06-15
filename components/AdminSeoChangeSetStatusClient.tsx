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
    setStatus('Сохраняю...');
    try {
      const response = await fetch('/api/admin/seo-change-sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_set_id: changeSetId, status: nextStatus }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось обновить строку.');
      setStatus(nextStatus === 'approved' ? 'Одобрено. Обнови страницу, чтобы увидеть очередь.' : 'Отклонено. Обнови страницу, чтобы увидеть очередь.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось обновить строку.');
    } finally {
      setSaving(null);
    }
  }

  async function markApplied() {
    setSaving('applied');
    setStatus('Сохраняю...');
    try {
      const response = await fetch('/api/admin/seo-change-sets-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_set_id: changeSetId }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось отметить как применённое.');
      setStatus('Отмечено как применённое. Обнови страницу, чтобы увидеть очередь.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось отметить как применённое.');
    } finally {
      setSaving(null);
    }
  }

  if (isApproved) {
    return <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={markApplied} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {saving === 'applied' ? 'Сохраняю...' : 'Отметить применённым'}</button>
      {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
    </div>;
  }

  if (!isPending) {
    return <div className="text-[11px] leading-relaxed text-[var(--smoke)]">Проверено</div>;
  }

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => updateStatus('approved')} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><CheckCircle2 size={13} /> {saving === 'approved' ? 'Сохраняю...' : 'Одобрить'}</button>
    <button type="button" onClick={() => updateStatus('rejected')} disabled={Boolean(saving)} className="btn-ghost px-3 py-2 text-[10px] disabled:opacity-60"><ShieldAlert size={13} /> {saving === 'rejected' ? 'Сохраняю...' : 'Отклонить'}</button>
    {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
  </div>;
}
