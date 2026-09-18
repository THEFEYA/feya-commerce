import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ContentQaShadowRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CQA_QUEUE_LIMIT = 300;

async function getQueue(): Promise<{ rows: ContentQaShadowRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(CQA_QUEUE_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ContentQaShadowRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized.includes('READY') || normalized === 'CQA_RECORDED' || normalized === 'PASS') return 'ok';
  if (normalized.includes('BLOCK') || normalized.includes('REJECT') || normalized.includes('REVISION')) return 'danger';
  return 'warning';
}

function countState(rows: ContentQaShadowRow[], state: string) {
  return rows.filter((row) => row.cqa_shadow_state === state).length;
}

export default async function AdminContentQaPage() {
  const { rows, error } = await getQueue();

  const independentReady = countState(rows, 'READY_FOR_INDEPENDENT_CQA');
  const humanAndCqa = countState(rows, 'READY_FOR_HUMAN_AND_CQA_REVIEW');
  const similarity = countState(rows, 'APPROVED_NEEDS_SIMILARITY_CHECK');
  const componentClaims =
    countState(rows, 'APPROVED_NEEDS_COMPONENT_CLAIM_CHECK') +
    countState(rows, 'CQA_RECORDED_NEEDS_COMPONENT_CLAIM_CHECK');
  const prechecks = countState(rows, 'NEEDS_PRECHECKS');
  const blocked = countState(rows, 'BLOCKED_BY_VALIDATION') + countState(rows, 'REVISION_REQUIRED');

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/content-qa">Content QA</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">CQA shadow mode · read-only</div>
          <h1>Content QA</h1>
          <p>
            Human approval is not treated as independent CQA approval. This screen classifies existing SEO pack drafts against deterministic prechecks without changing historical review status.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Active SEO pack drafts</span></div>
          <div className="card metric"><strong>{independentReady}</strong><span>Ready for independent CQA</span></div>
          <div className="card metric"><strong>{humanAndCqa}</strong><span>Ready for human + CQA</span></div>
          <div className="card metric"><strong>{similarity}</strong><span>Approved but similarity missing</span></div>
          <div className="card metric"><strong>{componentClaims}</strong><span>Component claim review</span></div>
          <div className="card metric"><strong>{prechecks}</strong><span>Need prechecks</span></div>
          <div className="card metric"><strong>{blocked}</strong><span>Blocked / revision</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Independent CQA has not been run on historical drafts yet. cqa_status=not_run remains the canonical state until a separate CQA review is actually executed and recorded.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Human review</th>
                <th>Validation</th>
                <th>Similarity</th>
                <th>Image ALT</th>
                <th>Component claim</th>
                <th>CQA</th>
                <th>Shadow state</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.draft_id}>
                  <td>
                    <Link href={`/admin/products/${row.canonical_product_id}`}>
                      {asText(row.card_title, row.product_slug || row.canonical_product_id)}
                    </Link>
                    <div className="muted">{asText(row.draft_status)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.human_review_status)}`}>
                      {asText(row.human_review_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.validation_status)}`}>
                      {asText(row.validation_status)}
                    </span>
                    {(row.approval_blocker_count || 0) > 0 || (row.product_truth_blocker_count || 0) > 0 ? (
                      <div className="muted">
                        blockers: {(row.approval_blocker_count || 0) + (row.product_truth_blocker_count || 0)}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.similarity_status)}`}>
                      {asText(row.similarity_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.image_alt_truth_status)}`}>
                      {asText(row.image_alt_truth_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.component_claim_truth_status)}`}>
                      {asText(row.component_claim_truth_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.cqa_status)}`}>
                      {asText(row.cqa_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.cqa_shadow_state)}`}>
                      {asText(row.cqa_shadow_state)}
                    </span>
                    <div className="muted">metrics: {asText(row.metrics_status)}</div>
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
