import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { QueryClusterReviewRow } from '@/lib/types';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const QUEUE_LIMIT = 500;

async function getQueue(): Promise<{ rows: QueryClusterReviewRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_query_cluster_review_queue_v1')
    .select('*')
    .order('priority_tier', { ascending: true })
    .order('product_count', { ascending: false })
    .order('keyword_norm', { ascending: true })
    .limit(QUEUE_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as QueryClusterReviewRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function clusterLaneLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    COLLECTION_INTENT_FAMILY: 'Запрос для коллекции / категории',
    PRODUCT_INTENT_FAMILY: 'Запрос для товара',
    IMAGE_SEMANTIC_SUPPORT: 'Поддержка ALT / изображения',
  };
  return labels[key] || 'Маршрут ещё не классифицирован';
}

function pageLevelLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    collection: 'категория / коллекция',
    product: 'товар',
    image_alt: 'ALT изображения',
  };
  return labels[key] || asText(value);
}

function intentLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    commercial: 'коммерческий',
    'commercial/product/use-case': 'коммерческий / сценарий использования',
    descriptive: 'описательный',
    informational: 'информационный',
    navigational: 'навигационный',
    transactional: 'покупательский',
    unclear: 'неясный',
  };
  return labels[key] || (key ? 'другой' : 'не определён');
}

function axisLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    buyer_use_case: 'сценарий покупателя',
    color_component: 'цвет компонента',
    component: 'компонент',
    effect_component: 'эффект / визуал',
    event_component: 'событие + компонент',
    event_outfit: 'событие + образ',
    material_component: 'материал + компонент',
    persona_component: 'персона + компонент',
    style_component: 'стиль + компонент',
  };
  return labels[key] || asText(value);
}

function clusterStatusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    READY_FOR_SEMANTIC_CLUSTERING: 'Готово к смысловой группировке',
    NEEDS_CLEANUP_REVIEW: 'Нужна проверка очистки',
    NEEDS_CLEANUP: 'Нужна очистка',
    WAIT_FOR_METRICS: 'Ждём метрики',
    HOLD: 'Отложено',
    ALREADY_CLUSTERED: 'Уже сгруппировано',
    PENDING: 'Ожидает проверки',
    MISSING: 'Нет результата очистки',
  };
  return labels[key] || asText(value);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized.includes('READY') || normalized.includes('CLUSTERED')) return 'ok';
  if (normalized.includes('HOLD')) return 'danger';
  return 'warning';
}

function countStatus(rows: QueryClusterReviewRow[], status: string) {
  return rows.filter((row) => row.cluster_queue_status === status).length;
}

export default async function AdminSeoClustersPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getQueue();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 100;

  const ready = countStatus(rows, 'READY_FOR_SEMANTIC_CLUSTERING');
  const cleanupReview = countStatus(rows, 'NEEDS_CLEANUP_REVIEW');
  const cleanup = countStatus(rows, 'NEEDS_CLEANUP');
  const metrics = countStatus(rows, 'WAIT_FOR_METRICS');
  const hold = countStatus(rows, 'HOLD');
  const clustered = countStatus(rows, 'ALREADY_CLUSTERED');

  const attentionStates = new Set(['NEEDS_CLEANUP_REVIEW', 'NEEDS_CLEANUP', 'WAIT_FOR_METRICS', 'HOLD']);
  const filteredRows = rows.filter((row) => {
    const keyword = asText(row.semantic_keyword_candidate || row.source_keyword, '').toLowerCase();
    const matchesQuery = !q || keyword.includes(q) || asText(row.source_keyword, '').toLowerCase().includes(q);
    const state = String(row.cluster_queue_status || '');
    const matchesState =
      stateFilter === 'all'
        ? true
        : stateFilter === 'attention'
          ? attentionStates.has(state)
          : state === stateFilter;
    return matchesQuery && matchesState;
  }).sort((a, b) => {
    const rank = (state: unknown) => {
      const key = String(state || '');
      if (key === 'NEEDS_CLEANUP_REVIEW' || key === 'NEEDS_CLEANUP') return 0;
      if (key === 'WAIT_FOR_METRICS') return 1;
      if (key === 'READY_FOR_SEMANTIC_CLUSTERING') return 2;
      if (key === 'HOLD') return 3;
      return 4;
    };
    return rank(a.cluster_queue_status) - rank(b.cluster_queue_status);
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
    return query ? `/admin/seo-clusters?${query}` : '/admin/seo-clusters';
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-keywords">SEO-ключи</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/seo-cluster-proposals">Предложения групп</Link>
            <Link href="/admin/review">Проверка</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Смысловая группировка запросов · только просмотр</div>
          <h1>Очередь группировки запросов</h1>
          <p>
            Эта очередь не создаёт группы запросов автоматически. Она показывает, достаточно ли по каждому каноническому ключу проверенных смысловых и метрических данных, чтобы перейти к группировке.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{cleanupReview + cleanup}</strong><span>Нужна очистка / проверка</span></div>
          <div className="owner-summary-cell"><strong>{metrics}</strong><span>Ждут метрик</span></div>
          <div className="owner-summary-cell"><strong>{ready}</strong><span>Готовы к смысловой группировке</span></div>
          <div className="owner-summary-cell"><strong>{clustered}</strong><span>Уже сгруппировано</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Ось и шаблон — только признаки для анализа, а не готовые группы запросов. Группа становится канонической только после смысловой проверки и явного одобрения.
        </div>

        <form action="/admin/seo-clusters" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск ключа</div>
              <input name="q" defaultValue={q} className="field" placeholder="например: rave outfit" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
              <select name="state" defaultValue={stateFilter} className="field">
                <option value="attention">Требует внимания</option>
                <option value="NEEDS_CLEANUP_REVIEW">Нужна проверка очистки</option>
                <option value="NEEDS_CLEANUP">Нужна очистка</option>
                <option value="WAIT_FOR_METRICS">Ждёт метрик</option>
                <option value="READY_FOR_SEMANTIC_CLUSTERING">Готово к группировке</option>
                <option value="ALREADY_CLUSTERED">Уже сгруппировано</option>
                <option value="HOLD">Отложено</option>
                <option value="all">Все состояния</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Показано: {visibleRows.length}</span>
            <span>После фильтра: {filteredRows.length}</span>
            <span>Отложено: {hold}</span>
            <Link href="/admin/seo-clusters">Сбросить</Link>
          </div>
          <OwnerSavedViewsClient scope="seo-clusters" />
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ключевой запрос</th>
                <th>Направление</th>
                <th>Ось / шаблон</th>
                <th>Очистка</th>
                <th>Метрики</th>
                <th>Товаров</th>
                <th>Состояние группировки</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.keyword_id}>
                  <td>
                    <strong>{asText(row.semantic_keyword_candidate || row.source_keyword)}</strong>
                    {row.semantic_keyword_candidate && row.semantic_keyword_candidate !== row.source_keyword ? (
                      <div className="muted">исходный: {asText(row.source_keyword)}</div>
                    ) : null}
                    <div className="badge-row">
                      <span className="badge">{pageLevelLabel(row.suggested_page_level)}</span>
                      {row.ai_intent ? <span className="badge">{intentLabel(row.ai_intent)}</span> : null}
                    </div>
                  </td>
                  <td>{clusterLaneLabel(row.clustering_lane)}</td>
                  <td>
                    {axisLabel(row.keyword_axis)}
                    <div className="muted">{asText(row.keyword_pattern)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusClass(row.cleanup_review_status)}`}>
                      {clusterStatusLabel(row.cleanup_review_status || (row.cleanup_id ? 'PENDING' : 'MISSING'))}
                    </span>
                    {row.warning_flags ? <div className="muted">{asText(row.warning_flags)}</div> : null}
                  </td>
                  <td>
                    {row.avg_monthly_searches != null ? <strong>{row.avg_monthly_searches}</strong> : '—'}
                    <div className="muted">{asText(row.metric_data_freshness_status)}</div>
                  </td>
                  <td>{row.product_count ?? 0}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(row.cluster_queue_status)}`}>
                      {clusterStatusLabel(row.cluster_queue_status)}
                    </span>
                    {row.cluster_membership_count ? <div className="muted">{row.cluster_membership_count} групп</div> : null}
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
