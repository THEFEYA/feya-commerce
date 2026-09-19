'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  SlidersHorizontal,
  Store,
  TrendingUp,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'today', href: '/admin/company', label: 'Сегодня', icon: CalendarDays },
  { key: 'work', href: '/admin/company/work', label: 'Работа', icon: BriefcaseBusiness },
  { key: 'growth', href: '/admin/company/growth', label: 'Рост', icon: TrendingUp },
  { key: 'products', href: '/admin/products', label: 'Товары', icon: PackageSearch },
  { key: 'results', href: '/admin/company/results', label: 'Результаты', icon: BarChart3 },
  { key: 'system', href: '/admin/company/system', label: 'Система', icon: Settings2 },
] as const;

function ownerArea(pathname: string) {
  if (pathname.startsWith('/admin/company/search')) return 'search';
  if (pathname === '/admin/company') return 'today';
  if (
    pathname.startsWith('/admin/company/work') ||
    pathname.startsWith('/admin/company/owner-attention') ||
    pathname.startsWith('/admin/owner-attention') ||
    pathname.startsWith('/admin/content-qa') ||
    pathname.startsWith('/admin/product-facts-review') ||
    pathname.startsWith('/admin/seo-keyword-review')
  ) return 'work';
  if (
    pathname.startsWith('/admin/company/growth') ||
    pathname.startsWith('/admin/company/signals') ||
    pathname.startsWith('/admin/signals') ||
    pathname.startsWith('/admin/seo-keywords') ||
    pathname.startsWith('/admin/seo-clusters') ||
    pathname.startsWith('/admin/seo-cluster-proposals') ||
    pathname.startsWith('/admin/seo-portfolio') ||
    pathname.startsWith('/admin/seo-ownership-proposals') ||
    pathname.startsWith('/admin/seo-indexability') ||
    pathname.startsWith('/admin/opportunities') ||
    pathname.startsWith('/admin/strategy') ||
    pathname.startsWith('/admin/collections') ||
    pathname.startsWith('/admin/graph') ||
    pathname.startsWith('/admin/seo-lab') ||
    pathname.startsWith('/admin/content-briefs') ||
    pathname.startsWith('/admin/seo-apply') ||
    pathname.startsWith('/admin/seo-change-sets') ||
    pathname.startsWith('/admin/seo-gate') ||
    pathname.startsWith('/admin/seo-engine') ||
    pathname.startsWith('/admin/seo-approval') ||
    pathname.startsWith('/admin/seo-export') ||
    pathname.startsWith('/admin/seo-storefront-preview') ||
    pathname.startsWith('/admin/media-seo') ||
    pathname.startsWith('/admin/indexation') ||
    pathname === '/admin/seo'
  ) return 'growth';
  if (
    pathname.startsWith('/admin/company/results') ||
    pathname.startsWith('/admin/results') ||
    pathname.startsWith('/admin/experiments') ||
    pathname.startsWith('/admin/learning') ||
    pathname.startsWith('/admin/seo-applied-values')
  ) return 'results';
  if (
    pathname.startsWith('/admin/company/system') ||
    pathname.startsWith('/admin/company/advanced') ||
    pathname.startsWith('/admin/advanced') ||
    pathname.startsWith('/admin/system') ||
    pathname.startsWith('/admin/system-readiness') ||
    pathname.startsWith('/admin/data-health') ||
    pathname.startsWith('/admin/data-authority') ||
    pathname.startsWith('/admin/execution-map') ||
    pathname.startsWith('/admin/executions') ||
    pathname.startsWith('/admin/incidents') ||
    pathname.startsWith('/admin/roles') ||
    pathname.startsWith('/admin/scenario-tests') ||
    pathname.startsWith('/admin/metrics') ||
    pathname.startsWith('/admin/business-truth') ||
    pathname.startsWith('/admin/launch-readiness') ||
    pathname.startsWith('/admin/launch')
  ) return 'system';
  return 'products';
}

function currentContext(pathname: string) {
  const key = ownerArea(pathname);
  if (key === 'search') return 'Поиск';
  return NAV_ITEMS.find((item) => item.key === key)?.label || 'FEYA';
}

export default function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const activeArea = ownerArea(pathname);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem('feya-owner-sidebar') === 'collapsed');
      setCompactDensity(window.localStorage.getItem('feya-owner-density') === 'compact');
    } catch {
      // Local storage is optional; the navigation still works without it.
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        router.push('/admin/company/search');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  if (pathname.startsWith('/admin/login')) return <>{children}</>;

  const toggleDensity = () => {
    setCompactDensity((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('feya-owner-density', next ? 'compact' : 'comfortable');
      } catch {
        // View preference is optional.
      }
      return next;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('feya-owner-sidebar', next ? 'collapsed' : 'expanded');
      } catch {
        // Preference persistence is best-effort only.
      }
      return next;
    });
  };

  return (
    <div className={`owner-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${compactDensity ? ' is-density-compact' : ''}`} lang="ru">
      <aside className="owner-sidebar" aria-label="Основная навигация">
        <Link href="/admin/company" className="owner-brand" title="Центр управления FEYA">
          <span className="owner-brand-name">FEYA</span>
          <span className="owner-brand-title">Центр управления</span>
          <span className="owner-brand-subtitle">Сигналы · работа · рост · ИИ-команда</span>
        </Link>

        <button
          type="button"
          className="owner-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          title={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span>{sidebarCollapsed ? 'Развернуть' : 'Свернуть'}</span>
        </button>

        <nav className="owner-nav" aria-label="Разделы владельца">
          {NAV_ITEMS.map((item) => {
            const active = activeArea === item.key;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`owner-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={item.label}
              >
                <span className="owner-nav-mark" aria-hidden="true"><Icon size={14} strokeWidth={1.8} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="owner-sidebar-footer">
          <Link
            href="/admin/company/search"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/company/search') ? ' is-active' : ''}`} title="Поиск"
          >
            <span className="owner-nav-mark" aria-hidden="true"><Search size={14} strokeWidth={1.8} /></span>
            <span>Поиск</span>
          </Link>
          <Link
            href="/admin/company/advanced"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/company/advanced') ? ' is-active' : ''}`} title="Технические детали"
          >
            <span className="owner-nav-mark" aria-hidden="true"><Settings2 size={14} strokeWidth={1.8} /></span>
            <span>Технические детали</span>
          </Link>
          <Link href="/shop" className="owner-nav-item owner-nav-secondary" title="Магазин">
            <span className="owner-nav-mark" aria-hidden="true"><Store size={14} strokeWidth={1.8} /></span>
            <span>Магазин</span>
          </Link>
        </div>
      </aside>

      <div className="owner-stage">
        <header className="owner-topbar">
          <div className="owner-topbar-mobile-brand">FEYA</div>
          <Link href="/admin/company/search" className="owner-search-trigger" aria-label="Открыть поиск">
            <Search size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Найти товар, страницу, задачу или сигнал</span>
            <kbd>⌘ K</kbd>
          </Link>
          <div className="owner-topbar-context" title="Текущий раздел">
            {currentContext(pathname)}
          </div>
          <button
            type="button"
            className={`owner-density-toggle${compactDensity ? ' is-active' : ''}`}
            onClick={toggleDensity}
            aria-pressed={compactDensity}
            title={compactDensity ? 'Вернуть обычную плотность' : 'Сделать таблицы и карточки компактнее'}
          >
            <SlidersHorizontal size={13} strokeWidth={1.8} aria-hidden="true" />
            <span>{compactDensity ? 'Обычный вид' : 'Компактно'}</span>
          </button>
          <div className="owner-topbar-status">
            <span className="owner-status-dot" aria-hidden="true" />
            <span>Подготовка к запуску</span>
          </div>
        </header>

        <div className="owner-main">{children}</div>
      </div>

      <nav className="owner-mobile-nav" aria-label="Мобильная навигация">
        <Link href="/admin/company" className={activeArea === 'today' ? 'is-active' : ''} aria-current={activeArea === 'today' ? 'page' : undefined}>
          <span aria-hidden="true"><CalendarDays size={16} strokeWidth={1.8} /></span>
          <small>Сегодня</small>
        </Link>
        <Link href="/admin/company/work" className={activeArea === 'work' ? 'is-active' : ''} aria-current={activeArea === 'work' ? 'page' : undefined}>
          <span aria-hidden="true"><BriefcaseBusiness size={16} strokeWidth={1.8} /></span>
          <small>Работа</small>
        </Link>
        <Link href="/admin/company/search" className={activeArea === 'search' ? 'is-active' : ''} aria-current={activeArea === 'search' ? 'page' : undefined}>
          <span aria-hidden="true"><Search size={16} strokeWidth={1.8} /></span>
          <small>Найти</small>
        </Link>
        <Link href="/admin/products" className={activeArea === 'products' ? 'is-active' : ''} aria-current={activeArea === 'products' ? 'page' : undefined}>
          <span aria-hidden="true"><PackageSearch size={16} strokeWidth={1.8} /></span>
          <small>Товары</small>
        </Link>
        <Link href="/admin/company/system" className={['growth','results','system'].includes(activeArea) ? 'is-active' : ''}>
          <span aria-hidden="true">•••</span>
          <small>Ещё</small>
        </Link>
      </nav>
    </div>
  );
}
