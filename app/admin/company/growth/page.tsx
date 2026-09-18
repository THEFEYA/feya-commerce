import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { capabilityOwnerSummary, ownerToneForStatus, statusLabel } from '@/lib/owner-ui/terminology';

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

async function getCapabilities(): Promise<{ rows: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_capability_status_safe_v1')
    .select('capability_code,capability_state,limitations_summary,updated_at')
    .in('capability_code', CAPABILITY_CODES);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as Row[] };
}

function toneClass(tone: string) {
  return tone === 'danger' ? 'is-danger' : tone === 'warning' ? 'is-warning' : tone === 'success' ? 'is-success' : tone === 'info' ? 'is-info' : '';
}

export default async function AdminGrowthPage() {
  const { rows, error } = await getCapabilities();
  const map = new Map(rows.map((row) => [String(row.capability_code), row]));

  const areas = [
    {
      title: 'Возможности',
      description: 'Сигналы и идеи роста, которые подтверждены данными и достаточно важны, чтобы их исследовать.',
      href: '/admin/opportunities',
      capability: 'SIGNAL_ENGINE',
      state: 'AVAILABLE_WITH_LIMITATIONS',
    },
    {
      title: 'Спрос',
      description: 'Ключевые слова, группы запросов и внешний спрос. Живые данные Google Ads пока ограничены.',
      href: '/admin/seo-keywords',
      capability: 'GOOGLE_ADS_KEYWORD_METRICS',
      state: String(map.get('GOOGLE_ADS_KEYWORD_METRICS')?.capability_state || 'UNAVAILABLE'),
    },
    {
      title: 'Страницы',
      description: 'Какая страница за какие запросы отвечает, готова ли она к индексации и нет ли конфликтов.',
      href: '/admin/seo-portfolio',
      capability: 'SEO_PAGE_PORTFOLIO',
      state: String(map.get('SEO_PAGE_PORTFOLIO')?.capability_state || 'UNAVAILABLE'),
    },
    {
      title: 'Техническое SEO',
      description: 'Техническая готовность поиска. Глобальная индексация пока намеренно выключена.',
      href: '/admin/seo-indexability',
      capability: 'SEARCH_LAUNCH_GATE',
      state: String(map.get('SEARCH_LAUNCH_GATE')?.capability_state || 'UNAVAILABLE'),
    },
  ];

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Поиск и рост</div>
            <h1>Рост</h1>
            <p>Здесь будут собираться реальные возможности, спрос, страницы и техническое состояние поиска. До подключения источников система показывает ограничения честно.</p>
          </div>
        </header>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-grid two">
          {areas.map((area) => {
            const tone = ownerToneForStatus(area.state);
            return (
              <Link className={`owner-card ${toneClass(tone)}`} href={area.href} key={area.title}>
                <div className={`owner-status ${toneClass(tone)}`}>{statusLabel(area.state)}</div>
                <h2 className="owner-card-title" style={{ marginTop: '12px' }}>{area.title}</h2>
                <p className="owner-card-copy">{area.description}</p>
              </Link>
            );
          })}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Что пока не подключено</h2>
              <div className="owner-section-kicker">Без фиктивных графиков и выводов</div>
            </div>
          </div>
          <div className="owner-grid two">
            <article className="owner-card is-warning">
              <div className="owner-status is-warning">Google Ads</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Живые данные по спросу ограничены</h3>
              <p className="owner-card-copy">{capabilityOwnerSummary('GOOGLE_ADS_KEYWORD_METRICS')}</p>
            </article>
            <article className="owner-card is-warning">
              <div className="owner-status is-warning">Search Console</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Реальные поисковые показатели ещё не подключены</h3>
              <p className="owner-card-copy">{capabilityOwnerSummary('GSC_BULK_EXPORT')}</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
