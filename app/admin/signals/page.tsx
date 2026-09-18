import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { CaseAdmissionPreviewRow, GrowthSignalCandidateRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSignals(): Promise<{
  rows: GrowthSignalCandidateRow[];
  admissionByFingerprint: Map<string, CaseAdmissionPreviewRow>;
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return { rows: [], admissionByFingerprint: new Map(), error: getMissingAdminDataEnvMessage() };
  }

  const [signalsResult, admissionResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_signal_candidates_safe_v2')
      .select('*')
      .order('priority', { ascending: true })
      .order('materiality_score', { ascending: false })
      .order('signal_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_case_admission_preview_safe_v2')
      .select('signal_fingerprint,signal_code,existing_case_id,existing_case_code,existing_case_status,admission_decision,admission_reason'),
  ]);

  if (signalsResult.error) {
    return { rows: [], admissionByFingerprint: new Map(), error: signalsResult.error.message };
  }
  if (admissionResult.error) {
    return { rows: [], admissionByFingerprint: new Map(), error: admissionResult.error.message };
  }

  const admissionRows = (admissionResult.data || []) as CaseAdmissionPreviewRow[];
  return {
    rows: (signalsResult.data || []) as GrowthSignalCandidateRow[],
    admissionByFingerprint: new Map(admissionRows.map((row) => [row.signal_fingerprint, row])),
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function priorityClass(value: unknown) {
  const priority = asText(value, '').toUpperCase();
  if (priority === 'P0' || priority === 'P1') return 'danger';
  if (priority === 'P2') return 'warning';
  return 'ok';
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'BLOCKED' || state === 'DEGRADED' || state === 'UNAVAILABLE') return 'danger';
  if (state === 'WARN' || state === 'OPEN') return 'warning';
  return 'ok';
}

export default async function AdminSignalsPage() {
  const { rows, admissionByFingerprint, error } = await getSignals();

  const p1 = rows.filter((row) => row.priority === 'P1').length;
  const p2 = rows.filter((row) => row.priority === 'P2').length;
  const ownerDecisions = rows.filter((row) => row.case_admission_recommendation === 'OWNER_DECISION_REQUIRED').length;
  const workQueue = rows.filter((row) => row.case_admission_recommendation === 'WORK_QUEUE').length;
  const implementation = rows.filter((row) => row.case_admission_recommendation === 'IMPLEMENTATION_ACTION').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/signals">Signals</Link>
            <Link href="/admin/launch-readiness">Launch Readiness</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Signal & Eligibility Engine · pre-launch</div>
          <h1>Growth Signals</h1>
          <p>
            Deterministic candidates only. No signal creates a Growth Case automatically in the current PRE_LAUNCH maturity state.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Signal candidates</span></div>
          <div className="card metric"><strong>{p1}</strong><span>P1</span></div>
          <div className="card metric"><strong>{p2}</strong><span>P2</span></div>
          <div className="card metric"><strong>{ownerDecisions}</strong><span>Owner decisions</span></div>
          <div className="card metric"><strong>{workQueue}</strong><span>Work queue</span></div>
          <div className="card metric"><strong>{implementation}</strong><span>Implementation actions</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Commerce and measurement capabilities that are intentionally absent in PRE_LAUNCH are marked DEFER_UNTIL_ACTIVE_OBJECTIVE instead of generating noisy cases.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Signal</th>
                <th>Owner</th>
                <th>State</th>
                <th>Admission</th>
                <th>Case admission preview</th>
                <th>Evidence</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.signal_fingerprint}>
                  <td>
                    <span className={`status-pill ${priorityClass(row.priority)}`}>
                      {asText(row.priority)}
                    </span>
                    <div className="muted">{asText(row.materiality_score)}</div>
                  </td>
                  <td>
                    <strong>{asText(row.title, row.signal_code)}</strong>
                    <div className="muted">{row.signal_code}</div>
                    <div className="badge-row">
                      <span className="badge">{asText(row.signal_type)}</span>
                      <span className="badge">{asText(row.signal_scope)}</span>
                    </div>
                  </td>
                  <td>{asText(row.accountable_domain)}</td>
                  <td>
                    <span className={`status-pill ${stateClass(row.signal_state)}`}>
                      {asText(row.signal_state)}
                    </span>
                  </td>
                  <td>{asText(row.case_admission_recommendation)}</td>
                  <td>
                    {(() => {
                      const admission = admissionByFingerprint.get(row.signal_fingerprint);
                      return (
                        <>
                          <strong>{asText(admission?.admission_decision)}</strong>
                          <div className="muted">{asText(admission?.admission_reason)}</div>
                          {admission?.existing_case_code ? (
                            <div className="badge-row">
                              <span className="badge">{admission.existing_case_code}</span>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </td>
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
