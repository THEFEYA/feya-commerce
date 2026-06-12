'use client';
import Link from 'next/link';
import { ArrowUpRight, ShoppingBag, Check, Zap, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { colorStyle } from '@/components/colors';
import { SalePrice } from '@/components/SalePrice';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorOptions, mainRegularPrice, productSlug, productTitle, salePrice } from '@/lib/storefront';

export function ProductCard({ product: p, index = 0 }: { product: StorefrontProduct; index?: number }) {
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const primary = p.primary_image_url || '';
  const swap = p.hover_image_url || p.secondary_image_url || '';
  const cleanSwap = swap && swap !== primary ? swap : '';
  const video = p.has_video ? (p.video_url || '') : '';
  const colors = colorOptions(p);
  const hasMulti = Boolean(p.has_multiple_pdp_options || (p.pdp_option_count || 1) > 1);
  const regular = mainRegularPrice(p);
  const sale = salePrice(regular);
  const currency = p.currency || 'EUR';
  const slug = productSlug(p);
  const title = productTitle(p);
  const hasExpress = true;

  const addVisual = () => {
    const key = 'feya_visual_bag';
    const current = Number.parseInt(window.localStorage?.getItem(key) || '0', 10) || 0;
    window.localStorage?.setItem(key, String(current + 1));
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMulti) {
      window.location.href = `/shop/${slug}`;
      return;
    }
    addVisual();
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Link href={`/shop/${slug}`} data-testid={`product-card-${slug}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="product-card reveal group block focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60" style={{ animationDelay: `${(index % 8) * 60}ms` }}>
      <div className="img-wrap relative">
        {primary ? <img src={primary} alt={title} loading="lazy" className={`primary-media transition-opacity duration-500 ${hovered && (cleanSwap || video) ? 'opacity-0' : 'opacity-100'}`} /> : <div className="h-full grid place-items-center text-sm text-[var(--smoke)]">Missing image</div>}
        {video ? <video src={video} muted playsInline loop preload="none" autoPlay={hovered} className={`hover-media transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-0'}`} /> : cleanSwap ? <img src={cleanSwap} alt="" loading="lazy" className={`hover-media transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" /> : null}
        {hasExpress && <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(7,7,10,0.7)] backdrop-blur border border-[rgba(216,214,211,0.30)]"><Zap size={11} className="text-white" /><span className="text-[9px] tracking-[0.18em] uppercase text-white font-semibold">Express</span></div>}
        <button data-testid={`quick-add-${slug}`} onClick={handleQuickAdd} aria-label={hasMulti ? 'Choose options' : 'Add to bag'} className={`absolute z-20 bottom-3 left-3 right-3 inline-flex items-center justify-center gap-2 h-10 rounded-md backdrop-blur transition-all ${added ? 'bg-[var(--gold)] text-ink border border-[var(--gold)]' : 'bg-[rgba(7,7,10,0.85)] text-bone border border-[rgba(216,214,211,0.30)] hover:bg-white hover:text-ink hover:border-white opacity-0 group-hover:opacity-100'}`}>{added ? <Check size={14} /> : (hasMulti ? <ChevronRight size={14} /> : <ShoppingBag size={14} />)}<span className="text-[10.5px] tracking-[0.22em] uppercase font-semibold">{added ? 'Added' : hasMulti ? 'Choose options' : 'Add to bag'}</span></button>
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-4 lg:px-5 lg:py-5">
        <h3 className="font-tall text-bone text-[18px] lg:text-[19px] leading-[1.18] line-clamp-2 min-h-[2.5em]" title={title}>{title}</h3>
        <div className="flex items-center justify-between gap-2 mt-0.5"><div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)] min-w-0"><span className="truncate">{categoryLabel(p)}</span><span className="w-1 h-1 rounded-full bg-[var(--smoke)] shrink-0" /><span className="text-[#C8C2B5] truncate">{colors[0] || 'Mirror'}</span></div>{colors.length > 0 && <div className="flex items-center gap-1 shrink-0" aria-label="Available colors">{colors.slice(0,4).map((c) => <span key={c} title={c} className="w-3 h-3 rounded-full border border-[rgba(216,214,211,0.35)] shadow-inner" style={colorStyle(c)} />)}</div>}</div>
        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-[rgba(216,214,211,0.10)] gap-2"><SalePrice regular={regular} sale={sale} currency={currency} variant="card" testidPrefix={`card-price-${slug}`} /><span className="inline-flex items-center gap-1 text-[10.5px] tracking-[0.22em] uppercase text-[#C8C2B5] group-hover:text-white group-hover:gap-1.5 transition-all shrink-0">View <ArrowUpRight size={12} /></span></div>
      </div>
    </Link>
  );
}
