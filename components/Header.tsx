'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User, Menu, Heart, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FeyaButterfly, FeyaMark } from '@/components/FeyaMark';
import {
  enabledNavigationGroups,
  navigationPanel,
  publicPrimaryNavigation,
  type StorefrontNavigationItem,
} from '@/config/storefrontNavigation';

function navIsActive(pathname: string, href: string, code: string) {
  if (href === '/') return pathname === '/';
  if (code === 'shop') return pathname === '/shop' || pathname.startsWith('/shop/');
  if (href.includes('#')) return false;
  return pathname === href;
}

function MegaLeaf({ item, onNavigate, nested = false }: { item: StorefrontNavigationItem; onNavigate?: () => void; nested?: boolean }) {
  if (!item.enabled || !item.href) return null;
  return (
    <div>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`group flex items-center justify-between border-b border-white/[0.07] py-2.5 transition-colors hover:text-white ${nested ? 'pl-4 text-[10px] tracking-[0.14em] text-[#9F9A90]' : 'text-[11px] tracking-[0.16em] text-[#C8C2B5]'} uppercase`}
      >
        <span>{item.label}</span>
        <ArrowUpRight size={10} className="opacity-35 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </Link>
      {item.children?.length ? (
        <div className="border-l border-white/10">
          {item.children.filter((child) => child.enabled).map((child) => (
            <MegaLeaf key={child.code} item={child} onNavigate={onNavigate} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>('shop');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const readBag = () => setCount(Number(window.localStorage.getItem('feya_visual_bag') || '0'));
    onScroll();
    readBag();
    window.addEventListener('scroll', onScroll, { passive: true });
    const timer = window.setInterval(readBag, 700);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenPanel(null);
  }, [pathname]);

  const primaryNavigation = useMemo(() => publicPrimaryNavigation(), []);
  const panel = useMemo(() => (openPanel ? navigationPanel(openPanel) : null), [openPanel]);
  const groups = useMemo(() => (openPanel ? enabledNavigationGroups(openPanel) : []), [openPanel]);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled ? 'backdrop-blur-xl bg-[rgba(7,7,10,0.78)] border-b border-[rgba(216,214,211,0.18)]' : 'bg-transparent'
      }`}
      onMouseLeave={() => setOpenPanel(null)}
    >
      <div className={`overflow-hidden transition-all duration-500 ${scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
        <div className="bg-gradient-to-r from-transparent via-[rgba(212,178,106,0.10)] to-transparent text-center py-2 text-[10px] tracking-[0.32em] uppercase text-silver">
          Express DHL · Worldwide shipping · Made to order in our atelier
        </div>
      </div>

      <div className="container-feya flex items-center justify-between py-3 lg:py-3.5">
        <Link href="/" data-testid="logo-link" className="flex items-center gap-2.5 group">
          <FeyaButterfly width={30} className="hidden sm:block opacity-90 transition-transform duration-500 group-hover:scale-[1.05]" />
          <FeyaMark variant="chrome" width={78} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 xl:gap-9" data-testid="primary-nav">
          {primaryNavigation.map((item) => {
            const active = navIsActive(pathname, item.href, item.code);
            const hasPanel = 'panel' in item && Boolean(item.panel);
            return (
              <Link
                key={item.code}
                href={item.href}
                onMouseEnter={() => setOpenPanel(hasPanel ? String(item.panel) : null)}
                onFocus={() => setOpenPanel(hasPanel ? String(item.panel) : null)}
                className={`relative text-[11px] tracking-[0.24em] uppercase font-medium transition-colors duration-300 ${
                  active || (hasPanel && openPanel === item.panel)
                    ? 'text-white nav-active-glow'
                    : 'text-[#C8C2B5] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button aria-label="Search" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all">
            <Search size={15} strokeWidth={1.4} />
          </button>
          <button aria-label="Wishlist" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all">
            <Heart size={15} strokeWidth={1.4} />
          </button>
          <Link href="/account" aria-label="Account" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all">
            <User size={15} strokeWidth={1.4} />
          </Link>
          <Link href="/cart" aria-label="Bag" className={`relative flex items-center gap-2 px-3.5 h-9 rounded-full border transition-all ${
            count > 0
              ? 'border-[var(--gold)] text-white bg-[rgba(212,178,106,0.10)]'
              : 'border-[rgba(216,214,211,0.4)] text-white'
          }`}>
            <ShoppingBag size={14} strokeWidth={1.4} />
            <span className="text-[10.5px] tracking-[0.22em] uppercase hidden md:inline">Bag</span>
            <span className="text-[10px] text-silver">·</span>
            <span className={`text-[11px] tabular-nums font-semibold ${count > 0 ? 'text-[var(--gold-warm)]' : ''}`}>{count}</span>
          </Link>
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-[rgba(216,214,211,0.18)] text-white"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {panel && groups.length > 0 ? (
        <div
          onMouseEnter={() => setOpenPanel(panel.code)}
          className="hidden lg:block absolute left-0 right-0 top-full border-y border-[rgba(216,214,211,0.14)] bg-[linear-gradient(180deg,rgba(13,13,18,0.985),rgba(7,7,10,0.98))] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]"
        >
          <div className="container-feya py-7">
            <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-4">
              <div>
                <div className="eyebrow-gold mb-1">{panel.label}</div>
                <p className="text-[13px] leading-5 text-[var(--bone-dim)]">
                  {panel.code === 'shop' ? 'Choose a product family.' : panel.code === 'events_performance' ? 'Choose the occasion, performance context or dance path.' : 'Choose a style or persona.'}
                </p>
              </div>
              <Link
                href={panel.code === 'shop' ? '/shop' : `/collections#${panel.code}`}
                className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold-warm)] hover:text-white transition-colors"
              >
                Explore {panel.label.toLowerCase()} <ArrowUpRight size={11} className="inline-block ml-1" />
              </Link>
            </div>

            <div className={`mt-5 grid gap-x-8 gap-y-8 ${panel.code === 'shop' ? 'grid-cols-5' : panel.code === 'events_performance' ? 'grid-cols-4' : 'grid-cols-2'}`}>
              {groups.map((group) => (
                <section key={group.code} className="min-w-0">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                    {group.href ? (
                      <Link href={group.href} className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-warm)] hover:text-white transition-colors">
                        {group.label}
                      </Link>
                    ) : (
                      <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-warm)]">{group.label}</div>
                    )}
                    {group.href ? <ArrowUpRight size={10} className="text-[var(--gold-warm)] opacity-60" /> : null}
                  </div>
                  <div className="mt-1">
                    {group.items.filter((item) => item.enabled).map((item) => (
                      <MegaLeaf key={item.code} item={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full max-h-[calc(100vh-64px)] overflow-y-auto border-y border-[rgba(216,214,211,0.14)] bg-[rgba(7,7,10,0.99)] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]">
          <div className="container-feya py-4">
            {primaryNavigation.map((item) => {
              const hasPanel = 'panel' in item && Boolean(item.panel);
              if (!hasPanel) {
                return (
                  <Link key={item.code} href={item.href} className="block border-b border-white/10 py-4 text-[12px] uppercase tracking-[0.24em] text-[#D8D6D3]">
                    {item.label}
                  </Link>
                );
              }

              const mobileGroups = enabledNavigationGroups(String(item.panel));
              const expanded = openMobileSection === item.code;

              return (
                <div key={item.code} className="border-b border-white/10">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenMobileSection(expanded ? null : item.code)}
                    className="flex w-full items-center justify-between py-4 text-left text-[12px] uppercase tracking-[0.24em] text-[#D8D6D3]"
                  >
                    {item.label}
                    <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded ? (
                    <div className="pb-5">
                      {mobileGroups.map((group) => (
                        <div key={group.code} className="border-t border-white/[0.06] py-4 first:border-t-0 first:pt-0">
                          {group.href ? (
                            <Link
                              href={group.href}
                              onClick={() => setMobileOpen(false)}
                              className="text-[10px] uppercase tracking-[0.26em] text-[var(--gold-warm)]"
                            >
                              {group.label}
                            </Link>
                          ) : (
                            <div className="text-[10px] uppercase tracking-[0.26em] text-[var(--gold-warm)]">{group.label}</div>
                          )}
                          <div className="mt-2 pl-3">
                            {group.items.filter((child) => child.enabled).map((child) => (
                              <MegaLeaf key={child.code} item={child} onNavigate={() => setMobileOpen(false)} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
