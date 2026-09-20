'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { GrowthOpportunityRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { roleLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function dateLabel(value: unknown) {
  if (!value) return 'не задано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function stateLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    OPEN: 'Открыта',
    ACTIONING: 'В работе',
    CLOSED: 'Закрыта',
    EXPIRED: 'Срок истёк',
    CANCELLED: 'Отменена',
    EXPIRING_SOON: 'Окно закрывается ≤48 ч',
    EXPIRING_THIS_WEEK: 'Окно закрывается на этой неделе',
    ACTIVE: 'Актуальна',
  };
  return labels[key] || asText(value);
}

function typeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    EVENT: 'Событие',
    SEASONAL: 'Сезонная',
    SEARCH_DEMAND: 'Поисковый спрос',
    PRODUCT: 'Товарная',
    CONTENT: 'Контент',
    COMMERCIAL: 'Коммерческая',
    TECHNICAL: 'Техническая',
  };
  return labels[key] || 'Возможность роста';
}

export function OwnerOpportunityDrawerClient({ row }: { row: GrowthOpportunityRow }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({
    open,
    dialogRef,
    triggerRef,
    initialFocusRef: closeRef,
    close: closeDrawer,
  });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Подробнее</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть возможность" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`opportunity-drawer-${row.opportunity_id}`}
            className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto"
          >
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Возможность роста</div>
                <h2 id={`opportunity-drawer-${row.opportunity_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title, 'Возможность роста')}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className="owner-card">
                <div className="owner-card-meta">
                  <span className="owner-status is-info">{stateLabel(row.expiry_state || row.opportunity_status)}</span>
                  <span>{typeLabel(row.opportunity_type)}</span>
                  <span>{roleLabel(row.owner_role)}</span>
                  <span>{asText(row.priority, 'P3')}</span>
                </div>
                <h3 className="owner-card-title">Почему окно важно сейчас</h3>
                <p className="owner-card-copy">
                  Коммерческое окно заканчивается: <strong>{dateLabel(row.commercial_expiry_at)}</strong>.
                  {row.event_starts_at ? ` Само событие начинается ${dateLabel(row.event_starts_at)}.` : ' Отдельная дата события не задана.'}
                </p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Временной контекст</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Коммерческий срок</span><strong>{dateLabel(row.commercial_expiry_at)}</strong></div>
                  <div><span>Событие начинается</span><strong>{dateLabel(row.event_starts_at)}</strong></div>
                  <div><span>Событие заканчивается</span><strong>{dateLabel(row.event_ends_at)}</strong></div>
                  <div><span>Обнаружено</span><strong>{dateLabel(row.detected_at)}</strong></div>
                </div>
              </section>

              <section className={`owner-card ${row.initiative_id ? 'is-success' : 'is-info'}`}>
                <div className={`owner-status ${row.initiative_id ? 'is-success' : 'is-info'}`}>
                  {row.initiative_id ? 'Связана с инициативой' : 'Инициатива ещё не создана'}
                </div>
                <p className="owner-card-copy">
                  {row.initiative_id
                    ? 'Возможность уже связана с рабочей инициативой. Следующий шаг нужно смотреть в стратегии и рабочем процессе.'
                    : 'FEYA не создаёт инициативу автоматически только потому, что увидела возможность. Сначала должны быть достаточные данные и подходящая бизнес-цель.'}
                </p>
              </section>

              <div className="owner-actions">
                {row.initiative_id ? <Link href="/admin/strategy" className="owner-button primary">Открыть инициативу</Link> : null}
                <Link href="/admin/company/growth" className="owner-button">Контекст роста</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>Идентификаторы и исходный реестр</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.opportunity_id}>ID возможности</span>
                  {row.opportunity_code ? <span title={row.opportunity_code}>Код возможности</span> : null}
                  {row.event_code ? <span title={row.event_code}>Код события</span> : null}
                  {row.updated_at ? <span>обновлено: {dateLabel(row.updated_at)}</span> : null}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
