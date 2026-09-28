'use client';

import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import { ShopPagination } from '@/components/ShopPagination';
import type { StorefrontProduct } from '@/lib/types';
import {
  SHOP_PAGE_SIZE as PAGE_SIZE,
  PIECES,
  PARTS,
  COLORS,
  EVENTS,
  PERFORMANCE,
  DANCE,
  STYLES,
  SORTS,
  defaultShopFilters,
  filterShopProducts,
  type ShopNavigation,
} from '@/lib/shopCatalogNavigation';

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function allowedParamValue(value: string | null, allowed: string[]) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) || '';
}

function FilterBox({ checked }: { checked: boolean }) {
  return (
    <span className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${checked ? 'border-[var(--gold)] text-[var(--gold-warm)] shadow-[0_0_10px_rgba(212,178,106,.22)]' : 'border-[rgba(216,214,211,0.34)] text-transparent'}`}>
      {checked ? <Check size={10} strokeWidth={2.4} /> : null}
    </span>
  );
}

export function ShopClient({
  products,
  error,
  navigation,
}: {
  products: StorefrontProduct[];
  error?: string;
  navigation?: ShopNavigation;
}) {
  const initial = navigation?.filters ?? defaultShopFilters();

  const [page, setPage] = useState(navigation?.page ?? 1);
  const [piece, setPiece] = useState(initial.piece);
  const [part, setPart] = useState(initial.part);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [color, setColor] = useState(initial.color);
  const [event, setEvent] = useState<string[]>(initial.event);
  const [performance, setPerformance] = useState<string[]>(initial.performance);
  const [dance, setDance] = useState<string[]>(initial.dance);
  const [style, setStyle] = useState<string[]>(initial.style);
  const [search, setSearch] = useState(initial.search);
  const [sort, setSort] = useState(initial.sort);
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (navigation) return;
    const params = new URLSearchParams(window.location.search);

    const nextPiece = allowedParamValue(params.get('piece'), PIECES);
    const nextPart = allowedParamValue(params.get('part'), PARTS);
    const nextEvent = allowedParamValue(params.get('event'), EVENTS);
    const nextPerformance = allowedParamValue(params.get('performance'), PERFORMANCE);
    const nextDance = allowedParamValue(params.get('dance'), DANCE);
    const nextStyle = allowedParamValue(params.get('style'), STYLES);
    const nextSearch = params.get('search')?.trim() || '';

    if (nextPiece) setPiece(nextPiece);
    if (nextPart) setPart(nextPart);
    if (nextEvent) setEvent([nextEvent]);
    if (nextPerformance) setPerformance([nextPerformance]);
    if (nextDance) setDance([nextDance]);
    if (nextStyle) setStyle([nextStyle]);
    if (nextSearch) setSearch(nextSearch);
  }, [navigation]);

  const filters = useMemo(
    () => ({ piece, part, priceMin, priceMax, color, event, performance, dance, style, search, sort }),
    [piece, part, priceMin, priceMax, color, event, performance, dance, style, search, sort],
  );

  const filtered = useMemo(() => filterShopProducts(products, filters), [products, filters]);

  const [previousFilters, setPreviousFilters] = useState(filters);
  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [piece, part, priceMin, priceMax, color, event, performance, dance, style, search, sort]);

  const visibleProducts = navigation
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filtered.slice(0, visibleCount);

  const canLoadMore = visibleCount < filtered.length;

  const clear = () => {
    setPiece('All');
    setPart('');
    setPriceMin(0);
    setPriceMax(1000);
    setColor('');
    setEvent([]);
    setPerformance([]);
    setDance([]);
    setStyle([]);
    setSearch('');
    setSort(SORTS[0]);
  };

  const activeCount =
    Number(piece !== 'All') +
    Number(Boolean(part)) +
    Number(priceMin > 0 || priceMax < 1000) +
    Number(Boolean(color)) +
    event.length +
    performance.length +
    dance.length +
    style.length +
    Number(Boolean(search));

  return (
    <div data-testid="shop-page" className="relative pt-24 lg:pt-28">
      <section className="container-feya py-8 lg:py-10 border-b border-[rgba(216,214,211,0.10)]">
        <div className="eyebrow mb-3 reveal">TheFEYA catalog · Handmade statement pieces</div>
        <h1 className="display-hero text-bone reveal reveal-d1" style={{ fontSize: 'clamp(44px, 6.5vw, 96px)' }}>
          The <span className="editorial-italic text-gold-grad">shop</span>
        </h1>
        <p className="editorial-italic text-[var(--bone-dim)] mt-4 text-lg max-w-3xl">
          Start from the Shop menu when you want a specific piece. Once inside the catalog, refine by color, event, performance context or style.
        </p>
      </section>

      <section className="container-feya grid grid-cols-12 gap-7 lg:gap-10 py-10">
        <aside className="hidden lg:block col-span-2" data-testid="filter-sidebar">
          <div className="space-y-7">
            <div>
              <div className="eyebrow text-[10.5px] mb-2">Search</div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search TheFEYA…"
                  className="w-full h-9 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(216,214,211,0.18)] text-bone pl-9 pr-3 text-[12.5px] focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Piece</div>
              {PIECES.filter((value) => value !== 'All').map((value) => (
                <button
                  key={value}
                  onClick={() => setPiece(piece === value ? 'All' : value)}
                  className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"
                >
                  <FilterBox checked={piece === value} />{value}
                </button>
              ))}
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Body area</div>
              {PARTS.map((value) => (
                <button key={value} onClick={() => setPart(part === value ? '' : value)} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white">
                  <FilterBox checked={part === value} />{value}
                </button>
              ))}
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Color</div>
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map((value) => (
                  <button key={value} onClick={() => setColor(color === value ? '' : value)} className="flex flex-col items-center gap-1 group">
                    <span className={`w-7 h-7 rounded-full border-2 transition-all ${color === value ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]' : 'border-[rgba(216,214,211,0.30)] group-hover:border-white'}`} style={colorStyle(value)} />
                    <span className={`text-[9px] tracking-[0.12em] uppercase ${color === value ? 'text-white' : 'text-[#9b988e]'}`}>{value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Price</div>
              <div className="relative h-7">
                <div className="absolute top-3 left-0 right-0 h-px bg-[rgba(216,214,211,0.25)]" />
                <input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMin} onChange={(event) => setPriceMin(Math.min(Number(event.target.value), priceMax - 10))} />
                <input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMax} onChange={(event) => setPriceMax(Math.max(Number(event.target.value), priceMin + 10))} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input value={priceMin} onChange={(event) => setPriceMin(Number(event.target.value) || 0)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" />
                <span className="text-smoke">to</span>
                <input value={priceMax} onChange={(event) => setPriceMax(Number(event.target.value) || 1000)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" />
              </div>
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Event</div>
              {EVENTS.map((value) => (
                <button key={value} onClick={() => setEvent(toggleValue(event, value))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white">
                  <FilterBox checked={event.includes(value)} />{value}
                </button>
              ))}
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Performance</div>
              {PERFORMANCE.map((value) => (
                <button key={value} onClick={() => setPerformance(toggleValue(performance, value))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white">
                  <FilterBox checked={performance.includes(value)} />{value}
                </button>
              ))}
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Dance</div>
              {DANCE.map((value) => (
                <button key={value} onClick={() => setDance(toggleValue(dance, value))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white">
                  <FilterBox checked={dance.includes(value)} />{value}
                </button>
              ))}
            </div>

            <div>
              <div className="eyebrow text-[10.5px] mb-3">Style</div>
              {STYLES.map((value) => (
                <button key={value} onClick={() => setStyle(toggleValue(style, value))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white">
                  <FilterBox checked={style.includes(value)} />{value}
                </button>
              ))}
            </div>

            {activeCount > 0 && (
              <button onClick={clear} className="w-full text-left flex items-center gap-2 text-[var(--gold)] hover:text-white text-[11px] tracking-[0.22em] uppercase pt-2 border-t border-[rgba(216,214,211,0.10)]">
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-10">
          <div className="relative flex items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
            <div className="eyebrow-dim">Showing {visibleProducts.length} of {filtered.length} pieces</div>
            <div className="relative shrink-0">
              <button onClick={() => setSortOpen((value) => !value)} className="chip flex items-center gap-2">
                <SlidersHorizontal size={13} /> {sort}
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-[278px] rounded-xl border border-[rgba(216,214,211,.22)] bg-[rgba(5,5,8,.96)] p-2 z-[100] shadow-[0_28px_80px_rgba(0,0,0,.75)] backdrop-blur-xl flex flex-col gap-1 overflow-hidden">
                  {SORTS.map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setSort(value);
                        setSortOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2.5 rounded-lg text-[10px] tracking-[0.20em] uppercase transition-all ${sort === value ? 'text-[var(--gold-warm)] bg-[rgba(212,178,106,.12)]' : 'text-[var(--bone-dim)] hover:text-white hover:bg-white/8'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && products.length === 0 ? <div className="glass rounded-xl p-6 text-bone-dim">{error}</div> : null}
          {products.length > 0 && filtered.length === 0 ? <div className="glass rounded-xl p-6 text-bone-dim">No products match these filters.</div> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
            {visibleProducts.map((product, index) => <ProductCard key={product.canonical_product_id} product={product} index={index} />)}
          </div>

          {navigation ? (
            <ShopPagination page={page} count={filtered.length} filters={filters} />
          ) : canLoadMore ? (
            <div className="flex justify-center pt-10">
              <button onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))} className="btn-ghost">
                Show 20 more
              </button>
            </div>
          ) : null}
        </main>
      </section>
    </div>
  );
}
