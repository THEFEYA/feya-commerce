import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ContentBriefCompilerStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BRIEF_LIMIT = 400;

async function getBriefs(): Promise<{ rows: ContentBriefCompilerStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_content_brief_compiler_status_safe_v1')
    .select('*')
    .order('can_produce_canonical_brief', { ascending: false })
    .order('can_generate_shadow', { ascending: false })
    .order('compiler_status', { ascending: true })
    .limit(BRIEF_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ContentBriefCompilerStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function compilerStatusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SHADOW_READY: 'Можно готовить безопасный черновик',
    CANONICAL_READY: 'Готово канонически',
    BLOCKED_KEYWORD_REVIEW: 'Блокирует проверка ключевых слов',
    BLOCKED_PRODUCT_FACT_REVIEW: 'Блокирует проверка фактов товара',
    BLOCKED_GENERATION_GATE: 'Блокирует генерация',
    BLOCKED_NO_SEO_PAGE: 'Нет SEO-страницы',
  };
  return labels[key] || asText(value);
}

function qualityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key.includes('READY') || key.includes('PASS') || key.includes('APPROVED')) return 'Готово';
  if (key.includes('BLOCK') || key.includes('FAIL') || key.includes('REVIEW')) return 'Нужно проверить';
  if (key.includes('MISSING')) return 'Нет данных';
  return key ? 'Частично готово' : '—';
}

function pageStateLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'CANDIDATE') return 'Кандидат';
  if (key === 'INDEXABLE') return 'Разрешена к индексации';
  if (key === 'NOINDEX') return 'Не индексировать';
  if (key.includes('ACTIVE')) return 'Активна';
  return key ? 'Подготовка' : '—';
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'SHADOW_READY' || normalized.includes('CANONICAL_READY')) return 'ok';
  if (normalized.includes('BLOCKED')) return 'danger';
  return 'warning';
}

function count(rows: ContentBriefCompilerStatusRow[], predicate: (row: ContentBriefCompilerStatusRow) => boolean) {
  return rows.filter(predicate).length;
}

export default async function AdminContentBriefsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getBriefs();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const shadowReady = count(rows, (row) => Boolean(row.can_generate_shadow));
  const canonicalReady = count(rows, (row) => Boolean(row.can_produce_canonical_brief));
  const blockedKeyword = count(rows, (row) => row.compiler_status === 'BLOCKED_KEYWORD_REVIEW');
  const blockedFacts = count(rows, (row) => row.compiler_status === 'BLOCKED_PRODUCT_FACT_REVIEW');
  const blockedGeneration = count(rows, (row) => row.compiler_status === 'BLOCKED_GENERATION_GATE');
  const missingPage = count(rows, (row) => row.compiler_status === 'BLOCKED_NO_SEO_PAGE');

  const attentionStates = new Set([
    'BLOCKED_KEYWORD_REVIEW',
    'BLOCKED_PRODUCT_FACT_REVIEW',
    'BLOCKED_GENERATION_GATE',
    'BLOCKED_NO_SEO_PAGE',
  ]);
  const filteredRows = rows
    .filter((row) => {
      const haystack = [row.url_path, row.canonical_product_id, row.primary_keyword]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const state = String(row.compiler_status || '');
      const matchesState =
        stateFilter === 'all'
          ? true
          : stateFilter === 'attention'
            ? attentionStates.has(state)
            : state === stateFilter;
      return matchesQuery && matchesState;
    })
    .sort((a, b) => {
      const rank = (state: unknown) => {
        const key = String(state || '');
        if (key === 'BLOCKED_PRODUCT_FACT_REVIEW') return 0;
        if (key === 'BLOCKED_KEYWORD_REVIEW') return 1;
        if (key === 'BLOCKED_NO_SEO_PAGE') return 2;
        if (key === 'BLOCKED_GENERATION_GATE') return 3;
        if (key === 'SHADOW_READY') return 4;
        if (key === 'CANONICAL_READY') return 5;
        return 6;
      };
      return rank(a.compiler_status) - rank(b.compiler_status) || String(a.url_path || '').localeCompare(String(b.url_path || ''));
    });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stateFilter !== 'attention') next.set('state', stateFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/content-briefs?${query}` : '/admin/content-briefs';
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/content-briefs">Контентные задания</Link>
            <Link href="/admin/content-qa">Контроль качества</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Детерминированные контентные задания · безопасный режим</div>
          <h1>Контентные задания</h1>
          <p>
            Факты товара, выбранные оси, план ключевых слов, правила бизнеса, политика контента и состояние SEO-страницы собираются детерминированно, без генеративной модели. Каноническая готовность не считается достигнутой, пока нет подтверждённой ответственности страницы и одобренного плана ключевых слов.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{blockedFacts + blockedKeyword + blockedGeneration + missingPage}</strong><span>Требуют устранить блокеры</span></div>
          <div className="owner-summary-cell"><strong>{shadowReady}</strong><span>Можно готовить безопасный черновик</span></div>
          <div className="owner-summary-cell"><strong>{canonicalReady}</strong><span>Канонически готовы</span></div>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Товаров в реестре заданий</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Готовность к безопасному черновику не означает готовность к публикации. Это значит, что фактов и контекста достаточно для экспериментального черновика, но нерешённые ограничения по метрикам и ответственности страницы сохраняются.
        </div>

        <form action="/admin/content-briefs" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_300px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара / ключа</div>
              <input name="q" defaultValue={q} className="field" placeholder="название, путь, ID или ключ" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние задания</div>
              <select name="state" defaultValue={stateFilter} className="field">
                <option value="attention">Требует внимания</option>
                <option value="BLOCKED_PRODUCT_FACT_REVIEW">Блокируют факты товара</option>
                <option value="BLOCKED_KEYWORD_REVIEW">Блокирует проверка ключей</option>
                <option value="BLOCKED_GENERATION_GATE">Блокирует генерация</option>
                <option value="BLOCKED_NO_SEO_PAGE">Нет SEO-страницы</option>
                <option value="SHADOW_READY">Можно готовить безопасный черновик</option>
                <option value="CANONICAL_READY">Канонически готово</option>
                <option value="all">Все состояния</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>После фильтра: {filteredRows.length}</span>
            <span>Показано: {visibleRows.length}</span>
            <Link href="/admin/content-briefs">Сбросить</Link>
          </div>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Состояние задания</th>
                <th>Факты</th>
                <th>План ключевых слов</th>
                <th>Основной ключ</th>
                <th>SEO-страница</th>
                <th>Ответственность страницы</th>
                <th>Правила бизнеса</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.brief_queue_id}>
                  <td>
                    <Link href={`/admin/products/${row.canonical_product_id}`}>
                      {row.url_path || row.canonical_product_id}
                    </Link>
                    <div className="muted" title={asText(row.page_goal_code)}>SEO-задание товара</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.compiler_status)}`}>
                      {compilerStatusLabel(row.compiler_status)}
                    </span>
                    <div className="badge-row">
                      {row.can_generate_shadow ? <span className="badge">безопасный черновик</span> : null}
                      {row.can_produce_canonical_brief ? <span className="status-pill ok">канонически готово</span> : null}
                    </div>
                  </td>
                  <td>
                    {qualityLabel(row.product_fact_quality_status)}
                    <div className="muted" title={asText(row.generation_gate_status)}>{qualityLabel(row.generation_gate_status)}</div>
                  </td>
                  <td title={asText(row.plan_status)}>{qualityLabel(row.plan_status)}</td>
                  <td>{asText(row.primary_keyword)}</td>
                  <td>
                    {row.seo_page_id ? pageStateLabel(row.indexation_intent) : 'Нет SEO-страницы'}
                    <div className="muted" title={asText(row.page_lifecycle_state)}>{pageStateLabel(row.page_lifecycle_state)}</div>
                  </td>
                  <td>
                    {row.primary_ownership_count || 0} основных
                    <div className="muted">{row.ownership_count || 0} всего</div>
                  </td>
                  <td>{row.business_truth_count || 0} активных правил</td>
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
