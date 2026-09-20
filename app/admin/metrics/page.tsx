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
    limitation: 'Это не SEO-сложность, не позиция в органическом поиске и не спрос в реальном времени; доступ к свежим данным через API пока ограничен.',
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
    limitation: 'Недоступно до подключения данных Search Console рабочего сайта.',
  },
  ORGANIC_CTR: {
    summary: 'CTR органического поиска: клики, делённые на показы в заданном срезе.',
    limitation: 'Нельзя усреднять готовые проценты CTR по строкам.',
  },
  ORGANIC_IMPRESSIONS: {
    summary: 'Показы из Google Search Console для заданной страницы, запроса и рынка.',
    limitation: 'Недоступно до подключения данных Search Console рабочего сайта.',
  },
  PRODUCT_VIEW_EVENTS: {
    summary: 'Количество событий просмотра товара на рабочем сайте.',
    limitation: 'Недоступно до включения и проверки сбора событий GA4 на рабочем сайте.',
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

  const availableRows = registry.filter((row) => row.metric_state === 'AVAILABLE');
  const limitedRows = registry.filter((row) => row.metric_state === 'AVAILABLE_WITH_LIMITATIONS');
  const unavailableRows = registry.filter((row) => row.metric_state === 'UNAVAILABLE' || row.metric_state === 'NOT_OBSERVABLE');

  function measuredAtLabel(metricCode: string) {
    const current = valueMap.get(metricCode);
    if (!current?.measured_at) return 'время измерения не зафиксировано';
    const date = new Date(String(current.measured_at));
    if (Number.isNaN(date.getTime())) return 'время измерения не определено';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · измерение</div>
            <h1>Метрики</h1>
            <p>Показываем только те показатели, которые действительно рассчитаны из доступных источников. Недоступная метрика остаётся недоступной — FEYA не подставляет ноль и не создаёт декоративный KPI.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/results" className="owner-button">Результаты</Link>
            <Link href="/admin/company/system" className="owner-button">Система</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{available}</strong><span>Доступны сейчас</span></div>
          <div className="owner-summary-cell"><strong>{limited}</strong><span>Доступны с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Ещё нельзя измерять</span></div>
          <div className="owner-summary-cell"><strong>{values.length}</strong><span>Имеют фактическое значение</span></div>
        </section>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Измеряется сейчас</h2>
              <div className="owner-section-kicker">Операционные показатели с реальным текущим значением</div>
            </div>
          </div>

          {availableRows.length ? (
            <div className="owner-grid two">
              {availableRows.map((row) => {
                const current = valueMap.get(row.metric_code);
                const copy = metricCopy(row.metric_code, row.public_summary, row.limitations_summary);
                return (
                  <article className="owner-card is-success" key={row.metric_code}>
                    <div className="owner-card-meta">
                      <span className="owner-status is-success">Доступно</span>
                      <span>{roleLabel(row.owner_role)}</span>
                      <span>{measuredAtLabel(row.metric_code)}</span>
                    </div>
                    <h3 className="owner-card-title">{METRIC_LABELS[row.metric_code] || asText(row.metric_name, 'Метрика')}</h3>
                    <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {current ? <>{asText(current.metric_value)} {unitLabel(current.unit)}</> : '—'}
                    </div>
                    <p className="owner-card-copy" style={{ marginTop: '10px' }}>{copy.summary}</p>
                    <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '12px' }}>
                      <summary>
                        <span><strong>Как интерпретировать</strong><small>Ограничения показателя</small></span>
                        <span className="owner-section-kicker">Подробнее</span>
                      </summary>
                      <div className="owner-disclosure-body"><p className="owner-card-copy">{copy.limitation}</p></div>
                    </details>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-empty">Сейчас нет метрик с подтверждённым фактическим значением.</div>
          )}
        </section>

        {limitedRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head">
              <div>
                <h2>Доступно с ограничениями</h2>
                <div className="owner-section-kicker">Использовать можно только вместе с оговоркой о свежести и источнике</div>
              </div>
            </div>
            <div className="owner-grid two">
              {limitedRows.map((row) => {
                const copy = metricCopy(row.metric_code, row.public_summary, row.limitations_summary);
                return (
                  <article className="owner-card is-warning" key={row.metric_code}>
                    <div className="owner-card-meta"><span className="owner-status is-warning">С ограничениями</span><span>{roleLabel(row.owner_role)}</span></div>
                    <h3 className="owner-card-title">{METRIC_LABELS[row.metric_code] || asText(row.metric_name, 'Метрика')}</h3>
                    <p className="owner-card-copy">{copy.summary}</p>
                    <p className="owner-role-note"><strong>Ограничение:</strong> {copy.limitation}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Ещё нельзя измерять</strong><small>Скрыто по умолчанию, чтобы отсутствующие данные не выглядели как плохой результат</small></span>
              <span className="owner-section-kicker">{unavailableRows.length}</span>
            </summary>
            <div className="owner-disclosure-body owner-grid two">
              {unavailableRows.map((row) => {
                const copy = metricCopy(row.metric_code, row.public_summary, row.limitations_summary);
                return (
                  <article className="owner-card" key={row.metric_code}>
                    <div className="owner-card-meta"><span className="owner-status">Нет данных</span><span>{roleLabel(row.owner_role)}</span></div>
                    <h3 className="owner-card-title">{METRIC_LABELS[row.metric_code] || asText(row.metric_name, 'Метрика')}</h3>
                    <p className="owner-card-copy">{copy.limitation}</p>
                  </article>
                );
              })}
            </div>
          </details>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Технический реестр метрик</strong><small>Источник, поверхность измерения и исходные определения</small></span>
              <span className="owner-section-kicker">{registry.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Метрика</th><th>Значение</th><th>Ответственный</th><th>Состояние</th><th>Источник</th><th>Ограничение</th></tr></thead>
                  <tbody>
                    {registry.map((row) => {
                      const current = valueMap.get(row.metric_code);
                      const copy = metricCopy(row.metric_code, row.public_summary, row.limitations_summary);
                      return (
                        <tr key={row.metric_code}>
                          <td><strong title={row.metric_code}>{METRIC_LABELS[row.metric_code] || asText(row.metric_name, 'Метрика')}</strong></td>
                          <td>{current ? <strong>{asText(current.metric_value)} {unitLabel(current.unit)}</strong> : '—'}</td>
                          <td>{roleLabel(row.owner_role)}</td>
                          <td>{statusLabel(row.metric_state)}</td>
                          <td title={`${asText(row.authority_source)} · ${asText(row.measurement_surface)}`}>{asText(row.authority_source, '—')}</td>
                          <td>{copy.limitation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
