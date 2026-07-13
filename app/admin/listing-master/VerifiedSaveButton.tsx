'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';

type SaveResult = {
  ok: boolean;
  href?: string;
  code?: string;
  message?: string;
  requestId?: string;
};

type Props = {
  action: (formData: FormData) => Promise<SaveResult>;
  disabled?: boolean;
};

export default function VerifiedSaveButton({ action, disabled = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function save(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form) {
      setError('Форма фокуса не найдена. Обновите страницу и повторите.');
      return;
    }

    const formData = new FormData(form);
    formData.set('save_request_id', crypto.randomUUID());
    setError('');

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result?.ok || !result.href) {
          const suffix = result?.code ? ` (${result.code})` : '';
          setError(`${result?.message || 'Решение не сохранилось.'}${suffix}`);
          return;
        }
        window.location.assign(result.href);
      } catch (saveError) {
        console.error('[listing-master-save] client_action_failed', saveError);
        setError('Сервер не подтвердил сохранение. Повторите после обновления страницы.');
      }
    });
  }

  return <>
    <button type="button" onClick={save} className="btn-ghost" disabled={disabled || isPending}>
      <Save size={13} /> {isPending ? 'Сохраняю и проверяю…' : 'Сохранить текущий фокус и ключи'}
    </button>
    {error ? <span role="alert" className="self-center text-[11px] text-[var(--ruby-soft)]">{error}</span> : null}
  </>;
}
