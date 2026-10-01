'use client';

import { useState, useTransition } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { ProductComponentAssertionScope } from '@/lib/listingMasterComponentTruth';

type ConfirmResult = {
  ok: boolean;
  href?: string;
  code?: string;
  message?: string;
};

type Props = {
  action: (formData: FormData) => Promise<ConfirmResult>;
  disabled?: boolean;
  scope: ProductComponentAssertionScope;
};

export default function ConfirmCompositionButton({ action, disabled = false, scope }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function confirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form) {
      setError('Форма товара не найдена. Обновите страницу и повторите.');
      return;
    }

    const formData = new FormData(form);
    formData.set('composition_request_id', crypto.randomUUID());
    setError('');

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result?.ok || !result.href) {
          const suffix = result?.code ? ` (${result.code})` : '';
          setError(`${result?.message || 'Состав товара не подтверждён.'}${suffix}`);
          return;
        }
        window.location.assign(result.href);
      } catch (confirmError) {
        console.error('[listing-master-composition] client_action_failed', confirmError);
        setError('Сервер не подтвердил Product Truth. Повторите после обновления страницы.');
      }
    });
  }

  const label = scope === 'canonical_listing'
    ? 'Подтвердить состав листинга'
    : 'Подтвердить неизменный состав';

  return <>
    <button type="button" onClick={confirm} className="btn-ghost" disabled={disabled || isPending}>
      <BadgeCheck size={13} /> {isPending ? 'Проверяю и записываю…' : label}
    </button>
    {error ? <span role="alert" className="self-center text-[11px] text-[var(--ruby-soft)]">{error}</span> : null}
  </>;
}
