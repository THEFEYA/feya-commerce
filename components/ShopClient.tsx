'use client';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorLabel, mainRegularPrice, productTitle } from '@/lib/storefront';

const CATEGORIES = ['All', 'Corsets', 'Harness', 'Masks', 'Armor', 'Bodysuits', 'Stage Looks', 'Skirts', 'Accessories'];
const COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
const SIZES = ['XS','S','M','L','XL','XXL','XXXL','Custom'];
const MATERIALS = ['Mirror Acrylic', 'Vegan Leather', 'Mirror Chrome', 'Holographic Vinyl', 'Resin'];
const OCCASIONS = ['Festival', 'Stage', 'Burning Man', 'Editorial', 'Carnival'];
const SORTS = ['Editorial pick', 'Best sellers', 'Price · low to high', 'Price · high to low', 'Newest'];

function contains(p: StorefrontProduct, q: string) {
  return `${productTitle(p)} ${p.meta_description || ''} ${p.material || ''} ${p.color || ''}`.toLowerCase().includes(q.toLowerCase());
}

export function ShopClient({ products, error }: { products: StorefrontProduct[]; error?: string }) {
  const [category, setCategory] = useState('All');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [occasion, setOccasion] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(SORTS[0]);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const price = mainRegularPrice(p) || 0;
      if (category !== 'All' && categoryLabel(p) !== category) return false;
      if (price < priceMin || price > priceMax) return false;
      if (color && colorLabel(p) !== color) return false;
      if (size === 'Custom' && p.size_mode !== 'custom') return false;
      if (material && !contains(p, material.replace('Mirror ', ''))) return false;
      if (occasion && !contains(p, occasion)) return false;
      if (search.trim() && !contains(p, search.trim())) return false;
      return true;
    });
    if (sort === 'Price · low to high') list = list.sort((a,b)=>(mainRegularPrice(a)||0)-(mainRegularPrice(b)||0));
    if (sort === 'Price · high to low') list = list.sort((a,b)=>(mainRegularPrice(b)||0)-(mainRegularPrice(a)||0));
    if (sort === 'Newest') list = list.reverse();
    return list;
  }, [products, category, priceMin, priceMax, color, size, material, occasion, search, sort]);

  const clear = () => { setCategory('All'); setPriceMin(0); setPriceMax(1000); setColor(''); setSize(''); setMaterial(''); setOccasion(''); setSearch(''); setSort(SORTS[0]); };
  const activeCount = Number(category !== 'All') + Number(priceMin > 0 || priceMax < 1000) + Number(Boolean(color)) + Number(Boolean(size)) + Number(Boolean(material)) + Number(Boolean(occasion)) + Number(Boolean(search));

  return <div data-testid="shop-page" className="relative pt-28 lg:pt-32">
    <section className="container-feya py-8 lg:py-10"><div className="eyebrow mb-3 reveal">Atelier collection · Festival/Stage 26</div><h1 className="display-hero text-bone reveal reveal-d1" style={{ fontSize: 'clamp(44px, 6.5vw, 96px)' }}>The <span className="editorial-italic text-gold-grad">shop</span></h1><p className="editorial-italic text-[var(--bone-dim)] mt-4 text-lg">{products.length || 200} pieces, made to be seen. Filter by world, material or stage-readiness.</p></section>
    <div className="sticky top-[73px] lg:top-[78px] z-30 border-y border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.82)] backdrop-blur-xl category-tabs-recovered"><div className="container-feya flex items-center gap-8 overflow-x-auto no-scrollbar py-4">
      {CATEGORIES.map((c) => <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : ''}`}>{c}</button>)}
      <div className="ml-auto relative shrink-0"><button onClick={() => setSortOpen(v=>!v)} className="chip flex items-center gap-2"><SlidersHorizontal size={13} /> {sort}</button>{sortOpen && <div className="absolute right-0 top-12 w-64 glass-strong rounded-xl p-2 z-50">{SORTS.map((s)=><button key={s} onClick={()=>{setSort(s);setSortOpen(false);}} className="w-full text-left px-4 py-3 rounded-lg text-[11px] tracking-[0.18em] uppercase text-bone hover:bg-white/10">{s}</button>)}</div>}</div>
    </div></div>
    <section className="container-feya grid grid-cols-12 gap-7 lg:gap-10 py-8">
      <aside className="hidden lg:block col-span-2" data-testid="filter-sidebar"><div className="space-y-7">
        <div><div className="eyebrow text-[10.5px] mb-2">Search</div><div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search atelier…" className="w-full h-9 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(216,214,211,0.18)] text-bone pl-9 pr-3 text-[12.5px] focus:outline-none focus:border-white" /></div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Price</div><div className="relative h-7"><div className="absolute top-3 left-0 right-0 h-px bg-[rgba(216,214,211,0.25)]" /><input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMin} onChange={e=>setPriceMin(Math.min(Number(e.target.value), priceMax-10))} /><input className="price-range absolute inset-x-0 top-0 w-full bg-transparent appearance-none" type="range" min="0" max="1000" value={priceMax} onChange={e=>setPriceMax(Math.max(Number(e.target.value), priceMin+10))} /></div><div className="flex items-center gap-2 mt-2"><input value={priceMin} onChange={e=>setPriceMin(Number(e.target.value)||0)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" /><span className="text-smoke">to</span><input value={priceMax} onChange={e=>setPriceMax(Number(e.target.value)||1000)} className="w-20 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs" /></div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Color</div><div className="grid grid-cols-3 gap-2">{COLORS.map(c=><button key={c} onClick={()=>setColor(color===c?'':c)} className="flex flex-col items-center gap-1 group"><span className={`w-7 h-7 rounded-full border-2 transition-all ${color===c?'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.18)]':'border-[rgba(216,214,211,0.30)] group-hover:border-white'}`} style={colorStyle(c)} /><span className={`text-[9px] tracking-[0.12em] uppercase ${color===c?'text-white':'text-[#9b988e]'}`}>{c}</span></button>)}</div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Size</div><div className="flex flex-wrap gap-1.5">{SIZES.map(s=><button key={s} onClick={()=>setSize(size===s?'':s)} className={`size-pill ${size===s && s !== 'Custom' ? 'size-pill-active' : ''} ${size===s && s === 'Custom' ? 'size-pill-custom' : ''}`}>{s}</button>)}</div></div>
        <div><div className="eyebrow text-[10.5px] mb-3">Material</div>{MATERIALS.map(m=><button key={m} onClick={()=>setMaterial(material===m?'':m)} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><span className={`w-3.5 h-3.5 border ${material===m?'bg-gold border-gold':'border-[rgba(216,214,211,0.3)]'}`} />{m}</button>)}</div>
        <div><div className="eyebrow text-[10.5px] mb-3">Occasion / Event</div>{OCCASIONS.map(o=><button key={o} onClick={()=>setOccasion(occasion===o?'':o)} className="w-full flex items-center gap-2 text-left text-[12px] text-[var(--bone-dim)] py-1.5 hover:text-white"><span className={`w-3.5 h-3.5 border ${occasion===o?'bg-gold border-gold':'border-[rgba(216,214,211,0.3)]'}`} />{o}</button>)}</div>
        {activeCount > 0 && <button onClick={clear} className="w-full text-left flex items-center gap-2 text-[var(--gold)] hover:text-white text-[11px] tracking-[0.22em] uppercase pt-2 border-t border-[rgba(216,214,211,0.10)]"><X size={12} /> Clear all filters</button>}
      </div></aside>
      <main className="col-span-12 lg:col-span-10"><div className="flex items-center justify-between mb-5"><div className="eyebrow-dim">{filtered.length} of {products.length} pieces</div></div>{error ? <div className="glass rounded-xl p-6 text-bone-dim">{error}</div> : null}{products.length > 0 && filtered.length === 0 ? <div className="glass rounded-xl p-6 text-bone-dim">No products match these filters.</div> : null}<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">{filtered.map((p, i)=><ProductCard key={p.canonical_product_id} product={p} index={i} />)}</div></main>
    </section>
  </div>;
}
