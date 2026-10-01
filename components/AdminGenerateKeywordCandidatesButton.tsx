// @ts-nocheck
'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';

type Props = {
  productSlug: string;
};

export function AdminGenerateKeywordCandidatesButton({ productSlug }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const generate = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/admin/seo-engine/keyword-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: productSlug }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось сохранить ключевые фразы.');
      }
      setStatus('success');
      setMessage(`Сохранено ключевых фраз: ${data.generated_count || 0}. Следующий шаг — SEO-бриф на английский контент.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить ключевые фразы.');
    }
  };

  return <div className="flex flex-col gap-2">
    <button type="button" onClick={generate} disabled={status === 'loading'} className="btn-gold justify-center rounded-md h-10 disabled:opacity-60">
      {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
      {status === 'loading' ? 'Сохраняю ключи…' : 'Сохранить ключевые фразы'}
    </button>
    {message ? <div className={`text-[12px] leading-relaxed ${status === 'error' ? 'text-[var(--ruby-soft)]' : 'text-[#a9dfbd]'}`}>{message}</div> : null}
  </div>;
}
