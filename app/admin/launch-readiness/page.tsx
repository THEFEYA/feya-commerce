import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { LaunchReadinessGateRow, LaunchReadinessSummaryRow } from '@/lib/types';
import { gateTitle, roleLabel, scopeLabel, statusLabel } from '@/lib/owner-ui/terminology';

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
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/launch-readiness">Готовность к запуску</Link>
            <Link href="/admin/metrics">Метрики</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Готовность к запуску · детерминированная проверка</div>
          <h1>Готовность к запуску</h1>
          <p>
            Сайт, поисковая индексация, продажи и измерение результатов оцениваются отдельно. Общего «среднего балла» нет, поэтому критичная блокировка не может спрятаться за хорошим состоянием других зон.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          {summary.map((row) => (
            <div className="card metric" key={row.readiness_scope}>
              <strong>{scopeLabel(row.readiness_scope)}</strong>
              <span className={`status-pill ${stateClass(row.scope_status)}`}>
                {statusLabel(row.scope_status)}
              </span>
              <span>
                {row.pass_count || 0} пройдено · {row.warn_count || 0} требуют внимания · {row.blocking_count || 0} блокируют
              </span>
            </div>
          ))}
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Зона</th>
                <th>Проверка</th>
                <th>Статус</th>
                <th>Ответственный</th>
                <th>Текущее подтверждение</th>
                <th>Следующий шаг</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((row) => (
                <tr key={`${row.readiness_scope}-${row.gate_code}`}>
                  <td>{scopeLabel(row.readiness_scope)}</td>
                  <td>
                    <strong>{gateTitle(row.gate_code, row.gate_name)}</strong>
                    <div className="muted">{row.gate_code}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${stateClass(row.gate_status)}`}>
                      {statusLabel(row.gate_status)}
                    </span>
                    {row.is_blocker ? <div className="badge-row"><span className="badge">обязательная проверка</span></div> : null}
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
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
