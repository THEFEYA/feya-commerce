import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SeoPagePortfolioRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PORTFOLIO_LIMIT = 350;

async function getPortfolio(): Promise<{ rows: SeoPagePortfolioRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_seo_page_portfolio_safe_v1')
    .select('*')
    .order('url_path', { ascending: true })
    .limit(PORTFOLIO_LIMIT);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as SeoPagePortfolioRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toLowerCase();

  if (normalized.includes('mature') || normalized.includes('measurable') || normalized.includes('indexable') || normalized.includes('protected')) {
    return 'ok';
  }

  if (normalized.includes('retire') || normalized.includes('deprecated') || normalized.includes('noindex')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminSeoPortfolioPage() {
  const { rows, error } = await getPortfolio();

  const candidateCount = rows.filter((row) => row.indexation_intent === 'candidate').length;
  const indexableCount = rows.filter((row) => row.indexation_intent === 'indexable').length;
  const protectedCount = rows.filter((row) => row.protected_winner_flag).length;
  const primaryOwnerCount = rows.filter((row) => (row.primary_ownership_count || 0) > 0).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/seo-ownership-proposals">Ownership Proposals</Link>
            <Link href="/admin/review">Review</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">OSPM portfolio bootstrap · read-only</div>
          <h1>SEO Page Portfolio</h1>
          <p>
            Stable page identities and intended search lifecycle. Product pages are bootstrapped as candidates only; no query ownership or indexability is inferred automatically.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Pages loaded</span></div>
          <div className="card metric"><strong>{candidateCount}</strong><span>Indexation candidates</span></div>
          <div className="card metric"><strong>{indexableCount}</strong><span>Approved indexable</span></div>
          <div className="card metric"><strong>{primaryOwnerCount}</strong><span>Pages with primary query owner</span></div>
          <div className="card metric"><strong>{protectedCount}</strong><span>Protected winners</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Current expected bootstrap state: product pages exist, while Query Cluster Registry and page/query ownership remain empty until semantic clustering and OSPM review are implemented.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Path</th>
                <th>Type</th>
                <th>Lifecycle</th>
                <th>Indexation</th>
                <th>Query ownership</th>
                <th>Market</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.seo_page_id}>
                  <td>
                    {row.canonical_product_id ? (
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {row.card_title || row.h1 || row.seo_page_id}
                      </Link>
                    ) : asText(row.card_title || row.h1 || row.seo_page_id)}
                    {row.protected_winner_flag ? <div className="badge-row"><span className="status-pill ok">Protected winner</span></div> : null}
                  </td>
                  <td>{asText(row.url_path)}</td>
                  <td>{asText(row.page_type)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.lifecycle_state)}`}>{asText(row.lifecycle_state)}</span></td>
                  <td><span className={`status-pill ${getStatusClass(row.indexation_intent)}`}>{asText(row.indexation_intent)}</span></td>
                  <td>
                    <span className="badge">{row.ownership_count || 0} total</span>
                    <div className="badge-row">
                      <span className="badge">{row.primary_ownership_count || 0} primary</span>
                    </div>
                  </td>
                  <td>{asText(row.market_code)} / {asText(row.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
