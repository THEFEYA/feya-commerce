'use client';

import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import { ShopPagination } from '@/components/ShopPagination';
import type { StorefrontProduct } from '@/lib/types';
import {
  AUDIENCES,
  BODY_AREA_TREE,
  COLORS,
  DANCE,
  EFFECTS,
  EVENTS,
  MATERIALS,
  PERFORMANCE,
  PERSONAS,
  SHOP_PAGE_SIZE as PAGE_SIZE,
  SORTS,
  STYLES,
  defaultShopFilters,
  filterShopProducts,
  type ShopFilters,
  type ShopNavigation,
} from '@/lib/shopCatalogNavigation';

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function allowedParamValues(value: string | null, allowed: readonly string[]) {
  if (!value) return [];
  const result = value
    .split(',')
    .map((entry) => allowed.find((item) => item.toLowerCase() === entry.trim().toLowerCase()) || '')
    .filter(Boolean);
  return [...new Set(result)];
}

function FilterBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${
        checked
          ? 'border-[var(--gold)] text-[var(--gold-warm)] shadow-[0_0_10px_rgba(212,178,106,.22)]'
          : 'border-[rgba(216,214,211,0.34)] text-transparent'
      }`}
    >
      {checked ? <Check size={10} strokeWidth={2.4} /> : null}
    </span>
  );
}

function FilterSection({
  title,
  activeCount = 0,
  defaultOpen = false,
  children,
}: {
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);

  return (
    <section className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 py-1 text-left"
      >
        <span className="eyebrow text-[10.5px]">{title}</span>
        <span className="flex items-center gap-2 text-[10px] text-[var(--smoke)]">
          {activeCount > 0 ? (
            <span className="min-w-5 rounded-full border border-[rgba(212,178,106,.35)] px-1.5 py-0.5 text-center text-[var(--gold-warm)]">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open ? <div className="pt-3">{children}</div> : null}
    </section>
  );
}

function CheckboxList({
  values,
  selected,
  onToggle,
}: {
  values: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className="flex w-full items-center gap-2 py-1.5 text-left text-[12px] text-[var(--bone-dim)] transition-colors hover:text-white"
        >
          <FilterBox checked={selected.includes(value)} />
          <span>{value}</span>
        </button>
      ))}
    </div>
  );
}

function BodyAreaTree({
  parts,
  pieces,
  onTogglePart,
  onTogglePiece,
}: {
  parts: string[];
  pieces: string[];
  onTogglePart: (value: string) => void;
  onTogglePiece: (value: string) => void;
}) {
  const initiallyExpanded = BODY_AREA_TREE
    .filter((group) => parts.includes(group.part) || group.pieces.some((piece) => pieces.includes(piece)))
    .map((group) => group.part);

  const [expanded, setExpanded] = useState<string[]>(initiallyExpanded);

  const toggleExpanded = (part: string) => {
    setExpanded((current) => toggleValue(current, part));
  };

  return (
    <div className="divide-y divide-white/[0.07] rounded-lg border border-white/[0.08] bg-white/[0.015]">
      {BODY_AREA_TREE.map((group) => {
        const isOpen = expanded.includes(group.part);
        const childSelections = group.pieces.filter((piece) => pieces.includes(piece)).length;

        return (
          <div key={group.part}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                aria-label={`Select all ${group.part}`}
                onClick={() => onTogglePart(group.part)}
                className="shrink-0"
              >
                <FilterBox checked={parts.includes(group.part)} />
              </button>

              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleExpanded(group.part)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
              >
                <span className="text-[12px] text-[#D2CEC4]">{group.part}</span>
                <span className="flex items-center gap-2">
                  {childSelections > 0 ? (
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-[var(--gold-warm)]">
                      {childSelections}
                    </span>
                  ) : null}
                  <ChevronDown size={12} className={`text-[var(--smoke)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
            </div>

            {isOpen ? (
              <div className="border-t border-white/[0.06] bg-black/10 px-3 py-2 pl-8">
                <CheckboxList values={group.pieces} selected={pieces} onToggle={onTogglePiece} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type FilterPanelProps = {
  filters: ShopFilters;
  setSearch: (value: string) => void;
  setAudience: (value: string[]) => void;
  setPart: (value: string[]) => void;
  setPiece: (value: string[]) => void;
  setPriceMin: (value: number) => void;
  setPriceMax: (value: number) => void;
  setColor: (value: string) => void;
  setEvent: (value: string[]) => void;
  setPerformance: (value: string[]) => void;
  setDance: (value: string[]) => void;
  setStyle: (value: string[]) => void;
  setPersona: (value: string[]) => void;
  setMaterial: (value: string[]) => void;
  setEffect: (value: string[]) => void;
  clear: () => void;
  activeCount: number;
};

function CatalogFilterPanel({
  filters,
  setSearch,
  setAudience,
  setPart,
  setPiece,
  setPriceMin,
  setPriceMax,
  setColor,
  setEvent,
  setPerformance,
  setDance,
  setStyle,
  setPersona,
  setMaterial,
  setEffect,
  clear,
  activeCount,
}: FilterPanelProps) {
  const toggleAudience = (value: string) => setAudience(toggleValue(filters.audience, value));
  const togglePart = (value: string) => setPart(toggleValue(filters.part, value));
  const togglePiece = (value: string) => setPiece(toggleValue(filters.piece, value));
  const toggleEvent = (value: string) => setEvent(toggleValue(filters.event, value));
  const togglePerformance = (value: string) => setPerformance(toggleValue(filters.performance, value));
  const toggleDance = (value: string) => setDance(toggleValue(filters.dance, value));
  const toggleStyle = (value: string) => setStyle(toggleValue(filters.style, value));
  const togglePersona = (value: string) => setPersona(toggleValue(filters.persona, value));
  const toggleMaterial = (value: string) => setMaterial(toggleValue(filters.material, value));
  const toggleEffect = (value: string) => setEffect(toggleValue(filters.effect, value));

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow text-[10.5px] mb-2">Search</div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" />
          <input
            value={filters.search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search TheFEYA…"
            className="w-full h-9 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(216,214,211,0.18)] text-bone pl-9 pr-3 text-[12.5px] focus:outline-none focus:border-white"
          />
        </div>
      </div>

      <FilterSection title="Audience" activeCount={filters.audience.length} defaultOpen>
        <CheckboxList values={AUDIENCES} selected={filters.audience} onToggle={toggleAudience} />
      </FilterSection>

      <FilterSection title="Body Area" activeCount={filters.part.length + filters.piece.length} defaultOpen>
        <BodyAreaTree
          parts={filters.part}
          pieces={filters.piece}
          onTogglePart={togglePart}
          onTogglePiece={togglePiece}
        />
      </FilterSection>

      <FilterSection
        title="Price"
        activeCount={filters.priceMin > 0 || filters.priceMax < 1000 ? 1 : 0}
        defaultOpen
      >
        <div className="relative h-7">
          <div className="absolute top-3 left-0 right-0 h-px bg-[rgba(216,214,211,0.25)]" />
          <input
            className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none"
            type="range"
            min="0"
            max="1000"
            value={filters.priceMin}
            onChange={(event) => setPriceMin(Math.min(Number(event.target.value), filters.priceMax - 10))}
          />
          <input
            className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none"
            type="range"
            min="0"
            max="1000"
            value={filters.priceMax}
            onChange={(event) => setPriceMax(Math.max(Number(event.target.value), filters.priceMin + 10))}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            value={filters.priceMin}
            onChange={(event) => setPriceMin(Number(event.target.value) || 0)}
            className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs"
          />
          <span className="text-smoke">to</span>
          <input
            value={filters.priceMax}
            onChange={(event) => setPriceMax(Number(event.target.value) || 1000)}
            className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs"
          />
        </div>
      </FilterSection>

      <FilterSection title="Color" activeCount={filters.color ? 1 : 0} defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          {COLORS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setColor(filters.color === value ? '' : value)}
              className="flex flex-col items-center gap-1 group"
            >
              <span
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  filters.color === value
                    ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]'
                    : 'border-[rgba(216,214,211,0.30)] group-hover:border-white'
                }`}
                style={colorStyle(value)}
              />
              <span className={`text-[9px] tracking-[0.12em] uppercase ${filters.color === value ? 'text-white' : 'text-[#9b988e]'}`}>
                {value}
              </span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Event" activeCount={filters.event.length}>
        <CheckboxList values={EVENTS} selected={filters.event} onToggle={toggleEvent} />
      </FilterSection>

      <FilterSection title="Performance" activeCount={filters.performance.length + filters.dance.length}>
        <CheckboxList values={PERFORMANCE} selected={filters.performance} onToggle={togglePerformance} />
        <div className="mt-1">
          <CheckboxList values={DANCE} selected={filters.dance} onToggle={toggleDance} />
        </div>
      </FilterSection>

      <FilterSection title="Style" activeCount={filters.style.length}>
        <CheckboxList values={STYLES} selected={filters.style} onToggle={toggleStyle} />
      </FilterSection>

      <FilterSection title="Persona" activeCount={filters.persona.length}>
        <CheckboxList values={PERSONAS} selected={filters.persona} onToggle={togglePersona} />
      </FilterSection>

      <FilterSection title="Material" activeCount={filters.material.length}>
        <CheckboxList values={MATERIALS} selected={filters.material} onToggle={toggleMaterial} />
      </FilterSection>

      <FilterSection title="Visual Effect" activeCount={filters.effect.length}>
        <CheckboxList values={EFFECTS} selected={filters.effect} onToggle={toggleEffect} />
      </FilterSection>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={clear}
          className="w-full flex items-center gap-2 text-[var(--gold)] hover:text-white text-[11px] tracking-[0.22em] uppercase pt-4 border-t border-[rgba(216,214,211,0.10)]"
        >
          <X size={12} /> Clear all filters
        </button>
      ) : null}
    </div>
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
  const [piece, setPiece] = useState<string[]>(initial.piece);
  const [part, setPart] = useState<string[]>(initial.part);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [color, setColor] = useState(initial.color);
  const [event, setEvent] = useState<string[]>(initial.event);
  const [performance, setPerformance] = useState<string[]>(initial.performance);
  const [dance, setDance] = useState<string[]>(initial.dance);
  const [style, setStyle] = useState<string[]>(initial.style);
  const [persona, setPersona] = useState<string[]>(initial.persona);
  const [audience, setAudience] = useState<string[]>(initial.audience);
  const [material, setMaterial] = useState<string[]>(initial.material);
  const [effect, setEffect] = useState<string[]>(initial.effect);
  const [search, setSearch] = useState(initial.search);
  const [sort, setSort] = useState(initial.sort);
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (navigation) return;
    const params = new URLSearchParams(window.location.search);

    const nextPiece = allowedParamValues(params.get('piece'), BODY_AREA_TREE.flatMap((group) => group.pieces).concat(['Full Look']));
    const nextPart = allowedParamValues(params.get('part'), BODY_AREA_TREE.map((group) => group.part));
    const nextEvent = allowedParamValues(params.get('event'), EVENTS);
    const nextPerformance = allowedParamValues(params.get('performance'), PERFORMANCE);
    const nextDance = allowedParamValues(params.get('dance'), DANCE);
    const nextStyle = allowedParamValues(params.get('style'), STYLES);
    const nextPersona = allowedParamValues(params.get('persona'), PERSONAS);
    const nextAudience = allowedParamValues(params.get('audience'), AUDIENCES);
    const nextMaterial = allowedParamValues(params.get('material'), MATERIALS);
    const nextEffect = allowedParamValues(params.get('effect'), EFFECTS);
    const nextSearch = params.get('search')?.trim() || '';

    if (nextPiece.length) setPiece(nextPiece);
    if (nextPart.length) setPart(nextPart);
    if (nextEvent.length) setEvent(nextEvent);
    if (nextPerformance.length) setPerformance(nextPerformance);
    if (nextDance.length) setDance(nextDance);
    if (nextStyle.length) setStyle(nextStyle);
    if (nextPersona.length) setPersona(nextPersona);
    if (nextAudience.length) setAudience(nextAudience);
    if (nextMaterial.length) setMaterial(nextMaterial);
    if (nextEffect.length) setEffect(nextEffect);
    if (nextSearch) setSearch(nextSearch);
  }, [navigation]);

  const filters = useMemo(
    () => ({
      piece,
      part,
      priceMin,
      priceMax,
      color,
      event,
      performance,
      dance,
      style,
      persona,
      audience,
      material,
      effect,
      search,
      sort,
    }),
    [piece, part, priceMin, priceMax, color, event, performance, dance, style, persona, audience, material, effect, search, sort],
  );

  const filtered = useMemo(() => filterShopProducts(products, filters), [products, filters]);

  const [previousFilters, setPreviousFilters] = useState(filters);
  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [piece, part, priceMin, priceMax, color, event, performance, dance, style, persona, audience, material, effect, search, sort]);

  const visibleProducts = navigation
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filtered.slice(0, visibleCount);

  const canLoadMore = visibleCount < filtered.length;

  const clear = () => {
    setPiece([]);
    setPart([]);
    setPriceMin(0);
    setPriceMax(1000);
    setColor('');
    setEvent([]);
    setPerformance([]);
    setDance([]);
    setStyle([]);
    setPersona([]);
    setAudience([]);
    setMaterial([]);
    setEffect([]);
    setSearch('');
    setSort(SORTS[0]);
  };

  const activeCount =
    piece.length +
    part.length +
    Number(priceMin > 0 || priceMax < 1000) +
    Number(Boolean(color)) +
    event.length +
    performance.length +
    dance.length +
    style.length +
    persona.length +
    audience.length +
    material.length +
    effect.length +
    Number(Boolean(search));

  const panelProps: FilterPanelProps = {
    filters,
    setSearch,
    setAudience,
    setPart,
    setPiece,
    setPriceMin,
    setPriceMax,
    setColor,
    setEvent,
    setPerformance,
    setDance,
    setStyle,
    setPersona,
    setMaterial,
    setEffect,
    clear,
    activeCount,
  };

  return (
    <div data-testid="shop-page" className="relative pt-24 lg:pt-28">
      <section className="container-feya py-8 lg:py-10 border-b border-[rgba(216,214,211,0.10)]">
        <div className="eyebrow mb-3 reveal">TheFEYA catalog · Handmade statement pieces</div>
        <h1 className="display-hero text-bone reveal reveal-d1" style={{ fontSize: 'clamp(44px, 6.5vw, 96px)' }}>
          The <span className="editorial-italic text-gold-grad">shop</span>
        </h1>
        <p className="editorial-italic text-[var(--bone-dim)] mt-4 text-lg max-w-3xl">
          Start with who you are shopping for, then narrow by body area and product type. Price, color and context come next.
        </p>
      </section>

      <section className="container-feya grid grid-cols-12 gap-7 lg:gap-10 py-10">
        <aside className="hidden lg:block col-span-3 xl:col-span-2" data-testid="filter-sidebar">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
            <CatalogFilterPanel {...panelProps} />
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 xl:col-span-10">
          <div className="relative flex items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
            <div className="eyebrow-dim">Showing {visibleProducts.length} of {filtered.length} pieces</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="chip flex items-center gap-2 lg:hidden"
              >
                <SlidersHorizontal size={13} /> Filters{activeCount ? ` · ${activeCount}` : ''}
              </button>

              <div className="relative shrink-0">
                <button onClick={() => setSortOpen((value) => !value)} className="chip flex items-center gap-2">
                  <SlidersHorizontal size={13} /> {sort}
                </button>
                {sortOpen ? (
                  <div className="absolute right-0 top-full mt-2 w-[278px] rounded-xl border border-[rgba(216,214,211,.22)] bg-[rgba(5,5,8,.96)] p-2 z-[100] shadow-[0_28px_80px_rgba(0,0,0,.75)] backdrop-blur-xl flex flex-col gap-1 overflow-hidden">
                    {SORTS.map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setSort(value);
                          setSortOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 rounded-lg text-[10px] tracking-[0.20em] uppercase transition-all ${
                          sort === value
                            ? 'text-[var(--gold-warm)] bg-[rgba(212,178,106,.12)]'
                            : 'text-[var(--bone-dim)] hover:text-white hover:bg-white/8'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
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

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[min(92vw,390px)] overflow-y-auto border-l border-white/10 bg-[rgba(7,7,10,.985)] p-5 shadow-[-30px_0_80px_rgba(0,0,0,.55)]">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="eyebrow-gold">Filters</div>
                <div className="mt-1 text-[12px] text-[var(--bone-dim)]">{filtered.length} matching pieces</div>
              </div>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white"
              >
                <X size={15} />
              </button>
            </div>

            <CatalogFilterPanel {...panelProps} />

            <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[rgba(7,7,10,.96)] py-4">
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-chrome w-full justify-center">
                View {filtered.length} pieces
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
