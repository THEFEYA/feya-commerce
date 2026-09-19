'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { OwnerWorkItemVM } from '@/lib/owner-ui/types';
import { OwnerWorkDetailContent } from '@/components/admin/OwnerWorkDetailContent';

export function OwnerWorkDrawerClient({ item }: { item: OwnerWorkItemVM }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Открыть</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            aria-label="Закрыть подробности работы"
            className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={`work-drawer-${item.id}`}
            className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-[rgba(216,214,211,.14)] bg-[#0c0c11] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(216,214,211,.10)] bg-[#0c0c11]/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Работа FEYA</div>
                <h2 id={`work-drawer-${item.id}`} className="m-0 text-[20px] leading-snug text-bone">{item.title}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={() => setOpen(false)}><X size={15} /></button>
            </div>

            <div className="p-5">
              <OwnerWorkDetailContent item={item} compact />
              <div className="owner-actions" style={{ marginTop: '16px' }}>
                <Link href={`/admin/company/work/${encodeURIComponent(item.id)}`} className="owner-button primary">Открыть полностью</Link>
                <button type="button" className="owner-button" onClick={() => setOpen(false)}>Закрыть</button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
