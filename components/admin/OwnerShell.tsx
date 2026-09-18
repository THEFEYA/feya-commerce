'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileImage,
  FileSearch,
  FileText,
  Gauge,
  ImageIcon,
  Layers3,
  PackageSearch,
  Rocket,
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

const WORK_TOOLS = [
  { href: '/admin', label: 'Панель магазина', icon: Gauge },
  { href: '/admin/listing-master', label: 'Мастер листинга', icon: SlidersHorizontal },
  { href: '/admin/seo-lab', label: 'SEO-лаборатория', icon: Layers3 },
  { href: '/admin/seo-engine/scoring', label: 'Оценка ключей', icon: BarChart3 },
  { href: '/admin/seo-engine/briefs', label: 'SEO-бриф', icon: FileText },
  { href: '/admin/seo-approval', label: 'Проверка SEO', icon: CheckCircle2 },
  { href: '/admin/media', label: 'Проверка медиа', icon: ImageIcon },
  { href: '/admin/media-seo', label: 'SEO изображений', icon: FileImage },
  { href: '/admin/launch', label: 'Запуск', icon: Rocket },
  { href: '/admin/indexation', label: 'Индексация', icon: FileSearch },
] as const;

function pathMatches(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ownerArea(pathname: string) {
  if (pathname === '/admin/company') return 'today';
  if (
    pathname.startsWith('/admin/company/work') ||
    pathname.startsWith('/admin/company/owner-attention')
  ) return 'work';
  if (
    pathname.startsWith('/admin/company/growth') ||
    pathname.startsWith('/admin/company/signals') ||
    pathname.startsWith('/admin/seo-keywords') ||
    pathname.startsWith('/admin/seo-keyword-review') ||
    pathname.startsWith('/admin/seo-clusters') ||
    pathname.startsWith('/admin/seo-cluster-proposals') ||
    pathname.startsWith('/admin/seo-portfolio') ||
    pathname.startsWith('/admin/seo-ownership-proposals') ||
    pathname.startsWith('/admin/seo-indexability') ||
    pathname.startsWith('/admin/opportunities') ||
    pathname.startsWith('/admin/strategy')
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
    pathname.startsWith('/admin/launch-readiness')
  ) return 'system';
  return 'products';
}

function currentContext(pathname: string) {
  const tool = WORK_TOOLS.find((item) => pathMatches(pathname, item.href));
  if (tool) return tool.label;
  const key = ownerArea(pathname);
  return NAV_ITEMS.find((item) => item.key === key)?.label || 'FEYA';
}

export default function OwnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const activeArea = ownerArea(pathname);
  const activeTool = WORK_TOOLS.find((item) => pathMatches(pathname, item.href));
  const toolsOpen = Boolean(activeTool);

  useEffect(() => {
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

  return (
    <div className="owner-shell" lang="ru">
      <aside className="owner-sidebar" aria-label="Основная навигация">
        <Link href="/admin/company" className="owner-brand">
          <span className="owner-brand-name">FEYA</span>
          <span className="owner-brand-title">Центр управления</span>
          <span className="owner-brand-subtitle">Бизнес · товары · рост · ИИ-команда</span>
        </Link>

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
              >
                <span className="owner-nav-mark" aria-hidden="true"><Icon size={14} strokeWidth={1.8} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <details className="owner-tools" open={toolsOpen}>
          <summary>
            <span className="owner-nav-mark" aria-hidden="true"><SlidersHorizontal size={14} strokeWidth={1.8} /></span>
            <span>Рабочие инструменты</span>
            <span className="owner-tools-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="owner-tools-list">
            {WORK_TOOLS.map((item) => {
              const active = pathMatches(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`owner-tool-link${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span aria-hidden="true"><Icon size={13} strokeWidth={1.8} /></span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </details>

        <div className="owner-sidebar-footer">
          <Link
            href="/admin/company/search"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/company/search') ? ' is-active' : ''}`}
          >
            <span className="owner-nav-mark" aria-hidden="true"><Search size={14} strokeWidth={1.8} /></span>
            <span>Поиск</span>
          </Link>
          <Link
            href="/admin/company/advanced"
            className={`owner-nav-item owner-nav-secondary${pathname.startsWith('/admin/company/advanced') ? ' is-active' : ''}`}
          >
            <span className="owner-nav-mark" aria-hidden="true"><Settings2 size={14} strokeWidth={1.8} /></span>
            <span>Технические детали</span>
          </Link>
          <Link href="/shop" className="owner-nav-item owner-nav-secondary">
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
          <div className="owner-topbar-status">
            <span className="owner-status-dot" aria-hidden="true" />
            <span>Подготовка к запуску</span>
          </div>
        </header>

        <div className="owner-main">{children}</div>
      </div>

      <nav className="owner-mobile-nav" aria-label="Мобильная навигация">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = activeArea === item.key;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={active ? 'is-active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <span aria-hidden="true"><Icon size={16} strokeWidth={1.8} /></span>
              <small>{item.label}</small>
            </Link>
          );
        })}
        <Link href="/admin/company/system" className={activeArea === 'system' || activeArea === 'results' ? 'is-active' : ''}>
          <span aria-hidden="true">•••</span>
          <small>Ещё</small>
        </Link>
      </nav>
    </div>
  );
}
