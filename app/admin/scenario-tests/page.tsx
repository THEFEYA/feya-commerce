import Link from 'next/link';
import { CircleAlert, ShieldCheck, TestTube2 } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ScenarioReleaseReadinessRow, ScenarioTestRegistryRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{ scenarios: ScenarioTestRegistryRow[]; readiness: ScenarioReleaseReadinessRow | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { scenarios: [], readiness: null, error: getMissingAdminDataEnvMessage() };

  const [scenarioResult, readinessResult] = await Promise.all([
    supabase.from('feya_commerce_v_scenario_test_registry_safe_v1').select('*').eq('active_flag', true).order('severity', { ascending: true }).order('scenario_code', { ascending: true }),
    supabase.from('feya_commerce_v_scenario_release_readiness_safe_v1').select('*').maybeSingle(),
  ]);
  const firstError = scenarioResult.error || readinessResult.error;
  if (firstError) return { scenarios: [], readiness: null, error: firstError.message };
  return { scenarios: (scenarioResult.data || []) as ScenarioTestRegistryRow[], readiness: readinessResult.data as ScenarioReleaseReadinessRow | null };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function severityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'CRITICAL') return 'Критично';
  if (key === 'MAJOR') return 'Важно';
  if (key === 'MINOR') return 'Обычная';
  return asText(value);
}

function tone(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (['FAIL','ERROR','BLOCKED','CRITICAL'].includes(key)) return 'is-danger';
  if (['NOT_RUN','WARN','MAJOR'].includes(key)) return 'is-warning';
  if (key === 'PASS') return 'is-success';
  return 'is-info';
}

export default async function AdminScenarioTestsPage() {
  const { scenarios, readiness, error } = await getData();
  const criticalRows = scenarios.filter((row) => String(row.severity || '').toUpperCase() === 'CRITICAL' && String(row.latest_run_status || 'NOT_RUN').toUpperCase() !== 'PASS');
  const unresolvedRows = scenarios.filter((row) => !['PASS'].includes(String(row.latest_run_status || 'NOT_RUN').toUpperCase()));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Advanced · regression</div>
            <h1>Проверки сценариев</h1>
            <p>Обязательные инварианты FEYA перед релизом или повышением автономии. Сценарий считается пройденным только после реального запуска с доказательством результата.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system" className="owner-button">Назад к системе</Link>
            <Link href="/admin/execution-map" className="owner-button">Права действий</Link>
          </div>
        </header>

        <section className="owner-queue-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Критичные</strong><small>ещё не PASS</small></span>
            <b>{readiness?.critical_not_pass_count || 0}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><TestTube2 size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Не запускались</strong><small>нет фактического результата</small></span>
            <b>{readiness?.not_run_count || 0}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Ошибки / fail</strong><small>требуют диагностики</small></span>
            <b>{(readiness?.fail_count || 0) + (readiness?.error_count || 0)}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Пройдено</strong><small>есть фактический PASS</small></span>
            <b>{readiness?.pass_count || 0}</b>
          </div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className={`owner-card ${criticalRows.length ? 'is-warning' : 'is-success'}`} style={{ marginBottom: '18px' }}>
          <div className={`owner-status ${criticalRows.length ? 'is-warning' : 'is-success'}`}>Release gate: {statusLabel(readiness?.registry_release_state || 'BLOCKED')}</div>
          <p className="owner-card-copy">Автоматический scenario runner пока не считается существующим. Запись «run» без фактической проверки не засчитывается как PASS.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head"><div><h2>Что мешает считать регрессию пройденной</h2><div className="owner-section-kicker">Критичные и непройденные сценарии первыми</div></div></div>
          {unresolvedRows.length ? (
            <div className="owner-list">
              {unresolvedRows.slice(0, 24).map((row) => (
                <article className="owner-list-row" key={row.scenario_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${tone(row.severity)}`}>{severityLabel(row.severity)}</span>
                      <span className={`owner-status ${tone(row.latest_run_status || 'NOT_RUN')}`}>{statusLabel(row.latest_run_status || 'NOT_RUN')}</span>
                      <span>{asText(row.scenario_category)}</span>
                    </div>
                    <h3>{asText(row.title, row.scenario_code || 'Сценарий')}</h3>
                    <p>{asText(row.description)}</p>
                    {row.latest_failure_summary ? <p><strong>Последняя проблема:</strong> {asText(row.latest_failure_summary)}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Все активные сценарии имеют PASS.</div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полный регрессионный реестр</strong><small>Версии, applies-to и технические результаты</small></span>
              <span className="owner-section-kicker">{scenarios.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Сценарий</th><th>Важность</th><th>Категория</th><th>Последний запуск</th><th>Цель проверки</th><th>Ошибка</th></tr></thead>
                  <tbody>
                    {scenarios.map((row) => (
                      <tr key={row.scenario_id}>
                        <td><strong>{asText(row.title, row.scenario_code || '—')}</strong><div className="muted">{asText(row.scenario_code)} · v{row.scenario_version ?? '—'}</div></td>
                        <td>{severityLabel(row.severity)}</td>
                        <td>{asText(row.scenario_category)}</td>
                        <td>{statusLabel(row.latest_run_status || 'NOT_RUN')}</td>
                        <td title={asText(row.applies_to_json)}>{row.latest_target_code ? 'цель сохранена' : '—'}</td>
                        <td>{asText(row.latest_failure_summary)}</td>
                      </tr>
                    ))}
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
