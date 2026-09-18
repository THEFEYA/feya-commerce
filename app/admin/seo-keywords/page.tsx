import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SeoKeywordCleanupReportRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_KEYWORDS_LIMIT = 200;

const FILTERS = [
  { key: 'cleanup_pipeline_status', label: 'Состояние обработки' },
  { key: 'priority_tier', label: 'Приоритет' },
  { key: 'queue_suggested_page_level', label: 'Уровень страницы' },
] as const;

async function getSeoKeywordRows(): Promise<{ rows: SeoKeywordCleanupReportRow[]; totalCount: number | null; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], totalCount: null, error: getMissingAdminDataEnvMessage() };
  }

  const { data, error, count } = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select('*', { count: 'exact' })
    .limit(SEO_KEYWORDS_LIMIT);

  if (error) {
    return { rows: [], totalCount: null, error: error.message };
  }

  return { rows: (data || []) as SeoKeywordCleanupReportRow[], totalCount: count };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function normalizeStatus(value: unknown) {
  return asText(value, '').trim().toLowerCase();
}

function countCleanupStatus(rows: SeoKeywordCleanupReportRow[], status: string) {
  return rows.filter((row) => normalizeStatus(row.cleanup_pipeline_status) === status).length;
}

function getUniqueValues(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return Array.from(new Set(rows.map((row) => asText(row[key], '')).filter(Boolean))).slice(0, 10);
}

function keywordStatusLabel(value: unknown) {
  const key = normalizeStatus(value);
  const labels: Record<string, string> = {
    needs_ai_cleanup: 'Нужна автоматическая очистка',
    needs_human_review: 'Нужна проверка человеком',
    ready_for_metric_validation: 'Готово к проверке метрик',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    hold: 'Отложено',
    clean: 'Готово',
    ready: 'Готово',
    pending: 'Ожидает',
    not_checked: 'Ещё не проверено',
  };
  return labels[key] || asText(value);
}

function boolLabel(value: unknown) {
  if (value === true || String(value).toLowerCase() === 'true') return 'Да';
  if (value === false || String(value).toLowerCase() === 'false') return 'Нет';
  return asText(value);
}

function getStatusClass(value: unknown) {
  const normalized = normalizeStatus(value);

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('clean')) {
    return 'ok';
  }

  if (normalized.includes('hold') || normalized.includes('error') || normalized.includes('reject')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminSeoKeywordsPage() {
  const { rows, totalCount, error } = await getSeoKeywordRows();

  const metrics = [
    { label: 'Всего в очереди', value: totalCount ?? rows.length },
    { label: 'Показано строк', value: rows.length },
    { label: 'Нужна автоматическая очистка', value: countCleanupStatus(rows, 'needs_ai_cleanup') },
    { label: 'Нужна проверка человеком', value: countCleanupStatus(rows, 'needs_human_review') },
    { label: 'Готово к проверке метрик', value: countCleanupStatus(rows, 'ready_for_metric_validation') },
    { label: 'Отложено', value: countCleanupStatus(rows, 'hold') },
  ];

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/review">Проверка</Link>
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-keyword-review">Проверка ключевых слов</Link>
            <Link href="/admin/seo-keywords">SEO и ключевые слова</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Проверка SEO-ключевых слов · только просмотр</div>
          <h1>SEO и ключевые слова</h1>
          <p>
            Ключевые запросы остаются на языке поиска и не переводятся. Кандидат становится рабочим SEO-ключом только после очистки, проверки реальных метрик и подтверждения. Система не придумывает объём поиска, конкуренцию, CTR, ставки или тренды.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          {metrics.map((metric) => (
            <div className="card metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="toolbar" aria-label="Available read-only filters">
          {FILTERS.map((filter) => {
            const values = getUniqueValues(rows, filter.key);
            return (
              <div className="filter-chip" key={filter.key}>
                <strong>{filter.label}:</strong> {values.length ? values.join(' / ') : 'нет значений'}
              </div>
            );
          })}
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ключевой запрос</th>
                <th>Нормализованный запрос</th>
                <th>Приоритет</th>
                <th>Уровень страницы</th>
                <th>Ось</th>
                <th>Шаблон</th>
                <th>Проверка</th>
                <th>Обработка</th>
                <th>Очищенный запрос</th>
                <th>Предложенный запрос</th>
                <th>Нужна API-проверка</th>
                <th>Отложить</th>
                <th>Предупреждения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${asText(row.keyword, 'keyword')}-${index}`}>
                  <td>{asText(row.keyword)}</td>
                  <td>{asText(row.keyword_norm)}</td>
                  <td>{asText(row.priority_tier)}</td>
                  <td>{asText(row.queue_suggested_page_level)}</td>
                  <td>{asText(row.queue_keyword_axis)}</td>
                  <td>{asText(row.queue_keyword_pattern)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.validation_status)}`}>{keywordStatusLabel(row.validation_status)}</span></td>
                  <td><span className={`status-pill ${getStatusClass(row.cleanup_pipeline_status)}`}>{keywordStatusLabel(row.cleanup_pipeline_status)}</span></td>
                  <td>{asText(row.cleaned_keyword)}</td>
                  <td>{asText(row.suggested_keyword)}</td>
                  <td>{boolLabel(row.should_validate_api)}</td>
                  <td>{boolLabel(row.should_hold)}</td>
                  <td>{asText(row.warning_flags)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
