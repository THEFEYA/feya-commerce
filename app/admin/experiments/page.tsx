import Link from 'next/link';
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

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/experiments">Эксперименты</Link>
            <Link href="/admin/metrics">Метрики</Link>
            <Link href="/admin/incidents">Инциденты</Link>
            <Link href="/admin/executions">Выполнение</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Эксперименты и влияющие изменения · только просмотр</div>
          <h1>Эксперименты</h1>
          <p>
            Эксперимент запускается только при зафиксированных правилах измерения и подтверждённой реализуемости. Параллельные изменения и инциденты могут испортить атрибуцию результата.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{running}</strong><span>Экспериментов в работе</span></div>
          <div className="owner-summary-cell"><strong>{outcomeReady}</strong><span>Результат готов к оценке</span></div>
          <div className="owner-summary-cell"><strong>{contaminated}</strong><span>Есть влияющие параллельные изменения</span></div>
          <div className="owner-summary-cell"><strong>{invalidated}</strong><span>Результат нельзя использовать</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="section-head">
          <div>
            <h2>Реестр экспериментов</h2>
            <p className="muted">Система измерения результата ещё недоступна; здесь пока контролируются только дизайн эксперимента, состояние и внешние вмешательства.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Эксперимент</th>
                <th>Режим</th>
                <th>Статус</th>
                <th>Реализуемость</th>
                <th>Влияющие изменения</th>
                <th>Период</th>
              </tr>
            </thead>
            <tbody>
              {experiments.length ? experiments.map((row) => (
                <tr key={row.experiment_id}>
                  <td>
                    <strong title={asText(row.experiment_code)}>{asText(row.title, row.experiment_code || '—')}</strong>
                  </td>
                  <td title={asText(row.experiment_mode)}>{modeLabel(row.experiment_mode)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.experiment_status)}`}>
                      {statusLabel(row.experiment_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.feasibility_status)}`}>
                      {statusLabel(row.feasibility_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.contamination_state)}`}>
                      {statusLabel(row.contamination_state)}
                    </span>
                    <div className="muted">{row.contamination_count || 0} записей · {row.invalidating_contamination_count || 0} критичных</div>
                  </td>
                  <td>
                    {dateLabel(row.started_at || row.planned_start_at)}
                    <div className="muted">→ {dateLabel(row.ended_at || row.planned_end_at)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>Реальных экспериментов пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Последние изменения</h2>
            <p className="muted">Успешные изменения через шлюз выполнения автоматически фиксируются здесь.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Событие</th>
                <th>Область</th>
                <th>Объект</th>
                <th>Источник</th>
                <th>Выполнение / инцидент</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {changes.length ? changes.map((row) => (
                <tr key={row.change_event_id}>
                  <td>
                    <strong title={asText(row.event_code)}>{asText(row.change_type, row.event_code || '—')}</strong>
                  </td>
                  <td>{asText(row.change_domain)}</td>
                  <td>
                    {asText(row.entity_type)}
                    <div className="muted">{asText(row.entity_key)}</div>
                  </td>
                  <td>
                    {asText(row.source_type)}
                    <div className="muted">{asText(row.source_ref)}</div>
                  </td>
                  <td>
                    {row.execution_request_id ? <div className="muted" title={asText(row.execution_request_id)}>есть запись выполнения</div> : null}
                    {row.incident_id ? <div className="muted" title={asText(row.incident_id)}>связан с инцидентом</div> : null}
                    {!row.execution_request_id && !row.incident_id ? '—' : null}
                  </td>
                  <td>{dateLabel(row.event_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}>Зафиксированных изменений пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
