'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ActiveIncidentRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { statusLabel } from '@/lib/owner-ui/terminology';

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

function severityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'P0') return 'Критично';
  if (key === 'P1') return 'Очень важно';
  if (key === 'P2') return 'Важно';
  if (key === 'P3') return 'Наблюдать';
  return asText(value);
}

export function OwnerIncidentDrawerClient({ row }: { row: ActiveIncidentRow }) {
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
          <button type="button" aria-label="Закрыть инцидент" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`incident-drawer-${row.incident_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Инцидент</div>
                <h2 id={`incident-drawer-${row.incident_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title, 'Инцидент')}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${row.freeze_mutations ? 'is-danger' : 'is-warning'}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${row.freeze_mutations ? 'is-danger' : 'is-warning'}`}>{severityLabel(row.severity)}</span>
                  <span>{statusLabel(row.incident_status)}</span>
                </div>
                <h3 className="owner-card-title">Что произошло</h3>
                <p className="owner-card-copy">{asText(row.summary, 'Подробное описание причины пока не зафиксировано.')}</p>
              </section>

              <section className={`owner-card ${row.freeze_mutations ? 'is-danger' : 'is-success'}`}>
                <div className={`owner-status ${row.freeze_mutations ? 'is-danger' : 'is-success'}`}>
                  {row.freeze_mutations ? 'Изменяющие действия заморожены' : 'Глобальной заморозки изменений нет'}
                </div>
                <p className="owner-card-copy">
                  {row.freeze_mutations
                    ? 'FEYA должна остановить опасные изменения в затронутых областях до снятия freeze. Чтение и диагностика могут оставаться доступными.'
                    : 'Инцидент не сообщает о глобальной блокировке изменяющих действий.'}
                </p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Первопричина и время</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Первопричина</span><strong>{row.root_cause_key ? 'объединена системой' : 'не определена'}</strong></div>
                  <div><span>Обнаружен</span><strong>{dateTimeLabel(row.started_at)}</strong></div>
                  <div><span>Последнее изменение</span><strong>{dateTimeLabel(row.updated_at)}</strong></div>
                  <div><span>Обнаружил</span><strong>{asText(row.detected_by, 'не указано')}</strong></div>
                </div>
              </section>

              <div className="owner-actions">
                <Link href="/admin/company/system#permissions" className="owner-button primary">Права и безопасность</Link>
                <Link href="/admin/executions" className="owner-button">История выполнения</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Техническая область инцидента</strong><small>Raw scope только для диагностики</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body">
                  <div className="owner-card-meta" style={{ marginBottom: 0 }}>
                    <span title={row.incident_id}>ID инцидента</span>
                    {row.incident_code ? <span title={row.incident_code}>Код инцидента</span> : null}
                    {row.root_cause_key ? <span title={row.root_cause_key}>Root cause key</span> : null}
                    {row.scope_json ? <span title={JSON.stringify(row.scope_json)}>Scope сохранён</span> : null}
                    {row.freeze_domains_json ? <span title={JSON.stringify(row.freeze_domains_json)}>Freeze domains сохранены</span> : null}
                  </div>
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
