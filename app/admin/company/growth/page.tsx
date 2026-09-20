import Link from 'next/link';
import { FileSearch, GitBranch, SearchCheck, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
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
  historicalDemand: Row[];
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
      historicalDemand: [],
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
    historicalDemandResult,
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
      .from('vw_seo_keyword_bank_v1_for_listing_master')
      .select('keyword,avg_monthly_searches,competition,competition_index,region,language,metric_source,last_checked,review_status,bank_bucket')
      .not('avg_monthly_searches', 'is', null)
      .eq('review_status', 'approved_draft')
      .order('avg_monthly_searches', { ascending: false })
      .limit(16),
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
      .eq('indexability_readiness_status', 'READY_FOR_INDEXABILITY_REVIEW'),
  ]);

  const firstError =
    capabilitiesResult.error ||
    sourceHealthResult.error ||
    historicalDemandResult.error ||
    keywordResult.error ||
    pagesResult.error ||
    clusterProposalResult.error ||
    ownershipProposalResult.error ||
    primaryOwnerResult.error ||
    indexabilityResult.error;

  return {
    capabilities: (capabilitiesResult.data || []) as Row[],
    sourceHealth: (sourceHealthResult.data || []) as Row[],
    historicalDemand: (historicalDemandResult.data || []) as Row[],
    keywordPending: keywordResult.count || 0,
    seoPages: pagesResult.count || 0,
    clusterProposals: clusterProposalResult.count || 0,
    ownershipProposals: ownershipProposalResult.count || 0,
    pagesWithPrimaryOwner: primaryOwnerResult.count || 0,
    indexabilityReady: indexabilityResult.count || 0,
    ...(firstError ? { error: firstError.message } : {}),
  };
}

function bucketLabel(value: unknown) {
  const key = String(value || '').toLowerCase();
  if (key === 'collection') return 'категория';
  if (key === 'product') return 'товар';
  if (key === 'product_or_alt') return 'товар / ALT';
  if (key === 'commercial_collection') return 'коммерческая посадочная';
  if (key === 'visual_collection') return 'визуальная посадочная';
  if (key === 'faq') return 'FAQ';
  return key || '—';
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
  const historicalDemand = Array.from(
    new Map(
      data.historicalDemand.map((row) => [
        String(row.keyword || '').toLowerCase().replace(/[^a-z0-9]+/g, ''),
        row,
      ]),
    ).values(),
  ).slice(0, 8);
  const maxHistoricalDemand = Math.max(1, ...historicalDemand.map((row) => Number(row.avg_monthly_searches || 0)));

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
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Поиск и рост</div>
            <h1>Рост</h1>
            <p>Где FEYA уже видит спрос, как собирается поисковая структура и что пока ограничивает измеримый рост.</p>
          </div>
        </header>

        <nav className="owner-subnav" aria-label="Разделы роста">
          <Link href="/admin/opportunities">Возможности</Link>
          <a href="#demand">Спрос</a>
          <Link href="/admin/seo-portfolio">Страницы</Link>
          <Link href="/admin/seo-indexability">Техническое SEO</Link>
        </nav>

        {data.error ? <OwnerDataError error={data.error} /> : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><TrendingUp size={17} strokeWidth={1.7} /></span>
              <div><h2>Подготовка поисковой структуры</h2><div className="owner-section-kicker">Следующий этап не считается готовым раньше предыдущего</div></div>
            </div>
          </div>

          <div className="owner-growth-pipeline" aria-label="Этапы поисковой структуры">
            <Link href="/admin/seo-keyword-review" className="owner-growth-step is-current">
              <span className="owner-growth-step-icon" aria-hidden="true"><SearchCheck size={16} strokeWidth={1.7} /></span>
              <span className="owner-growth-step-copy"><small>1 · Проверка</small><strong>Ключевые запросы</strong><span>ждут проверки</span></span>
              <b>{data.keywordPending}</b>
            </Link>
            <Link href="/admin/seo-cluster-proposals" className="owner-growth-step">
              <span className="owner-growth-step-icon" aria-hidden="true"><GitBranch size={16} strokeWidth={1.7} /></span>
              <span className="owner-growth-step-copy"><small>2 · Структура</small><strong>Группы запросов</strong><span>предложений</span></span>
              <b>{data.clusterProposals}</b>
            </Link>
            <Link href="/admin/seo-portfolio" className="owner-growth-step">
              <span className="owner-growth-step-icon" aria-hidden="true"><FileSearch size={16} strokeWidth={1.7} /></span>
              <span className="owner-growth-step-copy"><small>3 · Ответственность</small><strong>Основные страницы</strong><span>из {data.seoPages}</span></span>
              <b>{data.pagesWithPrimaryOwner}</b>
            </Link>
            <Link href="/admin/seo-indexability" className="owner-growth-step">
              <span className="owner-growth-step-icon" aria-hidden="true"><ShieldCheck size={16} strokeWidth={1.7} /></span>
              <span className="owner-growth-step-copy"><small>4 · Допуск</small><strong>Индексация</strong><span>готовы к проверке</span></span>
              <b>{data.indexabilityReady}</b>
            </Link>
          </div>

          <div className="owner-growth-note">
            Нулевые значения на следующих этапах сейчас нормальны: каждый шаг открывается только после подтверждения предыдущего.
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-work" aria-hidden="true"><Sparkles size={17} strokeWidth={1.7} /></span>
              <div><h2>Рабочие области</h2><div className="owner-section-kicker">Командный центр объясняет состояние; глубокая операторская работа открывается отдельно</div></div>
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

            <Link className={'owner-card ' + toneClass(ownerToneForStatus(launchState))} href="/admin/seo-indexability">
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

        <section className="owner-section" id="demand">
          <div className="owner-section-head">
            <div>
              <h2>Исторический спрос</h2>
              <div className="owner-section-kicker">Реальные сохранённые метрики Google Keyword Planner · не данные в реальном времени</div>
            </div>
            <Link href="/admin/seo-engine/metric-import/validate" className="owner-button">Открыть метрики</Link>
          </div>

          {historicalDemand.length ? (
            <div className="owner-card">
              <div className="owner-card-meta">
                <span className="owner-status is-warning">Исторические данные</span>
                <span>{sourceStamp(adsHealth)}</span>
              </div>
              <div className="owner-demand-table">
                <div className="owner-demand-head">
                  <span>Ключевой запрос</span>
                  <span>Средний спрос / мес.</span>
                  <span>Google Ads</span>
                  <span>Проверено</span>
                </div>
                {historicalDemand.map((row, index) => {
                  const volume = Number(row.avg_monthly_searches || 0);
                  const width = Math.max(4, Math.round((volume / maxHistoricalDemand) * 100));
                  const competition = String(row.competition || 'UNKNOWN').toUpperCase();
                  return (
                    <div className="owner-demand-row" key={`${String(row.keyword)}-${index}`}>
                      <div className="owner-demand-keyword">
                        <strong>{String(row.keyword || '—')}</strong>
                        <span>{String(row.region || '—')} · {String(row.language || '—')} · {bucketLabel(row.bank_bucket)}</span>
                        <i style={{ width: `${width}%` }} aria-hidden="true" />
                      </div>
                      <div className="owner-demand-number">{new Intl.NumberFormat('ru-RU').format(volume)}</div>
                      <div>
                        <span className="owner-status">{competition === 'HIGH' ? 'Высокая' : competition === 'MEDIUM' ? 'Средняя' : competition === 'LOW' ? 'Низкая' : 'Нет данных'}</span>
                        <small className="owner-demand-note">конкуренция рекламодателей, не SEO-сложность</small>
                      </div>
                      <div className="owner-demand-date">{row.last_checked ? new Date(String(row.last_checked)).toLocaleDateString('ru-RU') : '—'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="owner-empty">Сохранённых метрик спроса пока нет.</div>
          )}
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
