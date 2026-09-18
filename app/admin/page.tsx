import Link from 'next/link';
import { logoutAdmin } from './login/actions';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

export default function AdminHomePage() {
  const authRequired = isAdminAuthRequired();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/shop">Shop Preview</Link>
            {authRequired ? (
              <form action={logoutAdmin}>
                <button type="submit" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }}>
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </nav>

        <section className="hero">
          <h1>Админка: read-only preview.</h1>
          <p>
            Админка остаётся read-only: очереди проверки, каталог, Product Builder detail и SEO keyword validation. Любые write/edit workflow будут добавляться только после включения защищённого admin gate и versioned change log.
          </p>
        </section>

        <section className="section-head">
          <h2>Разделы</h2>
        </section>

        <div className="grid admin-grid">
          <Link className="card metric" href="/admin/review">
            <strong>Review</strong>
            <span>Очереди проверки: цены, медиа, fallback, excluded.</span>
          </Link>
          <Link className="card metric" href="/admin/products">
            <strong>Products</strong>
            <span>Каталог product drafts + read-only Product Builder detail.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-keywords">
            <strong>SEO Keywords</strong>
            <span>Read-only cleanup and validation status for SEO keyword candidates.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-keyword-review">
            <strong>Keyword Review</strong>
            <span>Risk-tiered independent OSPM recommendations before human cleanup approval.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-portfolio">
            <strong>SEO Portfolio</strong>
            <span>Stable page IDs, lifecycle, indexation intent and future query ownership.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-clusters">
            <strong>Query Clusters</strong>
            <span>Read-only semantic clustering gates and current bottlenecks.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-cluster-proposals">
            <strong>Cluster Proposals</strong>
            <span>Human-approved keyword queue and non-canonical OSPM semantic proposals.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-ownership-proposals">
            <strong>Ownership Proposals</strong>
            <span>Approved query clusters mapped to candidate pages without changing indexability.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-indexability">
            <strong>Indexability</strong>
            <span>Separate human eligibility gate after ownership and content readiness.</span>
          </Link>
          <Link className="card metric" href="/admin/content-briefs">
            <strong>Content Briefs</strong>
            <span>Deterministic compiler readiness before SCO generation.</span>
          </Link>
          <Link className="card metric" href="/admin/content-qa">
            <strong>Content QA</strong>
            <span>Shadow CQA readiness over existing SEO pack drafts.</span>
          </Link>
          <Link className="card metric" href="/admin/business-truth">
            <strong>Business Truth</strong>
            <span>Versioned production, shipping and policy facts available to content/CQA.</span>
          </Link>
          <Link className="card metric" href="/admin/system-readiness">
            <strong>System Readiness</strong>
            <span>Capability Registry: what Growth OS can actually observe and execute now.</span>
          </Link>
          <Link className="card metric" href="/admin/roles">
            <strong>Roles</strong>
            <span>Explicit INACTIVE/SHADOW/ACTIVE/PAUSED runtime state and autonomy ceilings.</span>
          </Link>
          <Link className="card metric" href="/admin/data-authority">
            <strong>Data Authority</strong>
            <span>Source-of-Truth tiers and precedence across product, policy, search, analytics and commerce.</span>
          </Link>
          <Link className="card metric" href="/admin/data-health">
            <strong>Data Health</strong>
            <span>Latest observability, freshness, watermarks, coverage and source errors.</span>
          </Link>
          <Link className="card metric" href="/admin/launch-readiness">
            <strong>Launch Readiness</strong>
            <span>Hard gates for Public Site, Search, Commerce and Measurement.</span>
          </Link>
          <Link className="card metric" href="/admin/signals">
            <strong>Signals</strong>
            <span>Pre-launch signal candidates with owner, priority and admission recommendation.</span>
          </Link>
          <Link className="card metric" href="/admin/strategy">
            <strong>Strategy & Initiatives</strong>
            <span>Human-owned strategy versions, Director Gate, approval and revalidation state.</span>
          </Link>
          <Link className="card metric" href="/admin/opportunities">
            <strong>Opportunities</strong>
            <span>Seasonal/event windows with commercial expiry and Owner Attention bridge.</span>
          </Link>
          <Link className="card metric" href="/admin/incidents">
            <strong>Incidents</strong>
            <span>Root-cause deduplication and active mutation-freeze status.</span>
          </Link>
          <Link className="card metric" href="/admin/metrics">
            <strong>Metrics</strong>
            <span>Versioned metric definitions plus currently computable operational values.</span>
          </Link>
          <Link className="card metric" href="/admin/experiments">
            <strong>Experiments</strong>
            <span>Locked measurement designs, feasibility, contamination and durable change events.</span>
          </Link>
          <Link className="card metric" href="/admin/execution-map">
            <strong>Execution Map</strong>
            <span>Action ownership, executor, approval and production-write boundaries.</span>
          </Link>
          <Link className="card metric" href="/admin/scenario-tests">
            <strong>Scenario Tests</strong>
            <span>Versioned regression invariants and explicit NOT_RUN/PASS/FAIL release state.</span>
          </Link>
          <Link className="card metric" href="/admin/learning">
            <strong>Learning</strong>
            <span>Evidence-backed maturity from observations to regression-gated human policy adoption.</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
