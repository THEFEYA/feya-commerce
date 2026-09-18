import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthActionCapabilityRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getActions(): Promise<{ rows: GrowthActionCapabilityRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_action_capability_safe_v1')
    .select('*')
    .order('action_state', { ascending: true })
    .order('action_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as GrowthActionCapabilityRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE') return 'danger';
  return 'warning';
}

export default async function AdminExecutionMapPage() {
  const { rows, error } = await getActions();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/metrics">Metrics</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
            <Link href="/admin/executions">Executions</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Execution Capability Map · read-only</div>
          <h1>Execution Map</h1>
          <p>
            Every action declares who executes it, whether approval is required and whether it can mutate production. An unavailable action is not simulated by AI.
          </p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Owner</th>
                <th>State</th>
                <th>Class</th>
                <th>Executor</th>
                <th>Approval</th>
                <th>Mutation</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.action_code}>
                  <td>
                    <strong>{asText(row.action_name, row.action_code)}</strong>
                    <div className="muted">{row.action_code}</div>
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${stateClass(row.action_state)}`}>
                      {asText(row.action_state)}
                    </span>
                    <div className="muted">{asText(row.implementation_state)}</div>
                  </td>
                  <td>{asText(row.action_class)}</td>
                  <td>{asText(row.executor_type)}</td>
                  <td>{asText(row.approval_class)}</td>
                  <td>
                    {row.production_mutation === true ? (
                      <span className="status-pill danger">Production</span>
                    ) : row.production_mutation === false ? (
                      <span className="badge">No production write</span>
                    ) : '—'}
                    {row.dry_run_default ? <div className="badge-row"><span className="badge">dry-run default</span></div> : null}
                  </td>
                  <td>{asText(row.limitations_summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
