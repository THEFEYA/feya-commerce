'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, LoaderCircle } from 'lucide-react';

type Props = {
  tone: string;
  title: string;
  message: string;
  savedAt?: string;
};

export default function FocusActionFeedback({ tone, title, message, savedAt }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const edited = () => setDirty(true);
    const submitted = () => setApplying(true);
    form.addEventListener('input', edited);
    form.addEventListener('submit', submitted);
    return () => {
      form.removeEventListener('input', edited);
      form.removeEventListener('submit', submitted);
    };
  }, []);

  const success = !dirty && !applying && tone === 'success';
  const Icon = applying ? LoaderCircle : success ? CheckCircle2 : Info;
  const heading = applying ? 'Обновляю подбор слов…' : dirty ? 'Есть несохранённые изменения' : title;
  const detail = applying
    ? 'Дождитесь обновления списка. Поиск сам по себе не сохраняет решение.'
    : dirty
      ? 'Вы изменили оси. Примените поиск для просмотра ключей или сохраните решение — подбор пересчитается при сохранении.'
      : message;

  return <div ref={ref} role="status" aria-live="polite" aria-busy={applying}
    className={`mb-3 rounded-xl border p-3 text-[12px] leading-relaxed ${success ? 'border-green-400/40 bg-green-400/10 text-green-200' : 'border-amber-300/30 bg-amber-300/5 text-amber-100'}`}>
    <div className="flex items-center gap-2 font-semibold"><Icon size={16} className={applying ? 'animate-spin' : ''} />{heading}</div>
    <p className="mt-1">{detail}</p>
    {success && savedAt ? <p className="mt-1 text-[11px] opacity-80">Сохранено: {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(savedAt))} UTC</p> : null}
  </div>;
}
