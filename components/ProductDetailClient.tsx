'use client';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Heart, Share2, Truck, RotateCcw, FileText, ShoppingBag, Check, Zap, Ruler, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import { SalePrice } from '@/components/SalePrice';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorOptions, formatPrice, getMedia, optionKey, optionLabel, optionPrice, productTitle, salePrice, sortedOptions, splitTitle } from '@/lib/storefront';

const SIZES = ['XS','S','M','L','XL','XXL','XXXL','Custom'];

function isFullSetLabel(label: string) {
  return /full\s*set|complete\s*set|complete\s*look/i.test(label);
}

function compactHead(raw: string) {
  return raw
    .replace(/\s+with\s+top\s+&\s+skirt/i, ' with Top & Skirt')
    .replace(/\s+metallic\s+costume\s+set.*$/i, '')
    .replace(/\s+party\s+rave\s+wear.*$/i, '')
    .trim();
}

export function ProductDetailClient({ product: p, related }: { product: StorefrontProduct; related: StorefrontProduct[] }) {
  const gallery = useMemo(() => getMedia(p), [p]);
  const options = useMemo(() => sortedOptions(p), [p]);
  const full = options.find((o, i) => isFullSetLabel(optionLabel(o, i)));
  const fullKey = full ? optionKey(full, options.indexOf(full)) : '';
  const [idx, setIdx] = useState(0);
  const [configKey, setConfigKey] = useState(fullKey || (options[0] ? optionKey(options[0], 0) : ''));
  const [size, setSize] = useState('M');
  const [colorIdx, setColorIdx] = useState(0);
  const [delivery, setDelivery] = useState('standard');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const activeConfig = options.find((o, i) => optionKey(o, i) === configKey) || options[0] || null;
  const regular = optionPrice(activeConfig) ?? p.max_price ?? p.min_price ?? 0;
  const sale = salePrice(regular) || regular;
  const currency = activeConfig?.currency || p.currency || 'EUR';
  const total = sale * qty + (delivery === 'express' ? 45 : 0);
  const colors = colorOptions(p);
  const { head, tail } = splitTitle(productTitle(p));
  const shortHead = compactHead(head);
  const main = gallery[idx]?.url || p.primary_image_url || '';
  const complete = related.filter((x) => x.canonical_product_id !== p.canonical_product_id).slice(0, 4);
  const fullPrice = full ? optionPrice(full) : null;
  const separateTotal = options
    .filter((o, i) => !isFullSetLabel(optionLabel(o, i)))
    .reduce((sum, option) => sum + (optionPrice(option) || 0), 0);
  const fullSetSavings = fullPrice && separateTotal > fullPrice ? separateTotal - fullPrice : 0;
  const selectedIsFullSet = activeConfig ? isFullSetLabel(optionLabel(activeConfig, 0)) : false;

  const addToBag = () => { setAdded(true); setTimeout(() => setAdded(false), 1300); };

  return <div data-testid="product-page" className="relative pt-20 lg:pt-22">
    <div className="container-feya py-2"><div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)]"><Link href="/" className="hover:text-white">Atelier</Link><ChevronRight size={10} /><Link href="/shop" className="hover:text-white">Shop</Link><ChevronRight size={10} /><Link href={`/shop?cat=${categoryLabel(p)}`} className="hover:text-white">{categoryLabel(p)}</Link><ChevronRight size={10} /><span className="text-white truncate max-w-[280px]">{shortHead}</span></div></div>
    <section className="container-feya pb-7 grid grid-cols-12 gap-5 lg:gap-7">
      <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-3 lg:gap-4">
        <div className="col-span-2 hidden lg:flex flex-col gap-3 max-h-[500px] overflow-y-auto no-scrollbar">{gallery.map((g, i)=><button key={`${i}-${g.url}`} onClick={()=>setIdx(i)} className={`relative aspect-[4/5] rounded-sm overflow-hidden border transition-all shrink-0 ${idx===i?'border-white':'border-[rgba(216,214,211,0.12)] opacity-55 hover:opacity-100'}`}>{g.url ? <img src={String(g.url)} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /> : null}</button>)}</div>
        <div className="col-span-12 lg:col-span-10 relative rounded-md overflow-hidden bg-[rgba(255,255,255,0.03)] h-[430px] lg:h-[500px] border border-[rgba(216,214,211,0.12)]"><img src={main} alt={shortHead} className="absolute inset-0 w-full h-full object-cover object-top" /><button onClick={()=>setIdx((idx-1+gallery.length)%gallery.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white hover:text-ink transition-all"><ChevronLeft size={17} /></button><button onClick={()=>setIdx((idx+1)%gallery.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white hover:text-ink transition-all"><ChevronRight size={17} /></button><div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-xs text-white">{idx+1} / {gallery.length || 1}</div></div>
      </div>
      <aside className="col-span-12 lg:col-span-5 lg:sticky lg:top-20 self-start">
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.01em] line-clamp-2" style={{ fontSize:'clamp(31px, 3.35vw, 44px)' }}>{shortHead}</h1>
        {tail ? <p className="editorial-italic text-[var(--bone-dim)] text-[13px] mt-1.5 leading-relaxed line-clamp-1">{tail}</p> : null}
        <div className="mt-3"><SalePrice regular={regular} sale={sale} currency={currency} variant="pdp" testidPrefix="pdp-price" /></div>
        <div className="mt-3"><div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Configuration</div><div className="eyebrow-dim">{options.length || 1} options</div></div><select value={configKey} onChange={(e)=>setConfigKey(e.target.value)} className="w-full h-10 rounded-md bg-[rgba(255,255,255,0.035)] border border-[rgba(216,214,211,0.18)] text-bone px-4 focus:outline-none focus:border-white">{options.map((o,i)=><option key={optionKey(o,i)} value={optionKey(o,i)}>{optionLabel(o,i)}</option>)}</select></div>
        {selectedIsFullSet && fullSetSavings > 0 ? <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--gold-warm)]">Best value: save {formatPrice(salePrice(fullSetSavings) || fullSetSavings, currency)} compared with buying the pieces separately.</p> : null}
        <div className="mt-3"><div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Color · {colors[colorIdx] || colors[0] || 'Mirror'}</div><div className="eyebrow-dim">{colors.length || 1} shade</div></div><div className="flex gap-2">{colors.map((c,i)=><button key={c+i} onClick={()=>setColorIdx(i)} className={`w-8 h-8 rounded-full border-2 ${i===colorIdx?'border-white':'border-[rgba(216,214,211,0.28)]'}`} style={colorStyle(c)} title={c} />)}</div></div>
        <div className="mt-3"><div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Size · {size}</div><a href="#description" className="eyebrow-dim hover:text-white flex items-center gap-1"><Ruler size={12} /> Size guide</a></div><div className="flex flex-wrap gap-1.5">{SIZES.map(s=><button key={s} onClick={()=>setSize(s)} className={`size-pill ${size===s && s !== 'Custom' ? 'size-pill-active' : ''} ${size===s && s === 'Custom' ? 'size-pill-custom' : ''}`}>{s}</button>)}</div></div>
        <div className="mt-3"><div className="eyebrow text-[10px] mb-1.5">Delivery</div><div className="grid grid-cols-2 gap-2.5"><button onClick={()=>setDelivery('standard')} className={`glass rounded-md px-3 py-2.5 text-left ${delivery==='standard'?'border-white':''}`}><Truck size={14} /><div className="font-semibold mt-1 text-[13px]">Standard UPS</div><div className="text-[10.5px] text-[var(--bone-dim)]">14–21 business days · Included</div></button><button onClick={()=>setDelivery('express')} className={`glass rounded-md px-3 py-2.5 text-left ${delivery==='express'?'border-white':''}`}><Zap size={14} className="text-[var(--gold)]" /><div className="font-semibold mt-1 text-[13px]">Express DHL</div><div className="text-[10.5px] text-[var(--bone-dim)]">7–10 business days · +$45</div></button></div><p className="text-[11px] text-[var(--bone-dim)] mt-1.5">Production time is calculated before shipping. Made to order.</p></div>
        <div className="mt-3 glass rounded-md px-3 py-2.5 grid grid-cols-3 gap-3"><div><div className="eyebrow-dim">Ordered</div><strong className="text-[13px]">Jun 12</strong></div><div><div className="eyebrow-dim">Ready</div><strong className="text-[13px]">Jun 26 – Jul 03</strong></div><div><div className="eyebrow-dim">Delivered</div><strong className="text-[13px] text-[var(--gold-warm)]">{delivery==='express'?'Jul 03 – Jul 10':'Jul 10 – Jul 24'}</strong></div></div>
        <div className="mt-3 border-t border-[rgba(216,214,211,0.12)] pt-3 flex items-end justify-between"><div className="eyebrow text-[10px]">Total · {qty} × {formatPrice(sale, currency)}</div><div className="font-price text-gold-grad text-[30px] leading-none">{formatPrice(total, currency)}</div></div>
        <div className="mt-2.5 grid grid-cols-[112px_1fr] gap-2.5"><div className="h-10 rounded-md border border-[rgba(216,214,211,0.18)] grid grid-cols-3 items-center"><button onClick={()=>setQty(Math.max(1, qty-1))}>−</button><span className="text-center">{qty}</span><button onClick={()=>setQty(qty+1)}>+</button></div><button className="btn-chrome justify-center rounded-md h-10" onClick={addToBag}>{added ? <Check size={14} /> : <ShoppingBag size={14} />} Add to bag</button></div>
        <button className="btn-gold justify-center rounded-md h-10 w-full mt-2.5" onClick={addToBag}>Buy it now <ArrowUpRight size={13} /></button>
        <div className="recovered-policy-row mt-3 flex flex-wrap justify-center gap-4 text-[9px] tracking-[0.22em] uppercase"><a href="#save"><Heart size={11} className="inline mr-1" />Save</a><a href="#share"><Share2 size={11} className="inline mr-1" />Share</a><a href="#shipping"><Truck size={11} className="inline mr-1" />Shipping</a><a href="#returns"><RotateCcw size={11} className="inline mr-1" />Returns</a><a href="#policies"><FileText size={11} className="inline mr-1" />Store policies</a></div>
      </aside>
    </section>
    <section id="description" className="container-feya py-14 border-t border-[rgba(216,214,211,0.12)] grid grid-cols-12 gap-10"><div className="col-span-12 lg:col-span-7"><div className="eyebrow-gold mb-4">About this piece</div><h2 className="display-section text-bone mb-8" style={{ fontSize:'clamp(40px,5vw,72px)' }}>{shortHead}</h2><div className="space-y-5 text-[15px] lg:text-[16px] text-[var(--bone-dim)] leading-[1.85]"><p>{p.meta_description || `${shortHead} is a made-to-order TheFEYA statement piece for festivals, stage performance and editorial looks.`}</p><p>Made for performers, dancers, DJs, drag queens, stylists and festival guests who want a reflective look with strong presence. Each piece is prepared by hand and styled to work as a centerpiece or part of a complete look.</p><p>Production is made to order in our atelier. We ship worldwide, tracked and insured, with standard and express delivery options shown above.</p><p>Available in standard sizes or custom sizing. Each piece arrives with atelier packaging and care guidance.</p></div></div><div className="col-span-12 lg:col-span-5 space-y-0"><Detail icon={<Scissors size={15}/>} title="What's included" lines={[optionLabel(activeConfig || {}, 0), 'Atelier dust bag', 'Care card and replacement hardware kit']} /><Detail icon={<Ruler size={15}/>} title="Sizing & fit" lines={['Available in XS–XXXL standard sizing.', 'Custom sizing is available for made-to-order pieces.']} /><Detail icon={<Truck size={15}/>} title="Shipping & delivery" id="shipping" lines={['Worldwide tracked and insured shipping.', 'Standard UPS 14–21 business days.', 'Express DHL 7–10 business days.']} /><Detail icon={<RotateCcw size={15}/>} title="Returns & exchanges" id="returns" lines={['Standard-size pieces follow store policy.', 'Custom-sized pieces are final sale once production begins.']} /><Detail icon={<FileText size={15}/>} title="Handmade variation" id="policies" lines={['Each TheFEYA piece is one-of-a-kind.', 'Mirror panels and handmade details may vary slightly.']} /></div></section>
    <section className="container-feya py-14"><div className="flex items-end justify-between mb-6"><div><div className="eyebrow-gold mb-3">Complete the look</div><h2 className="display-section text-bone" style={{ fontSize:'clamp(36px,5vw,64px)' }}>Same world.</h2></div><Link href="/shop" className="btn-ghost">View all <ArrowUpRight size={13} /></Link></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{complete.map((item, i)=><ProductCard key={item.canonical_product_id} product={item} index={i} />)}</div></section>
  </div>;
}

function Detail({ icon, title, lines, id }: { icon: React.ReactNode; title: string; lines: string[]; id?: string }) {
  return <div id={id} className="border-t border-[rgba(216,214,211,0.12)] py-6"><div className="eyebrow-gold mb-3 flex items-center gap-2">{icon}{title}</div><div className="space-y-1.5 text-[14px] text-[var(--bone-dim)] leading-relaxed">{lines.filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div></div>;
}
