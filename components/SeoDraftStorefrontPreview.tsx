'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Ruler, ShieldCheck, ShoppingBag } from 'lucide-react';
import { THEFEYA_CANONICAL_RIGHT_PDP_PANEL } from '@/lib/thefeyaSeoDoctrine';
import { formatPrice, getMedia, mainRegularPrice, optionLabel, sortedOptions } from '@/lib/storefront';

export function SeoDraftStorefrontPreview({ product, draft }: { product: any; draft: any }) {
  const gallery = useMemo(() => getMedia(product || {}), [product]);
  const [index, setIndex] = useState(0);
  const image = gallery[index]?.url || product?.primary_image_url || '';
  const options = useMemo(() => sortedOptions(product || {}), [product]);
  const price = mainRegularPrice(product || {});
  const currency = product?.currency || 'EUR';
  const blocks = Array.isArray(draft?.pdp_blocks) ? draft.pdp_blocks.filter((block: any) => block?.placement === 'left_description') : [];

  function move(direction: number) {
    if (gallery.length <= 1) return;
    setIndex((index + direction + gallery.length) % gallery.length);
  }

  return <section className="overflow-hidden rounded-2xl border border-[rgba(216,214,211,.15)] bg-[#09090c]">
    <div className="border-b border-[rgba(216,214,211,.12)] bg-[rgba(212,178,106,.055)] px-5 py-3 text-[11px] leading-relaxed text-[var(--gold-warm)]">
      Реалистичный внутренний предпросмотр. Кнопки покупки отключены, данные не сохраняются и не публикуются.
    </div>

    <div className="p-5 lg:p-7">
      <div className="grid grid-cols-12 gap-5 lg:gap-7">
        <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-3 lg:gap-4">
          <div className="col-span-2 hidden lg:flex max-h-[650px] flex-col gap-3 overflow-y-auto pr-1">
            {gallery.map((item: any, itemIndex: number) => <button key={`${item.url}-${itemIndex}`} type="button" onClick={() => setIndex(itemIndex)} className={`relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-sm border bg-[rgba(255,255,255,.025)] ${itemIndex === index ? 'border-white opacity-100' : 'border-[rgba(216,214,211,.12)] opacity-55'}`}>
              {item.url ? <img src={String(item.url)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            </button>)}
          </div>

          <div className="col-span-12 lg:col-span-10 flex justify-center">
            <div className="relative aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-md border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]">
              {image ? <img src={String(image)} alt={draft?.h1 || product?.card_title || 'TheFEYA product preview'} className="absolute inset-0 h-full w-full object-cover" /> : null}
              {gallery.length > 1 ? <>
                <button type="button" onClick={() => move(-1)} className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white"><ChevronLeft size={17} /></button>
                <button type="button" onClick={() => move(1)} className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white"><ChevronRight size={17} /></button>
              </> : null}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">{index + 1} / {gallery.length || 1}</div>
            </div>
          </div>
        </div>

        <aside className="col-span-12 self-start lg:col-span-5 lg:sticky lg:top-6">
          <div className="eyebrow-gold mb-3">TheFEYA · draft preview</div>
          <h1 className="font-tall text-bone leading-[.98] tracking-[.01em]" style={{ fontSize: 'clamp(30px,3vw,42px)' }}>{draft?.h1 || product?.h1 || product?.card_title || 'Product title'}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{draft?.intro || draft?.meta_description || product?.meta_description || 'Generated product introduction will appear here.'}</p>

          <div className="mt-5 border-y border-[rgba(216,214,211,.12)] py-4">
            <div className="eyebrow-dim">Price preview</div>
            <div className="mt-2 font-price text-gold-grad text-[34px] leading-none">{formatPrice(price, currency)}</div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">Configuration</div><div className="eyebrow-dim">{options.length || 1} options</div></div>
            <div className="space-y-2">
              {(options.length ? options : [{}]).slice(0, 5).map((option: any, optionIndex: number) => <div key={`${optionLabel(option, optionIndex)}-${optionIndex}`} className="rounded-md border border-[rgba(216,214,211,.14)] bg-[rgba(255,255,255,.025)] px-4 py-3 text-[13px] text-[var(--bone-dim)]">{optionLabel(option, optionIndex)}</div>)}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between"><div className="eyebrow">Size</div><div className="eyebrow-dim flex items-center gap-1"><Ruler size={12} /> Size guide</div></div>
            <div className="flex flex-wrap gap-1.5">{['XS','S','M','L','XL','XXL','XXXL','Custom'].map((size) => <span key={size} className="size-pill opacity-70">{size}</span>)}</div>
          </div>

          <button type="button" disabled className="btn-chrome mt-5 h-11 w-full justify-center rounded-md opacity-45"><ShoppingBag size={14} /> Preview only</button>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--bone-dim)]"><ShieldCheck size={14} className="text-[var(--gold-warm)]" /> No save, apply or publish action is available here.</div>
        </aside>
      </div>

      <div className="mt-8 grid grid-cols-12 gap-7 border-t border-[rgba(216,214,211,.12)] pt-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow-gold mb-4">Product description preview</div>
          <div className="space-y-6">
            {blocks.map((block: any, blockIndex: number) => <article key={`${block.block_key}-${blockIndex}`}>
              <h2 className="text-bone text-[20px] leading-tight">{block.heading || humanize(block.block_key)}</h2>
              <div className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.8] text-[var(--bone-dim)]">{block.body || '—'}</div>
            </article>)}
            {!blocks.length ? <div className="text-[14px] text-[var(--bone-dim)]">Generated left-description blocks will appear here.</div> : null}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="eyebrow-gold mb-4">Additional information</div>
          <div className="divide-y divide-[rgba(216,214,211,.12)] border-y border-[rgba(216,214,211,.12)]">
            {THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => <details key={block.block_key} className="group py-4" open={block.block_key === 'sizing_fit'}>
              <summary className="cursor-pointer list-none text-bone text-[14px]">{block.heading}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">{block.body}</p>
            </details>)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

function humanize(value: string) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
