import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA</Link>
          <div className="nav-links">
            <Link href="/shop">Shop Preview</Link>
            <Link href="/admin">Admin Preview</Link>
          </div>
        </nav>

        <section className="hero">
          <h1>Independent commerce engine for stage, festival and editorial fashion.</h1>
          <p>
            Phase A is a read-only preview layer. The public catalog will read from safe Supabase storefront views, while the Russian admin will focus on review queues and product readiness before any write workflow is added.
          </p>
        </section>

        <section className="section-head">
          <h2>Phase A targets</h2>
        </section>

        <div className="grid admin-grid">
          <Link className="card metric" href="/shop">
            <strong>Shop</strong>
            <span>Read-only storefront catalog preview.</span>
          </Link>
          <Link className="card metric" href="/admin/review">
            <strong>Review</strong>
            <span>Russian admin review queue dashboard.</span>
          </Link>
          <Link className="card metric" href="/admin/products">
            <strong>Products</strong>
            <span>Read-only admin catalog overview.</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
