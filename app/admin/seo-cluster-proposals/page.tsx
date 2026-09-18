import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { QueryClusterProposalCandidateRow, QueryClusterProposalRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  candidates: QueryClusterProposalCandidateRow[];
  proposals: QueryClusterProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { candidates: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [candidateResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_query_cluster_proposal_queue_safe_v1')
      .select('*')
      .order('approved_at', { ascending: true })
      .order('cleanup_id', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_query_cluster_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (candidateResult.error) {
    return { candidates: [], proposals: [], error: candidateResult.error.message };
  }
  if (proposalResult.error) {
    return { candidates: [], proposals: [], error: proposalResult.error.message };
  }

  return {
    candidates: (candidateResult.data || []) as QueryClusterProposalCandidateRow[],
    proposals: (proposalResult.data || []) as QueryClusterProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'APPLIED' || normalized === 'APPROVED') return 'ok';
  if (normalized === 'REJECTED' || normalized === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminClusterProposalsPage() {
  const { candidates, proposals, error } = await getData();

  const review = proposals.filter((row) => row.proposal_status === 'REVIEW').length;
  const approved = proposals.filter((row) => row.proposal_status === 'APPROVED').length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-keyword-review">Keyword Review</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/seo-cluster-proposals">Cluster Proposals</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">OSPM semantic cluster proposals · read-only</div>
          <h1>Query Cluster Proposals</h1>
          <p>
            Only human-approved cleanup keywords may enter this queue. AI proposals remain non-canonical until human review and explicit apply.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{candidates.length}</strong><span>Approved keywords ready for proposal</span></div>
          <div className="card metric"><strong>{proposals.length}</strong><span>Proposals</span></div>
          <div className="card metric"><strong>{review}</strong><span>Awaiting human review</span></div>
          <div className="card metric"><strong>{approved}</strong><span>Approved, not applied</span></div>
          <div className="card metric"><strong>{applied}</strong><span>Applied canonical clusters</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Axis, style, event and product-family similarity are not enough to form a query cluster. The proposal runner is instructed to prefer single-member clusters over broad grouping.
        </div>

        <section className="section-head">
          <div>
            <h2>Approved keyword queue</h2>
            <p className="muted">Current human-approved, unclustered keywords not already reserved by an active proposal.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Axis / pattern</th>
                <th>Suggested level</th>
                <th>Intent</th>
                <th>Metrics</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length ? candidates.map((row) => (
                <tr key={row.cleanup_id}>
                  <td><strong>{asText(row.approved_keyword, row.keyword_norm || '—')}</strong></td>
                  <td>
                    {asText(row.keyword_axis)}
                    <div className="muted">{asText(row.keyword_pattern)}</div>
                  </td>
                  <td>{asText(row.suggested_page_level)}</td>
                  <td>{asText(row.ai_intent)}</td>
                  <td>
                    {row.avg_monthly_searches != null ? row.avg_monthly_searches : '—'}
                    <div className="muted">{asText(row.metric_freshness_status)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>No human-approved unclustered keywords are ready yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>Proposal history</h2>
            <p className="muted">Proposal status is separate from canonical query-cluster status.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Intent</th>
                <th>Members</th>
                <th>Status</th>
                <th>Rationale</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length ? proposals.map((row) => (
                <tr key={row.proposal_id}>
                  <td>
                    <strong>{asText(row.cluster_label, row.proposal_code || '—')}</strong>
                    <div className="muted">{asText(row.proposal_code)}</div>
                  </td>
                  <td>
                    {asText(row.normalized_intent)}
                    <div className="muted">{asText(row.intent_type)}</div>
                  </td>
                  <td>{row.proposed_member_count ?? 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.proposal_status)}`}>
                      {asText(row.proposal_status)}
                    </span>
                  </td>
                  <td>{asText(row.rationale)}</td>
                  <td>
                    {asText(row.review_note)}
                    {row.applied_query_cluster_id ? (
                      <div className="badge-row"><span className="badge">cluster applied</span></div>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No query cluster proposals recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
