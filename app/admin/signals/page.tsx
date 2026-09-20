import Link from 'next/link';
import { CircleAlert, Eye, Route, Wrench } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
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
  if (!supabase) return { rows: [], admissionByFingerprint: new Map(), error: getMissingAdminDataEnvMessage() };

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

  const firstError = signalsResult.error || admissionResult.error;
  if (firstError) return { rows: [], admissionByFingerprint: new Map(), error: firstError.message };

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

function toneClass(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (['P0','P1','BLOCKED','UNAVAILABLE'].includes(key)) return 'is-danger';
  if (['P2','WARN','DEGRADED'].includes(key)) return 'is-warning';
  if (['OPEN','MONITOR'].includes(key)) return 'is-info';
  return '';
}

export default async function AdminSignalsDiagnosticsPage() {
  const { rows, admissionByFingerprint, error } = await getSignals();
  const ownerDecisions = rows.filter((row) => row.case_admission_recommendation === 'OWNER_DECISION_REQUIRED').length;
  const workQueue = rows.filter((row) => row.case_admission_recommendation === 'WORK_QUEUE').length;
  const implementation = rows.filter((row) => row.case_admission_recommendation === 'IMPLEMENTATION_ACTION').length;
  const monitor = rows.filter((row) => row.case_admission_recommendation === 'MONITOR').length;

  const ordered = [...rows].sort((a, b) => {
    const routeRank = (value: unknown) => {
      const key = asText(value, '');
      if (key === 'OWNER_DECISION_REQUIRED') return 0;
      if (key === 'WORK_QUEUE') return 1;
      if (key === 'IMPLEMENTATION_ACTION') return 2;
      if (key === 'MONITOR') return 3;
      return 4;
    };
    return routeRank(a.case_admission_recommendation) - routeRank(b.case_admission_recommendation);
  });

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Advanced · сигналы</div>
            <h1>Диагностика сигналов</h1>
            <p>Технический слой маршрутизации. Здесь видно, почему детерминированный сигнал остаётся наблюдением, идёт в работу, требует владельца или указывает на недостающую реализацию.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/signals" className="owner-button">Назад к сигналам</Link>
            <Link href="/admin/company/advanced" className="owner-button">Advanced</Link>
          </div>
        </header>

        <section className="owner-queue-strip" style={{ marginBottom: '20px' }}>
          <Link href="/admin/company/owner-attention" className="owner-queue-item">
            <span className="owner-queue-icon"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Владелец</strong><small>граница полномочий</small></span>
            <b>{ownerDecisions}</b>
          </Link>
          <Link href="/admin/company/work" className="owner-queue-item">
            <span className="owner-queue-icon"><Route size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Работа</strong><small>можно маршрутизировать</small></span>
            <b>{workQueue}</b>
          </Link>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><Wrench size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Реализация</strong><small>нужна capability</small></span>
            <b>{implementation}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><Eye size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Наблюдение</strong><small>без эскалации</small></span>
            <b>{monitor}</b>
          </div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Диагностический экран</div>
          <p className="owner-card-copy">Сигнал сам по себе не создаёт Growth Case и не выполняет действие. Case Admission остаётся отдельным контролируемым решением.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div><h2>Маршруты, требующие внимания</h2><div className="owner-section-kicker">Сначала владелец, затем работа и недостающая реализация</div></div>
          </div>
          {ordered.length ? (
            <div className="owner-list">
              {ordered.slice(0, 20).map((row) => {
                const copy = signalCopy(row.signal_code, { title: row.title, summary: row.summary, action: row.next_action });
                const admission = admissionByFingerprint.get(row.signal_fingerprint);
                return (
                  <article className="owner-list-row" key={row.signal_fingerprint}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span className={`owner-status ${toneClass(row.priority)}`}>{priorityLabel(row.priority)}</span>
                        <span>{admissionLabel(row.case_admission_recommendation)}</span>
                        <span>{roleLabel(row.accountable_domain)}</span>
                      </div>
                      <h3>{copy.title}</h3>
                      <p>{copy.summary}</p>
                    </div>
                    <div className="owner-list-row-side">
                      <span className="owner-section-kicker">{admissionLabel(admission?.admission_decision)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-empty">Детерминированных сигналов сейчас нет.</div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полный технический реестр</strong><small>Admission reason, raw status и связанная рабочая ситуация</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Сигнал</th><th>Приоритет</th><th>Ответственный</th><th>Состояние</th><th>Маршрут</th><th>Admission</th><th>Причина</th></tr></thead>
                  <tbody>
                    {ordered.map((row) => {
                      const copy = signalCopy(row.signal_code, { title: row.title, summary: row.summary, action: row.next_action });
                      const admission = admissionByFingerprint.get(row.signal_fingerprint);
                      return (
                        <tr key={row.signal_fingerprint}>
                          <td><strong title={row.signal_code}>{copy.title}</strong></td>
                          <td>{priorityLabel(row.priority)}</td>
                          <td>{roleLabel(row.accountable_domain)}</td>
                          <td>{statusLabel(row.signal_state)}</td>
                          <td>{admissionLabel(row.case_admission_recommendation)}</td>
                          <td>{admissionLabel(admission?.admission_decision)}</td>
                          <td title={asText(admission?.admission_reason)}>{admissionReasonLabel(admission?.admission_reason)}</td>
                        </tr>
                      );
                    })}
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
