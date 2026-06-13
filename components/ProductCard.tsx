'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { colorStyle } from '@/components/colors';
import { SalePrice } from '@/components/SalePrice';
import type { StorefrontMedia, StorefrontProduct } from '@/lib/types';
import { colorOptions, mainCompareAtPrice, mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';

function normalizeGallery(value: unknown): StorefrontMedia[] {
  let raw = value;
  if (typeof value === 'string') {
    try { raw = JSON.parse(value) as unknown; } catch { raw = []; }
  }
  return Array.isArray(raw) ? raw as StorefrontMedia[] : [];
}

function galleryHoverUrl(product: StorefrontProduct, primary: string) {
  const gallery = normalizeGallery(product.media_gallery);
  const urls = gallery.map((item) => item.url).filter((url): url is string => Boolean(url));
  return urls.find((url) => url !== primary) || '';
}

export function ProductCard({ product: p, index = 0 }: { product: StorefrontProduct; index?: number }) {
  const [hovered, setHovered] = useState(false);
  const [hoverReady, setHoverReady] = useState(false);
  const primary = p.primary_image_url || '';
  const gallerySwap = galleryHoverUrl(p, primary);
  const swap = p.hover_image_url || p.secondary_image_url || gallerySwap || '';
  const cleanSwap = swap && swap !== primary ? swap : '';
  const video = p.has_video ? (p.video_url || '') : '';
  const hasHoverMedia = Boolean(cleanSwap || video);
  const canSwap = Boolean(hasHoverMedia && (video || hoverReady));
  const colors = colorOptions(p);
  const display = mainRegularPrice(p);
  const compareAt = mainCompareAtPrice(p);
  const hasCompareAt = compareAt != null && display != null && compareAt > display;
  const regular = hasCompareAt ? compareAt : display;
  const sale = hasCompareAt ? display : display;
  const currency = p.currency || 'EUR';
  const slug = productSlug(p);
  const title = productTitle(p);

  return (
    <Link prefetch href={`/shop/${slug}`} data-testid={`product-card-${slug}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={`product-card reveal group block focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${hasHoverMedia ? 'has-hover' : ''} ${canSwap ? 'hover-ready' : ''}`} style={{ animationDelay: `${(index % 8) * 60}ms` }}>
      <div className="img-wrap relative">
        {primary ? <img src={primary} alt={title} loading="lazy" className={`primary-media transition-opacity duration-500 ${hovered && canSwap ? 'opacity-0' : 'opacity-100'}`} /> : <div className="h-full grid place-items-center text-sm text-[var(--smoke)]">Missing image</div>}
        {video ? <video src={video} muted playsInline loop preload="none" autoPlay={hovered} className={`hover-media transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-0'}`} /> : cleanSwap ? <img src={cleanSwap} alt="" loading={index < 24 ? 'eager' : 'lazy'} decoding="async" onLoad={() => setHoverReady(true)} onError={() => setHoverReady(false)} className={`hover-media transition-opacity duration-500 ${hovered && hoverReady ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" /> : null}
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-4 lg:px-5 lg:py-5">
        <h3 className="product-card-title text-bone text-[18px] lg:text-[19px] leading-[1.15] line-clamp-2 min-h-[2.45em]" title={title}>{title}</h3>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)] min-w-0"><span className="truncate">{worldLabel(p)}</span></div>
          {colors.length > 0 && <div className="flex items-center gap-1.5 shrink-0" aria-label="Available colors"><span className="text-[9px] tracking-[0.18em] uppercase text-[#9b988e]">Color</span>{colors.slice(0,4).map((c) => <span key={c} title={c} className="w-3 h-3 rounded-full border border-[rgba(216,214,211,0.35)] shadow-inner" style={colorStyle(c)} />)}</div>}
        </div>
        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-[rgba(216,214,211,0.10)] gap-2"><SalePrice regular={regular} sale={sale} currency={currency} variant="card" testidPrefix={`card-price-${slug}`} /><span className="inline-flex items-center gap-1 text-[10.5px] tracking-[0.22em] uppercase text-[#C8C2B5] group-hover:text-white group-hover:gap-1.5 transition-all shrink-0">View <ArrowUpRight size={12} /></span></div>
      </div>
    </Link>
  );
}
