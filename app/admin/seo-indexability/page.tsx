import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { IndexabilityProposalRow, PageIndexabilityReadinessRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  readiness: PageIndexabilityReadinessRow[];
  proposals: IndexabilityProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { readiness: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [readinessResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_page_indexability_readiness_v1')
      .select('*')
      .order('indexability_readiness_status', { ascending: true })
      .order('url_path', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_indexability_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (readinessResult.error) return { readiness: [], proposals: [], error: readinessResult.error.message };
  if (proposalResult.error) return { readiness: [], proposals: [], error: proposalResult.error.message };

  return {
    readiness: (readinessResult.data || []) as PageIndexabilityReadinessRow[],
    proposals: (proposalResult.data || []) as IndexabilityProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'READY_FOR_INDEXABILITY_REVIEW' || normalized === 'APPLIED' || normalized === 'INDEXABLE') return 'ok';
  if (normalized === 'NOT_ELIGIBLE' || normalized === 'REJECTED' || normalized === 'NOINDEX') return 'danger';
  return 'warning';
}

export default async function AdminIndexabilityPage() {
  const { readiness, proposals, error } = await getData();

  const needsOwnership = readiness.filter((row) => row.indexability_readiness_status === 'NEEDS_PRIMARY_OWNERSHIP').length;
  const needsContent = readiness.filter((row) => row.indexability_readiness_status === 'NEEDS_PUBLISH_READY_CONTENT').length;
  const ready = readiness.filter((row) => row.indexability_readiness_status === 'READY_FOR_INDEXABILITY_REVIEW').length;
  const indexable = readiness.filter((row) => row.indexation_intent === 'indexable').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
            <Link href="/admin/seo-ownership-proposals">Ownership Proposals</Link>
            <Link href="/admin/seo-indexability">Indexability</Link>
            <Link href="/admin/launch-readiness">Launch Readiness</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Indexable Page Eligibility Gate · read-only</div>
          <h1>Page Indexability</h1>
          <p>
            Page ownership does not imply indexability. Product pages require primary query ownership and ready-for-publish content before an INDEXABLE_PRODUCT decision can be applied.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{readiness.length}</strong><span>Portfolio pages</span></div>
          <div className="card metric"><strong>{needsOwnership}</strong><span>Need primary ownership</span></div>
          <div className="card metric"><strong>{needsContent}</strong><span>Need publish-ready content</span></div>
          <div className="card metric"><strong>{ready}</strong><span>Ready for eligibility review</span></div>
          <div className="card metric"><strong>{indexable}</strong><span>Indexable</span></div>
          <div className="card metric"><strong>{proposals.length}</strong><span>Eligibility proposals</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          The current system does not run an AI indexability proposal runner because no page currently passes the prerequisite ownership/content gates.
        </div>

        <section className="section-head">
          <div>
            <h2>Readiness</h2>
            <p className="muted">Indexation intent remains candidate until a separate reviewed proposal is applied.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Type</th>
                <th>Ownership</th>
                <th>Publish-ready content</th>
                <th>Intent</th>
                <th>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {readiness.map((row) => (
                <tr key={row.seo_page_id}>
                  <td>
                    {row.canonical_product_id ? (
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {asText(row.card_title, row.url_path || '—')}
                      </Link>
                    ) : asText(row.url_path)}
                    <div className="muted">{asText(row.url_path)}</div>
                  </td>
                  <td>{asText(row.page_type)}</td>
                  <td>
                    {row.primary_ownership_count || 0} primary
                    <div className="muted">{row.ownership_count || 0} total</div>
                  </td>
                  <td>{row.ready_for_publish_count || 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.indexation_intent)}`}>
                      {asText(row.indexation_intent)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.indexability_readiness_status)}`}>
                      {asText(row.indexability_readiness_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Eligibility proposal history</h2>
            <p className="muted">Human review/apply is required for every canonical indexation-intent change.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Decision</th>
                <th>Status</th>
                <th>Rationale</th>
                <th>Review</th>
                <th>Applied intent</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length ? proposals.map((row) => (
                <tr key={row.proposal_id}>
                  <td>
                    <strong>{asText(row.card_title, row.url_path || '—')}</strong>
                    <div className="muted">{asText(row.url_path)}</div>
                  </td>
                  <td>{asText(row.decision)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.proposal_status)}`}>
                      {asText(row.proposal_status)}
                    </span>
                  </td>
                  <td>{asText(row.rationale)}</td>
                  <td>{asText(row.review_note)}</td>
                  <td>{asText(row.applied_indexation_intent)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No indexability proposals recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
