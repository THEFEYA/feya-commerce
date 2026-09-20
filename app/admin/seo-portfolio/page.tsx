import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SeoPagePortfolioRow } from '@/lib/types';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';

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

function pageTypeLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    product: 'товарная страница',
    collection: 'категория / коллекция',
    landing: 'посадочная страница',
    editorial: 'редакционная страница',
  };
  return labels[key] || asText(value);
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

export default async function AdminSeoPortfolioPage({ searchParams }: { searchParams: Promise<{ q?: string; indexation?: string; ownership?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getPortfolio();
  const q = String(params.q || '').trim().toLowerCase();
  const indexationFilter = String(params.indexation || 'all').toLowerCase();
  const ownershipFilter = String(params.ownership || 'all').toLowerCase();
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const candidateCount = rows.filter((row) => row.indexation_intent === 'candidate').length;
  const indexableCount = rows.filter((row) => row.indexation_intent === 'indexable').length;
  const protectedCount = rows.filter((row) => row.protected_winner_flag).length;
  const primaryOwnerCount = rows.filter((row) => (row.primary_ownership_count || 0) > 0).length;

  const filteredRows = rows.filter((row) => {
    const haystack = [row.card_title, row.h1, row.url_path]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const matchesIndexation = indexationFilter === 'all' || String(row.indexation_intent || '').toLowerCase() === indexationFilter;
    const hasOwner = Number(row.primary_ownership_count || 0) > 0;
    const matchesOwnership =
      ownershipFilter === 'all'
        ? true
        : ownershipFilter === 'with'
          ? hasOwner
          : !hasOwner;
    return matchesQuery && matchesIndexation && matchesOwnership;
  }).sort((a, b) => {
    const attentionRank = (row: SeoPagePortfolioRow) => {
      if ((row.primary_ownership_count || 0) === 0) return 0;
      if (row.indexation_intent === 'candidate') return 1;
      if (row.indexation_intent === 'indexable') return 3;
      return 2;
    };
    return attentionRank(a) - attentionRank(b) || String(a.url_path || '').localeCompare(String(b.url_path || ''));
  });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (indexationFilter !== 'all') next.set('indexation', indexationFilter);
    if (ownershipFilter !== 'all') next.set('ownership', ownershipFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-portfolio?${query}` : '/admin/seo-portfolio';
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Рост · поисковая архитектура</div>
            <h1>SEO-страницы</h1>
            <p>Стабильный портфель поисковых страниц. Страница остаётся кандидатом, пока не подтверждены её группа запросов, ответственность и отдельный допуск к индексации.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/seo-indexability" className="owner-button">Индексация</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{candidateCount}</strong><span>Кандидатов на индексацию</span></div>
          <div className="owner-summary-cell"><strong>{indexableCount}</strong><span>Разрешено индексировать</span></div>
          <div className="owner-summary-cell"><strong>{primaryOwnerCount}/{rows.length}</strong><span>Страниц имеют основную группу запросов</span></div>
          <div className="owner-summary-cell"><strong>{protectedCount}</strong><span>Защищённых успешных страниц</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Текущее ожидаемое состояние: страницы товаров уже существуют, но группы запросов и ответственность страниц ещё не подтверждены. Это не ошибка и не повод включать индексацию автоматически.
        </div>

        <form action="/admin/seo-portfolio" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_210px_220px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск страницы</div>
              <input name="q" defaultValue={q} className="field" placeholder="название, H1 или путь" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Индексация</div>
              <select name="indexation" defaultValue={indexationFilter} className="field">
                <option value="all">Все</option>
                <option value="candidate">Кандидат</option>
                <option value="indexable">Разрешена</option>
                <option value="noindex">Не индексировать</option>
              </select>
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Основная группа запросов</div>
              <select name="ownership" defaultValue={ownershipFilter} className="field">
                <option value="all">Все</option>
                <option value="with">Назначена</option>
                <option value="without">Не назначена</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Показано: {visibleRows.length}</span>
            <span>После фильтра: {filteredRows.length}</span>
            <Link href="/admin/seo-portfolio">Сбросить</Link>
          </div>
          <OwnerSavedViewsClient scope="seo-portfolio" />
        </form>

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
              {visibleRows.map((row) => (
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
                  <td>{pageTypeLabel(row.page_type)}</td>
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
