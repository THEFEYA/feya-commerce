import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/shop">Shop Preview</Link>
          </div>
        </nav>

        <section className="hero">
          <h1>Админка: read-only preview.</h1>
          <p>
            Первый этап админки показывает очереди проверки и каталог без редактирования. Запись в базу, Product Builder и SEO/AI workflow будут добавлены позже отдельными безопасными этапами.
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
            <span>Read-only обзор product drafts.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-keywords">
            <strong>SEO Keywords</strong>
            <span>Read-only cleanup and validation status for SEO keyword candidates.</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
