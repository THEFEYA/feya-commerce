'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Сегодня', mark: 'С' },
  { href: '/admin/work', label: 'Работа', mark: 'Р' },
  { href: '/admin/growth', label: 'Рост', mark: '↑' },
  { href: '/admin/products', label: 'Товары', mark: 'Т' },
  { href: '/admin/results', label: 'Результаты', mark: '✓' },
  { href: '/admin/system', label: 'Система', mark: '⚙' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/admin/products') {
    return pathname.startsWith('/admin/products') || pathname.startsWith('/admin/product-facts-review');
  }
  return pathname.startsWith(href);
}

export default function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar" aria-label="Основная навигация">
        <Link href="/admin" className="owner-brand">
          <span className="owner-brand-name">FEYA</span>
          <span className="owner-brand-subtitle">Центр управления</span>
        </Link>

        <nav className="owner-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`owner-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="owner-nav-mark" aria-hidden="true">{item.mark}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="owner-sidebar-footer">
          <Link
            href="/admin/search"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/search') ? ' is-active' : ''}`}
          >
            <span className="owner-nav-mark" aria-hidden="true">⌕</span>
            <span>Поиск</span>
          </Link>
          <Link
            href="/admin/advanced"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/advanced') ? ' is-active' : ''}`}
          >
            <span className="owner-nav-mark" aria-hidden="true">···</span>
            <span>Технические детали</span>
          </Link>
          <Link href="/shop" className="owner-nav-item owner-nav-secondary">
            <span className="owner-nav-mark" aria-hidden="true">↗</span>
            <span>Магазин</span>
          </Link>
        </div>
      </aside>

      <div className="owner-stage">
        <header className="owner-topbar">
          <div className="owner-topbar-mobile-brand">FEYA</div>
          <Link href="/admin/search" className="owner-search-trigger" aria-label="Открыть поиск">
            <span aria-hidden="true">⌕</span>
            <span>Найти товар, страницу, задачу или сигнал</span>
            <kbd>⌘ K</kbd>
          </Link>
          <div className="owner-topbar-status">
            <span className="owner-status-dot" aria-hidden="true" />
            <span>Режим подготовки к запуску</span>
          </div>
        </header>

        <div className="owner-main">{children}</div>
      </div>

      <nav className="owner-mobile-nav" aria-label="Мобильная навигация">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'is-active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.mark}</span>
              <small>{item.label}</small>
            </Link>
          );
        })}
        <Link href="/admin/system" className={pathname.startsWith('/admin/system') ? 'is-active' : ''}>
          <span aria-hidden="true">•••</span>
          <small>Ещё</small>
        </Link>
      </nav>
    </div>
  );
}
