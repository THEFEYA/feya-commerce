import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { PageOwnershipCandidateClusterRow, PageOwnershipProposalRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  clusters: PageOwnershipCandidateClusterRow[];
  proposals: PageOwnershipProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { clusters: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [clusterResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_page_query_ownership_candidate_clusters_v1')
      .select('*')
      .order('cluster_code', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_page_ownership_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (clusterResult.error) return { clusters: [], proposals: [], error: clusterResult.error.message };
  if (proposalResult.error) return { clusters: [], proposals: [], error: proposalResult.error.message };

  return {
    clusters: (clusterResult.data || []) as PageOwnershipCandidateClusterRow[],
    proposals: (proposalResult.data || []) as PageOwnershipProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'APPLIED' || normalized === 'APPROVED' || normalized === 'OWNERSHIP_EXISTS') return 'ok';
  if (normalized === 'REJECTED' || normalized === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminOwnershipProposalsPage() {
  const { clusters, proposals, error } = await getData();

  const ready = clusters.filter((row) => row.ownership_candidate_status === 'READY_FOR_OWNERSHIP_PROPOSAL').length;
  const review = proposals.filter((row) => row.proposal_status === 'REVIEW').length;
  const approved = proposals.filter((row) => row.proposal_status === 'APPROVED').length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-cluster-proposals">Cluster Proposals</Link>
            <Link href="/admin/seo-ownership-proposals">Ownership Proposals</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">OSPM page/query ownership · read-only</div>
          <h1>Page Ownership Proposals</h1>
          <p>
            Query-cluster approval and page ownership are separate decisions. Ownership can become canonical only after human review and does not change page indexability.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{clusters.length}</strong><span>Approved clusters inspected</span></div>
          <div className="card metric"><strong>{ready}</strong><span>Need primary owner</span></div>
          <div className="card metric"><strong>{review}</strong><span>Proposals awaiting review</span></div>
          <div className="card metric"><strong>{approved}</strong><span>Approved, not applied</span></div>
          <div className="card metric"><strong>{applied}</strong><span>Applied ownership</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Lexical shortlist scores are retrieval-only. The runner may return NO_SUITABLE_PAGE instead of forcing a product page to own broad collection intent.
        </div>

        <section className="section-head">
          <div>
            <h2>Cluster ownership state</h2>
            <p className="muted">Only approved clusters can enter ownership proposal review.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Cluster</th>
                <th>Intent</th>
                <th>Members</th>
                <th>Primary owners</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clusters.length ? clusters.map((row) => (
                <tr key={row.query_cluster_id}>
                  <td>
                    <strong>{asText(row.cluster_label, row.cluster_code || '—')}</strong>
                    <div className="muted">{asText(row.cluster_code)}</div>
                  </td>
                  <td>
                    {asText(row.normalized_intent)}
                    <div className="muted">{asText(row.intent_type)}</div>
                  </td>
                  <td>{row.member_count ?? 0}</td>
                  <td>{row.primary_owner_count ?? 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.ownership_candidate_status)}`}>
                      {asText(row.ownership_candidate_status)}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>No approved query clusters exist yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Ownership proposal history</h2>
            <p className="muted">Applied ownership is created with status intended; indexation remains a separate gate.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cluster</th>
                <th>Page</th>
                <th>Role</th>
                <th>Status</th>
                <th>Rationale</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length ? proposals.map((row) => (
                <tr key={row.proposal_id}>
                  <td>
                    <strong>{asText(row.cluster_label, row.cluster_code || '—')}</strong>
                    <div className="muted">{asText(row.normalized_intent)}</div>
                  </td>
                  <td>
                    <strong>{asText(row.card_title, row.url_path || '—')}</strong>
                    <div className="muted">{asText(row.url_path)}</div>
                  </td>
                  <td>{asText(row.ownership_role)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.proposal_status)}`}>
                      {asText(row.proposal_status)}
                    </span>
                  </td>
                  <td>{asText(row.rationale)}</td>
                  <td>
                    {asText(row.review_note)}
                    {row.applied_page_query_ownership_id ? (
                      <div className="badge-row"><span className="badge">ownership applied</span></div>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No page ownership proposals recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
