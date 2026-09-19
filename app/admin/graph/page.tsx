// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Blocks, CheckCircle2, CircleDot, Layers3, Palette, Shirt, Sparkles, TriangleAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionCandidates, summarizeSeoGraph, type SeoCollectionCandidate } from '@/lib/seo-product-graph';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(250);

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

function axisIcon(axis: SeoCollectionCandidate['axis']) {
  if (axis === 'piece') return Shirt;
  if (axis === 'occasion') return CircleDot;
  if (axis === 'style') return Sparkles;
  if (axis === 'color') return Palette;
  return Blocks;
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
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function SeoProductGraphPage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const candidates = buildSeoCollectionCandidates(products, reviewEvents);
  const summary = summarizeSeoGraph(candidates);
  const visibleCandidates = candidates.slice(0, 80);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · SEO Product Graph</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Product graph</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only SEO collection candidate layer for Shop by Piece, Occasion, Style, Color and Material. No public collection pages or feeds are generated here.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/launch" className="btn-ghost">Launch pipeline <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Metric icon={Layers3} label="Candidates" value={summary.total || 0} note="Internal SEO collection candidates." />
        <Metric icon={Shirt} label="Piece" value={summary.piece || 0} note="Shop by Piece groups." />
        <Metric icon={Sparkles} label="Style" value={summary.style || 0} note="Style/aesthetic groups." />
        <Metric icon={CheckCircle2} label="Feed-ready" value={summary.readyForFeed || 0} note="Has at least one feed-ready product." tone="success" />
        <Metric icon={TriangleAlert} label="With blockers" value={summary.blocked || 0} note="Contains blocked products." tone="danger" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCandidates.map((candidate) => {
          const Icon = axisIcon(candidate.axis);
          return <article key={candidate.key} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 eyebrow-gold mb-2"><Icon size={14} /> {candidate.axis}</div>
                <div className="text-bone text-[18px] leading-tight">{candidate.label}</div>
                <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Future URL: {candidate.href}</div>
              </div>
              <Chip>{candidate.productCount} products</Chip>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">SEO</div><div className="font-price text-bone text-[18px]">{candidate.canPrepareSeoCount}</div></div>
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Feed</div><div className="font-price text-bone text-[18px]">{candidate.readyForFeedCount}</div></div>
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Blocked</div><div className="font-price text-bone text-[18px]">{candidate.blockedCount}</div></div>
            </div>

            <div className="space-y-2">
              {candidate.sampleProducts.map((product) => <Link key={`${candidate.key}-${product.slug}`} href={`/admin/products/${product.slug}`} className="grid grid-cols-[42px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-2 hover:border-[rgba(212,178,106,.36)] transition-colors">
                <div className="relative h-12 w-10 rounded-md overflow-hidden bg-black/30">{product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                <div>
                  <div className="text-bone text-[12px] leading-snug line-clamp-1">{product.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1"><Chip tone={product.launchStage === 'Blocked' ? 'danger' : product.launchStage === 'Can Prepare Feed' ? 'success' : 'warning'}>{product.launchStage}</Chip></div>
                </div>
              </Link>)}
            </div>
          </article>;
        })}
      </div>
    </section>
  </main>;
}
