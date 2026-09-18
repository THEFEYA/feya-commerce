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
          <Link className="card metric" href="/admin/seo-portfolio">
            <strong>SEO Portfolio</strong>
            <span>Stable page IDs, lifecycle, indexation intent and future query ownership.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-clusters">
            <strong>Query Clusters</strong>
            <span>Read-only semantic clustering gates and current bottlenecks.</span>
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
          <Link className="card metric" href="/admin/launch-readiness">
            <strong>Launch Readiness</strong>
            <span>Hard gates for Public Site, Search, Commerce and Measurement.</span>
          </Link>
          <Link className="card metric" href="/admin/metrics">
            <strong>Metrics</strong>
            <span>Versioned metric definitions plus currently computable operational values.</span>
          </Link>
          <Link className="card metric" href="/admin/execution-map">
            <strong>Execution Map</strong>
            <span>Action ownership, executor, approval and production-write boundaries.</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
