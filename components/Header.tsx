'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User, Menu, Heart, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FeyaButterfly, FeyaMark } from '@/components/FeyaMark';
import { SEARCH_DISCOVERY_GROUPS, SEARCH_OWNER_DISCOVERY_ITEMS } from '@/config/searchDiscoveryArchitecture';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop', mega: true },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
];

function navIsActive(pathname: string, href: string, label: string) {
  if (href === '/') return pathname === '/';
  if (label === 'Shop') return pathname === '/shop' || pathname.startsWith('/shop/');
  if (label === 'Collections') return pathname === '/collections' || pathname.startsWith('/collections/');
  return pathname === href;
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <header data-testid="site-header" className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${scrolled ? 'backdrop-blur-xl bg-[rgba(7,7,10,0.78)] border-b border-[rgba(216,214,211,0.18)]' : 'bg-transparent'}`} onMouseLeave={() => setMegaOpen(false)}>
      <div className={`overflow-hidden transition-all duration-500 ${scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
        <div className="bg-gradient-to-r from-transparent via-[rgba(212,178,106,0.10)] to-transparent text-center py-2 text-[10px] tracking-[0.32em] uppercase text-silver">Express DHL · Worldwide shipping · Made to order in our atelier</div>
      </div>
      <div className="container-feya flex items-center justify-between py-3 lg:py-3.5">
        <Link href="/" data-testid="logo-link" className="flex items-center gap-2.5 group">
          <FeyaButterfly width={30} className="hidden sm:block opacity-90 transition-transform duration-500 group-hover:scale-[1.05]" />
          <FeyaMark variant="chrome" width={78} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>
        <nav className="hidden lg:flex items-center gap-7 xl:gap-9" data-testid="primary-nav">
          {NAV.map((item) => {
            const active = navIsActive(pathname, item.href, item.label);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onMouseEnter={() => setMegaOpen(Boolean(item.mega))}
                onFocus={() => setMegaOpen(Boolean(item.mega))}
                className={`relative text-[11px] tracking-[0.24em] uppercase font-medium transition-colors duration-300 ${active || (item.mega && megaOpen) ? 'text-white nav-active-glow' : 'text-[#C8C2B5] hover:text-white'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button aria-label="Search" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><Search size={15} strokeWidth={1.4} /></button>
          <button aria-label="Wishlist" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><Heart size={15} strokeWidth={1.4} /></button>
          <Link href="/account" aria-label="Account" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><User size={15} strokeWidth={1.4} /></Link>
          <Link href="/cart" aria-label="Bag" className={`relative flex items-center gap-2 px-3.5 h-9 rounded-full border transition-all ${count > 0 ? 'border-[var(--gold)] text-white bg-[rgba(212,178,106,0.10)]' : 'border-[rgba(216,214,211,0.4)] text-white'}`}>
            <ShoppingBag size={14} strokeWidth={1.4} />
            <span className="text-[10.5px] tracking-[0.22em] uppercase hidden md:inline">Bag</span>
            <span className="text-[10px] text-silver">·</span>
            <span className={`text-[11px] tabular-nums font-semibold ${count > 0 ? 'text-[var(--gold-warm)]' : ''}`}>{count}</span>
          </Link>
          <button
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-[rgba(216,214,211,0.18)] text-white"
          ><Menu size={16} /></button>
        </div>
      </div>
      {megaOpen && (
        <div onMouseEnter={() => setMegaOpen(true)} className="hidden lg:block absolute left-0 right-0 top-full border-y border-[rgba(216,214,211,0.14)] bg-[linear-gradient(180deg,rgba(13,13,18,0.94),rgba(7,7,10,0.90))] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]">
          <div className="container-feya grid grid-cols-[220px_1fr] gap-12 py-7">
            <div className="flex items-center gap-4 border-r border-[rgba(216,214,211,0.12)] pr-8">
              <FeyaButterfly width={52} className="opacity-90" />
              <div>
                <div className="eyebrow-gold mb-2">Atelier catalog</div>
                <p className="editorial-italic text-[15px] text-[var(--bone-dim)] leading-snug">Shop by piece, event and visual world.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-8">
              {SEARCH_DISCOVERY_GROUPS.map((group) => (
                <div key={group.code}>
                  <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--gold-warm)] mb-4">{group.title}</div>
                  <div className="flex flex-wrap gap-2.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        data-discovery-role={item.role}
                        className="rounded-full border border-[rgba(216,214,211,0.14)] bg-white/[0.025] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#D8D6D3] transition-all hover:border-[rgba(212,178,106,0.55)] hover:bg-[rgba(212,178,106,0.08)] hover:text-white hover:shadow-[0_0_22px_rgba(212,178,106,0.12)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="container-feya pb-5 flex flex-wrap items-center gap-6">
            <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[var(--bone-dim)] hover:text-white transition-colors">View full catalog <ArrowUpRight size={12} /></Link>
            <Link href="/collections" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[var(--bone-dim)] hover:text-white transition-colors">All collections <ArrowUpRight size={12} /></Link>
          </div>
        </div>
      )}

      {mobileOpen ? (
        <div className="lg:hidden border-y border-[rgba(216,214,211,0.14)] bg-[rgba(7,7,10,0.96)] backdrop-blur-xl">
          <div className="container-feya py-5">
            <nav aria-label="Mobile navigation" className="grid grid-cols-2 gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[rgba(216,214,211,0.12)] px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#D8D6D3]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-5 border-t border-[rgba(216,214,211,0.10)] pt-5">
              <div className="text-[9px] uppercase tracking-[0.3em] text-[var(--gold-warm)] mb-3">Evidence-backed collections</div>
              <div className="flex flex-wrap gap-2">
                {SEARCH_OWNER_DISCOVERY_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    data-discovery-role={item.role}
                    className="rounded-full border border-[rgba(216,214,211,0.14)] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[var(--bone-dim)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
