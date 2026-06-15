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

type ApiResponse = { ok?: boolean; error?: string };

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
    setStatus('Создаю черновики на проверку...');
    try {
      for (const field of changedFields) {
        const response = await fetch('/api/admin/seo-change-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_slug: productSlug,
            source_route: '/admin/seo-apply',
            target_field: field.field,
            current_value: field.currentValue || null,
            proposed_value: field.proposedValue,
            reason: 'Created from SEO Apply Preview',
            rule_pack_version: 'manual_v1',
            template_pack_version: 'template_v1',
            status: 'pending',
          }),
        });
        const payload = await response.json() as ApiResponse;
        if (!response.ok || !payload.ok) throw new Error(payload.error || `Не удалось создать черновик для ${field.field}.`);
      }
      setStatus(`Создано черновиков на проверку: ${changedFields.length}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать черновики на проверку.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-2">
    <button type="button" onClick={createChangeSets} disabled={saving || !changedFields.length} className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-60"><Layers3 size={13} /> {saving ? 'Создаю...' : 'Создать черновики на проверку'}</button>
    {status ? <span className="text-[11px] leading-relaxed text-[var(--gold-warm)]">{status}</span> : null}
  </div>;
}
