import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { LearningRegistryRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

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

function domainLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SEO: 'SEO',
    SEARCH: 'Органический поиск',
    CONTENT: 'Контент',
    PRODUCT: 'Товары',
    COMMERCE: 'Продажи',
    MEASUREMENT: 'Измерение',
    DATA: 'Данные',
    GROWTH: 'Рост',
  };
  return labels[key] || (key ? 'FEYA' : '—');
}

function dateLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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
            <Link href="/admin/learning">Выводы</Link>
            <Link href="/admin/scenario-tests">Проверки сценариев</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Реестр выводов и улучшений · только просмотр</div>
          <h1>Выводы</h1>
          <p>
            Наблюдение становится повторно используемым выводом только после повторных доказательств. Кандидат в правило требует целевой регрессионной проверки и человеческого подтверждения; агент не может сам переписать правило.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{observations}</strong><span>Новых наблюдений</span></div>
          <div className="owner-summary-cell"><strong>{repeated}</strong><span>Повторяющихся наблюдений</span></div>
          <div className="owner-summary-cell"><strong>{replicated}</strong><span>Подтверждённых выводов</span></div>
          <div className="owner-summary-cell"><strong>{candidates + adopted}</strong><span>Кандидатов в правила / принятых правил</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">Подтверждённых выводов пока нет.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Вывод</th>
                  <th>Область</th>
                  <th>Этап</th>
                  <th>Доказательства</th>
                  <th>Кандидат в правило</th>
                  <th>Регрессия</th>
                  <th>Принятие</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.learning_id}>
                    <td>
                      <strong title={asText(row.learning_code)}>{asText(row.title, row.learning_code || '—')}</strong>
                      <div className="muted">{asText(row.learning_statement)}</div>
                    </td>
                    <td title={asText(row.domain)}>{domainLabel(row.domain)}</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.learning_status)}`}>
                        {statusLabel(row.learning_status)}
                      </span>
                    </td>
                    <td>
                      {row.evidence_count ?? 0} доказательств
                      <div className="muted">{row.distinct_context_count ?? 0} контекстов</div>
                    </td>
                    <td>
                      {asText(row.proposed_policy_name, row.proposed_policy_code || '—')}
                      {row.proposed_policy_version ? (
                        <div className="muted" title={asText(row.proposed_policy_code)}>версия {row.proposed_policy_version}</div>
                      ) : null}
                      {row.candidate_version ? <div className="muted">кандидат {row.candidate_version}</div> : null}
                    </td>
                    <td>{row.required_scenario_count ?? 0} обязательных сценариев</td>
                    <td>
                      {row.adopted_policy_version ? (
                        <span className="status-pill ok">правило v{row.adopted_policy_version}</span>
                      ) : '—'}
                      {row.adopted_at ? <div className="muted">{dateLabel(row.adopted_at)}</div> : null}
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
