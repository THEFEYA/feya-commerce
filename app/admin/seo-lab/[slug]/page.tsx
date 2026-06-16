// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, BarChart3, CheckCircle2, FileSearch, FileText, ImageIcon, Layers3, ShieldAlert } from 'lucide-react';
import { AdminGenerateKeywordCandidatesButton } from '@/components/AdminGenerateKeywordCandidatesButton';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { productSlug, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoDraftSuggestion } from '@/lib/seo-draft-suggestions';
import { buildRuleBasedKeywordCandidates } from '@/lib/seo-keyword-candidates';
import { buildSeoScores, type SeoScoreStage } from '@/lib/seo-scoring';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_LAB_DETAIL_PRODUCTS_LIMIT = 500;

type PageProps = { params: Promise<{ slug: string }> };

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SEO_LAB_DETAIL_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function toneForStage(stage: SeoScoreStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Ready for Review' || stage === 'Ready for Draft') return 'success';
  return 'warning';
}

function scoreTone(value: number) {
  if (value >= 80) return 'success';
  if (value >= 55) return 'warning';
  return 'danger';
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
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

function DraftBlock({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-2">{label}</div><div className="text-[14px] leading-relaxed text-bone">{value}</div></div>;
}

export default async function SeoLabDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { products, error } = await loadProducts();
  const product = products.find((item) => productSlug(item) === slug);
  const score = buildSeoScores(products).find((item) => item.productSlug === slug);

  if (error || !score || !product) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'SEO score not found.'}</div><Link href="/admin/seo-lab" className="btn-ghost mt-5">Back to SEO Lab</Link></section></main>;
  }

  const draft = buildSeoDraftSuggestion(product);
  const keywordCandidates = buildRuleBasedKeywordCandidates(product).slice(0, 16);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Admin · SEO Lab Detail</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO score</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">{score.title}</p><div className="mt-4 flex flex-wrap gap-1.5"><Chip tone={toneForStage(score.stage)}>{score.stage}</Chip><Chip>score {score.overallScore}</Chip><Chip tone="warning">rule-based keyword seeds</Chip></div></div><div className="flex flex-wrap gap-3"><Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link><Link href={`/admin/products/${score.productSlug}`} className="btn-ghost">Product card <ArrowUpRight size={13} /></Link><Link href={`/admin/media-seo/${score.productSlug}`} className="btn-ghost">Media SEO <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine" className="btn-ghost">SEO Engine <ArrowUpRight size={13} /></Link></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"><Metric icon={BarChart3} label="Overall" value={score.overallScore} note="Current baseline score." tone={scoreTone(score.overallScore)} /><Metric icon={FileSearch} label="Title" value={score.titleScore} note="Title length and baseline quality." tone={scoreTone(score.titleScore)} /><Metric icon={FileText} label="Meta" value={score.metaScore} note="Meta description readiness." tone={scoreTone(score.metaScore)} /><Metric icon={FileText} label="Content" value={score.contentScore} note="Site-native description depth." tone={scoreTone(score.contentScore)} /><Metric icon={ImageIcon} label="Media" value={score.mediaScore} note="Media SEO readiness." tone={scoreTone(score.mediaScore)} /><Metric icon={Layers3} label="Schema" value={score.structuredDataScore} note="Structured data input readiness." tone={scoreTone(score.structuredDataScore)} /></div>
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 mb-6"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-gold mb-4">Recommended actions</div><div className="space-y-2">{score.notes.length ? score.notes.map((note, index) => <div key={index} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{note}</div>) : <div className="rounded-xl border border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] p-3 text-[13px] leading-relaxed text-[#a9dfbd]">No open baseline SEO actions.</div>}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-5"><div className="eyebrow-gold mb-4">Next links</div><div className="space-y-2"><Link href="/admin/seo-engine" className="btn-ghost w-full justify-between">SEO Engine <Layers3 size={13} /></Link><Link href="/admin/indexation" className="btn-ghost w-full justify-between">Indexation <CheckCircle2 size={13} /></Link><Link href="/admin/content" className="btn-ghost w-full justify-between">Content Pipeline <FileText size={13} /></Link><Link href="/admin/collections" className="btn-ghost w-full justify-between">Collections <Layers3 size={13} /></Link><Link href="/admin/launch" className="btn-ghost w-full justify-between">Launch Pipeline <ShieldAlert size={13} /></Link></div></div></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5"><div><div className="eyebrow-gold mb-2">Rule-based keyword candidates</div><div className="text-[13px] leading-relaxed text-[var(--bone-dim)]">First Product DNA seed layer. External keyword metrics are not connected yet; these candidates are used as controlled seeds for the SEO Engine.</div></div><div className="flex flex-col gap-2 lg:min-w-[230px]"><Chip>no external API</Chip><AdminGenerateKeywordCandidatesButton productSlug={slug} /></div></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{keywordCandidates.map((item) => <div key={`${item.bucket}-${item.keyword}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-bone text-[14px] leading-snug">{item.keyword}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip tone={item.is_excluded ? 'danger' : 'neutral'}>{item.bucket}</Chip><Chip tone="success">{item.final_score}</Chip></div><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{item.placement}</div></div>)}</div></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5"><div><div className="eyebrow-gold mb-2">Draft suggestions</div><div className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Rule-based drafts only. Nothing is published and no product data is changed.</div></div><Chip>approval required</Chip></div><div className="grid lg:grid-cols-2 gap-4"><DraftBlock label="SEO title draft" value={draft.titleDraft} /><DraftBlock label="Meta description draft" value={draft.metaDescriptionDraft} /><DraftBlock label="H1 draft" value={draft.h1Draft} /><DraftBlock label="Primary image alt draft" value={draft.altTextDraft} /><DraftBlock label="Collection hint" value={draft.collectionHint} /><DraftBlock label="Product slug" value={draft.productSlug} /></div><div className="mt-5 grid lg:grid-cols-2 gap-4"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-3">Description outline</div><ol className="space-y-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">{draft.descriptionOutline.map((item, index) => <li key={index}>{index + 1}. {item}</li>)}</ol></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-3">Safety notes</div><ul className="space-y-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">{draft.safetyNotes.map((item, index) => <li key={index}>• {item}</li>)}</ul></div></div></div>
  </section></main>;
}
