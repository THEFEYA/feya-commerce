import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SeoPagePortfolioRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PORTFOLIO_LIMIT = 350;

async function getPortfolio(): Promise<{ rows: SeoPagePortfolioRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_seo_page_portfolio_safe_v1')
    .select('*')
    .order('url_path', { ascending: true })
    .limit(PORTFOLIO_LIMIT);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as SeoPagePortfolioRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function portfolioLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    bootstrap: 'Подготовка',
    candidate: 'Кандидат',
    indexable: 'Разрешена',
    noindex: 'Не индексировать',
    active: 'Активна',
    mature: 'Стабильна',
    protected: 'Защищена',
  };
  return labels[key] || asText(value);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toLowerCase();

  if (normalized.includes('mature') || normalized.includes('measurable') || normalized.includes('indexable') || normalized.includes('protected')) {
    return 'ok';
  }

  if (normalized.includes('retire') || normalized.includes('deprecated') || normalized.includes('noindex')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminSeoPortfolioPage() {
  const { rows, error } = await getPortfolio();

  const candidateCount = rows.filter((row) => row.indexation_intent === 'candidate').length;
  const indexableCount = rows.filter((row) => row.indexation_intent === 'indexable').length;
  const protectedCount = rows.filter((row) => row.protected_winner_flag).length;
  const primaryOwnerCount = rows.filter((row) => (row.primary_ownership_count || 0) > 0).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-keywords">Ключевые слова</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/seo-ownership-proposals">Ответственность страниц</Link>
            <Link href="/admin/seo-indexability">Индексация</Link>
            <Link href="/admin/review">Проверка</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">SEO-портфель · только просмотр</div>
          <h1>SEO-страницы</h1>
          <p>
            Стабильный список страниц и их поисковое состояние. Страницы остаются кандидатами, пока группы запросов, ответственность и допуск к индексации не подтверждены.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Страниц</span></div>
          <div className="card metric"><strong>{candidateCount}</strong><span>Кандидатов на индексацию</span></div>
          <div className="card metric"><strong>{indexableCount}</strong><span>Разрешено индексировать</span></div>
          <div className="card metric"><strong>{primaryOwnerCount}</strong><span>Есть основная группа запросов</span></div>
          <div className="card metric"><strong>{protectedCount}</strong><span>Защищённых успешных страниц</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Текущее ожидаемое состояние: страницы товаров уже существуют, но группы запросов и ответственность страниц ещё не подтверждены. Это не ошибка и не повод включать индексацию автоматически.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Страница</th>
                <th>Путь</th>
                <th>Тип</th>
                <th>Этап</th>
                <th>Индексация</th>
                <th>Ответственность за запросы</th>
                <th>Рынок</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.seo_page_id}>
                  <td>
                    {row.canonical_product_id ? (
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {row.card_title || row.h1 || row.seo_page_id}
                      </Link>
                    ) : asText(row.card_title || row.h1 || row.seo_page_id)}
                    {row.protected_winner_flag ? <div className="badge-row"><span className="status-pill ok">Защищена от лишних изменений</span></div> : null}
                  </td>
                  <td>{asText(row.url_path)}</td>
                  <td>{asText(row.page_type)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.lifecycle_state)}`}>{portfolioLabel(row.lifecycle_state)}</span></td>
                  <td><span className={`status-pill ${getStatusClass(row.indexation_intent)}`}>{portfolioLabel(row.indexation_intent)}</span></td>
                  <td>
                    <span className="badge">Всего: {row.ownership_count || 0}</span>
                    <div className="badge-row">
                      <span className="badge">Основных: {row.primary_ownership_count || 0}</span>
                    </div>
                  </td>
                  <td>{asText(row.market_code)} / {asText(row.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
