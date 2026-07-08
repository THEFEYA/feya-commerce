import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { SeoKeywordCleanupReportRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_KEYWORDS_LIMIT = 500;

const FILTERS = [
  { key: 'cleanup_pipeline_status', label: 'Этап обработки' },
  { key: 'validation_status', label: 'Проверка метрик' },
  { key: 'priority_tier', label: 'Приоритет' },
  { key: 'queue_suggested_page_level', label: 'Куда подходит' },
] as const;

const VALUE_LABELS: Record<string, string> = {
  needs_human_review: 'нужна ручная проверка',
  needs_ai_cleanup: 'нужна AI-чистка',
  ready_for_metric_validation: 'готово к проверке метрик',
  queued: 'в очереди',
  hold: 'удержать',
  tier_1: 'приоритет 1',
  tier_2: 'приоритет 2',
  product: 'товар',
  collection: 'коллекция',
  image_alt: 'alt изображения',
  true: 'да',
  false: 'нет',
};

async function getSeoKeywordRows(): Promise<{ rows: SeoKeywordCleanupReportRow[]; totalCount: number | null; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], totalCount: null, error: getMissingSupabaseEnvMessage() };
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

function readable(value: unknown) {
  const text = asText(value);
  return VALUE_LABELS[text.toLowerCase()] || text;
}

function normalizeStatus(value: unknown) {
  return asText(value, '').trim().toLowerCase();
}

function countByField(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow, value: string) {
  return rows.filter((row) => normalizeStatus(row[key]) === value).length;
}

function countTrue(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return rows.filter((row) => row[key] === true).length;
}

function getUniqueValues(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return Array.from(new Set(rows.map((row) => asText(row[key], '')).filter(Boolean))).slice(0, 10);
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
  const isPartialLoad = totalCount != null && rows.length < totalCount;
  const metricReadyRows = rows.filter((row) => row.should_validate_api === true && row.should_hold !== true);
  const notReadyForScoringRows = rows.filter((row) => normalizeStatus(row.validation_status) !== 'validated');
  const firstWaveRows = metricReadyRows.filter((row) => normalizeStatus(row.priority_tier) === 'tier_1');

  const metrics = [
    { label: 'Всего кандидатов', value: totalCount ?? rows.length },
    { label: 'Загружено', value: rows.length },
    { label: 'Нужна ручная проверка', value: countByField(rows, 'cleanup_pipeline_status', 'needs_human_review') },
    { label: 'В очереди на метрики', value: countByField(rows, 'validation_status', 'queued') },
    { label: 'Нужно проверить через API', value: countTrue(rows, 'should_validate_api') },
    { label: 'На удержании', value: countTrue(rows, 'should_hold') },
    { label: 'Приоритет 1', value: countByField(rows, 'priority_tier', 'tier_1') },
    { label: 'Приоритет 2', value: countByField(rows, 'priority_tier', 'tier_2') },
  ];

  const readinessCards = [
    { title: 'Готово к проверке метрик', value: metricReadyRows.length, text: 'Можно отправлять в Google Ads API, ручной CSV или другой подтверждённый источник.' },
    { title: 'Первая волна', value: firstWaveRows.length, text: 'Приоритет 1: эти слова логично проверять первыми, чтобы быстрее перейти к SEO-черновику товара.' },
    { title: 'Нельзя финально оценивать', value: notReadyForScoringRows.length, text: 'Нет подтверждённых метрик. Эти слова нельзя использовать для финального scoring и массовой генерации.' },
    { title: 'Следующий результат', value: '1', text: 'Первый безопасный SEO-черновик для одного товара после проверки/выбора ключей.' },
  ];

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/review">Проверка</Link>
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-keywords">SEO-ключи</Link>
            <Link href="/shop">Витрина</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Шлюз проверки SEO-ключей</div>
          <h1>SEO-ключи</h1>
          <p>
            Это не финальные ключевые слова для сайта. Это очередь кандидатов: сначала проверяем смысл, реальные метрики, соответствие товару и риск каннибализации, только потом допускаем слова к title, description, alt и коллекциям.
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

        {!error ? (
          <section className="notice">
            <strong>Текущее решение:</strong> не запускать автоматическую чистку и не делать финальный scoring из этой очереди. Сначала ручная проверка и подтверждение метрик из реального источника.
            {isPartialLoad ? ` Загружено ${rows.length} из ${totalCount} строк, поэтому счётчики частичные.` : ' Текущий лимит загружает всю подтверждённую очередь.'}
          </section>
        ) : null}

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          {readinessCards.map((card) => (
            <div className="card metric" key={card.title}>
              <strong>{card.value}</strong>
              <span>{card.title}</span>
              <small>{card.text}</small>
            </div>
          ))}
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card"><h3>1. Смысл</h3><p>Определяем: товар, коллекция, стиль, событие, alt или спорное слово.</p></div>
          <div className="card"><h3>2. Метрики</h3><p>Проверяем спрос, конкуренцию и регион через API, CSV или другой подтверждённый источник.</p></div>
          <div className="card"><h3>3. Распределение</h3><p>Широкие слова идут в коллекции, точные — в товары, видимые детали — в alt.</p></div>
          <div className="card"><h3>4. Черновик контента</h3><p>Готовим SEO-черновик только после связки: факты товара + проверенные ключи.</p></div>
        </section>

        <section className="toolbar" aria-label="Доступные read-only фильтры">
          {FILTERS.map((filter) => {
            const values = getUniqueValues(rows, filter.key);
            return (
              <div className="filter-chip" key={filter.key}>
                <strong>{filter.label}:</strong> {values.length ? values.map(readable).join(' / ') : 'нет загруженных значений'}
              </div>
            );
          })}
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ключевое слово</th>
                <th>Нормализация</th>
                <th>Приоритет</th>
                <th>Куда подходит</th>
                <th>Ось смысла</th>
                <th>Паттерн</th>
                <th>Проверка метрик</th>
                <th>Этап обработки</th>
                <th>Очищенный вариант</th>
                <th>Предложение</th>
                <th>Нужно API</th>
                <th>Удержать</th>
                <th>Предупреждения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${asText(row.keyword, 'keyword')}-${index}`}>
                  <td>{asText(row.keyword)}</td>
                  <td>{asText(row.keyword_norm)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.priority_tier)}`}>{readable(row.priority_tier)}</span></td>
                  <td>{readable(row.queue_suggested_page_level)}</td>
                  <td>{asText(row.queue_keyword_axis)}</td>
                  <td>{asText(row.queue_keyword_pattern)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.validation_status)}`}>{readable(row.validation_status)}</span></td>
                  <td><span className={`status-pill ${getStatusClass(row.cleanup_pipeline_status)}`}>{readable(row.cleanup_pipeline_status)}</span></td>
                  <td>{asText(row.cleaned_keyword)}</td>
                  <td>{asText(row.suggested_keyword)}</td>
                  <td>{readable(row.should_validate_api)}</td>
                  <td>{readable(row.should_hold)}</td>
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
