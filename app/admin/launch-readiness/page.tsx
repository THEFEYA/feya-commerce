export const instant = false;

import Link from 'next/link';
import { connection } from 'next/server';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { LaunchReadinessGateRow, LaunchReadinessSummaryRow } from '@/lib/types';
import { gateTitle, launchGateOwnerCopy, roleLabel, scopeLabel, statusLabel } from '@/lib/owner-ui/terminology';
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

/**
 * Live, read-only search authority. The legacy launch_readiness_v2 views
 * predate ACTIVE Search Release v12 and must not be treated as indexation truth.
 * Missing or contradictory evidence is UNKNOWN, never 0 or PASS.
 */
type ActiveSearchEvidence = {
  releaseCode: string;
  releaseVersion: number;
  targetOrigin: string;
  intendedIndex: number;
  intendedNoindex: number;
  approvedProducts: number;
};

async function getActiveSearchEvidence(): Promise<{ value: ActiveSearchEvidence | null; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { value: null, error: getMissingAdminDataEnvMessage() };

  const releases = await supabase
    .from('feya_search_releases_v1')
    .select('release_id,release_code,release_version,target_origin')
    .eq('release_status', 'ACTIVE')
    .limit(2);

  if (releases.error) return { value: null, error: releases.error.message };
  if (!releases.data || releases.data.length !== 1)
    return { value: null, error: 'Ожидается ровно один активный Search Release; проверка источника необходима.' };

  const release = releases.data[0];
  if (release.target_origin !== 'https://thefeya.com')
    return { value: null, error: 'Активный Search Release указывает на другой домен; данные не подтверждены.' };

  const [index, noindex, products] = await Promise.all([
    supabase.from('feya_search_release_items_v1')
      .select('release_id', { count: 'exact', head: true })
      .eq('release_id', release.release_id).eq('intended_index_state', 'index'),
    supabase.from('feya_search_release_items_v1')
      .select('release_id', { count: 'exact', head: true })
      .eq('release_id', release.release_id).eq('intended_index_state', 'noindex'),
    supabase.from('feya_storefront_approved_product_bindings_v1')
      .select('canonical_product_id', { count: 'exact', head: true }),
  ]);

  const sourceError = index.error || noindex.error || products.error;
  if (sourceError) return { value: null, error: sourceError.message };
  if (index.count == null || noindex.count == null || products.count == null)
    return { value: null, error: 'Нет достоверного количества страниц или утверждённых товаров.' };

  return { value: {
    releaseCode: String(release.release_code),
    releaseVersion: Number(release.release_version),
    targetOrigin: String(release.target_origin),
    intendedIndex: index.count,
    intendedNoindex: noindex.count,
    approvedProducts: products.count,
  } };
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
  await connection();
  const [{ summary, gates, error }, activeSearch] = await Promise.all([getReadiness(), getActiveSearchEvidence()]);

  const orderedGates = [...gates].sort((a, b) => {
    const rank = (row: LaunchReadinessGateRow) => {
      const state = asText(row.gate_status, '').toUpperCase();
      if (state === 'BLOCKED') return 0;
      if (state === 'WARN') return 1;
      return 2;
    };
    return rank(a) - rank(b) || asText(a.readiness_scope).localeCompare(asText(b.readiness_scope));
  });

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · запуск</div>
            <h1>Готовность к запуску</h1>
            <p>Сайт, поиск, продажи и измерение проверяются отдельно. Общего «среднего балла» нет: критическая блокировка не должна прятаться за готовностью другой зоны.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system" className="owner-button">Система</Link>
            <Link href="/admin/execution-map" className="owner-button">Права и автоматизация</Link>
          </div>
        </header>

        <section className="owner-section" aria-label="Актуальный Search Release" style={{ marginBottom: '18px' }}>
          <div className="owner-section-head">
            <div>
              <h2>Текущий Search Release — отдельно от старых проверок</h2>
              <div className="owner-section-kicker">
                Актуальные данные из ACTIVE release и утверждённых Product bindings. Это разрешения на индексацию, а не отчёт Google.
              </div>
            </div>
            <Link href="/admin/data-health" className="owner-button">Источники данных</Link>
          </div>
          {activeSearch.value ? (
            <>
              <div className="owner-summary-strip" style={{ marginBottom: '12px' }}>
                <div className="owner-summary-cell">
                  <strong>{activeSearch.value.intendedIndex}</strong><span>Разрешены к индексации</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>{activeSearch.value.intendedNoindex}</strong><span>Предусмотрен noindex</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>{activeSearch.value.approvedProducts}</strong><span>Утверждённых товарных привязок</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>v{activeSearch.value.releaseVersion}</strong><span>ACTIVE Search Release</span>
                </div>
              </div>
              <p className="owner-section-kicker">
                {activeSearch.value.releaseCode} · {activeSearch.value.targetOrigin}. Реальное количество проиндексированных Google страниц и позиции здесь НЕ измеряются.
                Публикация оригинальных текстов 207 PDP имеет отдельный owner-controlled gate; noindex товаров не снимается.
              </p>
            </>
          ) : (
            <div className="notice">
              Состояние действующего Search Release не подтверждено: {activeSearch.error || 'источник недоступен'}.
              Устаревшие значения из readiness v2 нельзя заменять нулями.
            </div>
          )}
          <div className="notice" style={{ marginTop: '14px' }}>
            Историческая readiness v2 ниже содержит устаревшие кандидаты и может ошибочно показывать 0 индексируемых страниц.
            Не используйте её для решения о Search v12, публикации товаров или рекламном запуске.
          </div>
        </section>

        <section className="owner-grid four" style={{ marginBottom: '20px' }}>
          {summary.map((row) => (
            <article className={`owner-card ${row.scope_status === 'BLOCKED' ? 'is-warning' : row.scope_status === 'PASS' ? 'is-success' : 'is-info'}`} key={row.readiness_scope}>
              <div className={`owner-status ${row.scope_status === 'BLOCKED' ? 'is-warning' : row.scope_status === 'PASS' ? 'is-success' : 'is-info'}`}>
                {statusLabel(row.scope_status)}
              </div>
              <h2 className="owner-card-title" style={{ marginTop: '10px' }}>{scopeLabel(row.readiness_scope)}</h2>
              <p className="owner-card-copy">{row.blocking_count || 0} блокируют · {row.warn_count || 0} требуют внимания · {row.pass_count || 0} пройдено</p>
            </article>
          ))}
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Исторические условия readiness v2 (не текущая Search v12)</h2>
              <div className="owner-section-kicker">Архивная диагностика legacy модели. Реальная готовность Search Release показана выше; коммерческий запуск проверяется отдельно.</div>
            </div>
          </div>
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Зона</th>
                <th>Проверка</th>
                <th>Статус</th>
                <th>Ответственный</th>
                <th>Что это значит</th>
                <th>Что делать дальше</th>
              </tr>
            </thead>
            <tbody>
              {orderedGates.map((row) => {
                const copy = launchGateOwnerCopy(row.gate_code, { summary: row.summary, action: row.next_action });
                return (
                <tr key={`${row.readiness_scope}-${row.gate_code}`}>
                  <td>{scopeLabel(row.readiness_scope)}</td>
                  <td>
                    <strong title={asText(row.gate_code)}>{gateTitle(row.gate_code, row.gate_name)}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${stateClass(row.gate_status)}`}>
                      {statusLabel(row.gate_status)}
                    </span>
                    {row.is_blocker ? <div className="badge-row"><span className="badge">обязательная проверка</span></div> : null}
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>{copy.summary}</td>
                  <td>{copy.action}</td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        </section>
      </div>
    </main>
  );
}
