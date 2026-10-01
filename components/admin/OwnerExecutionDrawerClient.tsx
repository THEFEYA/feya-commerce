'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ExecutionGatewayRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { statusLabel } from '@/lib/owner-ui/terminology';
import { OwnerExecutionApprovalClient } from '@/components/admin/OwnerExecutionApprovalClient';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function actionLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    ENABLE_SEARCH_INDEXING: 'Включить поисковую индексацию',
    PUBLISH_CONTENT: 'Опубликовать контент',
    CHANGE_PRICE: 'Изменить публичную цену',
    UPDATE_CANONICAL: 'Изменить canonical',
    UPDATE_CONTENT_DRAFT: 'Обновить SEO-черновик',
    HARDEN_ADMIN_DATA_BOUNDARY: 'Закрыть внутренние данные админки',
    APPLY_INDEXABILITY_PROPOSAL: 'Применить решение по индексации',
    APPLY_QUERY_CLUSTER_PROPOSAL: 'Применить группу запросов',
    APPLY_PAGE_OWNERSHIP_PROPOSAL: 'Назначить страницу запросам',
  };
  return labels[key] || 'Контролируемое системное действие';
}

function approvalLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key.includes('HUMAN_OWNER')) return 'Нужно решение владельца';
  if (key.includes('HUMAN')) return 'Нужно одобрение человека';
  if (key.includes('POLICY')) return 'Зависит от правила и риска';
  if (!key || key === 'NONE') return 'Отдельное одобрение не требуется';
  return 'Контролируемое одобрение';
}

function dateTimeLabel(value: unknown) {
  if (!value) return 'не зафиксировано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function toneClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'SUCCEEDED') return 'is-success';
  if (status === 'FAILED' || status === 'STALE' || status === 'CANCELLED') return 'is-danger';
  if (status === 'EXECUTING' || status === 'RUNNING') return 'is-info';
  return 'is-warning';
}

export function OwnerExecutionDrawerClient({
  row,
  actionEnabled = false,
  actionBlockers = [],
}: {
  row: ExecutionGatewayRow;
  actionEnabled?: boolean;
  actionBlockers?: string[];
}) {
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
          <button type="button" aria-label="Закрыть выполнение" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`execution-drawer-${row.execution_request_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Контролируемое выполнение</div>
                <h2 id={`execution-drawer-${row.execution_request_id}`} className="m-0 text-[20px] leading-snug">{actionLabel(row.action_code)}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={closeDrawer}><X size={15} /></button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${toneClass(row.request_status)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(row.request_status)}`}>{statusLabel(row.request_status)}</span>
                  <span>{approvalLabel(row.approval_class)}</span>
                </div>
                <h3 className="owner-card-title">Что запросили</h3>
                <p className="owner-card-copy">{actionLabel(row.action_code)}.</p>
                <p className="owner-card-copy"><strong>Область изменения:</strong> {asText(row.mutation_domain, 'не указана')}.</p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Одобрение и исполнение</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Одобрение</span><strong>{row.has_approval_user ? 'зафиксировано' : 'не зафиксировано'}</strong></div>
                  <div><span>Одобрено</span><strong>{dateTimeLabel(row.approved_at)}</strong></div>
                  <div><span>Исполнитель</span><strong>{asText(row.executor_type, 'не назначен')}</strong></div>
                  <div><span>Создано</span><strong>{dateTimeLabel(row.created_at)}</strong></div>
                </div>
              </section>

              {String(row.request_status || '').toUpperCase() === 'APPROVAL_REQUIRED' ? (
                <OwnerExecutionApprovalClient
                  executionRequestId={row.execution_request_id}
                  title={actionLabel(row.action_code)}
                  enabled={actionEnabled}
                  blockers={actionBlockers}
                />
              ) : null}

              <section className={`owner-card ${row.latest_receipt_id ? toneClass(row.latest_receipt_status) : 'is-info'}`}>
                <div className={`owner-status ${row.latest_receipt_id ? toneClass(row.latest_receipt_status) : 'is-info'}`}>
                  {row.latest_receipt_id ? statusLabel(row.latest_receipt_status) : 'Квитанции выполнения пока нет'}
                </div>
                <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Фактическое выполнение</h3>
                <p className="owner-card-copy">
                  {row.latest_receipt_id
                    ? `Зафиксирована попытка ${row.latest_attempt_no ?? '—'}. Начало: ${dateTimeLabel(row.latest_started_at)}. Завершение: ${dateTimeLabel(row.latest_completed_at)}.`
                    : 'Одобрение или создание запроса не считаются выполнением. FEYA ждёт отдельную execution receipt.'}
                </p>
                {row.latest_error_message ? <p className="owner-card-copy"><strong>Ошибка:</strong> {row.latest_error_message}</p> : null}
              </section>

              <div className="owner-actions">
                <Link href="/admin/execution-map" className="owner-button">Права действия</Link>
                <Link href="/admin/incidents" className="owner-button">Инциденты</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>IDs и executor references</small></span>
                  <span className="owner-section-kicker">Advanced</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span title={row.execution_request_id}>Execution request ID</span>
                  {row.request_code ? <span title={row.request_code}>Код запроса</span> : null}
                  {row.action_code ? <span title={row.action_code}>Код действия</span> : null}
                  {row.latest_receipt_id ? <span title={row.latest_receipt_id}>Receipt ID</span> : null}
                  {row.latest_executor_id ? <span title={row.latest_executor_id}>Executor ID</span> : null}
                  {row.latest_error_code ? <span title={row.latest_error_code}>Error code</span> : null}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
