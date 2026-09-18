import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { LaunchReadinessGateRow, LaunchReadinessSummaryRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getReadiness(): Promise<{
  summary: LaunchReadinessSummaryRow[];
  gates: LaunchReadinessGateRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { summary: [], gates: [], error: getMissingAdminDataEnvMessage() };

  const [summaryResult, gateResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_launch_readiness_summary_safe_v2')
      .select('*')
      .order('readiness_scope', { ascending: true }),
    supabase
      .from('feya_commerce_v_launch_readiness_safe_v2')
      .select('*')
      .order('readiness_scope', { ascending: true })
      .order('gate_code', { ascending: true }),
  ]);

  if (summaryResult.error) return { summary: [], gates: [], error: summaryResult.error.message };
  if (gateResult.error) return { summary: [], gates: [], error: gateResult.error.message };

  return {
    summary: (summaryResult.data || []) as LaunchReadinessSummaryRow[],
    gates: (gateResult.data || []) as LaunchReadinessGateRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'PASS') return 'ok';
  if (state === 'BLOCKED') return 'danger';
  return 'warning';
}

export default async function AdminLaunchReadinessPage() {
  const { summary, gates, error } = await getReadiness();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/launch-readiness">Launch Readiness</Link>
            <Link href="/admin/metrics">Metrics</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Launch Readiness Gate · deterministic</div>
          <h1>Launch Readiness</h1>
          <p>
            Public site, Search indexing, Commerce and Measurement are evaluated separately. There is no blended readiness score that can hide a hard blocker.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          {summary.map((row) => (
            <div className="card metric" key={row.readiness_scope}>
              <strong>{asText(row.readiness_scope)}</strong>
              <span className={`status-pill ${stateClass(row.scope_status)}`}>
                {asText(row.scope_status)}
              </span>
              <span>
                {row.pass_count || 0} pass · {row.warn_count || 0} warn · {row.blocking_count || 0} blockers
              </span>
            </div>
          ))}
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Gate</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Current evidence</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((row) => (
                <tr key={`${row.readiness_scope}-${row.gate_code}`}>
                  <td>{row.readiness_scope}</td>
                  <td>
                    <strong>{asText(row.gate_name, row.gate_code)}</strong>
                    <div className="muted">{row.gate_code}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${stateClass(row.gate_status)}`}>
                      {asText(row.gate_status)}
                    </span>
                    {row.is_blocker ? <div className="badge-row"><span className="badge">hard gate</span></div> : null}
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>{asText(row.summary)}</td>
                  <td>{asText(row.next_action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
