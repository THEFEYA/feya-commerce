import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { KeywordCleanupReviewStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_LIMIT = 500;

async function getRows(): Promise<{ rows: KeywordCleanupReviewStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_keyword_cleanup_review_status_safe_v1')
    .select('*')
    .order('cleanup_id', { ascending: true })
    .limit(REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as KeywordCleanupReviewStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function riskClass(value: unknown) {
  const risk = asText(value, '').toUpperCase();
  if (risk === 'LOW') return 'ok';
  if (risk === 'HIGH') return 'danger';
  return 'warning';
}

function recClass(value: unknown) {
  const rec = asText(value, '').toUpperCase();
  if (rec === 'APPROVE') return 'ok';
  if (rec === 'REJECT') return 'danger';
  return 'warning';
}

export default async function AdminKeywordCleanupReviewPage() {
  const { rows, error } = await getRows();

  const pending = rows.filter((row) => row.review_status === 'pending').length;
  const low = rows.filter((row) => row.review_risk === 'LOW').length;
  const medium = rows.filter((row) => row.review_risk === 'MEDIUM').length;
  const high = rows.filter((row) => row.review_risk === 'HIGH').length;
  const recommended = rows.filter((row) => Boolean(row.recommendation_id)).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/admin/seo-keyword-review">Keyword Review</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">OSPM cleanup review · read-only</div>
          <h1>Keyword Cleanup Review</h1>
          <p>
            Cleanup generation, independent OSPM recommendation and human review are separate states. An AI recommendation never changes the human review_status.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Current review candidates</span></div>
          <div className="card metric"><strong>{pending}</strong><span>Pending human review</span></div>
          <div className="card metric"><strong>{low}</strong><span>Low risk</span></div>
          <div className="card metric"><strong>{medium}</strong><span>Medium risk</span></div>
          <div className="card metric"><strong>{high}</strong><span>High risk</span></div>
          <div className="card metric"><strong>{recommended}</strong><span>Independent recommendations</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          LOW/MEDIUM/HIGH is a review-effort tier, not SEO value. Search volume, competition and rankings are not inferred by this queue.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Routing</th>
                <th>Risk</th>
                <th>Cleanup provenance</th>
                <th>OSPM recommendation</th>
                <th>Human status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cleanup_id}>
                  <td>
                    <strong>{asText(row.effective_keyword, row.original_keyword)}</strong>
                    <div className="muted">source: {asText(row.original_keyword)}</div>
                    {row.normalization_only ? <div className="badge-row"><span className="badge">normalization only</span></div> : null}
                  </td>
                  <td>
                    {asText(row.suggested_page_level)}
                    <div className="muted">{asText(row.ai_intent)}</div>
                    <div className="badge-row">
                      <span className="badge">{asText(row.keyword_axis)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${riskClass(row.review_risk)}`}>
                      {asText(row.review_risk)}
                    </span>
                    <div className="muted">{asText(row.review_lane)}</div>
                  </td>
                  <td>{asText(row.warning_flags, 'none')}</td>
                  <td>
                    {row.recommendation ? (
                      <>
                        <span className={`status-pill ${recClass(row.recommendation)}`}>
                          {row.recommendation}
                        </span>
                        <div className="muted">{asText(row.recommended_keyword)}</div>
                        <div className="muted">{asText(row.recommendation_reason)}</div>
                      </>
                    ) : (
                      <span className="badge">not run</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${row.review_status === 'approved' ? 'ok' : row.review_status === 'rejected' ? 'danger' : 'warning'}`}>
                      {asText(row.review_status)}
                    </span>
                    {row.approved_keyword ? <div className="muted">{row.approved_keyword}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
