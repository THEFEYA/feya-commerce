'use client';

import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { GrowthObjectiveEventRow, GrowthObjectiveRow } from '@/lib/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';
import { OwnerStrategicActionClient } from '@/components/admin/OwnerStrategicActionClient';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function dateTimeLabel(value: unknown) {
  if (!value) return 'не зафиксировано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function typeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string,string> = {
    SEARCH_GROWTH: 'Рост органического поиска',
    COMMERCE_GROWTH: 'Коммерческий рост',
    PRODUCT: 'Товарная цель',
    CONTENT: 'Контентная цель',
    MEASUREMENT: 'Измерительная цель',
    TECHNICAL: 'Техническая цель',
    DATA: 'Данные и наблюдаемость',
  };
  return labels[key] || (key ? 'Цель роста' : 'Цель роста');
}

function tone(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (['ACTIVE','COMPLETED'].includes(key)) return 'is-success';
  if (['BLOCKED','CANCELLED','REJECTED','INFEASIBLE'].includes(key)) return 'is-danger';
  if (['DRAFT','PROPOSED','PENDING','PARTIAL'].includes(key)) return 'is-warning';
  return 'is-info';
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function eventLabel(value: unknown) {
  const key=asText(value,'').toUpperCase();
  const labels:Record<string,string>={
    CREATED:'Создана',
    FEASIBILITY_SET:'Оценена реализуемость',
    ACTIVATED:'Активирована владельцем',
    STATUS_CHANGED:'Изменён статус',
    COMPLETED:'Завершена',
    CANCELLED:'Отменена',
  };
  return labels[key] || statusLabel(value);
}

export function OwnerObjectiveDrawerClient({
  row,
  events = [],
  actionEnabled = false,
  actionBlockers = [],
  showOwnerAction = false,
}: {
  row: GrowthObjectiveRow;
  events?: GrowthObjectiveEventRow[];
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
  const objectiveStatus = String(row.objective_status || '').toUpperCase();
  const feasibility = String(row.feasibility_status || '').toUpperCase();
  const activationEligible =
    ['DRAFT', 'FEASIBILITY_REVIEW', 'PAUSED'].includes(objectiveStatus) &&
    ['FEASIBLE', 'PARTIAL'].includes(feasibility);

  return <>
    <button ref={triggerRef} type="button" className="owner-button" onClick={()=>setOpen(true)}>Подробнее</button>
    {open ? <div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" aria-label="Закрыть цель роста" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]" onClick={close}/>
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`objective-drawer-${row.objective_id}`} className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto">
        <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="owner-eyebrow" style={{marginBottom:'5px'}}>Цель роста</div>
            <h2 id={`objective-drawer-${row.objective_id}`} className="m-0 text-[20px] leading-snug">{asText(row.title,'Цель роста')}</h2>
          </div>
          <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={close}><X size={15}/></button>
        </div>

        <div className="owner-drawer-body space-y-4 p-5">
          <section className={`owner-card ${tone(row.objective_status)}`}>
            <div className="owner-card-meta">
              <span className={`owner-status ${tone(row.objective_status)}`}>{statusLabel(row.objective_status)}</span>
              <span>{typeLabel(row.objective_type)}</span>
              <span>{roleLabel(row.owner_role)}</span>
            </div>
            <h3 className="owner-card-title">Что измеряет цель</h3>
            <p className="owner-card-copy">Основная метрика: <strong>{asText(row.primary_metric_code,'не назначена')}</strong>.</p>
            <p className="owner-card-copy">Guardrail-метрик: {arrayCount(row.guardrail_metric_codes_json)}.</p>
          </section>

          <section className={`owner-card ${tone(row.feasibility_status)}`}>
            <div className={`owner-status ${tone(row.feasibility_status)}`}>Реализуемость: {statusLabel(row.feasibility_status)}</div>
            <p className="owner-card-copy">
              Активная цель может быть включена только после достаточной оценки реализуемости и человеческой активации.
              {row.activation_reason ? ` Причина активации: ${row.activation_reason}` : ''}
            </p>
          </section>

          <section className="owner-card">
            <div className="owner-section-kicker">Стратегический контекст</div>
            <div className="owner-role-roster" style={{marginTop:'10px'}}>
              <div><span>Стратегия</span><strong>{asText(row.strategy_version_ref,'не связана')}</strong></div>
              <div><span>Активирована</span><strong>{dateTimeLabel(row.activated_at)}</strong></div>
              <div><span>Завершена</span><strong>{dateTimeLabel(row.completed_at)}</strong></div>
              <div><span>Создана</span><strong>{dateTimeLabel(row.created_at)}</strong></div>
            </div>
          </section>

          {showOwnerAction && activationEligible ? (
            <OwnerStrategicActionClient
              actionCode="ACTIVATE_GROWTH_OBJECTIVE"
              entityId={row.objective_id}
              expectedState={objectiveStatus}
              title={asText(row.title, 'Цель роста')}
              enabled={actionEnabled}
              blockers={actionBlockers}
            />
          ) : null}

          {showOwnerAction && ['DRAFT', 'FEASIBILITY_REVIEW', 'PAUSED'].includes(objectiveStatus) && !activationEligible ? (
            <section className="owner-card is-warning">
              <div className="owner-status is-warning">Активация пока недопустима</div>
              <p className="owner-card-copy">Сначала реализуемость цели должна быть FEASIBLE или PARTIAL. Текущее состояние: {statusLabel(row.feasibility_status)}.</p>
            </section>
          ) : null}

          <section className="owner-card">
            <div className="owner-section-kicker">История цели</div>
            {events.length ? <div className="owner-timeline" style={{marginTop:'10px'}}>
              {events.map((event)=>(
                <div className="owner-timeline-row" key={event.objective_event_id}>
                  <span className="owner-timeline-dot" aria-hidden="true"/>
                  <div>
                    <strong>{eventLabel(event.event_type)}</strong>
                    <p>{event.reason || [event.from_status,event.to_status].filter(Boolean).join(' → ') || 'Событие зафиксировано.'}</p>
                    <small>{dateTimeLabel(event.created_at)}</small>
                  </div>
                </div>
              ))}
            </div> : <p className="owner-card-copy">Отдельных событий цели пока нет. FEYA не генерирует историю искусственно.</p>}
          </section>

          <details className="owner-disclosure owner-disclosure-section">
            <summary><span><strong>Технические детали</strong><small>Scope, timeframe, constraints и feasibility evidence</small></span><span className="owner-section-kicker">Advanced</span></summary>
            <div className="owner-disclosure-body owner-card-meta" style={{marginBottom:0}}>
              <span title={row.objective_id}>Objective ID</span>
              {row.objective_code ? <span title={row.objective_code}>Objective code</span>:null}
              {row.scope_json ? <span title={JSON.stringify(row.scope_json)}>Scope сохранён</span>:null}
              {row.timeframe_json ? <span title={JSON.stringify(row.timeframe_json)}>Timeframe сохранён</span>:null}
              {row.constraints_json ? <span title={JSON.stringify(row.constraints_json)}>Constraints сохранены</span>:null}
              {row.feasibility_json ? <span title={JSON.stringify(row.feasibility_json)}>Feasibility evidence сохранено</span>:null}
            </div>
          </details>
        </div>
      </aside>
    </div>:null}
  </>;
}
