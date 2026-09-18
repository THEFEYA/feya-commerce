import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { KeywordCleanupReviewStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_LIMIT = 500;

async function getRows(): Promise<{ rows: KeywordCleanupReviewStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_keyword_cleanup_review_status_safe_v1')
    .select('*')
    .order('cleanup_id', { ascending: true })
    .limit(REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as KeywordCleanupReviewStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function riskLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'LOW') return 'Низкий';
  if (key === 'MEDIUM') return 'Средний';
  if (key === 'HIGH') return 'Высокий';
  return asText(value);
}

function recommendationLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    APPROVE: 'Одобрить',
    REJECT: 'Исключить',
    HUMAN_REVIEW: 'Проверить вручную',
    HOLD: 'Отложить',
  };
  return labels[key] || asText(value);
}

function humanStatusLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    pending: 'Ожидает проверки',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    hold: 'Отложено',
  };
  return labels[key] || asText(value);
}

function laneLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    FAST_TRACK: 'Быстрая проверка',
    SEMANTIC_REVIEW: 'Смысловая проверка',
    ROUTING_REVIEW: 'Проверка маршрута',
    ALT_REVIEW: 'Проверка ALT',
    HUMAN_REVIEW: 'Ручная проверка',
  };
  return labels[key] || asText(value);
}

function riskClass(value: unknown) {
  const risk = asText(value, '').toUpperCase();
  if (risk === 'LOW') return 'ok';
  if (risk === 'HIGH') return 'danger';
  return 'warning';
}

function recClass(value: unknown) {
  const rec = asText(value, '').toUpperCase();
  if (rec === 'APPROVE') return 'ok';
  if (rec === 'REJECT') return 'danger';
  return 'warning';
}

export default async function AdminKeywordCleanupReviewPage() {
  const { rows, error } = await getRows();

  const pending = rows.filter((row) => row.review_status === 'pending').length;
  const low = rows.filter((row) => row.review_risk === 'LOW').length;
  const medium = rows.filter((row) => row.review_risk === 'MEDIUM').length;
  const high = rows.filter((row) => row.review_risk === 'HIGH').length;
  const recommended = rows.filter((row) => Boolean(row.recommendation_id)).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-keywords">SEO-ключи</Link>
            <Link href="/admin/seo-keyword-review">Проверка ключей</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Проверка очистки ключей · только просмотр</div>
          <h1>Проверка ключевых слов</h1>
          <p>
            Автоматическая очистка, независимая рекомендация и решение человека — разные этапы. Рекомендация AI никогда сама не меняет человеческий статус проверки.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Кандидатов на проверку</span></div>
          <div className="card metric"><strong>{pending}</strong><span>Ждут человека</span></div>
          <div className="card metric"><strong>{low}</strong><span>Низкий риск проверки</span></div>
          <div className="card metric"><strong>{medium}</strong><span>Средний риск проверки</span></div>
          <div className="card metric"><strong>{high}</strong><span>Высокий риск проверки</span></div>
          <div className="card metric"><strong>{recommended}</strong><span>Есть независимая рекомендация</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Низкий / средний / высокий — это сложность проверки, а не SEO-ценность ключа. Объём поиска, конкуренция и позиции здесь не придумываются.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ключевой запрос</th>
                <th>Куда использовать</th>
                <th>Сложность проверки</th>
                <th>Предупреждения очистки</th>
                <th>Независимая рекомендация</th>
                <th>Решение человека</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cleanup_id}>
                  <td>
                    <strong>{asText(row.effective_keyword, row.original_keyword || '—')}</strong>
                    <div className="muted">исходный: {asText(row.original_keyword)}</div>
                    {row.normalization_only ? <div className="badge-row"><span className="badge">только нормализация</span></div> : null}
                  </td>
                  <td>
                    {asText(row.suggested_page_level)}
                    <div className="muted">{asText(row.ai_intent)}</div>
                    <div className="badge-row">
                      <span className="badge">{asText(row.keyword_axis)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${riskClass(row.review_risk)}`}>
                      {riskLabel(row.review_risk)}
                    </span>
                    <div className="muted">{laneLabel(row.review_lane)}</div>
                  </td>
                  <td>{asText(row.warning_flags, 'нет')}</td>
                  <td>
                    {row.recommendation ? (
                      <>
                        <span className={`status-pill ${recClass(row.recommendation)}`}>
                          {recommendationLabel(row.recommendation)}
                        </span>
                        <div className="muted">{asText(row.recommended_keyword)}</div>
                        <div className="muted">{asText(row.recommendation_reason)}</div>
                      </>
                    ) : (
                      <span className="badge">ещё не запускалось</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${row.review_status === 'approved' ? 'ok' : row.review_status === 'rejected' ? 'danger' : 'warning'}`}>
                      {humanStatusLabel(row.review_status)}
                    </span>
                    {row.approved_keyword ? <div className="muted">{row.approved_keyword}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
