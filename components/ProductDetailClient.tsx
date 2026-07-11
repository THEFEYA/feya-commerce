'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  RotateCcw,
  Ruler,
  Scissors,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { colorStyle } from '@/components/colors';
import { ProductCard } from '@/components/ProductCard';
import { SalePrice } from '@/components/SalePrice';
import { THEFEYA_CANONICAL_RIGHT_PDP_PANEL } from '@/lib/thefeyaSeoDoctrine';
import type { StorefrontProduct } from '@/lib/types';
import {
  categoryLabel,
  colorOptions,
  componentCode,
  formatPrice,
  getMedia,
  isFullSetOption,
  optionCompareAtPrice,
  optionDiscountPercent,
  optionKey,
  optionLabel,
  optionPrice,
  productSlug,
  productTitle,
  sortedOptions,
  splitTitle,
} from '@/lib/storefront';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'];
const CART_KEY = 'feya_visual_cart_v1';
const COUNT_KEY = 'feya_visual_bag';
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

type DraftBlock = {
  block_key?: string;
  placement?: string;
  heading?: string;
  body?: string;
};

type SeoDraftPreview = {
  h1?: string | null;
  intro?: string | null;
  meta_description?: string | null;
  pdp_blocks?: DraftBlock[] | null;
};

type ReviewItem = {
  id: string;
  author: string;
  date: string;
  rating: number;
  body: string;
  images: string[];
};

type ProductDetailProps = {
  product: StorefrontProduct;
  related: StorefrontProduct[];
  draft?: SeoDraftPreview | null;
  previewMode?: boolean;
  embedded?: boolean;
};

function compactHead(raw: string) {
  return raw
    .replace(/\s+with\s+top\s+&\s+skirt/i, ' with Top & Skirt')
    .replace(/\s+metallic\s+costume\s+set.*$/i, '')
    .replace(/\s+party\s+rave\s+wear.*$/i, '')
    .trim();
}

function readCart() {
  try {
    const parsed = window.localStorage.getItem(CART_KEY);
    const value = parsed ? JSON.parse(parsed) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function ProductDetailClient({
  product: p,
  related,
  draft = null,
  previewMode = false,
  embedded = false,
}: ProductDetailProps) {
  const gallery = useMemo(() => getMedia(p), [p]);
  const options = useMemo(() => sortedOptions(p), [p]);
  const full = options.find((o, i) => isFullSetOption(o, i));
  const fullKey = full ? optionKey(full, options.indexOf(full)) : '';

  const [idx, setIdx] = useState(0);
  const [configKey, setConfigKey] = useState(fullKey || (options[0] ? optionKey(options[0], 0) : ''));
  const [configOpen, setConfigOpen] = useState(false);
  const [size, setSize] = useState('M');
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeConfig = options.find((o, i) => optionKey(o, i) === configKey) || options[0] || null;
  const activeConfigIndex = activeConfig ? Math.max(0, options.indexOf(activeConfig)) : 0;
  const activeConfigLabel = activeConfig ? optionLabel(activeConfig, activeConfigIndex) : 'Full Set';
  const display = optionPrice(activeConfig) ?? p.full_set_display_price_amount ?? p.max_price ?? p.min_price ?? 0;
  const compareAt = optionCompareAtPrice(activeConfig);
  const hasCompareAt = compareAt != null && display != null && compareAt > display;
  const regular = hasCompareAt ? compareAt : display;
  const sale = display;
  const currency = activeConfig?.currency || p.currency || 'EUR';
  const total = sale * qty;
  const colors = colorOptions(p);
  const selectedColor = colors[colorIdx] || colors[0] || 'Mirror';
  const slug = productSlug(p);
  const originalTitle = splitTitle(productTitle(p));
  const draftTitle = String(draft?.h1 || '').trim();
  const head = draftTitle || originalTitle.head;
  const tail = draftTitle ? '' : originalTitle.tail;
  const shortHead = compactHead(head);
  const activeImage = gallery[idx];
  const main = activeImage?.url || p.primary_image_url || '';
  const complete = related.filter((x) => x.canonical_product_id !== p.canonical_product_id).slice(0, 4);
  const draftBlocks = Array.isArray(draft?.pdp_blocks)
    ? draft.pdp_blocks.filter((block) => block?.placement === 'left_description' && block?.body)
    : [];
  const reviewSummary = useMemo(() => readReviewSummary(p), [p]);
  const includedLines = confirmedIncludedLines(p, activeConfig, activeConfigLabel);

  const fullRegularPrice = full ? optionPrice(full) : null;
  const separateRegularTotal = options
    .filter((o, i) => !isFullSetOption(o, i))
    .reduce((sum, option) => sum + (optionPrice(option) || 0), 0);
  const v4Savings = typeof p.full_set_savings_amount === 'number' ? p.full_set_savings_amount : null;
  const computedSavings = fullRegularPrice && separateRegularTotal > fullRegularPrice ? separateRegularTotal - fullRegularPrice : 0;
  const fullSetSavings = v4Savings ?? computedSavings;
  const selectedIsFullSet = activeConfig ? isFullSetOption(activeConfig, activeConfigIndex) : false;
  const savingsText = selectedIsFullSet && fullSetSavings > 0
    ? `Best value: save ${formatPrice(fullSetSavings, currency)} vs ordering pieces separately${separateRegularTotal > 0 ? ` (${formatPrice(separateRegularTotal, currency)})` : ''}.`
    : '';

  useEffect(() => {
    thumbnailRefs.current[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [idx]);

  const moveImage = (direction: number) => {
    if (gallery.length <= 1) return;
    setIdx((idx + direction + gallery.length) % gallery.length);
  };

  const addToBag = (goToCart = false) => {
    if (previewMode) return;
    const current = readCart();
    const id = `${p.canonical_product_id || slug}-${configKey}-${size}-${selectedColor}`;
    const existingIndex = current.findIndex((item: { id: string }) => item.id === id);
    const nextItem = {
      id,
      slug,
      title: shortHead,
      image: p.primary_image_url || main,
      config: activeConfigLabel,
      size,
      color: selectedColor,
      qty,
      price: sale,
      currency,
      price_contract_version: p.price_contract_version || null,
      price_confidence_status: activeConfig?.price_confidence_status || p.price_confidence_status || null,
      label_confidence_status: activeConfig?.needs_label_review ? 'needs_review' : activeConfig?.public_label ? 'approved' : null,
      component_code: componentCode(activeConfig),
      component_family: activeConfig?.component_family || null,
      is_full_set: activeConfig ? isFullSetOption(activeConfig, activeConfigIndex) : false,
      is_bundle: activeConfig?.is_bundle || false,
      configuration_id: activeConfig?.configuration_id || activeConfig?.configuration_price_id || activeConfig?.source_price_row_id || null,
      public_label: activeConfig?.public_label || activeConfigLabel,
      unit_price_amount: sale,
      compare_at_price_amount: hasCompareAt ? compareAt : null,
    };
    const next = existingIndex >= 0
      ? current.map((item: { id: string; qty: number }) => item.id === id ? { ...item, qty: item.qty + qty } : item)
      : [...current, nextItem];
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.localStorage.setItem(COUNT_KEY, String(next.reduce((sum: number, item: { qty: number }) => sum + item.qty, 0)));
    window.dispatchEvent(new Event('storage'));
    setAdded(true);
    if (goToCart) {
      window.location.href = '/cart';
      return;
    }
    setTimeout(() => setAdded(false), 1300);
  };

  return <div data-testid="product-page" className={`relative ${embedded ? 'pt-0' : 'pt-[104px] lg:pt-[104px]'}`}>
    {!embedded ? <div className="container-feya py-3">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--smoke)]">
        <Link href="/" className="hover:text-white">Home</Link><ChevronRight size={10} />
        <Link href="/shop" className="hover:text-white">Shop</Link><ChevronRight size={10} />
        <span className="text-[var(--bone-dim)] truncate max-w-[160px]">{categoryLabel(p)}</span><ChevronRight size={10} />
        <span className="text-white truncate max-w-[280px]">{shortHead}</span>
      </div>
    </div> : null}

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

      <aside className={`col-span-12 lg:col-span-5 self-start ${embedded ? 'lg:sticky lg:top-6' : 'lg:sticky lg:top-[104px]'}`}>
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.01em] line-clamp-2" style={{ fontSize: 'clamp(28px, 2.8vw, 38px)' }}>{shortHead}</h1>
        {tail ? <p className="editorial-italic text-[var(--bone-dim)] text-[12px] mt-1 leading-relaxed line-clamp-1">{tail}</p> : null}
        {reviewSummary.count > 0 ? <ReviewAnchor average={reviewSummary.average} count={reviewSummary.count} /> : null}

        <div className="mt-2"><SalePrice regular={regular} sale={sale} currency={currency} variant="pdp" testidPrefix="pdp-price" discountPercent={optionDiscountPercent(activeConfig)} /></div>

        <div className="mt-2 relative">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Configuration</div><div className="eyebrow-dim">{options.length || 1} options</div></div>
          <button type="button" onClick={() => setConfigOpen((open) => !open)} className="w-full h-10 rounded-md bg-[rgba(255,255,255,0.035)] border border-[rgba(216,214,211,0.18)] text-bone px-4 focus:outline-none focus:border-white flex items-center justify-between text-left">
            <span className="truncate">{activeConfigLabel}</span>
            <ChevronDown size={15} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </button>
          {configOpen ? <div className="absolute left-0 right-0 top-full mt-2 z-[80] rounded-lg border border-[rgba(216,214,211,.22)] bg-[rgba(5,5,8,.96)] p-1.5 shadow-[0_28px_80px_rgba(0,0,0,.75)] backdrop-blur-xl max-h-[250px] overflow-auto">
            {options.map((o, i) => {
              const key = optionKey(o, i);
              const active = key === configKey;
              return <button key={key} type="button" onClick={() => { setConfigKey(key); setConfigOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-md text-[13px] transition-all ${active ? 'bg-[rgba(212,178,106,.14)] text-[var(--gold-warm)]' : 'text-[var(--bone-dim)] hover:text-white hover:bg-white/10'}`}>{optionLabel(o, i)}</button>;
            })}
          </div> : null}
        </div>
        <p className="mt-1.5 min-h-[18px] text-[12px] leading-relaxed text-[var(--gold-warm)]">{savingsText}</p>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Color · {selectedColor}</div><div className="eyebrow-dim">{colors.length || 1} shade</div></div>
          <div className="flex gap-2">{colors.map((c, i) => <button key={c + i} onClick={() => setColorIdx(i)} className={`w-8 h-8 rounded-full border-2 ${i === colorIdx ? 'border-white' : 'border-[rgba(216,214,211,0.28)]'}`} style={colorStyle(c)} title={c} />)}</div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Size · {size}</div><a href="#description" className="eyebrow-dim hover:text-white flex items-center gap-1"><Ruler size={12} /> Size guide</a></div>
          <div className="flex flex-wrap gap-1.5">{SIZES.map((s) => <button key={s} onClick={() => setSize(s)} className={`size-pill ${size === s && s !== 'Custom' ? 'size-pill-active' : ''} ${size === s && s === 'Custom' ? 'size-pill-custom' : ''}`}>{s}</button>)}</div>
        </div>

        <div className="mt-3 rounded-md border border-[rgba(216,214,211,.10)] bg-[rgba(255,255,255,.018)] px-3 py-2 text-[11px] text-[var(--bone-dim)]">
          Shipping method and delivery dates are selected in the cart.
        </div>

        <div className="mt-3 border-t border-[rgba(216,214,211,0.12)] pt-3 flex items-end justify-between"><div className="eyebrow text-[10px]">Total · {qty} × {formatPrice(sale, currency)}</div><div className="font-price text-gold-grad text-[29px] leading-none">{formatPrice(total, currency)}</div></div>
        {previewMode
          ? <button type="button" disabled className="btn-chrome justify-center rounded-md h-10 w-full mt-2 opacity-45"><ShieldCheck size={14} /> Preview only</button>
          : <>
            <div className="mt-2 grid grid-cols-[112px_1fr] gap-2.5"><div className="h-10 rounded-md border border-[rgba(216,214,211,0.18)] grid grid-cols-3 items-center"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span className="text-center">{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div><button className="btn-chrome justify-center rounded-md h-10" onClick={() => addToBag(false)}>{added ? <Check size={14} /> : <ShoppingBag size={14} />} Add to bag</button></div>
            <button className="btn-gold justify-center rounded-md h-10 w-full mt-2" onClick={() => addToBag(true)}>Buy it now <ArrowUpRight size={13} /></button>
          </>}
        <div className="recovered-policy-row mt-2.5 flex flex-wrap justify-center gap-4 text-[9px] tracking-[0.22em] uppercase"><a href="#save"><Heart size={11} className="inline mr-1" />Save</a><a href="#share"><Share2 size={11} className="inline mr-1" />Share</a><a href="#shipping"><Truck size={11} className="inline mr-1" />Shipping</a><a href="#returns"><RotateCcw size={11} className="inline mr-1" />Returns</a><a href="#policies"><FileText size={11} className="inline mr-1" />Store policies</a></div>
      </aside>
    </section>

    <section id="description" className="container-feya py-7 border-t border-[rgba(216,214,211,0.12)] grid grid-cols-12 gap-7">
      <div className="col-span-12 lg:col-span-7">
        {draftBlocks.length
          ? <GeneratedDescription title={shortHead} blocks={draftBlocks} />
          : <DefaultDescription product={p} title={shortHead} />}
      </div>
      <div className="col-span-12 lg:col-span-5 space-y-0">
        {includedLines.length ? <Detail icon={<Scissors size={15} />} title="What's included" lines={includedLines} /> : null}
        {THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => <Detail
          key={block.block_key}
          icon={rightPanelIcon(block.block_key)}
          title={block.heading}
          id={rightPanelId(block.block_key)}
          lines={[...block.lines]}
        />)}
      </div>
    </section>

    <ReviewsSection summary={reviewSummary} />

    {complete.length ? <section className="container-feya py-12"><div className="flex items-end justify-between mb-6"><div><div className="eyebrow-gold mb-3">Complete the look</div><h2 className="display-section text-bone" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>Same world.</h2></div><Link href="/shop" className="btn-ghost">View all <ArrowUpRight size={13} /></Link></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{complete.map((item, i) => <ProductCard key={item.canonical_product_id || i} product={item} index={i} />)}</div></section> : null}

    {lightboxOpen ? <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
      <button type="button" className="absolute right-5 top-5 h-10 w-10 rounded-full border border-white/20 bg-black/40 text-white text-xl" onClick={() => setLightboxOpen(false)}>×</button>
      {main ? <img src={String(main)} alt={activeImage?.alt || shortHead} className="max-h-[90vh] max-w-full object-contain" /> : null}
    </div> : null}
  </div>;
}

function GeneratedDescription({ title, blocks }: { title: string; blocks: DraftBlock[] }) {
  return <div>
    <div className="eyebrow-gold mb-3">{blocks[0]?.heading || 'About this piece'}</div>
    <h2 className="display-section text-bone mb-4" style={{ fontSize: 'clamp(24px, 2.3vw, 34px)' }}>{title}</h2>
    <div className="space-y-6 text-[15px] text-[var(--bone-dim)] leading-[1.8]">
      {blocks.map((block, index) => <article key={`${block.block_key || 'block'}-${index}`}>
        {index > 0 ? <h3 className="text-bone text-[22px] leading-tight mb-2">{block.heading || humanize(block.block_key)}</h3> : null}
        <DisplayBody body={String(block.body || '')} />
      </article>)}
    </div>
  </div>;
}

function DefaultDescription({ product, title }: { product: StorefrontProduct; title: string }) {
  return <div>
    <div className="eyebrow-gold mb-3">About this piece</div>
    <h2 className="display-section text-bone mb-4" style={{ fontSize: 'clamp(24px, 2.3vw, 34px)' }}>{title}</h2>
    <div className="space-y-4 text-[15px] text-[var(--bone-dim)] leading-[1.8]">
      <p>{product.meta_description || `${title} is a studio-created statement piece for festival, stage, and editorial looks.`}</p>
      <p>Its silhouette is designed to stay visually clear in motion, from a distance, and on camera. Product-specific material, finish, and fit details are shown in the selected configuration and information panel.</p>
      <p>Made to order in standard or custom sizing, with worldwide tracked delivery options selected in the cart.</p>
    </div>
  </div>;
}

function DisplayBody({ body }: { body: string }) {
  const lines = body.split(/\n/).map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  const looksLikeList = lines.length > 1;
  if (!looksLikeList) return <p>{body}</p>;
  return <ul className="space-y-2">{lines.map((line, index) => <li key={`${line}-${index}`} className="flex gap-2"><span className="mt-[.7em] h-1 w-1 shrink-0 rounded-full bg-[var(--gold-warm)]" /><span>{line}</span></li>)}</ul>;
}

function Detail({ icon, title, lines, id }: { icon: ReactNode; title: string; lines: string[]; id?: string }) {
  return <div id={id} className="border-t border-[rgba(216,214,211,0.12)] py-5"><div className="eyebrow-gold mb-3 flex items-center gap-2">{icon}{title}</div><div className="space-y-1.5 text-[14px] text-[var(--bone-dim)] leading-relaxed">{lines.filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div></div>;
}

function ReviewAnchor({ average, count }: { average: number; count: number }) {
  return <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-[11px] text-[var(--bone-dim)] hover:text-white">
    <span className="flex gap-0.5" aria-hidden="true"><Stars value={average} size={11} /></span>
    <span>{average.toFixed(1)}</span>
    <span className="text-[var(--smoke)]">·</span>
    <span>{count} {count === 1 ? 'review' : 'reviews'}</span>
  </a>;
}

function ReviewsSection({ summary }: { summary: { average: number; count: number; items: ReviewItem[] } }) {
  if (!summary.count) {
    return <section id="reviews" className="container-feya py-5 border-t border-[rgba(216,214,211,0.12)]">
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow-gold">Customer reviews</div>
        <div className="text-[13px] text-[var(--bone-dim)]">No reviews yet.</div>
      </div>
    </section>;
  }

  return <section id="reviews" className="container-feya py-8 border-t border-[rgba(216,214,211,0.12)]">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="eyebrow-gold mb-2">Customer reviews</div>
        <div className="text-[17px] text-bone">{summary.average.toFixed(1)} from {summary.count} {summary.count === 1 ? 'review' : 'reviews'}</div>
      </div>
      <div className="flex gap-1 text-[var(--gold-warm)]" aria-label={`${summary.average.toFixed(1)} out of 5 stars`}><Stars value={summary.average} size={16} /></div>
    </div>

    {summary.items.length ? <div className="mt-5 grid gap-4 lg:grid-cols-3">{summary.items.slice(0, 3).map((review) => <article key={review.id} className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.02)] p-5">
      <div className="flex items-start justify-between gap-4"><div><div className="text-bone text-[13px]">{review.author}</div><div className="mt-1 text-[10px] uppercase tracking-[.14em] text-[var(--smoke)]">{review.date}</div></div><div className="flex gap-0.5 text-[var(--gold-warm)]"><Stars value={review.rating} size={11} /></div></div>
      <p className="mt-4 text-[14px] leading-relaxed text-[var(--bone-dim)]">{review.body}</p>
      {review.images.length ? <div className="mt-4 flex gap-2">{review.images.slice(0, 3).map((image) => <img key={image} src={image} alt="Customer review" className="h-16 w-16 rounded-md object-cover border border-[rgba(216,214,211,.12)]" />)}</div> : null}
    </article>)}</div> : null}
  </section>;
}

function Stars({ value, size }: { value: number; size: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return <>{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={size} strokeWidth={1.5} fill={index < filled ? 'currentColor' : 'none'} />)}</>;
}

function confirmedIncludedLines(product: StorefrontProduct, configuration: any, label: string) {
  if (!configuration || hasCompositionRisk(product, configuration)) return [];
  const bundleCodes = Array.isArray(configuration.bundle_component_codes)
    ? configuration.bundle_component_codes.map(humanize).filter(Boolean)
    : [];
  if (bundleCodes.length) return uniqueStrings(bundleCodes);

  const code = String(configuration.component_code || configuration.component_family || '').trim();
  if (code && !CYRILLIC.test(code)) return [humanize(code)];

  const publicLabel = String(configuration.public_label || label || '').trim();
  if (!publicLabel || CYRILLIC.test(publicLabel) || /^full\s*set$/i.test(publicLabel)) return [];
  return [publicLabel];
}

function hasCompositionRisk(product: StorefrontProduct, configuration: any) {
  const productRecord = product as Record<string, any>;
  return Boolean(
    productRecord.has_component_review_risk
    || Number(productRecord.needs_component_review_count || 0) > 0
    || productRecord.needs_label_review
    || productRecord.has_russian_public_label
    || configuration?.needs_label_review
    || configuration?.has_russian_raw_label
    || CYRILLIC.test(String(configuration?.public_label || '')),
  );
}

function rightPanelIcon(key: string) {
  if (key === 'sizing_fit') return <Ruler size={15} />;
  if (key === 'production_timing') return <Clock3 size={15} />;
  if (key === 'shipping_delivery') return <Truck size={15} />;
  if (key === 'material') return <ShieldCheck size={15} />;
  if (key === 'care') return <Sparkles size={15} />;
  if (key === 'customization') return <Scissors size={15} />;
  return <FileText size={15} />;
}

function rightPanelId(key: string) {
  if (key === 'shipping_delivery') return 'shipping';
  if (key === 'customization') return 'policies';
  return undefined;
}

function readReviewSummary(product: StorefrontProduct) {
  const record = product as Record<string, any>;
  const rawItems = firstDefined(record, ['reviews', 'review_items', 'reviews_json']);
  const sourceItems = parseArray(rawItems);
  const items = sourceItems.map(normalizeReview).filter((item): item is ReviewItem => Boolean(item));
  const explicitCount = numberValue(firstDefined(record, ['review_count', 'reviews_count', 'rating_count']));
  const explicitAverage = numberValue(firstDefined(record, ['average_rating', 'rating_average', 'review_rating']));
  const count = Math.max(explicitCount, items.length);
  const calculatedAverage = items.length ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : 0;
  const average = clampRating(explicitAverage || calculatedAverage);
  return { count, average, items };
}

function normalizeReview(value: any, index: number): ReviewItem | null {
  if (!value || typeof value !== 'object') return null;
  const body = String(value.body || value.text || value.comment || value.review || '').trim();
  if (!body) return null;
  const images = parseArray(value.images || value.photos || value.media)
    .map((item) => typeof item === 'string' ? item : item?.url)
    .filter((item): item is string => typeof item === 'string' && /^https?:\/\//i.test(item));
  return {
    id: String(value.id || value.review_id || index),
    author: maskAuthor(String(value.author || value.name || value.customer_name || 'Verified customer')),
    date: formatReviewDate(value.date || value.created_at || value.reviewed_at),
    rating: clampRating(numberValue(value.rating || value.stars) || 5),
    body,
    images,
  };
}

function firstDefined(record: Record<string, any>, keys: string[]) {
  for (const key of keys) if (record[key] != null) return record[key];
  return null;
}

function parseArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function numberValue(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clampRating(value: number) {
  return Math.max(0, Math.min(5, value || 0));
}

function maskAuthor(value: string) {
  const clean = value.trim();
  if (!clean || clean.toLowerCase() === 'verified customer') return 'Verified customer';
  if (clean.length <= 2) return `${clean.charAt(0) || 'C'}***`;
  return `${clean.charAt(0)}***${clean.charAt(clean.length - 1)}`;
}

function formatReviewDate(value: any) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function humanize(value: any) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
