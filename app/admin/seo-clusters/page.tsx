import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { QueryClusterReviewRow } from '@/lib/types';

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

export default async function AdminSeoClustersPage() {
  const { rows, error } = await getQueue();

  const ready = countStatus(rows, 'READY_FOR_SEMANTIC_CLUSTERING');
  const cleanupReview = countStatus(rows, 'NEEDS_CLEANUP_REVIEW');
  const cleanup = countStatus(rows, 'NEEDS_CLEANUP');
  const metrics = countStatus(rows, 'WAIT_FOR_METRICS');
  const hold = countStatus(rows, 'HOLD');
  const clustered = countStatus(rows, 'ALREADY_CLUSTERED');

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

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Активных ключей загружено</span></div>
          <div className="card metric"><strong>{ready}</strong><span>Готовы к смысловой группировке</span></div>
          <div className="card metric"><strong>{cleanupReview}</strong><span>Нужна проверка очистки</span></div>
          <div className="card metric"><strong>{cleanup}</strong><span>Нужна очистка</span></div>
          <div className="card metric"><strong>{metrics}</strong><span>Ждут метрик</span></div>
          <div className="card metric"><strong>{clustered}</strong><span>Уже сгруппировано</span></div>
          <div className="card metric"><strong>{hold}</strong><span>Отложено</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Ось и шаблон — только признаки для анализа, а не готовые группы запросов. Группа становится канонической только после смысловой проверки и явного одобрения.
        </div>

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
              {rows.map((row) => (
                <tr key={row.keyword_id}>
                  <td>
                    <strong>{asText(row.semantic_keyword_candidate || row.source_keyword)}</strong>
                    {row.semantic_keyword_candidate && row.semantic_keyword_candidate !== row.source_keyword ? (
                      <div className="muted">исходный: {asText(row.source_keyword)}</div>
                    ) : null}
                    <div className="badge-row">
                      <span className="badge">{asText(row.suggested_page_level)}</span>
                      {row.ai_intent ? <span className="badge">{row.ai_intent}</span> : null}
                    </div>
                  </td>
                  <td>{asText(row.clustering_lane)}</td>
                  <td>
                    {asText(row.keyword_axis)}
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
      </div>
    </main>
  );
}
