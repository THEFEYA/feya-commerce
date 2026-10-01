'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ExperimentRegistryRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function dateLabel(value: unknown) {
  if (!value) return 'не задано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function modeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    A_B: 'A/B',
    AB: 'A/B',
    BEFORE_AFTER: 'До / после',
    HOLDOUT: 'Контрольная группа',
    OBSERVATIONAL: 'Наблюдение',
    QUASI_EXPERIMENT: 'Квазиэксперимент',
  };
  return labels[key] || (key ? 'Настраиваемый дизайн' : 'не задан');
}

export function OwnerExperimentDrawerClient({ row }: { row: ExperimentRegistryRow }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({ open, dialogRef, triggerRef, initialFocusRef: closeRef, close: closeDrawer });

  const contaminated = ['CONTAMINATED', 'INVALIDATED'].includes(String(row.contamination_state || '').toUpperCase());

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>Подробнее</button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button type="button" aria-label="Закрыть эксперимент" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`experiment-drawer-${row.experiment_id}`}
            className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto"
          >
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Эксперимент</div>
                <h2 id={`experiment-drawer-${row.experiment_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title, 'Эксперимент')}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${contaminated ? 'is-warning' : 'is-info'}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${contaminated ? 'is-warning' : 'is-info'}`}>{statusLabel(row.experiment_status)}</span>
                  <span>{modeLabel(row.experiment_mode)}</span>
                  <span>{statusLabel(row.feasibility_status)}</span>
                </div>
                <h3 className="owner-card-title">Можно ли доверять будущему результату</h3>
                <p className="owner-card-copy">
                  Состояние влияющих изменений: <strong>{statusLabel(row.contamination_state)}</strong>.
                  {row.invalidating_contamination_count ? ` Есть ${row.invalidating_contamination_count} изменений, которые могут полностью отменить допустимый вывод.` : ''}
                </p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Период измерения</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>План начала</span><strong>{dateLabel(row.planned_start_at)}</strong></div>
                  <div><span>Факт начала</span><strong>{dateLabel(row.started_at)}</strong></div>
                  <div><span>План конца</span><strong>{dateLabel(row.planned_end_at)}</strong></div>
                  <div><span>Факт конца</span><strong>{dateLabel(row.ended_at)}</strong></div>
                </div>
              </section>

              <section className={`owner-card ${row.measurement_spec_id ? 'is-success' : 'is-warning'}`}>
                <div className={`owner-status ${row.measurement_spec_id ? 'is-success' : 'is-warning'}`}>
                  {row.measurement_spec_id ? 'Правила измерения зафиксированы' : 'Measurement spec не привязан'}
                </div>
                <p className="owner-card-copy">
                  {row.measurement_spec_id
                    ? 'Эксперимент связан с отдельной спецификацией измерения. Итог всё равно ограничивается качеством данных и загрязнением периода.'
                    : 'Без заранее зафиксированных правил измерения FEYA не должна объявлять изменение доказанным результатом.'}
                </p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Связанный рабочий контекст</div>
                <p className="owner-card-copy">
                  {row.case_id ? 'Эксперимент связан с Growth Case.' : 'Отдельный Growth Case для этого эксперимента в owner-проекции не указан.'}
                </p>
                <div className="owner-actions">
                  <Link href="/admin/company/results" className="owner-button">Результаты</Link>
                  <Link href="/admin/metrics" className="owner-button">Метрики</Link>
                </div>
              </section>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>Идентификаторы и contamination counts</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.experiment_id}>ID эксперимента</span>
                  {row.experiment_code ? <span title={row.experiment_code}>Код эксперимента</span> : null}
                  <span>влияющих изменений: {Number(row.contamination_count || 0)}</span>
                  <span>инвалидирующих: {Number(row.invalidating_contamination_count || 0)}</span>
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
