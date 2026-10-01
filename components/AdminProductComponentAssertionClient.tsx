'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export type ComponentFamilyOption = {
  component_family_id: string;
  canonical_name: string;
};

export type FixedComponentAssertion = {
  product_component_assertion_id: string;
  component_family_id: string;
  component_family: string;
};

type Props = {
  canonicalProductId: string;
  componentFamilies: ComponentFamilyOption[];
  approvedAssertions: FixedComponentAssertion[];
  sourceRoute: string;
};

type AssertionResponse = {
  ok?: boolean;
  error?: string;
};

export function AdminProductComponentAssertionClient({
  canonicalProductId,
  componentFamilies,
  approvedAssertions,
  sourceRoute,
}: Props) {
  const router = useRouter();
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [status, setStatus] = useState('');

  const availableFamilies = useMemo(() => {
    const approvedIds = new Set(approvedAssertions.map((item) => item.component_family_id));
    return componentFamilies.filter((item) => !approvedIds.has(item.component_family_id));
  }, [approvedAssertions, componentFamilies]);

  async function mutate(action: 'approve' | 'revoke', componentFamilyId: string) {
    const saving = `${action}:${componentFamilyId}`;
    setSavingKey(saving);
    setStatus(action === 'approve' ? 'Сохраняю Product Truth…' : 'Отзываю подтверждение…');
    try {
      const response = await fetch('/api/admin/product-component-assertions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          canonical_product_id: canonicalProductId,
          component_family_id: componentFamilyId,
          source_route: sourceRoute,
        }),
      });
      const payload = await response.json() as AssertionResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Не удалось сохранить Product Truth.');
      }
      setSelectedFamilyId('');
      setStatus(action === 'approve' ? 'Компонент подтверждён.' : 'Подтверждение отозвано.');
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось сохранить Product Truth.');
    } finally {
      setSavingKey('');
    }
  }

  return <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.05)] p-5">
    <div className="eyebrow-gold mb-2">Fixed product composition</div>
    <p className="max-w-3xl text-[12px] leading-relaxed text-[var(--bone-dim)]">
      Подтвердите только компонент, который всегда входит в этот товар. Размер, цвет, фото и SEO-фокус не создают Product Truth автоматически.
    </p>

    {approvedAssertions.length ? <div className="mt-4 flex flex-wrap gap-2">
      {approvedAssertions.map((assertion) => {
        const saving = savingKey === `revoke:${assertion.component_family_id}`;
        return <button
          key={assertion.product_component_assertion_id}
          type="button"
          onClick={() => mutate('revoke', assertion.component_family_id)}
          disabled={Boolean(savingKey)}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(126,205,161,.35)] bg-[rgba(126,205,161,.08)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--mint)] disabled:opacity-60"
          title="Отозвать это подтверждение"
        >
          <CheckCircle2 size={13} />
          {assertion.component_family}
          <XCircle size={12} />
          {saving ? '…' : null}
        </button>;
      })}
    </div> : null}

    <div className="mt-4 flex flex-col gap-3 md:flex-row">
      <select
        value={selectedFamilyId}
        onChange={(event) => setSelectedFamilyId(event.target.value)}
        disabled={Boolean(savingKey)}
        className="min-h-11 flex-1 rounded-xl border border-[rgba(216,214,211,.16)] bg-[#0b0b0f] px-4 text-[13px] text-bone outline-none"
      >
        <option value="">Выберите неизменный компонент…</option>
        {availableFamilies.map((family) => <option key={family.component_family_id} value={family.component_family_id}>{family.canonical_name}</option>)}
      </select>
      <button
        type="button"
        onClick={() => mutate('approve', selectedFamilyId)}
        disabled={!selectedFamilyId || Boolean(savingKey)}
        className="btn-ghost min-h-11 px-5 text-[10px] disabled:opacity-50"
      >
        <CheckCircle2 size={13} />
        {savingKey.startsWith('approve:') ? 'Сохраняю…' : 'Подтвердить fixed component'}
      </button>
    </div>
    {status ? <div className="mt-3 text-[11px] text-[var(--gold-warm)]">{status}</div> : null}
  </div>;
}
