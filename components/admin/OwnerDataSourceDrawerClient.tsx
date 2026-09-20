'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { DataSourceHealthRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { dataFreshnessLabel, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function dateTimeLabel(value: unknown) {
  if (!value) return 'не зафиксировано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function authorityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    CURRENT_FIRST_PARTY: 'Текущий внутренний источник',
    DERIVED_OPERATIONAL: 'Рассчитано внутри FEYA',
    EXTERNAL_MARKET: 'Внешний рыночный источник',
    LEGACY_FIRST_PARTY: 'Исторический внутренний источник',
  };
  return labels[key] || 'Источник данных';
}

function toneClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'HEALTHY' || state === 'AVAILABLE') return 'is-success';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE') return 'is-danger';
  return 'is-warning';
}

export function OwnerDataSourceDrawerClient({ row }: { row: DataSourceHealthRow }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({ open, dialogRef, triggerRef, initialFocusRef: closeRef, close: closeDrawer });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Подробнее</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть источник данных" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`source-drawer-${row.source_code}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Источник данных</div>
                <h2 id={`source-drawer-${row.source_code}`} className="m-0 text-[20px] leading-snug">{sourceLabel(row.source_code)}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${toneClass(row.health_state)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(row.health_state)}`}>{statusLabel(row.health_state)}</span>
                  <span>{dataFreshnessLabel(row.freshness_state)}</span>
                </div>
                <h3 className="owner-card-title">Можно ли использовать данные сейчас</h3>
                <p className="owner-card-copy">
                  {row.error_message
                    ? row.error_message
                    : 'Последний снимок источника не сообщает отдельную ошибку. Ограничения всё равно зависят от свежести, покрытия и доступности.'}
                </p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Свежесть и объём</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Последние данные</span><strong>{dateTimeLabel(row.watermark_at)}</strong></div>
                  <div><span>Последний успех</span><strong>{dateTimeLabel(row.last_success_at)}</strong></div>
                  <div><span>Проверено</span><strong>{dateTimeLabel(row.checked_at)}</strong></div>
                  <div><span>Наблюдаемых строк</span><strong>{row.observed_row_count ?? '—'}</strong></div>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Источник истины</div>
                <p className="owner-card-copy"><strong>{authorityLabel(row.authority_tier)}</strong>.</p>
                <p className="owner-card-copy">Основной источник: {asText(row.primary_source, 'не указан')}.</p>
                <p className="owner-card-copy">Область authority: {asText(row.authority_domain, 'не указана')}.</p>
              </section>

              <div className="owner-actions">
                <Link href="/admin/data-authority" className="owner-button">Источники истины</Link>
                <Link href="/admin/company/system" className="owner-button">Система</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические evidence</strong><small>Coverage, error code и raw evidence только для диагностики</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.source_code}>Код источника</span>
                  {row.source_instance_key ? <span title={row.source_instance_key}>Instance key</span> : null}
                  {row.error_code ? <span title={row.error_code}>Error code</span> : null}
                  {row.coverage_json ? <span title={JSON.stringify(row.coverage_json)}>Coverage сохранён</span> : null}
                  {row.evidence_json ? <span title={JSON.stringify(row.evidence_json)}>Evidence сохранён</span> : null}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
