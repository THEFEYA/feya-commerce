import Link from 'next/link';
import type { OwnerWorkItemVM } from '@/lib/owner-ui/types';

function toneClass(tone: OwnerWorkItemVM['tone']) {
  return tone === 'danger'
    ? 'is-danger'
    : tone === 'warning'
      ? 'is-warning'
      : tone === 'success'
        ? 'is-success'
        : tone === 'info'
          ? 'is-info'
          : '';
}

function dateTimeLabel(value?: string | null) {
  if (!value) return 'Время не указано';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Время не указано';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function lifecyclePhase(status: string) {
  if (status === 'QUEUED' || status === 'NEW' || status === 'ASSIGNED') return 0;
  if (status === 'RUNNING') return 1;
  if (status.startsWith('WAITING') || status === 'BLOCKED') return 2;
  if (status === 'COMPLETED') return 3;
  if (status === 'MEASURING' || status === 'LEARNING') return 4;
  if (status === 'CLOSED') return 5;
  return 0;
}

const LIFECYCLE_STAGES = [
  'В очереди',
  'В работе',
  'Ожидание',
  'Работа завершена',
  'Измерение',
  'Закрыто',
];

export function OwnerWorkDetailContent({ item, compact = false }: { item: OwnerWorkItemVM; compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <section className={`owner-card ${toneClass(item.tone)}`}>
        <div className="owner-card-meta">
          <span className={`owner-status ${toneClass(item.tone)}`}>{item.statusLabel}</span>
          <span>{item.priorityLabel}</span>
          <span>{item.ownerLabel}</span>
        </div>
        <h2 className="owner-card-title">Зачем появилась работа</h2>
        <p className="owner-card-copy">{item.purpose}</p>
      </section>

      <section className="owner-card owner-work-state-card">
        <div className="owner-section-kicker">Текущее состояние</div>
        <div className="owner-work-state-head">
          <h3 className="owner-card-title">{item.statusLabel}</h3>
          <span>{dateTimeLabel(item.updatedAt)}</span>
        </div>
        <p className="owner-card-copy">Ответственная роль: {item.ownerLabel}.</p>
        <div className="owner-work-stage-track" aria-label={`Текущий этап: ${item.statusLabel}`}>
          {LIFECYCLE_STAGES.map((label, index) => {
            const current = lifecyclePhase(item.status);
            const complete = index < current;
            const active = index === current;
            return (
              <div className={`owner-work-stage${complete ? ' is-complete' : ''}${active ? ' is-active' : ''}`} key={label}>
                <span className="owner-work-stage-dot" aria-hidden="true" />
                <small>{label}</small>
              </div>
            );
          })}
        </div>
        <p className="owner-work-stage-note">Этапы показывают фактическое состояние workflow. Это не процент готовности и не оценка времени.</p>
      </section>

      <section className="owner-card">
        <div className="owner-section-kicker">Что делается сейчас</div>
        {item.currentStep ? <div className="owner-work-current-step">{item.currentStep}</div> : null}
        <p className="owner-card-copy">
          {item.status === 'RUNNING'
            ? 'Работа выполняется в текущем ответственном направлении.'
            : item.status.startsWith('WAITING')
              ? 'Активное выполнение приостановлено до выполнения условия ожидания.'
              : item.status === 'BLOCKED'
                ? 'Продолжение остановлено блокирующим условием.'
                : 'Текущий этап зафиксирован в рабочем процессе.'}
        </p>
      </section>

      <section className={`owner-card ${item.blockedReason ? 'is-warning' : item.waitReason ? 'is-info' : ''}`}>
        <div className="owner-section-kicker">Что ждёт или блокирует</div>
        <p className="owner-card-copy">
          {item.blockedReason
            ? item.blockedReason
            : item.waitReason
              ? item.waitReason
              : 'Отдельная причина ожидания или блокировки сейчас не зафиксирована.'}
        </p>
      </section>

      <section className="owner-card">
        <div className="owner-section-kicker">Ожидаемый результат</div>
        <p className="owner-card-copy">
          Отдельное формализованное поле результата пока не входит в owner-проекцию этой рабочей ситуации. FEYA не подставляет выдуманную цель вместо отсутствующих данных.
        </p>
      </section>

      <details className="owner-disclosure owner-disclosure-section">
        <summary>
          <span><strong>Workflow, доказательства и измерение</strong><small>Раскрывать только когда нужен контекст процесса</small></span>
          <span className="owner-section-kicker">детали</span>
        </summary>
        <div className="owner-disclosure-body space-y-3">
          <div>
            <div className="owner-section-kicker">Передачи между ролями</div>
            <p className="owner-card-copy">В текущую owner-проекцию ещё не включена отдельная timeline-проекция handoff-событий.</p>
          </div>
          <div>
            <div className="owner-section-kicker">Доказательства</div>
            <p className="owner-card-copy">Отдельный evidence summary для этой ситуации пока не подключён.</p>
          </div>
          <div>
            <div className="owner-section-kicker">Изменения и измерение</div>
            <p className="owner-card-copy">Показываются только после появления фактического change/measurement контекста; отсутствие данных не заменяется предположением.</p>
          </div>
        </div>
      </details>

      <details className="owner-disclosure owner-disclosure-section">
        <summary>
          <span><strong>Технические детали</strong><small>Коды нужны только для диагностики</small></span>
          <span className="owner-section-kicker">Advanced</span>
        </summary>
        <div className="owner-disclosure-body">
          <div className="owner-card-meta" style={{ marginBottom: 0 }}>
            <span title={item.id}>ID рабочей ситуации</span>
            {item.code ? <span title={item.code}>Код ситуации</span> : null}
            {item.currentStep ? <span title={item.currentStep}>Код текущего этапа</span> : null}
          </div>
        </div>
      </details>

      {!compact ? (
        <div className="owner-actions">
          <Link href="/admin/company/work" className="owner-button">Назад к работе</Link>
          <Link href="/admin/company/advanced" className="owner-button">Технические детали</Link>
        </div>
      ) : null}
    </div>
  );
}
