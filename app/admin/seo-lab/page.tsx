// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, BarChart3, FileSearch, FileText, ImageIcon, Layers3, ShieldAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoScores, summarizeSeoScores, type SeoScoreStage } from '@/lib/seo-scoring';
import type { StorefrontProduct } from '@/lib/types';
import { seoScoreStageLabel } from '@/lib/adminDisplayRu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_LAB_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SEO_LAB_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function toneForStage(stage: SeoScoreStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Ready for Review' || stage === 'Ready for Draft') return 'success';
  return 'warning';
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

export default async function SeoLabPage() {
  const { products, error } = await loadProducts();
  const scores = buildSeoScores(products);
  const summary = summarizeSeoScores(scores);
  const visibleScores = scores.slice(0, 140);
  const avgScore = summary.total ? Math.round(summary.avgScore / summary.total) : 0;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · SEO-лаборатория</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Оценка SEO</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Базовая оценка SEO для товаров-кандидатов витрины. Она служит основой для правил, шаблонов, исследований, API-сигналов и рекомендаций, которые требуют подтверждения.</p></div><div className="flex gap-3"><Link href="/admin/indexation" className="btn-ghost">Индексация <ArrowUpRight size={13} /></Link><Link href="/admin/content" className="btn-ghost">Контент <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><Metric icon={BarChart3} label="Средняя оценка" value={avgScore} note="Средняя SEO-оценка товаров." /><Metric icon={ShieldAlert} label="Заблокировано" value={summary.Blocked || 0} note="Не хватает обязательных SEO-данных." tone="danger" /><Metric icon={FileText} label="Нужен контент" value={summary['Needs Content'] || 0} note="Нужно доработать описание или meta description." tone="warning" /><Metric icon={ImageIcon} label="Нужны медиа" value={summary['Needs Media'] || 0} note="Нужно доработать SEO изображений." tone="warning" /><Metric icon={FileSearch} label="Готово к проверке" value={summary['Ready for Review'] || 0} note="Готово к финальной SEO-проверке." tone="success" /></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.4fr_.85fr_.65fr_1.25fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Товар</div><div>Этап</div><div>Оценка</div><div>Состав оценки</div><div>Действие</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{visibleScores.map((score) => <Link key={score.productSlug} href={`/admin/seo-lab/${score.productSlug}`} className="grid grid-cols-[1.4fr_.85fr_.65fr_1.25fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors"><div><div className="text-bone text-[15px] leading-snug line-clamp-2">{score.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{score.productSlug}</div></div><div><Chip tone={toneForStage(score.stage)}>{seoScoreStageLabel(score.stage)}</Chip></div><div className="font-price text-gold-grad text-[30px] leading-none">{score.overallScore}</div><div className="flex flex-wrap gap-1.5"><Chip>заголовок {score.titleScore}</Chip><Chip>meta {score.metaScore}</Chip><Chip>контент {score.contentScore}</Chip><Chip>медиа {score.mediaScore}</Chip><Chip>schema {score.structuredDataScore}</Chip></div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]"><Layers3 size={12} /> Открыть оценку</div></Link>)}</div></div>
  </section></main>;
}
