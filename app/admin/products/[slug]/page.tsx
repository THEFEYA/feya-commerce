// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, ImageIcon, ShieldAlert, Tags, WalletCards } from 'lucide-react';
import { AdminReviewActionsClient } from '@/components/AdminReviewActionsClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { asConfigurations, asMediaGallery, formatPrice, optionLabel, optionPrice, productSlug, productTitle, STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4, worldLabel, categoryLabel, colorLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  return { product: data as StorefrontProduct | null };
}

function Chip({ children, tone = 'neutral' }) {
  const cls = tone === 'danger'
    ? 'border-[rgba(196,64,88,.36)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function Panel({ title, icon: Icon, children }) {
  return <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="eyebrow-gold mb-4 flex items-center gap-2"><Icon size={14} /> {title}</div>
    {children}
  </section>;
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug);

  if (error || !product) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Product not found.'}</div><Link href="/admin/products" className="btn-ghost mt-5">Back to products</Link></section></main>;
  }

  const configs = asConfigurations(product);
  const media = asMediaGallery(product);
  const missingComponents = configs.filter((config) => !config.component_code).length;
  const labelReview = Boolean(product.needs_label_review || configs.some((config) => config.needs_label_review));
  const priceReview = product.price_confidence_status === 'unverified' || Boolean(product.needs_price_review);
  const mediaReview = !(product.secondary_image_url || product.hover_image_url || product.has_video || Number(product.media_count || 0) > 1);
  const slugValue = productSlug(product);
  const storefrontHref = `/shop/${slugValue}`;
  const adminHref = `/admin/products/${slugValue}`;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Product Detail</div>
          <h1 className="font-tall text-bone leading-[0.95]" style={{ fontSize: 'clamp(36px,5.5vw,74px)' }}>{productTitle(product)}</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only product control card from the v4 storefront contract. Admin actions below are saved as append-only review events.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip>{worldLabel(product)}</Chip>
            <Chip>{categoryLabel(product)}</Chip>
            <Chip>{colorLabel(product)}</Chip>
            {labelReview ? <Chip tone="warning">Label review</Chip> : null}
            {priceReview ? <Chip tone="warning">Price review</Chip> : null}
            {missingComponents ? <Chip tone="danger">Missing components {missingComponents}</Chip> : null}
            {mediaReview ? <Chip tone="danger">Media QA</Chip> : null}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="btn-ghost">Products</Link>
          <Link href={storefrontHref} className="btn-ghost">Storefront <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <Panel title="Media" icon={ImageIcon}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[rgba(216,214,211,.10)] bg-black/25">
              {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {media.slice(0, 8).map((item, index) => <div key={`${item.url || item.image_url}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-black/25 border border-[rgba(216,214,211,.10)]">{item.url || item.image_url ? <img src={item.url || item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>)}
            </div>
          </Panel>

          <Panel title="Product identity" icon={Tags}>
            <div className="space-y-3 text-[13px] text-[var(--bone-dim)]">
              <Info label="Canonical product ID" value={product.canonical_product_id} />
              <Info label="Etsy listing ID" value={product.matched_etsy_listing_id} />
              <Info label="Slug" value={product.product_slug} />
              <Info label="Material" value={product.material} />
              <Info label="Raw color" value={product.color} />
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-5">
          <Panel title="Launch blockers" icon={ShieldAlert}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Blocker label="Label review" active={labelReview} />
              <Blocker label="Price review" active={priceReview} />
              <Blocker label="Missing components" active={missingComponents > 0} detail={String(missingComponents)} />
              <Blocker label="Media QA" active={mediaReview} />
            </div>
          </Panel>

          <AdminReviewActionsClient productSlug={slugValue} canonicalProductId={product.canonical_product_id} sourceRoute={adminHref} />

          <Panel title="Pricing" icon={WalletCards}>
            <div className="grid sm:grid-cols-3 gap-3">
              <Metric label="Min price" value={formatPrice(product.min_price, product.currency || 'EUR')} />
              <Metric label="Max price" value={formatPrice(product.max_price, product.currency || 'EUR')} />
              <Metric label="Confidence" value={product.price_confidence_status || 'unknown'} />
            </div>
          </Panel>

          <Panel title="Configurations" icon={Boxes}>
            <div className="rounded-xl border border-[rgba(216,214,211,.10)] overflow-hidden">
              <div className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
                <div>Public option</div><div>Price</div><div>Component</div><div>Flags</div>
              </div>
              <div className="divide-y divide-[rgba(216,214,211,.08)]">
                {configs.map((config, index) => <div key={`${optionLabel(config, index)}-${index}`} className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 text-[13px] items-center">
                  <div><div className="text-bone">{optionLabel(config, index)}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{config.configuration_id || config.sellable_configuration_id || 'No id'}</div></div>
                  <div className="font-price text-gold-grad text-[20px]">{formatPrice(optionPrice(config), product.currency || 'EUR')}</div>
                  <div>{config.component_code ? <Chip>{config.component_code}</Chip> : <Chip tone="danger">Missing</Chip>}</div>
                  <div className="flex flex-wrap gap-1.5">{config.is_full_set ? <Chip tone="warning">Full set</Chip> : null}{config.is_bundle ? <Chip tone="warning">Bundle</Chip> : null}{config.needs_label_review ? <Chip tone="warning">Label</Chip> : null}</div>
                </div>)}
                {!configs.length ? <div className="p-4 text-[13px] text-[var(--bone-dim)]">No configurations returned.</div> : null}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  </main>;
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-1">{label}</div><div className="text-bone break-words">{value || '—'}</div></div>;
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-2">{label}</div><div className="text-bone text-[20px] leading-none">{value}</div></div>;
}

function Blocker({ label, active, detail }) {
  return <div className={`rounded-xl border p-4 ${active ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.10)] bg-black/15'}`}><div className="eyebrow-dim mb-2">{label}</div><div className={active ? 'text-[var(--gold-warm)]' : 'text-[var(--bone-dim)]'}>{active ? `Needs work${detail ? ` · ${detail}` : ''}` : 'OK'}</div></div>;
}
