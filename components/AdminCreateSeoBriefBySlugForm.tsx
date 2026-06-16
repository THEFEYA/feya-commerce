// @ts-nocheck
'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

export function AdminCreateSeoBriefBySlugForm() {
  const [productSlug, setProductSlug] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const slug = productSlug.trim();
    if (!slug) {
      setStatus('error');
      setMessage('Вставь product_slug товара.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/admin/seo-engine/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: slug }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось создать SEO-бриф.');
      setStatus('success');
      setMessage(`SEO-бриф создан. Главный ключ: ${data.primary_keyword || 'не выбран'}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Не удалось создать SEO-бриф.');
    }
  };

  return <form onSubmit={submit} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="eyebrow-gold mb-3">Создать SEO-бриф</div>
    <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] mb-4">Вставь product_slug товара, для которого уже сохранены ключевые фразы. Бриф будет создан для англоязычного SEO-контента, интерфейс и проверка остаются на русском.</p>
    <div className="grid gap-3 md:grid-cols-[1fr_230px]">
      <input value={productSlug} onChange={(event) => setProductSlug(event.target.value)} placeholder="product-slug" className="h-10 rounded-md border border-[rgba(216,214,211,.16)] bg-black/30 px-3 text-[13px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" />
      <button type="submit" disabled={status === 'loading'} className="btn-gold justify-center rounded-md h-10 disabled:opacity-60">
        {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        {status === 'loading' ? 'Создаю бриф…' : 'Создать SEO-бриф'}
      </button>
    </div>
    {message ? <div className={`mt-4 text-[12px] leading-relaxed ${status === 'error' ? 'text-[var(--ruby-soft)]' : 'text-[#a9dfbd]'}`}>{message}</div> : null}
  </form>;
}
