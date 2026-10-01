'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, User, Menu, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FeyaButterfly, FeyaMark } from '@/components/FeyaMark';
import {
  enabledNavigationGroups,
  navigationPanel,
  publicPrimaryNavigation,
  type StorefrontNavigationItem,
} from '@/config/storefrontNavigation';
import {
  DEFAULT_EVENTS_PERFORMANCE_MEGA_PREVIEW,
  DEFAULT_SHOP_MEGA_PREVIEW,
  DEFAULT_STYLE_MEGA_PREVIEW,
  EVENTS_PERFORMANCE_MEGA_PREVIEWS,
  SHOP_MEGA_PREVIEWS,
  STYLE_MEGA_PREVIEWS,
} from '@/config/megaMenuPresentation';

function navIsActive(pathname: string, href: string, code: string) {
  if (href === '/') return pathname === '/';
  if (code === 'shop') return pathname === '/shop' || pathname.startsWith('/shop/');
  if (href.includes('#')) return false;
  return pathname === href;
}

function MegaLeaf({
  item,
  onNavigate,
  onPreview,
  nested = false,
}: {
  item: StorefrontNavigationItem;
  onNavigate?: () => void;
  onPreview?: (label: string) => void;
  nested?: boolean;
}) {
  if (!item.enabled) return null;

  const rowClass = `group flex items-center justify-between border-b border-white/[0.07] py-2.5 transition-colors ${nested ? 'pl-4 text-[10px] tracking-[0.14em]' : 'text-[11px] tracking-[0.16em]'} uppercase`;

  return (
    <div>
      {item.href ? (
        <Link
          href={item.href}
          onClick={onNavigate}
          onMouseEnter={() => onPreview?.(item.label)}
          onFocus={() => onPreview?.(item.label)}
          className={`${rowClass} text-[#C8C2B5] hover:text-white`}
        >
          <span>{item.label}</span>
          <ArrowUpRight size={10} className="opacity-35 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </Link>
      ) : (
        <div aria-disabled="true" className={`${rowClass} cursor-default text-[rgba(200,194,181,.42)]`}>
          <span>{item.label}</span>
        </div>
      )}
      {item.children?.length ? (
        <div className="border-l border-white/10">
          {item.children.filter((child) => child.enabled).map((child) => (
            <MegaLeaf key={child.code} item={child} onNavigate={onNavigate} onPreview={onPreview} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>('shop');
  const [menuPreviewLabel, setMenuPreviewLabel] = useState(DEFAULT_SHOP_MEGA_PREVIEW);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disclosureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileDialogRef = useRef<HTMLDivElement | null>(null);

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
    setSearchOpen(false);
    cancelScheduledClose();
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileOpen) {
        setMobileOpen(false);
        window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
        return;
      }
      if (openPanel) {
        const disclosure = disclosureRefs.current[openPanel];
        setOpenPanel(null);
        window.requestAnimationFrame(() => disclosure?.focus());
        return;
      }
      setSearchOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, openPanel]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled])')]
      .filter((element) => element.offsetParent !== null);
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const primaryNavigation = useMemo(() => publicPrimaryNavigation(), []);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const cancelScheduledOpen = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const defaultPreviewForPanel = (panelCode: string) =>
    panelCode === 'shop'
      ? DEFAULT_SHOP_MEGA_PREVIEW
      : panelCode === 'events_performance'
        ? DEFAULT_EVENTS_PERFORMANCE_MEGA_PREVIEW
        : DEFAULT_STYLE_MEGA_PREVIEW;

  const openNavigationPanel = (panelCode: string) => {
    cancelScheduledClose();
    cancelScheduledOpen();
    setSearchOpen(false);
    setOpenPanel(panelCode);
    setMenuPreviewLabel(defaultPreviewForPanel(panelCode));
  };

  const schedulePanelOpen = (panelCode: string) => {
    cancelScheduledOpen();
    cancelScheduledClose();
    const delay = openPanel && openPanel !== panelCode ? 80 : 320;
    openTimerRef.current = setTimeout(() => openNavigationPanel(panelCode), delay);
  };

  const schedulePanelClose = () => {
    cancelScheduledOpen();
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setOpenPanel(null), 300);
  };

  const panelFocusables = (panelCode: string) => {
    const panel=document.getElementById(`nav-panel-${panelCode}`);
    if(!panel)return [];
    return [...panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')]
      .filter((element)=>element.offsetParent!==null);
  };

  const focusNextTopLevelLink = (panelCode: string) => {
    const currentIndex=primaryNavigation.findIndex((item)=>'panel' in item && String(item.panel||'')===panelCode);
    const next=primaryNavigation[currentIndex+1];
    if(next)document.getElementById(`primary-nav-link-${next.code}`)?.focus();
  };

  const handlePanelTab = (event: React.KeyboardEvent<HTMLDivElement>, panelCode: string) => {
    if(event.key!=='Tab')return;
    const items=panelFocusables(panelCode);
    if(!items.length)return;
    const first=items[0];
    const last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      disclosureRefs.current[panelCode]?.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      setOpenPanel(null);
      focusNextTopLevelLink(panelCode);
    }
  };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled ? 'backdrop-blur-xl bg-[rgba(7,7,10,0.78)] border-b border-[rgba(216,214,211,0.18)]' : 'bg-transparent'
      }`}
      onMouseEnter={cancelScheduledClose}
      onMouseLeave={schedulePanelClose}
      onFocusCapture={() => {
        cancelScheduledOpen();
        cancelScheduledClose();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenPanel(null);
      }}
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

        <nav aria-label="Main" className="hidden lg:block" data-testid="primary-nav">
          <ul className="flex items-center gap-5 xl:gap-7">
            {primaryNavigation.map((item) => {
              const active = navIsActive(pathname, item.href, item.code);
              const hasPanel = 'panel' in item && Boolean(item.panel);
              const panelCode = hasPanel ? String(item.panel) : '';
              const expanded = hasPanel && openPanel === panelCode;
              return (
                <li key={item.code} className="flex items-center">
                  <Link
                    id={`primary-nav-link-${item.code}`}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={() => {
                      if (hasPanel) schedulePanelOpen(panelCode);
                      else {
                        cancelScheduledOpen();
                        setOpenPanel(null);
                      }
                    }}
                    onMouseLeave={() => {
                      if (hasPanel) schedulePanelClose();
                    }}
                    className={`relative py-3 text-[11px] tracking-[0.24em] uppercase font-medium transition-colors duration-300 ${
                      active || expanded
                        ? 'text-white nav-active-glow'
                        : 'text-[#C8C2B5] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                  {hasPanel ? (
                    <button
                      ref={(node) => { disclosureRefs.current[panelCode] = node; }}
                      type="button"
                      aria-label={`${item.label} submenu`}
                      aria-expanded={expanded}
                      aria-controls={`nav-panel-${panelCode}`}
                      onClick={() => expanded ? setOpenPanel(null) : openNavigationPanel(panelCode)}
                      onKeyDown={(event) => {
                        if(event.key==='Tab'&&!event.shiftKey&&expanded){
                          const first=panelFocusables(panelCode)[0];
                          if(first){
                            event.preventDefault();
                            first.focus();
                          }
                        }
                      }}
                      className="relative -ml-3 -mr-3 flex h-11 w-11 items-center justify-center rounded-full text-[#C8C2B5] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d8b56d]/55"
                    >
                      <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`}/>
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            onClick={() => {
              setOpenPanel(null);
              setMobileOpen(false);
              setSearchOpen((value) => !value);
            }}
            className="flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"
          >
            {searchOpen ? <X size={15} strokeWidth={1.4} /> : <Search size={15} strokeWidth={1.4} />}
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
            ref={mobileMenuButtonRef}
            aria-label={mobileOpen ? 'Close menu' : 'Menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMobileOpen((value) => !value)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-[rgba(216,214,211,0.18)] text-white"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="absolute left-0 right-0 top-full border-y border-white/[0.10] bg-[rgba(8,8,10,.985)] shadow-[0_28px_80px_rgba(0,0,0,.68)] backdrop-blur-xl">
          <form
            role="search"
            className="container-feya flex items-center gap-3 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              const value = searchQuery.trim();
              setSearchOpen(false);
              router.push(value ? `/shop?search=${encodeURIComponent(value)}` : '/shop');
            }}
          >
            <Search size={18} strokeWidth={1.3} className="shrink-0 text-[#aaa2a0]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search TheFEYA products"
              placeholder="Search products, looks and pieces…"
              className="min-w-0 flex-1 bg-transparent text-[18px] text-[#f4f1ea] outline-none placeholder:text-[rgba(170,162,160,.48)]"
            />
            <button type="submit" className="visual-primary-cta !min-h-10 !px-5">Search</button>
          </form>
        </div>
      ) : null}

      {primaryNavigation.map((parentItem) => {
        if (!('panel' in parentItem) || !parentItem.panel) return null;
        const panelCode = String(parentItem.panel);
        const panel = navigationPanel(panelCode);
        const groups = enabledNavigationGroups(panelCode);
        if (!panel || !groups.length) return null;
        const previewMap =
          panelCode === 'shop'
            ? SHOP_MEGA_PREVIEWS
            : panelCode === 'events_performance'
              ? EVENTS_PERFORMANCE_MEGA_PREVIEWS
              : STYLE_MEGA_PREVIEWS;
        const defaultPreviewLabel = defaultPreviewForPanel(panelCode);
        const activePreviewLabel = openPanel === panelCode ? menuPreviewLabel : defaultPreviewLabel;
        const menuPreview = previewMap[activePreviewLabel] || previewMap[defaultPreviewLabel];
        const expanded = openPanel === panelCode;

        return (
          <div
            key={panelCode}
            id={`nav-panel-${panelCode}`}
            aria-hidden={!expanded}
            onMouseEnter={() => {
              cancelScheduledClose();
              cancelScheduledOpen();
              if (!expanded) openNavigationPanel(panelCode);
            }}
            onMouseLeave={schedulePanelClose}
            onKeyDown={(event) => handlePanelTab(event,panelCode)}
            className={`${expanded ? 'hidden lg:block' : 'hidden'} absolute left-0 right-0 top-full max-h-[calc(100vh-7rem)] overflow-y-auto border-y border-[rgba(216,214,211,0.14)] bg-[linear-gradient(180deg,rgba(13,13,18,0.995),rgba(7,7,10,0.995))] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.82)]`}
          >
            <div className="container-feya py-7">
              <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-4">
                <div>
                  <div className="eyebrow-gold mb-1">{panel.label}</div>
                  <p className="text-[13px] leading-5 text-[var(--bone-dim)]">
                    {panel.code === 'shop' ? 'Choose a product family.' : panel.code === 'events_performance' ? 'Choose an event or performance path.' : 'Choose a style or persona.'}
                  </p>
                </div>
                <Link
                  href={parentItem.href}
                  onClick={() => setOpenPanel(null)}
                  className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold-warm)] hover:text-white transition-colors"
                >
                  View all {panel.label.toLowerCase()} <ArrowUpRight size={11} className="inline-block ml-1" />
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(280px,.34fr)] gap-8">
                <div className={`grid min-w-0 gap-x-8 gap-y-8 ${
                  panel.code === 'shop'
                    ? 'grid-cols-4'
                    : panel.code === 'events_performance'
                      ? 'grid-cols-3'
                      : 'grid-cols-2'
                }`}>
                  {groups.map((group) => (
                    <section
                      key={group.code}
                      className="min-w-0"
                      onMouseEnter={() => {
                        if (previewMap[group.label]) setMenuPreviewLabel(group.label);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                        {group.href ? (
                          <Link
                            href={group.href}
                            onFocus={() => {
                              if (previewMap[group.label]) setMenuPreviewLabel(group.label);
                            }}
                            onClick={() => setOpenPanel(null)}
                            className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-warm)] hover:text-white transition-colors"
                          >
                            {group.label}
                          </Link>
                        ) : (
                          <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-warm)]">{group.label}</div>
                        )}
                        {group.href ? <ArrowUpRight size={10} className="text-[var(--gold-warm)] opacity-60" /> : null}
                      </div>
                      <div className="mt-1">
                        {group.items.filter((item) => item.enabled).map((item) => (
                          <MegaLeaf
                            key={item.code}
                            item={item}
                            onNavigate={() => setOpenPanel(null)}
                            onPreview={(label) => {
                              if (previewMap[label]) setMenuPreviewLabel(label);
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                {menuPreview ? (
                  <aside className="sticky top-0 h-[390px] overflow-hidden rounded-[14px] border border-[rgba(216,181,109,.09)] bg-[#111117]">
                    <img
                      key={`${panel.code}:${menuPreview.label}`}
                      src={menuPreview.imageUrl}
                      alt={`${menuPreview.label} visual preview`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover animate-[feyaPreviewFade_.28s_ease_both]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/10 to-transparent" />
                    <div className="visual-tile-label-band visual-mega-preview-band absolute inset-x-0 bottom-0 px-5 py-4">
                      <div className="text-[9px] uppercase tracking-[.18em] text-[#e7cf96]">
                        {panel.code === 'style' ? menuPreview.axis : panel.code === 'shop' ? 'Product preview' : 'Look preview'}
                      </div>
                      <div className="font-tall mt-1.5 text-[28px] leading-none text-[#f7f3ec]">{menuPreview.label}</div>
                      <Link
                        href={`/shop/${menuPreview.productSlug}`}
                        onClick={() => setOpenPanel(null)}
                        className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d9d2c8] hover:text-white"
                      >
                        Preview piece <ArrowUpRight size={11} />
                      </Link>
                    </div>
                  </aside>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      <div
        id="mobile-site-navigation"
        ref={mobileDialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        aria-hidden={!mobileOpen}
        className={`${mobileOpen ? 'lg:hidden' : 'hidden'} absolute left-0 right-0 top-full max-h-[calc(100vh-64px)] overflow-y-auto border-y border-[rgba(216,214,211,0.14)] bg-[rgba(7,7,10,0.99)] backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,0.72)]`}
      >
        <div className="container-feya py-4">
          {primaryNavigation.map((item) => {
            const hasPanel = 'panel' in item && Boolean(item.panel);
            if (!hasPanel) {
              return (
                <Link key={item.code} href={item.href} onClick={() => setMobileOpen(false)} className="block border-b border-white/10 py-4 text-[12px] uppercase tracking-[0.24em] text-[#D8D6D3]">
                  {item.label}
                </Link>
              );
            }

            const mobileGroups = enabledNavigationGroups(String(item.panel));
            const expanded = openMobileSection === item.code;
            const mobilePanelId = `mobile-panel-${item.code}`;

            return (
              <div key={item.code} className="border-b border-white/10">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={mobilePanelId}
                  onClick={() => setOpenMobileSection(expanded ? null : item.code)}
                  className="flex min-h-11 w-full items-center justify-between py-4 text-left text-[12px] uppercase tracking-[0.24em] text-[#D8D6D3]"
                >
                  {item.label}
                  <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>

                <div id={mobilePanelId} className={expanded ? 'pb-5' : 'hidden'}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="mb-4 flex min-h-11 items-center justify-between border-t border-white/[0.06] py-3 text-[10px] uppercase tracking-[0.20em] text-[var(--gold-warm)]"
                  >
                    {item.code === 'shop' ? 'Shop all' : `View all ${item.label}`}
                    <ArrowUpRight size={11}/>
                  </Link>
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
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
