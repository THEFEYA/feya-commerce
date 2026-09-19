import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthMetricRegistryRow, GrowthOperationalMetricRow } from '@/lib/types';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMetrics(): Promise<{
  registry: GrowthMetricRegistryRow[];
  values: GrowthOperationalMetricRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { registry: [], values: [], error: getMissingAdminDataEnvMessage() };

  const [registryResult, valuesResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_metric_registry_safe_v1')
      .select('*')
      .order('metric_state', { ascending: true })
      .order('metric_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_growth_operational_metrics_safe_v1')
      .select('*')
      .order('metric_code', { ascending: true }),
  ]);

  if (registryResult.error) return { registry: [], values: [], error: registryResult.error.message };
  if (valuesResult.error) return { registry: [], values: [], error: valuesResult.error.message };

  return {
    registry: (registryResult.data || []) as GrowthMetricRegistryRow[],
    values: (valuesResult.data || []) as GrowthOperationalMetricRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

const METRIC_LABELS: Record<string, string> = {
  CONTENT_BRIEF_CANONICAL_READY_COUNT: 'SEO-брифов готовы к каноническому использованию',
  CONTENT_BRIEF_SHADOW_READY_COUNT: 'SEO-брифов готовы к безопасной генерации',
  CQA_READY_FOR_INDEPENDENT_COUNT: 'Черновиков готовы к независимой CQA',
  QUERY_CLUSTER_READY_KEYWORD_COUNT: 'Ключей готовы к смысловой группировке',
  SEO_PAGE_CANDIDATE_COUNT: 'Страниц-кандидатов SEO',
  EXTERNAL_AVG_MONTHLY_SEARCHES: 'Средний месячный спрос Google Ads',
  COMPLETED_ORDERS: 'Завершённые заказы',
  CQA_FIRST_PASS_ACCEPTANCE_RATE: 'Доля прохождения CQA с первого раза',
  NET_ITEM_REVENUE: 'Чистая выручка по товарам',
  ORGANIC_AVG_POSITION: 'Средняя позиция в Search Console',
  ORGANIC_CLICKS: 'Клики из органического поиска',
  ORGANIC_CTR: 'CTR органического поиска',
  ORGANIC_IMPRESSIONS: 'Показы в органическом поиске',
  PRODUCT_VIEW_EVENTS: 'Просмотры товара на сайте',
};

const METRIC_SUMMARIES: Record<string, { summary: string; limitation: string }> = {
  CONTENT_BRIEF_CANONICAL_READY_COUNT: {
    summary: 'Количество детерминированных SEO-брифов, которые прошли канонические условия сборки.',
    limitation: 'Ожидаемо остаётся низким или нулевым, пока не завершены ответственность страниц за запросы и одобрение планов ключевых слов.',
  },
  CONTENT_BRIEF_SHADOW_READY_COUNT: {
    summary: 'Количество SEO-брифов, для которых уже можно безопасно готовить тестовый черновик.',
    limitation: 'Готовность к безопасному черновику не означает готовность к каноническому использованию или публикации.',
  },
  CQA_READY_FOR_INDEPENDENT_COUNT: {
    summary: 'Количество активных SEO-черновиков, готовых к независимому контролю качества.',
    limitation: 'Это размер рабочей очереди, а не показатель качества контента сам по себе.',
  },
  QUERY_CLUSTER_READY_KEYWORD_COUNT: {
    summary: 'Количество ключей, которые прошли обязательные входные проверки и готовы к смысловой группировке.',
    limitation: 'Нулевое значение означает состояние процесса, а не провал SEO.',
  },
  SEO_PAGE_CANDIDATE_COUNT: {
    summary: 'Количество активных SEO-страниц со статусом кандидата на индексацию.',
    limitation: 'Это метрика готовности процесса, а не бизнес-KPI.',
  },
  EXTERNAL_AVG_MONTHLY_SEARCHES: {
    summary: 'Оценка среднего месячного спроса Google Ads Keyword Planner для конкретного ключа, рынка и языка.',
    limitation: 'Это не SEO-сложность, не позиция в органическом поиске и не спрос в реальном времени; live-доступ API пока ограничен.',
  },
  COMPLETED_ORDERS: {
    summary: 'Количество достоверно завершённых заказов из канонического commerce-источника.',
    limitation: 'Черновики заказов не считаются завершёнными продажами.',
  },
  CQA_FIRST_PASS_ACCEPTANCE_RATE: {
    summary: 'Доля первых независимых CQA-проверок, которые проходят без обязательной повторной переработки.',
    limitation: 'Пока недоступно: ещё нет достаточной истории реальных независимых CQA-запусков.',
  },
  NET_ITEM_REVENUE: {
    summary: 'Чистая выручка по товарам после признанных возвратов и корректировок.',
    limitation: 'Недоступно до появления достоверного источника завершённых заказов и возвратов.',
  },
  ORGANIC_AVG_POSITION: {
    summary: 'Средняя позиция Search Console в заданном срезе.',
    limitation: 'Не является точным rank-tracker; агрегация должна сохранять семантику Search Console.',
  },
  ORGANIC_CLICKS: {
    summary: 'Клики из Google Search Console для заданной страницы, запроса и рынка.',
    limitation: 'Недоступно до подключения production-данных Search Console.',
  },
  ORGANIC_CTR: {
    summary: 'CTR органического поиска: клики, делённые на показы в заданном срезе.',
    limitation: 'Нельзя усреднять готовые проценты CTR по строкам.',
  },
  ORGANIC_IMPRESSIONS: {
    summary: 'Показы из Google Search Console для заданной страницы, запроса и рынка.',
    limitation: 'Недоступно до подключения production-данных Search Console.',
  },
  PRODUCT_VIEW_EVENTS: {
    summary: 'Количество событий просмотра товара на production-сайте.',
    limitation: 'Недоступно до включения и проверки production-инструментации GA4.',
  },
};

function metricCopy(code: unknown, fallbackSummary: unknown, fallbackLimitation: unknown) {
  const key = asText(code, '').toUpperCase();
  return METRIC_SUMMARIES[key] || {
    summary: 'Метрика зарегистрирована в Growth OS и используется только в пределах доступного источника данных.',
    limitation: 'Технические ограничения доступны в деталях источника.',
  };
}

function unitLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    briefs: 'брифов',
    drafts: 'черновиков',
    keywords: 'ключей',
    pages: 'страниц',
    orders: 'заказов',
    clicks: 'кликов',
    impressions: 'показов',
    events: 'событий',
    ratio: '',
    currency: '',
    position: '',
    'estimated searches per month': 'запросов/мес.',
  };
  return labels[key] ?? asText(value, '');
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE') return 'danger';
  return 'warning';
}

export default async function AdminMetricsPage() {
  const { registry, values, error } = await getMetrics();
  const valueMap = new Map(values.map((row) => [row.metric_code, row]));
  const available = registry.filter((row) => row.metric_state === 'AVAILABLE').length;
  const limited = registry.filter((row) => row.metric_state === 'AVAILABLE_WITH_LIMITATIONS').length;
  const unavailable = registry.filter((row) => row.metric_state === 'UNAVAILABLE' || row.metric_state === 'NOT_OBSERVABLE').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/metrics">Метрики</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Реестр метрик · только просмотр</div>
          <h1>Метрики</h1>
          <p>
            Определения метрик версионируются отдельно от промптов агентов. Если источник данных недоступен, FEYA не подставляет выдуманные значения.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{available}</strong><span>Метрик доступны сейчас</span></div>
          <div className="owner-summary-cell"><strong>{limited}</strong><span>Доступны с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Ещё нельзя измерять</span></div>
          <div className="owner-summary-cell"><strong>{values.length}</strong><span>Имеют фактическое текущее значение</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Метрика</th>
                <th>Текущее значение</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Источник / поверхность</th>
                <th>Определение</th>
                <th>Ограничение</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((row) => {
                const current = valueMap.get(row.metric_code);
                return (
                  <tr key={row.metric_code}>
                    <td>
                      <strong title={row.metric_code}>{METRIC_LABELS[row.metric_code] || asText(row.metric_name, 'Метрика')}</strong>
                    </td>
                    <td>
                      {current ? <strong>{asText(current.metric_value)} {unitLabel(current.unit)}</strong> : '—'}
                    </td>
                    <td>{roleLabel(row.owner_role)}</td>
                    <td>
                      <span className={`status-pill ${stateClass(row.metric_state)}`}>
                        {statusLabel(row.metric_state)}
                      </span>
                    </td>
                    <td title={`${asText(row.authority_source)} · ${asText(row.measurement_surface)}`}>{row.metric_state === 'AVAILABLE' ? 'Рабочий внутренний источник' : row.metric_state === 'AVAILABLE_WITH_LIMITATIONS' ? 'Ограниченный внешний / внутренний источник' : 'Источник ещё не подключён'}</td>
                    <td>{metricCopy(row.metric_code, row.public_summary, row.limitations_summary).summary}</td>
                    <td>
                      <details>
                        <summary className="cursor-pointer text-[var(--gold-warm)]">Ограничения</summary>
                        <div className="muted" style={{ marginTop: '6px' }}>
                          {metricCopy(row.metric_code, row.public_summary, row.limitations_summary).limitation}
                          <div title={`${asText(row.public_summary)} · ${asText(row.limitations_summary)}`} style={{ marginTop: '5px', opacity: .65 }}>Технический оригинал сохранён в источнике данных.</div>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
