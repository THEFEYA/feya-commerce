// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Film, ImageIcon, Images, Sparkles } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const MEDIA_QA_LIMIT = 250;

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(MEDIA_QA_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function mediaIssues(product: StorefrontProduct) {
  const issues: string[] = [];
  const mediaCount = Number(product.media_count || 0);
  if (!product.primary_image_url) issues.push('Missing primary image');
  if (!product.secondary_image_url && !product.hover_image_url && !product.has_video && mediaCount < 2) issues.push('No hover/second media');
  if (mediaCount > 0 && mediaCount < 4) issues.push('Thin gallery');
  if (product.primary_image_url && !product.primary_image_alt) issues.push('Missing alt text');
  return issues;
}

function galleryDepth(product: StorefrontProduct) {
  const count = Number(product.media_count || 0);
  if (count >= 8) return 'Strong';
  if (count >= 4) return 'OK';
  if (count >= 2) return 'Thin';
  return 'Weak';
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminMediaQaPage() {
  const { rows, error } = await loadProducts();
  const qaRows = rows
    .map((product) => ({ product, issues: mediaIssues(product) }))
    .filter((row) => row.issues.length)
    .slice(0, 160);

  const missingPrimary = rows.filter((product) => !product.primary_image_url).length;
  const missingHover = rows.filter((product) => !product.secondary_image_url && !product.hover_image_url && !product.has_video && Number(product.media_count || 0) < 2).length;
  const thinGallery = rows.filter((product) => Number(product.media_count || 0) > 0 && Number(product.media_count || 0) < 4).length;
  const hasVideo = rows.filter((product) => product.has_video || product.video_url).length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin QA · Media</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Media QA</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки визуальной готовности: primary image, hover image, gallery depth, alt text, video readiness и future image/feed quality.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={ImageIcon} label="Missing primary" value={missingPrimary} note="Products without primary image URL." />
        <Metric icon={Sparkles} label="Missing hover" value={missingHover} note="No second/hover/video signal for card swap." />
        <Metric icon={Images} label="Thin gallery" value={thinGallery} note="Less than 4 media assets in current v4 slice." />
        <Metric icon={Film} label="Video ready" value={hasVideo} note="Products with video signal available." />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {qaRows.map(({ product, issues }) => <article key={product.canonical_product_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
          <Link href={`/admin/products/${productSlug(product)}`} className="group block">
            <div className="relative aspect-[4/5] bg-black/30 overflow-hidden">
              {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <div className="h-full w-full grid place-items-center text-[var(--smoke)] text-sm">Missing image</div>}
              {product.secondary_image_url || product.hover_image_url ? <img src={product.hover_image_url || product.secondary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" /> : null}
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{issues.slice(0,2).map((issue) => <Chip key={issue} tone={issue.includes('Missing') || issue.includes('No ') ? 'danger' : 'warning'}>{issue}</Chip>)}</div>
            </div>
            <div className="p-5">
              <div className="text-bone text-[16px] leading-snug line-clamp-2">{productTitle(product)}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Media</div><div className="font-price text-bone text-[18px] leading-none">{Number(product.media_count || 0)}</div></div>
                <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Depth</div><div className="font-price text-bone text-[18px] leading-none">{galleryDepth(product)}</div></div>
                <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Video</div><div className="font-price text-bone text-[18px] leading-none">{product.has_video || product.video_url ? 'Yes' : 'No'}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {issues.map((issue) => <Chip key={issue} tone={issue.includes('Missing') || issue.includes('No ') ? 'danger' : 'warning'}>{issue}</Chip>)}
              </div>
            </div>
          </Link>
        </article>)}

        {!qaRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No media QA rows returned from v4.</div> : null}
      </div>
    </section>
  </main>;
}
