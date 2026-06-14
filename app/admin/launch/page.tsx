// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileSearch, Rocket, ShieldAlert, Sparkles } from 'lucide-react';
import { getLaunchStage, type LaunchStageLabel } from '@/lib/admin-pipeline';
import { getProductEvents, getProductFlags, getProductReadiness, type AdminReviewEvent } from '@/lib/admin-readiness';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const LIMIT = 250;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(LIMIT);

  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function LaunchPipelinePage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const rows = products.map((product) => {
    const readiness = getProductReadiness(product, getProductEvents(product, reviewEvents));
    const stage = getLaunchStage(readiness);
    const flags = getProductFlags(product);
    return { product, readiness, stage, flags };
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.stage.label] = (acc[row.stage.label] || 0) + 1;
    return acc;
  }, {} as Record<LaunchStageLabel, number>);

  const priorityRows = rows
    .sort((a, b) => {
      const order: Record<LaunchStageLabel, number> = { 'Blocked': 0, 'Needs Review': 1, 'Can Prepare SEO': 2, 'Can Prepare Feed': 3, 'Ready for Future Payment': 4 };
      return order[a.stage.label] - order[b.stage.label];
    })
    .slice(0, 120);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Launch Pipeline</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Launch pipeline</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Operational launch layer from shared pipeline logic. This prepares SEO/feed/publish decisions while payment remains intentionally off.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Metric icon={ShieldAlert} label="Blocked" value={counts.Blocked || 0} note="Needs-fix event exists." tone="danger" />
        <Metric icon={FileSearch} label="Needs Review" value={counts['Needs Review'] || 0} note="Data or admin review is open." tone="warning" />
        <Metric icon={Sparkles} label="Can Prepare SEO" value={counts['Can Prepare SEO'] || 0} note="Operational checks closed; SEO next." />
        <Metric icon={CheckCircle2} label="Can Prepare Feed" value={counts['Can Prepare Feed'] || 0} note="Safe candidate for feed prep." tone="success" />
        <Metric icon={Rocket} label="Products" value={rows.length} note="Current v4 slice." />
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[76px_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Image</div><div>Product</div><div>Launch stage</div><div>Readiness</div><div>Open flags</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {priorityRows.map(({ product, readiness, stage, flags }) => {
            const slug = productSlug(product);
            return <Link key={product.canonical_product_id || slug} href={`/admin/products/${slug}`} className="grid grid-cols-[76px_1.5fr_1fr_1fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors">
              <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
              <div><div className="text-bone text-[15px] leading-snug line-clamp-2">{productTitle(product)}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div></div>
              <div><Chip tone={stage.tone}>{stage.label}</Chip><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{stage.note}</div></div>
              <div><Chip tone={readiness.tone}>{readiness.label}</Chip></div>
              <div className="flex flex-wrap gap-1.5">
                {flags.labelReview ? <Chip tone="warning">Label</Chip> : null}
                {flags.priceReview ? <Chip tone="warning">Price</Chip> : null}
                {flags.missingComponent ? <Chip tone="danger">Component {flags.missingComponent}</Chip> : null}
                {flags.mediaReview ? <Chip tone="danger">Media</Chip> : null}
                {!flags.labelReview && !flags.priceReview && !flags.missingComponent && !flags.mediaReview ? <Chip>OK</Chip> : null}
              </div>
            </Link>;
          })}
        </div>
      </div>
    </section>
  </main>;
}
