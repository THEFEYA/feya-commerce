import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';
import type { CaseRouteTruth } from '@/lib/owner-ui/growthCaseRouteTruth';
import { explainGrowthCaseAndon } from '@/lib/owner-ui/growthCaseAndon';
import {CircleCheck,Hourglass,ShieldAlert,Waypoints,Scale,ShieldCheck,ChartNoAxesCombined,Info} from 'lucide-react';
import styles from './OwnerCaseRouteVisual.module.css';

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(d)
    : 'Время не подтверждено';
}
const ownerReviewLabels: Record<CaseRouteTruth['ownerL0'],string> = {
  CONFIRMED_INTERNAL_ONLY: 'Владелец подтвердил внутренний факт L0',
  REQUEST_PENDING: 'Есть открытое обращение к владельцу',
  OTHER_RECORDED_DECISION: 'Решение записано, но L0 не подтверждён',
  UNVERIFIED_OR_ABSENT: 'Подтверждённого решения пока нет',
};
const measurementLabels: Record<CaseRouteTruth['measurement'],string> = {
  NO_PLAN: 'План измерения ещё не зафиксирован',
  DRAFT_ONLY: 'План измерения пока в черновике',
  LOCKED_NO_OUTCOME: 'План зафиксирован, результат ещё не записан',
  RECORDED_OUTCOME: 'Результат записан; качество вывода проверяется отдельно',
};
const auditLabels: Record<CaseRouteTruth['eventContinuity'],string> = {
  VERIFIED_LATEST: 'Последнее сохранённое событие соответствует состоянию кейса',
  NO_EVENT_HISTORY: 'Не удалось подтвердить историю событий кейса',
  EVENT_STATUS_MISMATCH: 'Статус кейса и последнее событие расходятся',
  EVENT_EPOCH_MISMATCH: 'Версия ответственного кейса не совпадает с историей',
};
const EVENT_LABELS: Record<CaseRouteTruth['timeline'][number]['kind'],string> = {
  CASE:'Кейс',WORKFLOW:'Тех. работа',HANDOFF:'Передача',OWNER:'Владелец',
};

/**
 * Owner-first hierarchy: the authoritative Case state, technical workflow,
 * human evidence and measurement are separate. Detail unfolds on demand.
 * This component is strictly presentational; not a transition/action button.
 */
export function OwnerCaseRouteTruth({route}:{route:CaseRouteTruth}) {
  const consistent = route.eventContinuity === 'VERIFIED_LATEST';
  const andon = explainGrowthCaseAndon(route);
  const stages = [
    {id:'case',name:'Бизнес-кейс',detail:statusLabel(route.caseStatus),
      state:route.caseStatus==='CLOSED'?'recorded':'current',icon:CircleCheck},
    {id:'workflow',name:'Техническая работа',
      detail:route.workflowStatus==='COMPLETED'?'Шаг завершён, но кейс открыт':statusLabel(route.workflowStatus),
      state:route.workflowStatus==='COMPLETED'?'recorded':route.workflowStatus==='FAILED'?'attention':'current',
      icon:Hourglass},
    {id:'owner',name:'Решение владельца',detail:ownerReviewLabels[route.ownerL0],
      state:route.ownerL0==='CONFIRMED_INTERNAL_ONLY'?'recorded':
        route.ownerL0==='REQUEST_PENDING'?'current':'unknown',icon:Scale},
    {id:'qa',name:'Независимая QA',detail:'Отдельное подтверждение отсутствует',
      state:'unknown',icon:ShieldCheck},
    {id:'execution',name:'Контролируемое действие',detail:'Execution Receipt здесь не подтверждён',
      state:'unknown',icon:ShieldAlert},
    {id:'measurement',name:'Измерение и вывод',detail:measurementLabels[route.measurement],
      state:route.measurement==='RECORDED_OUTCOME'?'recorded':
        route.measurement==='LOCKED_NO_OUTCOME'?'current':'unknown',icon:ChartNoAxesCombined},
  ] as const;
  return (
    <section className={'owner-card '+styles.routeShell} aria-label="Подтверждённый маршрут Growth Case">
      <div className="owner-card-meta">
        <span className="owner-status is-info">Реальные данные · без симуляции</span>
        <span>{roleLabel(route.caseOwner)}</span>
      </div>
      <h2 className="owner-card-title">Маршрут кейса</h2>
      <p className="owner-card-copy">
        Здесь показаны четыре независимых факта. Завершение технического workflow, передача между ролями
        или подтверждение владельца не закрывают сам кейс.
      </p>

      <div className={styles.journeyHeader}>
        <span><Waypoints size={18}/> Доказательный маршрут · только сохранённые факты</span>
        <small>Проверяется отдельно: кейс / workflow / решение / QA / исполнение / измерение</small>
      </div>
      <ol className={styles.journey} aria-label="Этапы реального Growth Case">
        {stages.map((stage,index)=>{
          const Icon=stage.icon;
          return <li key={stage.id} data-state={stage.state} className={styles.journeyStep}>
            <span className={styles.journeyNumber}>{String(index+1).padStart(2,'0')}</span>
            <span className={styles.journeyIcon}><Icon size={24} strokeWidth={1.7}/></span>
            <strong>{stage.name}</strong>
            <small>{stage.detail}</small>
            {index<stages.length-1?<span className={styles.journeyArrow} aria-hidden="true">›</span>:null}
          </li>;
        })}
      </ol>
      <div className={styles.journeyNote}>
        <Info size={17}/>
        <p>Зелёная отметка говорит только о записи конкретного этапа.
          Независимая проверка и публикация не следуют из завершения workflow или согласования владельца.</p>
      </div>

      <section className={styles.andonPanel} data-state={andon.state} aria-label="Контроль следующего шага">
        <div className={styles.andonHead}>
          <div className={styles.andonIndicator} aria-hidden="true">●</div>
          <div>
            <div className={styles.andonEyebrow}>КОНТРОЛЬ ПРОЦЕССА · TOYOTA / ANDON</div>
            <h3>{andon.title}</h3>
            <p>{andon.explanation}</p>
          </div>
        </div>
        <div className={styles.andonNext}>
          <strong>Следующий шаг</strong>
          <span>{andon.nextAction}</span>
          <small>Ответственный: {andon.actor}. Выполнение автоматически не запускается.</small>
        </div>
        <details className={styles.andonDetails}>
          <summary>Что необходимо для продолжения</summary>
          <div>
            {andon.missing.length
              ? <ul>{andon.missing.map(item=><li key={item}>{item}</li>)}</ul>
              : <p>Отсутствие требований здесь не является подтверждением готовности к публикации.</p>}
            <p>Уровень доказательств: только сохранённые события Case. Статусы и права повторно проверяются защищённым Core.</p>
          </div>
        </details>
      </section>

      <div className={'owner-grid two '+styles.truthGrid} style={{marginTop:'12px'}}>
        <div className="owner-card">
          <div className="owner-section-kicker">1 · Бизнес-кейс</div>
          <strong>{statusLabel(route.caseStatus)}</strong>
          <p className="owner-card-copy">
            {consistent ? 'Текущий статус подтверждён журналом событий.' : 'Требуется сверка журнала событий.'}
            {' '}Ответственный: {roleLabel(route.caseOwner)}.
          </p>
        </div>
        <div className="owner-card">
          <div className="owner-section-kicker">2 · Техническая работа</div>
          <strong>{statusLabel(route.workflowStatus)}</strong>
          <p className="owner-card-copy">
            {route.workflowStatus === 'COMPLETED'
              ? 'Завершена именно техническая операция. Результат бизнеса не измерен этим статусом.'
              : 'Статус взят из отдельного журнала workflow.'}
          </p>
        </div>
        <div className="owner-card">
          <div className="owner-section-kicker">3 · Решение владельца</div>
          <strong>{ownerReviewLabels[route.ownerL0]}</strong>
          <p className="owner-card-copy">Независимая экспертная QA этим решением не подтверждается.</p>
        </div>
        <div className="owner-card">
          <div className="owner-section-kicker">4 · Измерение</div>
          <strong>{measurementLabels[route.measurement]}</strong>
          <p className="owner-card-copy">Наличие результата измерения не означает автоматически подтверждённый рост продаж.</p>
        </div>
      </div>

      {route.permissibleNextStep ? (
        <p className="owner-card-copy" style={{marginTop:'12px'}}>
          <strong>Следующий допустимый этап по Core:</strong> {route.caseStatus} → {route.permissibleNextStep}.
          {' '}Это только план перехода, не выполненное действие. Команды запуска здесь нет:
          переход требует отдельного защищённого разрешения и повторной проверки состояния.
        </p>
      ) : null}

      <details className="owner-disclosure owner-disclosure-section">
        <summary>
          <span>
            <strong>История и доказательства</strong>
            <small>Реальные события, версии, причины ограничений</small>
          </span>
          <span className="owner-section-kicker">{route.timeline.length} событий</span>
        </summary>
        <div className="owner-disclosure-body">
          <p className="owner-card-copy">
            <strong>Целостность:</strong> {auditLabels[route.eventContinuity]}.
            {' '}Эпоха владения: {route.ownershipEpoch ?? 'не определена'}.
            {' '}Независимая QA: не подтверждена в доступных данных.
          </p>
          {route.timeline.length ? (
            <div className="owner-timeline" style={{marginTop:'10px'}}>
              {route.timeline.map(entry => (
                <div className={'owner-timeline-row '+styles.timelineEntry} data-kind={entry.kind} key={entry.id}>
                  <span className="owner-timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{entry.label}</strong>
                    <small>{EVENT_LABELS[entry.kind]} · {formatTime(entry.at)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="owner-card-copy">
              Подтверждённых событий для отображения нет. Система не придумывает историю.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
