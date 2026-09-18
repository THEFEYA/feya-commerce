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
            <Link href="/admin/company">Центр управления FEYA</Link>
            <Link href="/shop">Просмотр магазина</Link>
            {authRequired ? (
              <form action={logoutAdmin}>
                <button type="submit" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }}>
                  Выйти
                </button>
              </form>
            ) : null}
          </div>
        </nav>

        <section className="hero">
          <h1>Админка TheFEYA.</h1>
          <p>
            Рабочее пространство товаров, SEO, контента и проверки. Интерфейс управления компанией и AI-командой теперь вынесен отдельно и не заменяет эту админку.
          </p>
        </section>

        <section className="section-head">
          <h2>Рабочие разделы</h2>
        </section>

        <div className="grid admin-grid">
          <Link className="card metric" href="/admin/products">
            <strong>Товары</strong>
            <span>Каталог, Product Builder, факты, варианты, цены, медиа и готовность.</span>
          </Link>
          <Link className="card metric" href="/admin/seo-keywords">
            <strong>SEO и ключевые слова</strong>
            <span>Ключевые запросы остаются в оригинальном языке; интерфейс и пояснения — на русском.</span>
          </Link>
          <Link className="card metric" href="/admin/review">
            <strong>Проверка</strong>
            <span>Очереди по ценам, медиа, готовности и другим проблемам товаров.</span>
          </Link>
          <Link className="card metric admin-company-entry" href="/admin/company">
            <strong>Центр управления FEYA</strong>
            <span>Компания, AI-команда, сигналы, работа, результаты и состояние системы.</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
