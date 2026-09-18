import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { capabilityOwnerSummary, dataFreshnessLabel, ownerToneForStatus, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

const CAPABILITY_CODES = [
  'GOOGLE_ADS_KEYWORD_METRICS',
  'GSC_BULK_EXPORT',
  'SEO_KEYWORD_CLEANUP',
  'QUERY_CLUSTER_REVIEW_QUEUE',
  'SEO_PAGE_PORTFOLIO',
  'SEARCH_LAUNCH_GATE',
];

type GrowthData = {
  capabilities: Row[];
  sourceHealth: Row[];
  keywordPending: number;
  seoPages: number;
  clusterProposals: number;
  ownershipProposals: number;
  pagesWithPrimaryOwner: number;
  indexabilityReady: number;
  error?: string;
};

async function getGrowthData(): Promise<GrowthData> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return {
      capabilities: [],
      sourceHealth: [],
      keywordPending: 0,
      seoPages: 0,
      clusterProposals: 0,
      ownershipProposals: 0,
      pagesWithPrimaryOwner: 0,
      indexabilityReady: 0,
      error: getMissingAdminDataEnvMessage(),
    };
  }

  const [
    capabilitiesResult,
    sourceHealthResult,
    keywordResult,
    pagesResult,
    clusterProposalResult,
    ownershipProposalResult,
    primaryOwnerResult,
    indexabilityResult,
  ] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_capability_status_safe_v1')
      .select('capability_code,capability_state,limitations_summary,updated_at')
      .in('capability_code', CAPABILITY_CODES),
    supabase
      .from('feya_commerce_v_data_source_health_latest_safe_v1')
      .select('source_code,health_state,freshness_state,last_success_at,checked_at')
      .in('source_code', ['EXTERNAL_KEYWORD_DEMAND', 'ORGANIC_SEARCH_PERFORMANCE']),
    supabase
      .from('feya_commerce_v_keyword_cleanup_review_status_safe_v1')
      .select('cleanup_id', { count: 'exact', head: true })
      .eq('review_status', 'pending'),
    supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id', { count: 'exact', head: true }),
    supabase
      .from('feya_commerce_v_query_cluster_proposals_safe_v1')
      .select('proposal_id', { count: 'exact', head: true }),
    supabase
      .from('feya_commerce_v_page_ownership_proposals_safe_v1')
      .select('proposal_id', { count: 'exact', head: true }),
    supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id', { count: 'exact', head: true })
      .gt('primary_ownership_count', 0),
    supabase
      .from('feya_commerce_v_page_indexability_readiness_v1')
      .select('seo_page_id', { count: 'exact', head: true })
      .eq('indexability_readiness_status', 'READY'),
  ]);

  const firstError =
    capabilitiesResult.error ||
    sourceHealthResult.error ||
    keywordResult.error ||
    pagesResult.error ||
    clusterProposalResult.error ||
    ownershipProposalResult.error ||
    primaryOwnerResult.error ||
    indexabilityResult.error;

  return {
    capabilities: (capabilitiesResult.data || []) as Row[],
    sourceHealth: (sourceHealthResult.data || []) as Row[],
    keywordPending: keywordResult.count || 0,
    seoPages: pagesResult.count || 0,
    clusterProposals: clusterProposalResult.count || 0,
    ownershipProposals: ownershipProposalResult.count || 0,
    pagesWithPrimaryOwner: primaryOwnerResult.count || 0,
    indexabilityReady: indexabilityResult.count || 0,
    ...(firstError ? { error: firstError.message } : {}),
  };
}

function toneClass(tone: string) {
  return tone === 'danger'
    ? 'is-danger'
    : tone === 'warning'
      ? 'is-warning'
      : tone === 'success'
        ? 'is-success'
        : tone === 'info'
          ? 'is-info'
          : '';
}

export default async function AdminGrowthPage() {
  const data = await getGrowthData();
  const map = new Map(data.capabilities.map((row) => [String(row.capability_code), row]));
  const healthMap = new Map(data.sourceHealth.map((row) => [String(row.source_code), row]));

  const adsState = String(map.get('GOOGLE_ADS_KEYWORD_METRICS')?.capability_state || 'UNAVAILABLE');
  const gscState = String(map.get('GSC_BULK_EXPORT')?.capability_state || 'UNAVAILABLE');
  const portfolioState = String(map.get('SEO_PAGE_PORTFOLIO')?.capability_state || 'UNAVAILABLE');
  const launchState = String(map.get('SEARCH_LAUNCH_GATE')?.capability_state || 'UNAVAILABLE');
  const adsHealth = healthMap.get('EXTERNAL_KEYWORD_DEMAND');
  const gscHealth = healthMap.get('ORGANIC_SEARCH_PERFORMANCE');

  const sourceStamp = (row: Row | undefined) => {
    if (!row) return 'Источник ещё не проверен';
    const freshness = dataFreshnessLabel(row.freshness_state);
    const last = row.last_success_at
      ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(String(row.last_success_at)))
      : 'успешного обновления ещё не было';
    return `${freshness} · последнее успешное обновление: ${last}`;
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Поиск и рост</div>
            <h1>Рост</h1>
            <p>
              Текущее состояние поисковой структуры FEYA. Здесь нет выдуманных графиков: до подключения реальных Google-источников показываются только уже подтверждённые внутренние данные и ограничения.
            </p>
          </div>
        </header>

        {data.error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{data.error}</p>
          </div>
        ) : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Подготовка поисковой структуры</h2>
              <div className="owner-section-kicker">Последовательность важнее количества экранов</div>
            </div>
          </div>

          <div className="owner-summary-strip">
            <div className="owner-summary-cell">
              <strong>{data.keywordPending}</strong>
              <span>Ключевых запросов ждут проверки</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.clusterProposals}</strong>
              <span>Предложений групп запросов</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.pagesWithPrimaryOwner}/{data.seoPages}</strong>
              <span>Страниц с основной группой запросов</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{data.indexabilityReady}/{data.seoPages}</strong>
              <span>Страниц готовы к индексации</span>
            </div>
          </div>

          <div className="owner-card is-info" style={{ marginTop: '10px' }}>
            <div className="owner-status is-info">Текущий порядок</div>
            <p className="owner-card-copy">
              Сначала проверяем ключевые запросы → затем формируем группы запросов → закрепляем основные страницы → только после этого решаем вопрос индексации. Нулевые значения на следующих этапах сейчас являются ожидаемым состоянием, а не ошибкой.
            </p>
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Рабочие области</h2>
              <div className="owner-section-kicker">Глубокая работа остаётся в существующей админке</div>
            </div>
          </div>

          <div className="owner-grid two">
            <Link className="owner-card is-info" href="/admin/seo-keyword-review">
              <div className="owner-status is-info">{data.keywordPending ? 'Есть очередь' : 'Очередь пуста'}</div>
              <h3 className="owner-card-title" style={{ marginTop: '12px' }}>Спрос и ключевые запросы</h3>
              <p className="owner-card-copy">
                Проверка ключей, смысловых направлений и будущего распределения по товарам и коллекциям. Значения запросов остаются на языке поиска.
              </p>
            </Link>

            <Link className={'owner-card ' + toneClass(ownerToneForStatus(portfolioState))} href="/admin/seo-portfolio">
              <div className={'owner-status ' + toneClass(ownerToneForStatus(portfolioState))}>{statusLabel(portfolioState)}</div>
              <h3 className="owner-card-title" style={{ marginTop: '12px' }}>Страницы</h3>
              <p className="owner-card-copy">
                {data.seoPages} страниц уже находятся в портфеле. Предложений ответственности страниц сейчас: {data.ownershipProposals}.
              </p>
            </Link>

            <Link className={'owner-card ' + toneClass(ownerToneForStatus(launchState))} href="/admin/indexation">
              <div className={'owner-status ' + toneClass(ownerToneForStatus(launchState))}>{statusLabel(launchState)}</div>
              <h3 className="owner-card-title" style={{ marginTop: '12px' }}>Индексация и техническое SEO</h3>
              <p className="owner-card-copy">
                Индексация остаётся закрытой до подтверждения поисковой структуры, основного домена и готовности контента.
              </p>
            </Link>

            <Link className="owner-card" href="/admin/opportunities">
              <div className="owner-status">Возможности</div>
              <h3 className="owner-card-title" style={{ marginTop: '12px' }}>Возможности роста</h3>
              <p className="owner-card-copy">
                Здесь фиксируются только реальные возможности с достаточными данными и сроком действия. Пустой список не заполняется искусственно.
              </p>
            </Link>
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Внешние данные</h2>
              <div className="owner-section-kicker">Что пока ограничивает живую аналитику</div>
            </div>
          </div>

          <div className="owner-grid two">
            <article className={'owner-card ' + toneClass(ownerToneForStatus(adsState))}>
              <div className={'owner-status ' + toneClass(ownerToneForStatus(adsState))}>Google Ads · {statusLabel(adsState)}</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Живой спрос пока ограничен</h3>
              <p className="owner-card-copy">{capabilityOwnerSummary('GOOGLE_ADS_KEYWORD_METRICS')}</p>
              <p className="owner-card-copy"><strong>Данные:</strong> {sourceStamp(adsHealth)}</p>
              <div className="owner-actions">
                <Link href="/admin/seo-engine/metric-import/validate" className="owner-button">Проверить / импортировать метрики</Link>
                <Link href="/admin/seo-engine/commercial-review" className="owner-button">Сигналы Google Ads</Link>
              </div>
            </article>

            <article className={'owner-card ' + toneClass(ownerToneForStatus(gscState))}>
              <div className={'owner-status ' + toneClass(ownerToneForStatus(gscState))}>Search Console · {statusLabel(gscState)}</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Позиции и клики ещё не измеряются</h3>
              <p className="owner-card-copy">{capabilityOwnerSummary('GSC_BULK_EXPORT')}</p>
              <p className="owner-card-copy"><strong>Данные:</strong> {sourceStamp(gscHealth)}</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
