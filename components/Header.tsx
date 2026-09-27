'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User, Menu, Heart, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FeyaButterfly, FeyaMark } from '@/components/FeyaMark';
import {
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

function NavItemChip({ item, onNavigate }: { item: StorefrontNavigationItem; onNavigate?: () => void }) {
  const className = 'rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-all';
  if (item.enabled && item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`${className} border-[rgba(216,214,211,0.14)] bg-white/[0.025] text-[#D8D6D3] hover:border-[rgba(212,178,106,0.55)] hover:bg-[rgba(212,178,106,0.08)] hover:text-white hover:shadow-[0_0_22px_rgba(212,178,106,0.12)]`}
      >
        {item.label}
      </Link>
    );
  }

  if (item.enabled) {
    return (
      <span className={`${className} border-[rgba(216,214,211,0.10)] bg-white/[0.015] text-[#B5B0A6]`}>
        {item.label}
      </span>
    );
  }

  return (
    <span
      aria-disabled="true"
      className={`${className} cursor-default border-[rgba(216,214,211,0.07)] bg-transparent text-[rgba(200,194,181,0.38)]`}
    >
      {item.label}
    </span>
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

  const panel = useMemo(() => openPanel ? navigationPanel(openPanel) : null, [openPanel]);
  const primaryNavigation = useMemo(() => publicPrimaryNavigation(), []);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${scrolled ? 'backdrop-blur-xl bg-[rgba(7,7,10,0.78)] border-b border-[rgba(216,214,211,0.18)]' : 'bg-transparent'}`}
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
                className={`relative text-[11px] tracking-[0.24em] uppercase font-medium transition-colors duration-300 ${active || (hasPanel && openPanel === item.panel) ? 'text-white nav-active-glow' : 'text-[#C8C2B5] hover:text-white'}`}
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
          <Link href="/cart" aria-label="Bag" className={`relative flex items-center gap-2 px-3.5 h-9 rounded-full border transition-all ${count > 0 ? 'border-[var(--gold)] text-white bg-[rgba(212,178,106,0.10)]' : 'border-[rgba(216,214,211,0.4)] text-white'}`}>
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

      {panel && (
        <div
          onMouseEnter={() => setOpenPanel(panel.code)}
          className="hidden lg:block absolute left-0 right-0 top-full border-y border-[rgba(216,214,211,0.14)] bg-[linear-gradient(180deg,rgba(13,13,18,0.96),rgba(7,7,10,0.93))] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]"
        >
          <div className="container-feya grid grid-cols-[220px_1fr] gap-12 py-7">
            <div className="flex items-center gap-4 border-r border-[rgba(216,214,211,0.12)] pr-8">
              <FeyaButterfly width={52} className="opacity-90" />
              <div>
                <div className="eyebrow-gold mb-2">{panel.label}</div>
                <p className="editorial-italic text-[15px] text-[var(--bone-dim)] leading-snug">
                  Shop by piece, event, performance and visual direction.
                </p>
              </div>
            </div>

            <div className={`grid gap-8 ${panel.groups.filter((group) => group.items.some((item) => item.enabled)).length >= 4 ? 'grid-cols-4' : panel.groups.filter((group) => group.items.some((item) => item.enabled)).length === 3 ? 'grid-cols-3' : panel.groups.filter((group) => group.items.some((item) => item.enabled)).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {panel.groups.filter((group) => group.items.some((item) => item.enabled)).map((group) => (
                <div key={group.code}>
                  <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--gold-warm)] mb-4">{group.label}</div>
                  <div className="flex flex-wrap gap-2.5">
                    {group.items.filter((item) => item.enabled).map((item) => <NavItemChip key={item.code} item={item} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="container-feya pb-5">
            <Link href={panel.code === 'shop' ? '/shop' : `/collections#${panel.code}`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[var(--bone-dim)] hover:text-white transition-colors">
              Explore {panel.label.toLowerCase()} <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full max-h-[calc(100vh-64px)] overflow-y-auto border-y border-[rgba(216,214,211,0.14)] bg-[rgba(7,7,10,0.98)] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]">
          <div className="container-feya py-5">
            {primaryNavigation.map((item) => {
              const hasPanel = 'panel' in item && Boolean(item.panel);
              if (!hasPanel) {
                return (
                  <Link key={item.code} href={item.href} className="block border-b border-white/10 py-4 text-[12px] uppercase tracking-[0.24em] text-[#D8D6D3]">
                    {item.label}
                  </Link>
                );
              }

              const mobilePanel = navigationPanel(String(item.panel));
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
                  {expanded && mobilePanel && (
                    <div className="pb-4">
                      {mobilePanel.groups.filter((group) => group.items.some((child) => child.enabled)).map((group) => (
                        <div key={group.code} className="mb-5 last:mb-0">
                          <div className="mb-2 text-[9px] uppercase tracking-[0.28em] text-[var(--gold-warm)]">{group.label}</div>
                          <div className="flex flex-wrap gap-2">
                            {group.items.filter((child) => child.enabled).map((child) => <NavItemChip key={child.code} item={child} onNavigate={() => setMobileOpen(false)} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="grid grid-cols-3 gap-2 pt-5">
              <Link href="/size-guide" className="btn-ghost justify-center text-center">Size</Link>
              <Link href="/shipping" className="btn-ghost justify-center text-center">Shipping</Link>
              <Link href="/contact" className="btn-ghost justify-center text-center">Contact</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
