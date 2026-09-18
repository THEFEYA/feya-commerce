import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthInitiativeRow, GrowthStrategyRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  strategies: GrowthStrategyRow[];
  initiatives: GrowthInitiativeRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { strategies: [], initiatives: [], error: getMissingAdminDataEnvMessage() };

  const [strategyResult, initiativeResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_strategy_safe_v1')
      .select('*')
      .order('strategy_code', { ascending: true })
      .order('version_no', { ascending: false }),
    supabase
      .from('feya_commerce_v_growth_initiatives_safe_v1')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);

  if (strategyResult.error) return { strategies: [], initiatives: [], error: strategyResult.error.message };
  if (initiativeResult.error) return { strategies: [], initiatives: [], error: initiativeResult.error.message };

  return {
    strategies: (strategyResult.data || []) as GrowthStrategyRow[],
    initiatives: (initiativeResult.data || []) as GrowthInitiativeRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'ACTIVE' || status === 'APPROVED' || status === 'VALID' || status === 'COMPLETED') return 'ok';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'REQUIRED' || status === 'BLOCKED') return 'danger';
  return 'warning';
}

export default async function AdminStrategyPage() {
  const { strategies, initiatives, error } = await getData();

  const activeStrategies = strategies.filter((row) => row.strategy_status === 'ACTIVE').length;
  const revalidation = initiatives.filter((row) => row.strategy_revalidation_status === 'REQUIRED').length;
  const directorPending = initiatives.filter((row) => row.director_gate_status === 'PENDING').length;
  const humanPending = initiatives.filter((row) => row.human_approval_status === 'PENDING').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/strategy">Strategy</Link>
            <Link href="/admin/signals">Signals</Link>
            <Link href="/admin/executions">Executions</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Growth Strategy / Initiative Registry · read-only</div>
          <h1>Strategy & Initiatives</h1>
          <p>
            Growth Strategy activation is human-owned. Director Gate and Human Approval remain separate, and unfinished initiatives must be revalidated when the active strategy changes.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{strategies.length}</strong><span>Strategy versions</span></div>
          <div className="card metric"><strong>{activeStrategies}</strong><span>Active strategy</span></div>
          <div className="card metric"><strong>{initiatives.length}</strong><span>Initiatives</span></div>
          <div className="card metric"><strong>{directorPending}</strong><span>Director Gate pending</span></div>
          <div className="card metric"><strong>{humanPending}</strong><span>Human approval pending</span></div>
          <div className="card metric"><strong>{revalidation}</strong><span>Strategy revalidation required</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="section-head">
          <div>
            <h2>Strategy versions</h2>
            <p className="muted">CONTRIBUTION_MARGIN_MODE cannot activate until VARIABLE_COST_TRUTH is available.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Version</th>
                <th>Status</th>
                <th>Economic mode</th>
                <th>Active window</th>
              </tr>
            </thead>
            <tbody>
              {strategies.length ? strategies.map((row) => (
                <tr key={row.strategy_version_id}>
                  <td>
                    <strong>{asText(row.title, row.strategy_code || '—')}</strong>
                    <div className="muted">{asText(row.strategy_code)}</div>
                  </td>
                  <td>v{row.version_no ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.strategy_status)}`}>
                      {asText(row.strategy_status)}
                    </span>
                  </td>
                  <td>{asText(row.economic_mode)}</td>
                  <td>
                    {asText(row.active_from)}
                    <div className="muted">→ {asText(row.active_to)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>No real Growth Strategy version has been created.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Initiatives</h2>
            <p className="muted">ACTIONING is blocked until strategy, Director Gate and required Human Approval are all valid.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Initiative</th>
                <th>Owner</th>
                <th>Action class</th>
                <th>Status</th>
                <th>Director Gate</th>
                <th>Human approval</th>
                <th>Strategy</th>
                <th>Due / expiry</th>
              </tr>
            </thead>
            <tbody>
              {initiatives.length ? initiatives.map((row) => (
                <tr key={row.initiative_id}>
                  <td>
                    <strong>{asText(row.title, row.initiative_code || '—')}</strong>
                    <div className="muted">{asText(row.initiative_code)}</div>
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>{asText(row.action_class)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.initiative_status)}`}>
                      {asText(row.initiative_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.director_gate_status)}`}>
                      {asText(row.director_gate_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.human_approval_status)}`}>
                      {asText(row.human_approval_status)}
                    </span>
                  </td>
                  <td>
                    {asText(row.strategy_code)} v{row.strategy_version_no ?? '—'}
                    <div className="muted">
                      <span className={`status-pill ${statusClass(row.strategy_revalidation_status)}`}>
                        {asText(row.strategy_revalidation_status)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {asText(row.due_at)}
                    <div className="muted">expires {asText(row.expires_at)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}>No real initiatives have been created.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
