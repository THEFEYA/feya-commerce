'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { colorStyle } from '@/components/colors';
import { SalePrice } from '@/components/SalePrice';
import type { StorefrontProduct } from '@/lib/types';
import { colorOptions, mainCompareAtPrice, mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';

function isUrl(value: unknown): value is string {
  return typeof value === 'string' && (/^https?:\/\//i.test(value.trim()) || value.trim().startsWith('/'));
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function collectUrls(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];

  if (isUrl(value)) return [value.trim()];

  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (parsed !== value) return collectUrls(parsed, depth + 1);
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectUrls(item, depth + 1));
  }

  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const priorityKeys = [
      'hover_image_url',
      'secondary_image_url',
      'primary_image_url',
      'url',
      'image_url',
      'src',
      'public_url',
      'media_url',
      'secure_url',
      'thumbnail_url',
      'preview_url',
      'original_url',
      'cdn_url',
    ];

    const priority = priorityKeys.flatMap((key) => collectUrls(item[key], depth + 1));
    const nested = Object.entries(item)
      .filter(([key]) => !priorityKeys.includes(key) && !/alt|title|label|type|id|slug/i.test(key))
      .flatMap(([, nestedValue]) => collectUrls(nestedValue, depth + 1));

    return [...priority, ...nested];
  }

  return [];
}

function uniqueUrls(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = url.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function galleryUrls(product: StorefrontProduct) {
  return uniqueUrls(collectUrls(product.media_gallery));
}

export function ProductCard({ product: p, index = 0 }: { product: StorefrontProduct; index?: number }) {
  const primary = p.primary_image_url || '';
  const gallery = galleryUrls(p);
  const mediaCandidates = uniqueUrls([
    p.hover_image_url || '',
    p.secondary_image_url || '',
    ...gallery,
  ]);
  const cleanSwap = mediaCandidates.find((url) => url && url !== primary) || '';
  const video = p.has_video ? (p.video_url || '') : '';
  const hasHoverMedia = Boolean(video || cleanSwap);
  const primaryClassName = hasHoverMedia
    ? 'primary-media transition-opacity duration-500 group-hover:opacity-0'
    : 'primary-static-media h-full w-full object-cover transition-transform duration-700';
  const colors = colorOptions(p);
  const display = mainRegularPrice(p);
  const compareAt = mainCompareAtPrice(p);
  const hasCompareAt = compareAt != null && display != null && compareAt > display;
  const regular = hasCompareAt ? compareAt : display;
  const sale = display;
  const currency = p.currency || 'EUR';
  const slug = productSlug(p);
  const title = productTitle(p);

  return (
    <Link prefetch href={`/shop/${slug}`} data-testid={`product-card-${slug}`} className={`product-card reveal group block focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${hasHoverMedia ? 'has-hover-media' : ''}`} style={{ animationDelay: `${(index % 8) * 60}ms` }}>
      <div className="img-wrap relative overflow-hidden">
        {primary ? <img src={primary} alt={title} loading="lazy" className={primaryClassName} /> : <div className="h-full grid place-items-center text-sm text-[var(--smoke)]">Missing image</div>}
        {video ? <video src={video} muted playsInline loop preload="metadata" className="hover-media absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" /> : cleanSwap ? <img src={cleanSwap} alt="" loading={index < 24 ? 'eager' : 'lazy'} decoding="async" className="hover-media absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" /> : null}
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
