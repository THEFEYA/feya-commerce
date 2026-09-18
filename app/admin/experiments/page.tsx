import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ChangeEventRow, ExperimentRegistryRow } from '@/lib/types';

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
            <Link href="/admin/experiments">Experiments</Link>
            <Link href="/admin/metrics">Metrics</Link>
            <Link href="/admin/incidents">Incidents</Link>
            <Link href="/admin/executions">Executions</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">GMEL experiment / contamination registry · read-only</div>
          <h1>Experiments</h1>
          <p>
            Experiments require locked Measurement Specs and explicit feasibility. Change events and incidents can contaminate attribution; invalidating contamination blocks OUTCOME_READY.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{experiments.length}</strong><span>Experiments</span></div>
          <div className="card metric"><strong>{running}</strong><span>Running</span></div>
          <div className="card metric"><strong>{contaminated}</strong><span>Contaminated</span></div>
          <div className="card metric"><strong>{invalidated}</strong><span>Invalidated</span></div>
          <div className="card metric"><strong>{outcomeReady}</strong><span>Outcome-ready</span></div>
          <div className="card metric"><strong>{changes.length}</strong><span>Recent change events</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="section-head">
          <div>
            <h2>Experiment registry</h2>
            <p className="muted">The Measurement Engine is still unavailable; this layer governs design/state/contamination only.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Feasibility</th>
                <th>Contamination</th>
                <th>Window</th>
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
                      {asText(row.experiment_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.feasibility_status)}`}>
                      {asText(row.feasibility_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.contamination_state)}`}>
                      {asText(row.contamination_state)}
                    </span>
                    <div className="muted">{row.contamination_count || 0} records · {row.invalidating_contamination_count || 0} invalidating</div>
                  </td>
                  <td>
                    {asText(row.started_at, asText(row.planned_start_at))}
                    <div className="muted">→ {asText(row.ended_at, asText(row.planned_end_at))}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No real experiments have been created.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Recent change events</h2>
            <p className="muted">Successful Execution Gateway mutations are bridged here automatically.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Domain</th>
                <th>Entity</th>
                <th>Source</th>
                <th>Execution / Incident</th>
                <th>Time</th>
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
                <tr><td colSpan={6}>No durable change events have been recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
