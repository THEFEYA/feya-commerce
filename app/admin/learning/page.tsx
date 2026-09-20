import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerLearningDrawerClient } from '@/components/admin/OwnerLearningDrawerClient';
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

  const confirmedRows = rows.filter((row) => ['REPLICATED_LEARNING', 'ADOPTED_POLICY'].includes(String(row.learning_status || '')));
  const developingRows = rows.filter((row) => !confirmedRows.includes(row));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Результаты · обучение системы</div>
            <h1>Выводы</h1>
            <p>Наблюдение становится повторно используемым выводом только после повторных доказательств. FEYA не превращает один удачный случай в правило автоматически.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/results" className="owner-button">Назад к результатам</Link>
            <Link href="/admin/scenario-tests" className="owner-button">Проверки сценариев</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{observations}</strong><span>Новых наблюдений</span></div>
          <div className="owner-summary-cell"><strong>{repeated}</strong><span>Повторяющихся наблюдений</span></div>
          <div className="owner-summary-cell"><strong>{replicated}</strong><span>Подтверждённых выводов</span></div>
          <div className="owner-summary-cell"><strong>{adopted}</strong><span>Принятых правил</span></div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Подтверждённые выводы</h2>
              <div className="owner-section-kicker">Только то, что прошло достаточный уровень повторяемости</div>
            </div>
          </div>

          {confirmedRows.length ? (
            <div className="owner-grid two">
              {confirmedRows.map((row) => (
                <article className="owner-card is-success" key={row.learning_id}>
                  <div className="owner-card-meta">
                    <span className="owner-status is-success">{statusLabel(row.learning_status)}</span>
                    <span>{domainLabel(row.domain)}</span>
                  </div>
                  <h3 className="owner-card-title">{asText(row.title, 'Подтверждённый вывод')}</h3>
                  <p className="owner-card-copy">{asText(row.learning_statement)}</p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>{row.evidence_count ?? 0} доказательств</span>
                    <span>{row.distinct_context_count ?? 0} контекстов</span>
                    {row.adopted_policy_version ? <span>правило v{row.adopted_policy_version}</span> : null}
                  </div>
                  <div className="owner-actions"><OwnerLearningDrawerClient row={row} /></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Подтверждённых выводов пока нет. Это нормальное состояние до накопления повторяемых результатов.</div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Выводы в развитии</strong><small>Наблюдения, повторения и кандидаты в правила ещё не считаются корпоративным знанием</small></span>
              <span className="owner-section-kicker">{developingRows.length}</span>
            </summary>
            <div className="owner-disclosure-body owner-list">
              {developingRows.length ? developingRows.map((row) => (
                <article className="owner-list-row" key={row.learning_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta"><span>{statusLabel(row.learning_status)}</span><span>{domainLabel(row.domain)}</span></div>
                    <h3>{asText(row.title, 'Наблюдение')}</h3>
                    <p>{asText(row.learning_statement)}</p>
                  </div>
                  <div className="owner-list-row-side"><span className="owner-section-kicker">{row.evidence_count ?? 0} доказательств</span><OwnerLearningDrawerClient row={row} /></div>
                </article>
              )) : <div className="owner-empty">Наблюдений в развитии сейчас нет.</div>}
            </div>
          </details>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Технический реестр</strong><small>Полная история зрелости, кандидатов в правила и регрессионных требований</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Вывод</th><th>Область</th><th>Этап</th><th>Доказательства</th><th>Кандидат в правило</th><th>Регрессия</th><th>Принятие</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.learning_id}>
                        <td><strong title={asText(row.learning_code)}>{asText(row.title, row.learning_code || '—')}</strong><div className="muted">{asText(row.learning_statement)}</div></td>
                        <td>{domainLabel(row.domain)}</td>
                        <td>{statusLabel(row.learning_status)}</td>
                        <td>{row.evidence_count ?? 0} · {row.distinct_context_count ?? 0} контекстов</td>
                        <td>{asText(row.proposed_policy_name, row.proposed_policy_code || '—')}</td>
                        <td>{row.required_scenario_count ?? 0} сценариев</td>
                        <td>{row.adopted_policy_version ? `v${row.adopted_policy_version}` : '—'}</td>
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
