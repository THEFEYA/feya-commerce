import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { CaseAdmissionPreviewRow, GrowthSignalCandidateRow } from '@/lib/types';
import { admissionLabel, admissionReasonLabel, priorityLabel, roleLabel, signalCopy, statusLabel } from '@/lib/owner-ui/terminology';

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
            <Link href="/admin/signals">Сигналы</Link>
            <Link href="/admin/owner-attention">Решения владельца</Link>
            <Link href="/admin/launch-readiness">Готовность к запуску</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Сигналы и допустимость действий · подготовка к запуску</div>
          <h1>Сигналы роста</h1>
          <p>
            Показываются только детерминированные кандидаты. На текущем этапе подготовки к запуску ни один сигнал не создаёт рабочую ситуацию автоматически.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{ownerDecisions}</strong><span>Нужно решение владельца</span></div>
          <div className="owner-summary-cell"><strong>{workQueue}</strong><span>Можно передать в работу</span></div>
          <div className="owner-summary-cell"><strong>{implementation}</strong><span>Нужны изменения системы</span></div>
          <div className="owner-summary-cell"><strong>{p1 + p2}</strong><span>Важных сигналов P1–P2</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Продажи и измерение результатов, которые намеренно ещё не активны до запуска, откладываются до появления соответствующей цели вместо создания лишнего шума.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Приоритет</th>
                <th>Сигнал</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Маршрут</th>
                <th>Предварительное решение по работе</th>
                <th>Что произошло</th>
                <th>Следующий шаг</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => {
                const routeRank = (value: unknown) => {
                  const key = asText(value, '');
                  if (key === 'OWNER_DECISION_REQUIRED') return 0;
                  if (key === 'WORK_QUEUE') return 1;
                  if (key === 'IMPLEMENTATION_ACTION') return 2;
                  if (key === 'MONITOR') return 3;
                  return 4;
                };
                const priorityRank = (value: unknown) => {
                  const key = asText(value, '');
                  if (key === 'P0') return 0;
                  if (key === 'P1') return 1;
                  if (key === 'P2') return 2;
                  return 3;
                };
                return routeRank(a.case_admission_recommendation) - routeRank(b.case_admission_recommendation)
                  || priorityRank(a.priority) - priorityRank(b.priority);
              }).map((row) => (
                <tr key={row.signal_fingerprint}>
                  <td>
                    <span className={`status-pill ${priorityClass(row.priority)}`}>
                      {priorityLabel(row.priority)}
                    </span>

                  </td>
                  <td>
                    <strong title={row.signal_code}>{signalCopy(row.signal_code, { title: row.title, summary: row.summary, action: row.next_action }).title}</strong>
                    <div className="badge-row">
                      <span className="badge" title={asText(row.signal_type)}>Системный сигнал</span>
                    </div>
                  </td>
                  <td>{roleLabel(row.accountable_domain)}</td>
                  <td>
                    <span className={`status-pill ${stateClass(row.signal_state)}`}>
                      {statusLabel(row.signal_state)}
                    </span>
                  </td>
                  <td>{admissionLabel(row.case_admission_recommendation)}</td>
                  <td>
                    {(() => {
                      const admission = admissionByFingerprint.get(row.signal_fingerprint);
                      return (
                        <>
                          <strong>{admissionLabel(admission?.admission_decision)}</strong>
                          <div className="muted" title={asText(admission?.admission_reason)}>{admissionReasonLabel(admission?.admission_reason)}</div>
                          {admission?.existing_case_code ? (
                            <div className="badge-row">
                              <span className="badge" title={admission.existing_case_code}>Есть связанная рабочая ситуация</span>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </td>
                  <td>{signalCopy(row.signal_code, { title: row.title, summary: row.summary, action: row.next_action }).summary}</td>
                  <td>{signalCopy(row.signal_code, { title: row.title, summary: row.summary, action: row.next_action }).action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
