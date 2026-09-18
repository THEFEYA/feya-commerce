import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ScenarioReleaseReadinessRow, ScenarioTestRegistryRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  scenarios: ScenarioTestRegistryRow[];
  readiness: ScenarioReleaseReadinessRow | null;
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { scenarios: [], readiness: null, error: getMissingAdminDataEnvMessage() };

  const [scenarioResult, readinessResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_scenario_test_registry_safe_v1')
      .select('*')
      .eq('active_flag', true)
      .order('severity', { ascending: true })
      .order('scenario_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_scenario_release_readiness_safe_v1')
      .select('*')
      .maybeSingle(),
  ]);

  if (scenarioResult.error) return { scenarios: [], readiness: null, error: scenarioResult.error.message };
  if (readinessResult.error) return { scenarios: [], readiness: null, error: readinessResult.error.message };

  return {
    scenarios: (scenarioResult.data || []) as ScenarioTestRegistryRow[],
    readiness: readinessResult.data as ScenarioReleaseReadinessRow | null,
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, 'NOT_RUN').toUpperCase();
  if (status === 'PASS') return 'ok';
  if (status === 'FAIL' || status === 'ERROR' || status === 'BLOCKED') return 'danger';
  return 'warning';
}

function severityClass(value: unknown) {
  const severity = asText(value, '').toUpperCase();
  if (severity === 'CRITICAL') return 'danger';
  if (severity === 'MAJOR') return 'warning';
  return 'ok';
}

export default async function AdminScenarioTestsPage() {
  const { scenarios, readiness, error } = await getData();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/scenario-tests">Проверки сценариев</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Безопасность релиза · регрессионный реестр</div>
          <h1>Проверки сценариев</h1>
          <p>
            Активные сценарии задают обязательные условия, которые нельзя нарушать. Реестр не считает проверку пройденной без фактического запуска: до появления доказательства статус остаётся «Ещё не проверено».
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{scenarios.length}</strong><span>Активных сценариев</span></div>
          <div className="card metric"><strong>{readiness?.pass_count || 0}</strong><span>Пройдено</span></div>
          <div className="card metric"><strong>{readiness?.warn_count || 0}</strong><span>Требуют внимания</span></div>
          <div className="card metric"><strong>{readiness?.fail_count || 0}</strong><span>Не пройдено</span></div>
          <div className="card metric"><strong>{readiness?.not_run_count || 0}</strong><span>Ещё не запускались</span></div>
          <div className="card metric"><strong>{readiness?.critical_not_pass_count || 0}</strong><span>Критичных не пройдено</span></div>
          <div className="card metric">
            <strong>
              <span className={`status-pill ${statusClass(readiness?.registry_release_state)}`}>
                {statusLabel(readiness?.registry_release_state || 'BLOCKED')}
              </span>
            </strong>
            <span>Состояние реестра для релиза</span>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Автоматический исполнитель регрессионных сценариев пока намеренно недоступен. Запись о запуске не равна фактической проверке: будущая автоматизация должна сохранять явные доказательства выполнения условий.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Важность</th>
                <th>Сценарий</th>
                <th>Категория</th>
                <th>Применяется к</th>
                <th>Последний запуск</th>
                <th>Ошибка</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((row) => (
                <tr key={row.scenario_id}>
                  <td>
                    <span className={`status-pill ${severityClass(row.severity)}`}>
                      {asText(row.severity)}
                    </span>
                  </td>
                  <td>
                    <strong>{asText(row.title, row.scenario_code || '—')}</strong>
                    <div className="muted">{asText(row.scenario_code)} · v{row.scenario_version ?? '—'}</div>
                    <div className="muted">{asText(row.description)}</div>
                  </td>
                  <td>{asText(row.scenario_category)}</td>
                  <td>{asText(row.applies_to_json)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.latest_run_status)}`}>
                      {statusLabel(row.latest_run_status || 'NOT_RUN')}
                    </span>
                    {row.latest_target_code ? (
                      <div className="muted">{row.latest_target_type}/{row.latest_target_code}@{row.latest_target_version}</div>
                    ) : null}
                  </td>
                  <td>{asText(row.latest_failure_summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
