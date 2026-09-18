import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { ContentBriefCompilerStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BRIEF_LIMIT = 400;

async function getBriefs(): Promise<{ rows: ContentBriefCompilerStatusRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_content_brief_compiler_status_safe_v1')
    .select('*')
    .order('can_produce_canonical_brief', { ascending: false })
    .order('can_generate_shadow', { ascending: false })
    .order('compiler_status', { ascending: true })
    .limit(BRIEF_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ContentBriefCompilerStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'SHADOW_READY' || normalized.includes('CANONICAL_READY')) return 'ok';
  if (normalized.includes('BLOCKED')) return 'danger';
  return 'warning';
}

function count(rows: ContentBriefCompilerStatusRow[], predicate: (row: ContentBriefCompilerStatusRow) => boolean) {
  return rows.filter(predicate).length;
}

export default async function AdminContentBriefsPage() {
  const { rows, error } = await getBriefs();

  const shadowReady = count(rows, (row) => Boolean(row.can_generate_shadow));
  const canonicalReady = count(rows, (row) => Boolean(row.can_produce_canonical_brief));
  const blockedKeyword = count(rows, (row) => row.compiler_status === 'BLOCKED_KEYWORD_REVIEW');
  const blockedFacts = count(rows, (row) => row.compiler_status === 'BLOCKED_PRODUCT_FACT_REVIEW');
  const blockedGeneration = count(rows, (row) => row.compiler_status === 'BLOCKED_GENERATION_GATE');
  const missingPage = count(rows, (row) => row.compiler_status === 'BLOCKED_NO_SEO_PAGE');

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/content-briefs">Content Briefs</Link>
            <Link href="/admin/content-qa">Content QA</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Deterministic Content Brief Compiler · shadow</div>
          <h1>Content Briefs</h1>
          <p>
            Product facts, axis strategy, keyword plan, scoped Business Truth, Content Policy and SEO Page state are compiled without an LLM. Canonical-ready remains false until real OSPM ownership and approved keyword-plan conditions exist.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Brief candidates</span></div>
          <div className="card metric"><strong>{shadowReady}</strong><span>Can generate shadow</span></div>
          <div className="card metric"><strong>{canonicalReady}</strong><span>Canonical-ready</span></div>
          <div className="card metric"><strong>{blockedKeyword}</strong><span>Blocked keyword review</span></div>
          <div className="card metric"><strong>{blockedFacts}</strong><span>Blocked Product Facts</span></div>
          <div className="card metric"><strong>{blockedGeneration}</strong><span>Blocked generation gate</span></div>
          <div className="card metric"><strong>{missingPage}</strong><span>Missing SEO page</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Shadow-ready does not mean publish-ready. It means the deterministic compiler has enough truth/context to allow an experimental draft while preserving unresolved metric/ownership limitations.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Compiler</th>
                <th>Facts</th>
                <th>Keyword plan</th>
                <th>Primary keyword</th>
                <th>SEO page</th>
                <th>Ownership</th>
                <th>Business Truth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.brief_queue_id}>
                  <td>
                    <Link href={`/admin/products/${row.canonical_product_id}`}>
                      {row.url_path || row.canonical_product_id}
                    </Link>
                    <div className="muted">{asText(row.page_goal_code)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.compiler_status)}`}>
                      {asText(row.compiler_status)}
                    </span>
                    <div className="badge-row">
                      {row.can_generate_shadow ? <span className="badge">shadow</span> : null}
                      {row.can_produce_canonical_brief ? <span className="status-pill ok">canonical</span> : null}
                    </div>
                  </td>
                  <td>
                    {asText(row.product_fact_quality_status)}
                    <div className="muted">{asText(row.generation_gate_status)}</div>
                  </td>
                  <td>{asText(row.plan_status)}</td>
                  <td>{asText(row.primary_keyword)}</td>
                  <td>
                    {row.seo_page_id ? asText(row.indexation_intent) : 'missing'}
                    <div className="muted">{asText(row.page_lifecycle_state)}</div>
                  </td>
                  <td>
                    {row.primary_ownership_count || 0} primary
                    <div className="muted">{row.ownership_count || 0} total</div>
                  </td>
                  <td>{row.business_truth_count || 0} active facts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
