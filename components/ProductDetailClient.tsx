'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Heart, RotateCcw, Ruler, Scissors, Share2, ShoppingBag, Truck, Zap } from 'lucide-react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import { SalePrice } from '@/components/SalePrice';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorOptions, formatPrice, getMedia, optionKey, optionLabel, optionPrice, productTitle, salePrice, sortedOptions, splitTitle } from '@/lib/storefront';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'];

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
  const [configOpen, setConfigOpen] = useState(false);
  const [size, setSize] = useState('M');
  const [colorIdx, setColorIdx] = useState(0);
  const [delivery, setDelivery] = useState('standard');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeConfig = options.find((o, i) => optionKey(o, i) === configKey) || options[0] || null;
  const activeConfigLabel = activeConfig ? optionLabel(activeConfig, 0) : 'Full Set';
  const regular = optionPrice(activeConfig) ?? p.max_price ?? p.min_price ?? 0;
  const sale = salePrice(regular) || regular;
  const currency = activeConfig?.currency || p.currency || 'EUR';
  const total = sale * qty + (delivery === 'express' ? 45 : 0);
  const colors = colorOptions(p);
  const { head, tail } = splitTitle(productTitle(p));
  const shortHead = compactHead(head);
  const activeImage = gallery[idx];
  const main = activeImage?.url || p.primary_image_url || '';
  const complete = related.filter((x) => x.canonical_product_id !== p.canonical_product_id).slice(0, 4);

  const fullRegularPrice = full ? optionPrice(full) : null;
  const separateRegularTotal = options
    .filter((o, i) => !isFullSetLabel(optionLabel(o, i)))
    .reduce((sum, option) => sum + (optionPrice(option) || 0), 0);
  const separateSaleTotal = separateRegularTotal > 0 ? salePrice(separateRegularTotal) || separateRegularTotal : 0;
  const fullSalePrice = fullRegularPrice != null ? salePrice(fullRegularPrice) || fullRegularPrice : null;
  const fullSetSavings = fullSalePrice && separateSaleTotal > fullSalePrice ? separateSaleTotal - fullSalePrice : 0;
  const selectedIsFullSet = activeConfig ? isFullSetLabel(optionLabel(activeConfig, 0)) : false;
  const savingsText = selectedIsFullSet && fullSetSavings > 0
    ? `Best value: save ${formatPrice(fullSetSavings, currency)} vs ordering pieces separately (${formatPrice(separateSaleTotal, currency)}).`
    : '';

  useEffect(() => {
    thumbnailRefs.current[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [idx]);

  const moveImage = (direction: number) => {
    if (gallery.length <= 1) return;
    setIdx((idx + direction + gallery.length) % gallery.length);
  };

  const addToBag = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };

  return <div data-testid="product-page" className="relative pt-20 lg:pt-[74px]">
    <div className="container-feya py-2">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)]">
        <Link href="/" className="hover:text-white">Atelier</Link><ChevronRight size={10} />
        <Link href="/shop" className="hover:text-white">Shop</Link><ChevronRight size={10} />
        <Link href={`/shop?cat=${categoryLabel(p)}`} className="hover:text-white">{categoryLabel(p)}</Link><ChevronRight size={10} />
        <span className="text-white truncate max-w-[280px]">{shortHead}</span>
      </div>
    </div>

    <section className="container-feya pb-4 grid grid-cols-12 gap-5 lg:gap-7">
      <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-3 lg:gap-4">
        <div className="col-span-2 hidden lg:flex flex-col gap-3 max-h-[650px] overflow-y-auto pr-1">
          {gallery.map((g, i) => <button ref={(node) => { thumbnailRefs.current[i] = node; }} key={`${i}-${g.url}`} onClick={() => setIdx(i)} className={`relative w-full aspect-[4/5] rounded-sm overflow-hidden border transition-all shrink-0 bg-[rgba(255,255,255,0.025)] ${idx === i ? 'border-white opacity-100' : 'border-[rgba(216,214,211,0.12)] opacity-55 hover:opacity-100'}`}>
            {g.url ? <img src={String(g.url)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-center" /> : null}
          </button>)}
        </div>
        <div className="col-span-12 lg:col-span-10 flex justify-center">
          <button type="button" onClick={() => main && setLightboxOpen(true)} className="relative w-full max-w-[520px] aspect-[4/5] rounded-md overflow-hidden bg-[rgba(255,255,255,0.025)] border border-[rgba(216,214,211,0.12)] text-left">
            {main ? <img src={String(main)} alt={activeImage?.alt || shortHead} loading={idx === 0 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover object-center" /> : null}
            {gallery.length > 1 ? <>
              <span onClick={(event) => { event.stopPropagation(); moveImage(-1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white hover:text-ink transition-all"><ChevronLeft size={17} /></span>
              <span onClick={(event) => { event.stopPropagation(); moveImage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white hover:text-ink transition-all"><ChevronRight size={17} /></span>
            </> : null}
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-xs text-white">{idx + 1} / {gallery.length || 1}</span>
          </button>
        </div>
      </div>

      <aside className="col-span-12 lg:col-span-5 lg:sticky lg:top-20 self-start">
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.01em] line-clamp-2" style={{ fontSize: 'clamp(28px, 2.8vw, 38px)' }}>{shortHead}</h1>
        {tail ? <p className="editorial-italic text-[var(--bone-dim)] text-[12px] mt-1 leading-relaxed line-clamp-1">{tail}</p> : null}

        <div className="mt-2"><SalePrice regular={regular} sale={sale} currency={currency} variant="pdp" testidPrefix="pdp-price" /></div>

        <div className="mt-2 relative">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Configuration</div><div className="eyebrow-dim">{options.length || 1} options</div></div>
          <button type="button" onClick={() => setConfigOpen((open) => !open)} className="w-full h-10 rounded-md bg-[rgba(255,255,255,0.035)] border border-[rgba(216,214,211,0.18)] text-bone px-4 focus:outline-none focus:border-white flex items-center justify-between text-left">
            <span className="truncate">{activeConfigLabel}</span>
            <ChevronDown size={15} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </button>
          {configOpen ? <div className="absolute left-0 right-0 top-full mt-2 z-[80] glass-strong rounded-lg p-1.5 shadow-2xl max-h-[250px] overflow-auto">
            {options.map((o, i) => {
              const key = optionKey(o, i);
              const active = key === configKey;
              return <button key={key} type="button" onClick={() => { setConfigKey(key); setConfigOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-md transition-all ${active ? 'bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'text-bone hover:bg-white/10'}`}>{optionLabel(o, i)}</button>;
            })}
          </div> : null}
        </div>
        <p className="mt-1.5 min-h-[18px] text-[12px] leading-relaxed text-[var(--gold-warm)]">{savingsText}</p>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Color · {colors[colorIdx] || colors[0] || 'Mirror'}</div><div className="eyebrow-dim">{colors.length || 1} shade</div></div>
          <div className="flex gap-2">{colors.map((c, i) => <button key={c + i} onClick={() => setColorIdx(i)} className={`w-8 h-8 rounded-full border-2 ${i === colorIdx ? 'border-white' : 'border-[rgba(216,214,211,0.28)]'}`} style={colorStyle(c)} title={c} />)}</div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Size · {size}</div><a href="#description" className="eyebrow-dim hover:text-white flex items-center gap-1"><Ruler size={12} /> Size guide</a></div>
          <div className="flex flex-wrap gap-1.5">{SIZES.map((s) => <button key={s} onClick={() => setSize(s)} className={`size-pill ${size === s && s !== 'Custom' ? 'size-pill-active' : ''} ${size === s && s === 'Custom' ? 'size-pill-custom' : ''}`}>{s}</button>)}</div>
        </div>

        <div className="mt-2">
          <div className="eyebrow text-[10px] mb-1.5">Delivery</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => setDelivery('standard')} className={`glass rounded-md px-3 py-2 text-left transition-all ${delivery === 'standard' ? 'border-white bg-[rgba(255,255,255,.07)] shadow-[0_0_0_1px_rgba(255,255,255,.28),0_0_28px_rgba(216,214,211,.08)]' : ''}`}><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-full border border-[rgba(216,214,211,0.22)] flex items-center justify-center shrink-0"><Truck size={14} /></span><span><span className="block font-semibold text-[13px]">Standard UPS</span><span className="block text-[10.5px] text-[var(--bone-dim)]">14–21 business days · Included</span></span></div></button>
            <button onClick={() => setDelivery('express')} className={`glass rounded-md px-3 py-2 text-left transition-all ${delivery === 'express' ? 'border-[var(--gold)] bg-[rgba(212,178,106,.08)] shadow-[0_0_0_1px_rgba(212,178,106,.35),0_0_30px_rgba(212,178,106,.12)]' : ''}`}><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-full border border-[rgba(212,178,106,0.42)] flex items-center justify-center shrink-0 text-[var(--gold)]"><Zap size={14} /></span><span><span className="block font-semibold text-[13px]">Express DHL</span><span className="block text-[10.5px] text-[var(--bone-dim)]">7–10 business days · +$45</span></span></div></button>
          </div>
          <p className="text-[11px] text-[var(--bone-dim)] mt-1.5">Production time is calculated before shipping. Made to order.</p>
        </div>

        <div className="mt-2 glass rounded-md px-3 py-2 grid grid-cols-3 gap-3">
          <div><div className="eyebrow-dim">Ordered</div><strong className="text-[13px]">Jun 12</strong></div>
          <div><div className="eyebrow-dim">Ready</div><strong className="text-[13px]">Jun 26 – Jul 03</strong></div>
          <div><div className="eyebrow-dim">Delivered</div><strong className="text-[13px] text-[var(--gold-warm)]">{delivery === 'express' ? 'Jul 03 – Jul 10' : 'Jul 10 – Jul 24'}</strong></div>
        </div>

        <div className="mt-2 border-t border-[rgba(216,214,211,0.12)] pt-2 flex items-end justify-between"><div className="eyebrow text-[10px]">Total · {qty} × {formatPrice(sale, currency)}</div><div className="font-price text-gold-grad text-[29px] leading-none">{formatPrice(total, currency)}</div></div>
        <div className="mt-2 grid grid-cols-[112px_1fr] gap-2.5"><div className="h-10 rounded-md border border-[rgba(216,214,211,0.18)] grid grid-cols-3 items-center"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span className="text-center">{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div><button className="btn-chrome justify-center rounded-md h-10" onClick={addToBag}>{added ? <Check size={14} /> : <ShoppingBag size={14} />} Add to bag</button></div>
        <button className="btn-gold justify-center rounded-md h-10 w-full mt-2" onClick={addToBag}>Buy it now <ArrowUpRight size={13} /></button>
        <div className="recovered-policy-row mt-2.5 flex flex-wrap justify-center gap-4 text-[9px] tracking-[0.22em] uppercase"><a href="#save"><Heart size={11} className="inline mr-1" />Save</a><a href="#share"><Share2 size={11} className="inline mr-1" />Share</a><a href="#shipping"><Truck size={11} className="inline mr-1" />Shipping</a><a href="#returns"><RotateCcw size={11} className="inline mr-1" />Returns</a><a href="#policies"><FileText size={11} className="inline mr-1" />Store policies</a></div>
      </aside>
    </section>

    <section id="description" className="container-feya py-7 border-t border-[rgba(216,214,211,0.12)] grid grid-cols-12 gap-7">
      <div className="col-span-12 lg:col-span-7"><div className="eyebrow-gold mb-3">About this piece</div><h2 className="display-section text-bone mb-4" style={{ fontSize: 'clamp(24px, 2.3vw, 34px)' }}>{shortHead}</h2><div className="space-y-4 text-[15px] text-[var(--bone-dim)] leading-[1.8]"><p>{p.meta_description || `${shortHead} is a made-to-order TheFEYA statement piece for festivals, stage performance and editorial looks.`}</p><p>Made for performers, dancers, DJs, drag queens, stylists and festival guests who want a reflective look with strong presence. Each piece is prepared by hand and styled to work as a centerpiece or part of a complete look.</p><p>Production is made to order in our atelier. We ship worldwide, tracked and insured, with standard and express delivery options shown above.</p><p>Available in standard sizes or custom sizing. Each piece arrives with atelier packaging and care guidance.</p></div></div>
      <div className="col-span-12 lg:col-span-5 space-y-0"><Detail icon={<Scissors size={15} />} title="What's included" lines={[optionLabel(activeConfig || {}, 0), 'Atelier dust bag', 'Care card and replacement hardware kit']} /><Detail icon={<Ruler size={15} />} title="Sizing & fit" lines={['Available in XS–XXXL standard sizing.', 'Custom sizing is available for made-to-order pieces.']} /><Detail icon={<Truck size={15} />} title="Shipping & delivery" id="shipping" lines={['Worldwide tracked and insured shipping.', 'Standard UPS 14–21 business days.', 'Express DHL 7–10 business days.']} /><Detail icon={<RotateCcw size={15} />} title="Returns & exchanges" id="returns" lines={['Standard-size pieces follow store policy.', 'Custom-sized pieces are final sale once production begins.']} /><Detail icon={<FileText size={15} />} title="Handmade variation" id="policies" lines={['Each TheFEYA piece is one-of-a-kind.', 'Mirror panels and handmade details may vary slightly.']} /></div>
    </section>

    {complete.length ? <section className="container-feya py-12"><div className="flex items-end justify-between mb-6"><div><div className="eyebrow-gold mb-3">Complete the look</div><h2 className="display-section text-bone" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>Same world.</h2></div><Link href="/shop" className="btn-ghost">View all <ArrowUpRight size={13} /></Link></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{complete.map((item, i) => <ProductCard key={item.canonical_product_id || i} product={item} index={i} />)}</div></section> : null}

    {lightboxOpen ? <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
      <button type="button" className="absolute right-5 top-5 h-10 w-10 rounded-full border border-white/20 bg-black/40 text-white text-xl" onClick={() => setLightboxOpen(false)}>×</button>
      {main ? <img src={String(main)} alt={activeImage?.alt || shortHead} className="max-h-[90vh] max-w-full object-contain" /> : null}
    </div> : null}
  </div>;
}

function Detail({ icon, title, lines, id }: { icon: ReactNode; title: string; lines: string[]; id?: string }) {
  return <div id={id} className="border-t border-[rgba(216,214,211,0.12)] py-5"><div className="eyebrow-gold mb-3 flex items-center gap-2">{icon}{title}</div><div className="space-y-1.5 text-[14px] text-[var(--bone-dim)] leading-relaxed">{lines.filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div></div>;
}
