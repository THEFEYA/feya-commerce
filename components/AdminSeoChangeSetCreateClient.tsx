'use client';

import { useState } from 'react';
import { Layers3 } from 'lucide-react';

type FieldPreview = {
  field: string;
  currentValue: string;
  proposedValue: string;
  changed: boolean;
};

type Props = {
  productSlug: string;
  fields: FieldPreview[];
};

type ApiResponse = { ok?: boolean; error?: string; replaced?: number; created?: number };

export function AdminSeoChangeSetCreateClient({ productSlug, fields }: Props) {
  const changedFields = fields.filter((field) => field.changed && field.proposedValue.trim());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  async function createChangeSets() {
    if (!changedFields.length) {
      setStatus('Нет изменённых полей для очереди.');
      return;
    }

    setSaving(true);
    setStatus('Заменяю старые черновики и создаю новые...');
    try {
      const response = await fetch('/api/admin/seo-change-sets-replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: productSlug,
          source_route: '/admin/seo-apply',
          fields: changedFields,
        }),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Не удалось заменить черновики.');
      setStatus(`Готово: старых отклонено ${payload.replaced || 0}, новых создано ${payload.created || 0}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось заменить черновики.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-2">
    <button type="button" onClick={createChangeSets} disabled={saving || !changedFields.length} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-60"><Layers3 size={13} /> {saving ? 'Заменяю...' : 'Заменить старые черновики'}</button>
    {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
  </div>;
}
