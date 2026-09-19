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
                    <td>{asText(row.public_summary)}</td>
                    <td><details><summary className="cursor-pointer text-[var(--gold-warm)]">Ограничения</summary><div className="muted" style={{ marginTop: '6px' }}>{asText(row.limitations_summary)}</div></details></td>
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
