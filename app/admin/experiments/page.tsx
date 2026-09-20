import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ChangeEventRow, ExperimentRegistryRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  experiments: ExperimentRegistryRow[];
  changes: ChangeEventRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { experiments: [], changes: [], error: getMissingAdminDataEnvMessage() };

  const [experimentResult, changeResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_experiment_registry_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('feya_commerce_v_change_events_safe_v1')
      .select('*')
      .order('event_at', { ascending: false })
      .limit(200),
  ]);

  if (experimentResult.error) return { experiments: [], changes: [], error: experimentResult.error.message };
  if (changeResult.error) return { experiments: [], changes: [], error: changeResult.error.message };

  return {
    experiments: (experimentResult.data || []) as ExperimentRegistryRow[],
    changes: (changeResult.data || []) as ChangeEventRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
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
  return labels[key] || (key ? 'Настраиваемый дизайн' : '—');
}

function dateLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'OUTCOME_READY' || status === 'CLOSED' || status === 'FEASIBLE' || status === 'CLEAN') return 'ok';
  if (status === 'INVALIDATED' || status === 'NOT_FEASIBLE' || status === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminExperimentsPage() {
  const { experiments, changes, error } = await getData();

  const running = experiments.filter((row) => row.experiment_status === 'RUNNING').length;
  const contaminated = experiments.filter((row) => row.contamination_state === 'CONTAMINATED').length;
  const invalidated = experiments.filter((row) => row.contamination_state === 'INVALIDATED').length;
  const outcomeReady = experiments.filter((row) => row.experiment_status === 'OUTCOME_READY').length;

  const activeRows = experiments.filter((row) => !['CLOSED', 'CANCELLED'].includes(String(row.experiment_status || '')));
  const outcomeRows = experiments.filter((row) => row.experiment_status === 'OUTCOME_READY');
  const riskyRows = experiments.filter((row) => ['CONTAMINATED', 'INVALIDATED'].includes(String(row.contamination_state || '')));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Результаты · эксперименты</div>
            <h1>Эксперименты</h1>
            <p>Эксперимент считается полезным только при заранее зафиксированном измерении и чистом контексте. Параллельные изменения или инциденты могут ограничить допустимый вывод.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/results" className="owner-button">Назад к результатам</Link>
            <Link href="/admin/metrics" className="owner-button">Метрики</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{running}</strong><span>В работе</span></div>
          <div className="owner-summary-cell"><strong>{outcomeReady}</strong><span>Результат готов к оценке</span></div>
          <div className="owner-summary-cell"><strong>{contaminated}</strong><span>Есть влияющие изменения</span></div>
          <div className="owner-summary-cell"><strong>{invalidated}</strong><span>Результат нельзя использовать</span></div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что происходит сейчас</h2>
              <div className="owner-section-kicker">Только активные эксперименты и ситуации, которые влияют на достоверность результата</div>
            </div>
          </div>

          {activeRows.length ? (
            <div className="owner-list">
              {activeRows.map((row) => (
                <article className="owner-list-row" key={row.experiment_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${row.contamination_state === 'INVALIDATED' ? 'is-danger' : row.contamination_state === 'CONTAMINATED' ? 'is-warning' : 'is-info'}`}>
                        {statusLabel(row.experiment_status)}
                      </span>
                      <span>{modeLabel(row.experiment_mode)}</span>
                      <span>{statusLabel(row.feasibility_status)}</span>
                    </div>
                    <h3>{asText(row.title, 'Эксперимент')}</h3>
                    <p>
                      Период: {dateLabel(row.started_at || row.planned_start_at)} → {dateLabel(row.ended_at || row.planned_end_at)}.
                      {row.contamination_count ? ` Влияющих изменений: ${row.contamination_count}.` : ''}
                    </p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{statusLabel(row.contamination_state)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Активных экспериментов пока нет. Это нормальное состояние до появления измеримых инициатив.</div>
          )}
        </section>

        {outcomeRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head"><div><h2>Готово к оценке результата</h2></div></div>
            <div className="owner-grid two">
              {outcomeRows.map((row) => (
                <article className="owner-card is-success" key={row.experiment_id}>
                  <div className="owner-card-meta"><span className="owner-status is-success">Результат готов</span><span>{modeLabel(row.experiment_mode)}</span></div>
                  <h3 className="owner-card-title">{asText(row.title, 'Эксперимент')}</h3>
                  <p className="owner-card-copy">Доказательность всё равно ограничивается состоянием измерения и наличием влияющих изменений.</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {riskyRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head"><div><h2>Риски интерпретации</h2><div className="owner-section-kicker">Эти эксперименты нельзя интерпретировать как чистый эффект без дополнительной проверки</div></div></div>
            <div className="owner-grid two">
              {riskyRows.map((row) => (
                <article className={`owner-card ${row.contamination_state === 'INVALIDATED' ? 'is-danger' : 'is-warning'}`} key={row.experiment_id}>
                  <div className={`owner-status ${row.contamination_state === 'INVALIDATED' ? 'is-danger' : 'is-warning'}`}>{statusLabel(row.contamination_state)}</div>
                  <h3 className="owner-card-title" style={{ marginTop: '10px' }}>{asText(row.title, 'Эксперимент')}</h3>
                  <p className="owner-card-copy">{row.contamination_count || 0} влияющих изменений · {row.invalidating_contamination_count || 0} критичных.</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>История изменений и технический реестр</strong><small>Все эксперименты и change events для диагностики</small></span>
              <span className="owner-section-kicker">{experiments.length + changes.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap" style={{ marginBottom: '18px' }}>
                <table>
                  <thead><tr><th>Эксперимент</th><th>Режим</th><th>Статус</th><th>Реализуемость</th><th>Влияющие изменения</th><th>Период</th></tr></thead>
                  <tbody>
                    {experiments.length ? experiments.map((row) => (
                      <tr key={row.experiment_id}>
                        <td><strong>{asText(row.title, row.experiment_code || '—')}</strong></td>
                        <td>{modeLabel(row.experiment_mode)}</td>
                        <td>{statusLabel(row.experiment_status)}</td>
                        <td>{statusLabel(row.feasibility_status)}</td>
                        <td>{statusLabel(row.contamination_state)} · {row.contamination_count || 0}</td>
                        <td>{dateLabel(row.started_at || row.planned_start_at)} → {dateLabel(row.ended_at || row.planned_end_at)}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>Экспериментов пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Изменение</th><th>Область</th><th>Объект</th><th>Источник</th><th>Время</th></tr></thead>
                  <tbody>
                    {changes.length ? changes.map((row) => (
                      <tr key={row.change_event_id}>
                        <td><strong>{asText(row.change_type, row.event_code || '—')}</strong></td>
                        <td>{asText(row.change_domain)}</td>
                        <td>{asText(row.entity_type)}</td>
                        <td>{asText(row.source_type)}</td>
                        <td>{dateLabel(row.event_at)}</td>
                      </tr>
                    )) : <tr><td colSpan={5}>Зафиксированных изменений пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
