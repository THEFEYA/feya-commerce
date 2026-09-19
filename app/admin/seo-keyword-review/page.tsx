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

export default async function AdminKeywordCleanupReviewPage({ searchParams }: { searchParams: Promise<{ q?: string; risk?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getRows();
  const q = String(params.q || '').trim().toLowerCase();
  const riskFilter = String(params.risk || 'all').toUpperCase();
  const statusFilter = String(params.status || 'pending').toLowerCase();
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 100;

  const pending = rows.filter((row) => row.review_status === 'pending').length;
  const low = rows.filter((row) => row.review_risk === 'LOW').length;
  const medium = rows.filter((row) => row.review_risk === 'MEDIUM').length;
  const high = rows.filter((row) => row.review_risk === 'HIGH').length;
  const recommended = rows.filter((row) => Boolean(row.recommendation_id)).length;

  const filteredRows = rows.filter((row) => {
    const keyword = asText(row.effective_keyword, row.original_keyword || '').toLowerCase();
    const matchesQuery = !q || keyword.includes(q) || asText(row.original_keyword, '').toLowerCase().includes(q);
    const matchesRisk = riskFilter === 'ALL' || asText(row.review_risk, '').toUpperCase() === riskFilter;
    const matchesStatus = statusFilter === 'all' || asText(row.review_status, '').toLowerCase() === statusFilter;
    return matchesQuery && matchesRisk && matchesStatus;
  }).sort((a, b) => {
    const rank = (row: KeywordCleanupReviewStatusRow) => {
      if (row.review_status === 'pending' && row.review_risk === 'HIGH') return 0;
      if (row.review_status === 'pending' && row.review_risk === 'MEDIUM') return 1;
      if (row.review_status === 'pending') return 2;
      return 3;
    };
    return rank(a) - rank(b);
  });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (riskFilter !== 'ALL') next.set('risk', riskFilter);
    if (statusFilter !== 'pending') next.set('status', statusFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-keyword-review?${query}` : '/admin/seo-keyword-review';
  };

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

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{pending}</strong><span>Ждут решения человека</span></div>
          <div className="owner-summary-cell"><strong>{high}</strong><span>Высокая сложность проверки</span></div>
          <div className="owner-summary-cell"><strong>{medium}</strong><span>Средняя сложность проверки</span></div>
          <div className="owner-summary-cell"><strong>{recommended}</strong><span>Есть независимая рекомендация</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Низкий / средний / высокий — это сложность проверки, а не SEO-ценность ключа. Низкий риск сейчас: {low}. Объём поиска, конкуренция и позиции здесь не придумываются.
        </div>

        <form action="/admin/seo-keyword-review" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_190px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск ключа</div>
              <input name="q" defaultValue={q} className="field" placeholder="например: rave outfit" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Сложность</div>
              <select name="risk" defaultValue={riskFilter} className="field">
                <option value="ALL">Все</option>
                <option value="HIGH">Высокая</option>
                <option value="MEDIUM">Средняя</option>
                <option value="LOW">Низкая</option>
              </select>
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Статус</div>
              <select name="status" defaultValue={statusFilter} className="field">
                <option value="pending">Ждут решения</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
                <option value="hold">Отложено</option>
                <option value="all">Все</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Показано: {visibleRows.length}</span>
            <span>После фильтра: {filteredRows.length}</span>
            <Link href="/admin/seo-keyword-review">Сбросить</Link>
          </div>
        </form>

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
              {visibleRows.map((row) => (
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

        {filteredRows.length > pageSize ? (
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
            <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
            <div className="owner-actions" style={{ marginTop: 0 }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
              {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
