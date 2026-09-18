import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { LearningRegistryRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: LearningRegistryRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_learning_registry_safe_v2')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(300);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as LearningRegistryRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'ADOPTED_POLICY' || status === 'REPLICATED_LEARNING') return 'ok';
  if (status === 'REJECTED' || status === 'RETIRED') return 'danger';
  return 'warning';
}

export default async function AdminLearningPage() {
  const { rows, error } = await getRows();

  const observations = rows.filter((row) => row.learning_status === 'OBSERVATION').length;
  const repeated = rows.filter((row) => row.learning_status === 'REPEATED_OBSERVATION').length;
  const replicated = rows.filter((row) => row.learning_status === 'REPLICATED_LEARNING').length;
  const candidates = rows.filter((row) => row.learning_status === 'POLICY_CANDIDATE').length;
  const adopted = rows.filter((row) => row.learning_status === 'ADOPTED_POLICY').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/learning">Learning</Link>
            <Link href="/admin/scenario-tests">Scenario Tests</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Learning Registry / controlled Kaizen · read-only</div>
          <h1>Learning</h1>
          <p>
            Observations mature through repeated evidence and replication. Policy candidates still require targeted regression PASS and human adoption; agents cannot rewrite policy directly.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Learning items</span></div>
          <div className="card metric"><strong>{observations}</strong><span>Observations</span></div>
          <div className="card metric"><strong>{repeated}</strong><span>Repeated observations</span></div>
          <div className="card metric"><strong>{replicated}</strong><span>Replicated learnings</span></div>
          <div className="card metric"><strong>{candidates}</strong><span>Policy candidates</span></div>
          <div className="card metric"><strong>{adopted}</strong><span>Adopted policies</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">No durable learning items have been recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Learning</th>
                  <th>Domain</th>
                  <th>Stage</th>
                  <th>Evidence</th>
                  <th>Policy candidate</th>
                  <th>Regression</th>
                  <th>Adoption</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.learning_id}>
                    <td>
                      <strong>{asText(row.title, row.learning_code || '—')}</strong>
                      <div className="muted">{asText(row.learning_code)}</div>
                      <div className="muted">{asText(row.learning_statement)}</div>
                    </td>
                    <td>{asText(row.domain)}</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.learning_status)}`}>
                        {asText(row.learning_status)}
                      </span>
                    </td>
                    <td>
                      {row.evidence_count ?? 0} evidence
                      <div className="muted">{row.distinct_context_count ?? 0} contexts</div>
                    </td>
                    <td>
                      {asText(row.proposed_policy_name, row.proposed_policy_code || '—')}
                      {row.proposed_policy_version ? (
                        <div className="muted">{row.proposed_policy_code} v{row.proposed_policy_version}</div>
                      ) : null}
                      {row.candidate_version ? <div className="muted">candidate {row.candidate_version}</div> : null}
                    </td>
                    <td>{row.required_scenario_count ?? 0} required scenarios</td>
                    <td>
                      {row.adopted_policy_version ? (
                        <span className="status-pill ok">policy v{row.adopted_policy_version}</span>
                      ) : '—'}
                      {row.adopted_at ? <div className="muted">{row.adopted_at}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
