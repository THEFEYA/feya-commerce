'use client';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorLabel, mainRegularPrice, productTitle } from '@/lib/storefront';

const PAGE_SIZE = 20;
const CATEGORIES = ['All', 'Corsets', 'Harness', 'Masks', 'Armor', 'Bodysuits', 'Stage Looks', 'Skirts', 'Accessories'];
const COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
const SIZES = ['XS','S','M','L','XL','XXL','XXXL','Custom'];
const MATERIALS = ['Mirror Acrylic', 'Vegan Leather', 'Mirror Chrome', 'Holographic Vinyl', 'Resin'];
const OCCASIONS = ['Festival', 'Stage', 'Burning Man', 'Editorial', 'Carnival'];
const STYLES = ['Desert', 'Rave', 'Stage', 'Editorial', 'Futuristic', 'Goddess', 'Warrior'];
const PRODUCTION_TIMES = ['7–10 days', '14–21 days', '21–28 days', '30+ days'];
const SORTS = ['Editorial pick', 'Best sellers', 'Price · low to high', 'Price · high to low', 'Newest'];

function contains(p: StorefrontProduct, q: string) {
  return `${productTitle(p)} ${p.meta_description || ''} ${p.material || ''} ${p.color || ''} ${p.product_type || ''} ${p.production_profile || ''} ${p.shipping_profile || ''}`.toLowerCase().includes(q.toLowerCase());
}

function matchesProduction(p: StorefrontProduct, value: string) {
  if (!value) return true;
  const text = `${p.production_profile || ''} ${p.shipping_profile || ''} ${p.meta_description || ''}`.toLowerCase();
  if (value === '7–10 days') return /7|10|express/.test(text);
  if (value === '14–21 days') return /14|21|standard|ups|made/.test(text) || !text.trim();
  if (value === '21–28 days') return /21|28/.test(text);
  if (value === '30+ days') return /30|month/.test(text);
  return true;
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FilterBox({ checked }: { checked: boolean }) {
  return <span className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${checked ? 'border-[var(--gold)] text-[var(--gold-warm)] shadow-[0_0_10px_rgba(212,178,106,.22)]' : 'border-[rgba(216,214,211,0.34)] text-transparent'}`}>
    {checked ? <Check size={10} strokeWidth={2.4} /> : null}
  </span>;
}

export function ShopClient({ products, error }: { products: StorefrontProduct[]; error?: string }) {
  const [category, setCategory] = useState('All');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [occasion, setOccasion] = useState<string[]>([]);
  const [style, setStyle] = useState<string[]>([]);
  const [productionTime, setProductionTime] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(SORTS[0]);
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const price = mainRegularPrice(p) || 0;
      if (category !== 'All' && categoryLabel(p) !== category) return false;
      if (price < priceMin || price > priceMax) return false;
      if (color && colorLabel(p) !== color) return false;
      if (size === 'Custom' && p.size_mode !== 'custom') return false;
      if (material && !contains(p, material.replace('Mirror ', ''))) return false;
      if (occasion.length && !occasion.some((o) => contains(p, o))) return false;
      if (style.length && !style.some((s) => contains(p, s))) return false;
      if (productionTime && !matchesProduction(p, productionTime)) return false;
      if (search.trim() && !contains(p, search.trim())) return false;
      return true;
    });
    if (sort === 'Price · low to high') list = list.sort((a,b)=>(mainRegularPrice(a)||0)-(mainRegularPrice(b)||0));
    if (sort === 'Price · high to low') list = list.sort((a,b)=>(mainRegularPrice(b)||0)-(mainRegularPrice(a)||0));
    if (sort === 'Newest') list = list.reverse();
    return list;
  }, [products, category, priceMin, priceMax, color, size, material, occasion, style, productionTime, search, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, priceMin, priceMax, color, size, material, occasion, style, productionTime, search, sort]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;
  const clear = () => { setCategory('All'); setPriceMin(0); setPriceMax(1000); setColor(''); setSize(''); setMaterial(''); setOccasion([]); setStyle([]); setProductionTime(''); setSearch(''); setSort(SORTS[0]); };
  const activeCount = Number(category !== 'All') + Number(priceMin > 0 || priceMax < 1000) + Number(Boolean(color)) + Number(Boolean(size)) + Number(Boolean(material)) + occasion.length + style.length + Number(Boolean(productionTime)) + Number(Boolean(search));

  return <div data-testid="shop-page" className="relative pt-24 lg:pt-28">
    <section className="container-feya py-8 lg:py-10"><div className="eyebrow mb-3 reveal">Atelier collection · Festival/Stage 26</div><h1 className="display-hero text-bone reveal reveal-d1" style={{ fontSize: 'clamp(44px, 6.5vw, 96px)' }}>The <span className="editorial-italic text-gold-grad">shop</span></h1><p className="editorial-italic text-[var(--bone-dim)] mt-4 text-lg">{products.length || 200} pieces, made to be seen. Filter by world, material or stage-readiness.</p></section>
    <div className="sticky top-[62px] lg:top-[64px] z-30 border-y border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.90)] backdrop-blur-xl category-tabs-recovered"><div className="container-feya flex items-center gap-5 xl:gap-7 overflow-visible py-4 min-h-[58px] whitespace-nowrap">
      {CATEGORIES.map((c) => <button key={c} onClick={() => setCategory(c)} className={`chip shrink-0 ${category === c ? 'chip-active' : ''}`}>{c}</button>)}
      <div className="ml-auto relative shrink-0"><button onClick={() => setSortOpen(v=>!v)} className="chip flex items-center gap-2"><SlidersHorizontal size={13} /> {sort}</button>{sortOpen && <div className="absolute right-0 top-full mt-2 w-[278px] glass-strong rounded-xl p-2 z-[100] shadow-2xl flex flex-col gap-1 overflow-hidden">{SORTS.map((s)=><button key={s} onClick={()=>{setSort(s);setSortOpen(false);}} className={`block w-full text-left px-4 py-3 rounded-lg text-[11px] tracking-[0.18em] uppercase transition-all ${sort === s ? 'text-[var(--gold-warm)] bg-[rgba(212,178,106,.10)]' : 'text-bone hover:bg-white/10'}`}>{s}</button>)}</div>}</div>
    </div></div>
    <section className="container-feya grid grid-cols-12 gap-7 lg:gap-10 py-10">
      <aside className="hidden lg:block col-span-2" data-testid="filter-sidebar"><div className="space-y-7">
        <div><div className="eyebrow text-[10.5px] mb-2">Search</div><div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search atelier…" className="w-full h-9 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(216,214,211,0.18)] text-bone pl-9 pr-3 text-[12.5px] focus:outline-none focus:border-white" /></div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Price</div><div className="relative h-7"><div className="absolute top-3 left-0 right-0 h-px bg-[rgba(216,214,211,0.25)]" /><input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMin} onChange={e=>setPriceMin(Math.min(Number(e.target.value), priceMax-10))} /><input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMax} onChange={e=>setPriceMax(Math.max(Number(e.target.value), priceMin+10))} /></div><div className="flex items-center gap-2 mt-2"><input value={priceMin} onChange={e=>setPriceMin(Number(e.target.value)||0)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" /><span className="text-smoke">to</span><input value={priceMax} onChange={e=>setPriceMax(Number(e.target.value)||1000)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" /></div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Color</div><div className="grid grid-cols-3 gap-2">{COLORS.map(c=><button key={c} onClick={()=>setColor(color===c?'':c)} className="flex flex-col items-center gap-1 group"><span className={`w-7 h-7 rounded-full border-2 transition-all ${color===c?'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]':'border-[rgba(216,214,211,0.30)] group-hover:border-white'}`} style={colorStyle(c)} /><span className={`text-[9px] tracking-[0.12em] uppercase ${color===c?'text-white':'text-[#9b988e]'}`}>{c}</span></button>)}</div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Size</div><div className="flex flex-wrap gap-1.5">{SIZES.map(s=><button key={s} onClick={()=>setSize(size===s?'':s)} className={`size-pill ${size===s && s !== 'Custom' ? 'size-pill-active' : ''} ${size===s && s === 'Custom' ? 'size-pill-custom' : ''}`}>{s}</button>)}</div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Material</div>{MATERIALS.map(m=><button key={m} onClick={()=>setMaterial(material===m?'':m)} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><FilterBox checked={material===m} />{m}</button>)}</div>
        <div><div className="eyebrow text-[10.5px] mb-3">Occasion / Event</div>{OCCASIONS.map(o=><button key={o} onClick={()=>setOccasion(toggleValue(occasion, o))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><FilterBox checked={occasion.includes(o)} />{o}</button>)}</div>
        <div><div className="eyebrow text-[10.5px] mb-3">Style / World</div>{STYLES.map(s=><button key={s} onClick={()=>setStyle(toggleValue(style, s))} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><FilterBox checked={style.includes(s)} />{s}</button>)}</div>
        <div><div className="eyebrow text-[10.5px] mb-3">Production time</div>{PRODUCTION_TIMES.map(t=><button key={t} onClick={()=>setProductionTime(productionTime===t?'':t)} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><FilterBox checked={productionTime===t} />{t}</button>)}</div>
        {activeCount > 0 && <button onClick={clear} className="w-full text-left flex items-center gap-2 text-[var(--gold)] hover:text-white text-[11px] tracking-[0.22em] uppercase pt-2 border-t border-[rgba(216,214,211,0.10)]"><X size={12} /> Clear all filters</button>}
      </div></aside>
      <main className="col-span-12 lg:col-span-10"><div className="flex items-center justify-between mb-5"><div className="eyebrow-dim">Showing {visibleProducts.length} of {filtered.length} pieces</div></div>{error && products.length === 0 ? <div className="glass rounded-xl p-6 text-bone-dim">{error}</div> : null}{products.length > 0 && filtered.length === 0 ? <div className="glass rounded-xl p-6 text-bone-dim">No products match these filters.</div> : null}<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">{visibleProducts.map((p, i)=><ProductCard key={p.canonical_product_id} product={p} index={i} />)}</div>{canLoadMore ? <div className="flex justify-center pt-10"><button onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length))} className="btn-ghost">Show 20 more</button></div> : null}</main>
    </section>
  </div>;
}
