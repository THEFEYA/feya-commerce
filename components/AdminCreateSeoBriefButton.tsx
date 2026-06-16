// @ts-nocheck
'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

type Props = {
  productSlug: string;
};

export function AdminCreateSeoBriefButton({ productSlug }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const createBrief = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/admin/seo-engine/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: productSlug }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось создать SEO-бриф.');
      }
      setStatus('success');
      setMessage(`SEO-бриф создан. Главный ключ: ${data.primary_keyword || 'не выбран'}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось создать SEO-бриф.');
    }
  };

  return <div className="flex flex-col gap-2">
    <button type="button" onClick={createBrief} disabled={status === 'loading'} className="btn-ghost justify-center rounded-md h-10 disabled:opacity-60">
      {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      {status === 'loading' ? 'Создаю SEO-бриф…' : 'Создать SEO-бриф'}
    </button>
    {message ? <div className={`text-[12px] leading-relaxed ${status === 'error' ? 'text-[var(--ruby-soft)]' : 'text-[#a9dfbd]'}`}>{message}</div> : null}
  </div>;
}
