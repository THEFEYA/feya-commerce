// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoScores, summarizeSeoScores, type SeoScoreStage } from '@/lib/seo-scoring';
import type { StorefrontProduct } from '@/lib/types';
import { seoScoreStageLabel } from '@/lib/adminDisplayRu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_LAB_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };
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

export default async function SeoLabPage() {
  const { products, error } = await loadProducts();
  const scores = buildSeoScores(products);
  const summary = summarizeSeoScores(scores);
  const visibleScores = scores.slice(0, 140);
  const avgScore = summary.total ? Math.round(summary.avgScore / summary.total) : 0;

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · диагностика правил</div>
          <h1>SEO-лаборатория</h1>
          <p>Внутренняя проверка полноты SEO-данных по товарам. Оценка ниже — это результат наших правил качества, а не позиция в Google и не прогноз трафика.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/indexation" className="owner-button">Индексация <ArrowUpRight size={13} /></Link>
          <Link href="/admin/content" className="owner-button">Контент <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="owner-card is-danger" style={{ marginBottom: '18px' }}><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

      <section className="owner-section" style={{ marginTop: 0 }}>
        <div className="owner-summary-strip">
          <div className="owner-summary-cell"><strong>{summary.Blocked || 0}</strong><span>Заблокировано</span></div>
          <div className="owner-summary-cell"><strong>{summary['Needs Content'] || 0}</strong><span>Нужен контент</span></div>
          <div className="owner-summary-cell"><strong>{summary['Needs Media'] || 0}</strong><span>Нужны медиа</span></div>
          <div className="owner-summary-cell"><strong>{summary['Ready for Review'] || 0}</strong><span>Готово к проверке</span></div>
        </div>
        <div className="owner-card is-info" style={{ marginTop: '10px' }}>
          <div className="owner-status is-info">Внутренняя оценка правил</div>
          <p className="owner-card-copy">Среднее значение по текущему набору: {avgScore}. Используем его только для внутренней диагностики полноты и качества, не как SEO-рейтинг страницы.</p>
        </div>
      </section>
      <section className="owner-section">
        <div className="owner-section-head"><div><h2>Товары</h2><div className="owner-section-kicker">Показано {visibleScores.length} из {scores.length}; сначала диагностический список, без автоматических изменений.</div></div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="sticky top-[64px] z-10 grid grid-cols-[1.4fr_.85fr_.65fr_1.25fr_1fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]"><div>Товар</div><div>Этап</div><div>Оценка</div><div>Состав оценки</div><div>Действие</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{visibleScores.map((score) => <Link key={score.productSlug} href={`/admin/seo-lab/${score.productSlug}`} className="grid grid-cols-[1.4fr_.85fr_.65fr_1.25fr_1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors"><div><div className="text-bone text-[15px] leading-snug line-clamp-2">{score.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{score.productSlug}</div></div><div><Chip tone={toneForStage(score.stage)}>{seoScoreStageLabel(score.stage)}</Chip></div><div className="font-price text-gold-grad text-[30px] leading-none">{score.overallScore}</div><div className="flex flex-wrap gap-1.5"><Chip>заголовок {score.titleScore}</Chip><Chip>meta {score.metaScore}</Chip><Chip>контент {score.contentScore}</Chip><Chip>медиа {score.mediaScore}</Chip><Chip>schema {score.structuredDataScore}</Chip></div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]"><Layers3 size={12} /> Открыть оценку</div></Link>)}</div></div>
      </section>
    </div>
  </main>;
}
