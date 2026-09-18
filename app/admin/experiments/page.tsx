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

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{experiments.length}</strong><span>Экспериментов</span></div>
          <div className="card metric"><strong>{running}</strong><span>В работе</span></div>
          <div className="card metric"><strong>{contaminated}</strong><span>Есть влияющие изменения</span></div>
          <div className="card metric"><strong>{invalidated}</strong><span>Результат непригоден</span></div>
          <div className="card metric"><strong>{outcomeReady}</strong><span>Готов результат</span></div>
          <div className="card metric"><strong>{changes.length}</strong><span>Последних изменений</span></div>
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
                    <strong>{asText(row.title, row.experiment_code || '—')}</strong>
                    <div className="muted">{asText(row.experiment_code)}</div>
                  </td>
                  <td>{asText(row.experiment_mode)}</td>
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
                    {asText(row.started_at, asText(row.planned_start_at))}
                    <div className="muted">→ {asText(row.ended_at, asText(row.planned_end_at))}</div>
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
                    <strong>{asText(row.change_type, row.event_code || '—')}</strong>
                    <div className="muted">{asText(row.event_code)}</div>
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
                    {row.execution_request_id ? <div className="muted">execution {row.execution_request_id}</div> : null}
                    {row.incident_id ? <div className="muted">incident {row.incident_id}</div> : null}
                    {!row.execution_request_id && !row.incident_id ? '—' : null}
                  </td>
                  <td>{asText(row.event_at)}</td>
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
