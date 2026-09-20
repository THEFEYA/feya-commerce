'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { GrowthInitiativeRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { OwnerStrategicActionClient } from '@/components/admin/OwnerStrategicActionClient';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function actionLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    OBSERVE: 'Наблюдение',
    ANALYZE: 'Анализ',
    PROPOSE: 'Подготовить предложение',
    CONTENT: 'Контент',
    SEO: 'SEO',
    EXPERIMENT: 'Эксперимент',
    PRODUCTION_WRITE: 'Изменение рабочих данных',
  };
  return labels[key] || (key ? 'Рабочее действие' : '—');
}

function dateLabel(value: unknown) {
  if (!value) return 'не задано';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium'}).format(d);
}

function tone(value: unknown) {
  const key = asText(value,'').toUpperCase();
  if (key === 'BLOCKED' || key === 'REJECTED' || key === 'CANCELLED') return 'is-danger';
  if (key === 'ACTIVE' || key === 'APPROVED' || key === 'COMPLETED') return 'is-success';
  if (key === 'PENDING' || key === 'REQUIRED') return 'is-warning';
  return 'is-info';
}

export function OwnerInitiativeDrawerClient({
  row,
  actionEnabled = false,
  actionBlockers = [],
  showOwnerAction = false,
}: {
  row: GrowthInitiativeRow;
  actionEnabled?: boolean;
  actionBlockers?: string[];
  showOwnerAction?: boolean;
}) {
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const closeRef=useRef<HTMLButtonElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useOwnerDrawerA11y({open,dialogRef,triggerRef,initialFocusRef:closeRef,close});

  const ownerPending = String(row.human_approval_status || '').toUpperCase()==='PENDING';
  const directorPending = String(row.director_gate_status || '').toUpperCase()==='PENDING';
  const revalidation = String(row.strategy_revalidation_status || '').toUpperCase()==='REQUIRED';

  return <>
    <button ref={triggerRef} type="button" className="owner-button" onClick={()=>setOpen(true)}>Подробнее</button>
    {open?<div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть инициативу" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`initiative-drawer-${row.initiative_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div><div className="owner-eyebrow" style={{marginBottom:'5px'}}>Инициатива роста</div><h2 id={`initiative-drawer-${row.initiative_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title,'Инициатива')}</h2></div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>

        <div className="owner-drawer-body space-y-4 p-5">
          <section className={`owner-card ${tone(row.initiative_status)}`}>
            <div className="owner-card-meta">
              <span className={`owner-status ${tone(row.initiative_status)}`}>{statusLabel(row.initiative_status)}</span>
              <span>{roleLabel(row.owner_role)}</span>
              <span>{actionLabel(row.action_class)}</span>
            </div>
            <h3 className="owner-card-title">Что сейчас удерживает инициативу</h3>
            <p className="owner-card-copy">
              {ownerPending
                ? 'Нужно решение владельца. FEYA не должна продолжать за этой границей полномочий.'
                : directorPending
                  ? 'Нужна проверка директора по росту перед дальнейшим движением.'
                  : revalidation
                    ? 'После изменения стратегии инициативу нужно проверить повторно.'
                    : String(row.initiative_status||'').toUpperCase()==='BLOCKED'
                      ? 'Инициатива находится в блокированном состоянии.'
                      : 'Отдельная owner/director блокировка сейчас не заявлена.'}
            </p>
          </section>

          <section className="owner-card">
            <div className="owner-section-kicker">Проверки и полномочия</div>
            <div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Директор по росту</span><strong>{statusLabel(row.director_gate_status)}</strong></div>
              <div><span>Владелец</span><strong>{statusLabel(row.human_approval_status)}</strong></div>
              <div><span>Стратегия</span><strong>{statusLabel(row.strategy_revalidation_status)}</strong></div>
              <div><span>Materiality</span><strong>{row.materiality_score ?? '—'}</strong></div>
            </div>
          </section>

          <section className="owner-card">
            <div className="owner-section-kicker">Стратегический контекст</div>
            <p className="owner-card-copy">Стратегия: {asText(row.strategy_code,'—')} · версия {row.strategy_version_no ?? '—'}.</p>
            <div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Срок</span><strong>{dateLabel(row.due_at)}</strong></div>
              <div><span>Истекает</span><strong>{dateLabel(row.expires_at)}</strong></div>
              <div><span>Одобрено владельцем</span><strong>{dateLabel(row.human_approved_at)}</strong></div>
              <div><span>Завершено</span><strong>{dateLabel(row.completed_at)}</strong></div>
            </div>
          </section>

          {showOwnerAction && ownerPending ? (
            <OwnerStrategicActionClient
              actionCode="HUMAN_APPROVE_INITIATIVE"
              entityId={row.initiative_id}
              expectedState={String(row.human_approval_status || 'PENDING')}
              title={asText(row.title, 'Инициатива роста')}
              enabled={actionEnabled}
              blockers={actionBlockers}
            />
          ) : null}

          <div className="owner-actions">
            {ownerPending ? <Link href="/admin/company/owner-attention" className="owner-button">Решения владельца</Link>:null}
            <Link href="/admin/company/work" className="owner-button">Работа</Link>
            <Link href="/admin/opportunities" className="owner-button">Возможности</Link>
          </div>

          <details className="owner-disclosure owner-disclosure-section">
            <summary><span><strong>Технические детали</strong><small>Связи с case, objective и strategy version</small></span><span className="owner-section-kicker">Advanced</span></summary>
            <div className="owner-disclosure-body owner-card-meta" style={{marginBottom:0}}>
              <span title={row.initiative_id}>Initiative ID</span>
              {row.initiative_code ? <span title={row.initiative_code}>Initiative code</span>:null}
              {row.case_id ? <span title={row.case_id}>Growth Case</span>:null}
              {row.objective_id ? <span title={row.objective_id}>Objective</span>:null}
              {row.strategy_version_id ? <span title={row.strategy_version_id}>Strategy version ID</span>:null}
            </div>
          </details>
        </div>
      </aside>
    </div>:null}
  </>;
}
