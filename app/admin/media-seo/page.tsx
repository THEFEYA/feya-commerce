// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileImage, ImageIcon, RefreshCw, Scaling } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildMediaSeoPlans, summarizeMediaSeoPlans, type MediaSeoStage } from '@/lib/media-seo';
import type { StorefrontProduct } from '@/lib/types';
import { mediaSeoStageLabel } from '@/lib/adminDisplayRu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MEDIA_SEO_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(MEDIA_SEO_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function toneForStage(stage: MediaSeoStage) {
  if (stage === 'Blocked') return 'danger';
  if (stage === 'Ready for Image Sitemap') return 'success';
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
  const toneClass = tone === 'warning'
    ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

export default async function MediaSeoPipelinePage() {
  const { products, error } = await loadProducts();
  const plans = buildMediaSeoPlans(products);
  const summary = summarizeMediaSeoPlans(plans);
  const visiblePlans = plans.slice(0, 140);

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · SEO изображений</div>
          <h1>SEO изображений</h1>
          <p>Проверяем имена файлов, ALT, необходимость веб-экспорта и готовность изображений к sitemap. Рекомендации здесь не меняют исходные медиа автоматически.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/media" className="owner-button">Проверка медиа <ArrowUpRight size={13} /></Link>
          <Link href="/admin/collections" className="owner-button">Коллекции <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}
    <section className="owner-section" style={{ marginTop: 0 }}>
      <div className="owner-summary-strip">
        <div className="owner-summary-cell"><strong>{summary.exportRequired || 0}</strong><span>Нужен контролируемый экспорт</span></div>
        <div className="owner-summary-cell"><strong>{summary.resizeRecommended || 0}</strong><span>Нужно изменить размер / формат</span></div>
        <div className="owner-summary-cell"><strong>{summary.imageSitemapEligible || 0}</strong><span>Готово для image sitemap</span></div>
        <div className="owner-summary-cell"><strong>{summary.pinterestExportEligible || 0}</strong><span>Готово для Pinterest</span></div>
      </div>
      <div className="owner-card is-info" style={{ marginTop: '10px' }}>
        <div className="owner-status is-info">Изображений в проверке: {summary.total || 0}</div>
        <p className="owner-card-copy">Готовность Pinterest и sitemap — это техническая готовность файла, а не прогноз трафика или продаж.</p>
      </div>
    </section>
    <section className="owner-section">
      <div className="owner-section-head"><div><h2>План изображений</h2><div className="owner-section-kicker">Показано {visiblePlans.length} из {plans.length} товаров.</div></div></div>
      <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="sticky top-[64px] z-10 grid grid-cols-[1.2fr_.8fr_1fr_1.2fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]"><div>Товар</div><div>Этап</div><div>Текущий файл</div><div>Рекомендуемый файл</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{visiblePlans.map((plan) => <Link key={plan.productSlug} href={`/admin/media-seo/${plan.productSlug}`} className="grid grid-cols-[1.2fr_.8fr_1fr_1.2fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors"><div><div className="text-bone text-[15px] leading-snug line-clamp-2">{plan.title}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{plan.productSlug}</div></div><div><Chip tone={toneForStage(plan.stage)}>{mediaSeoStageLabel(plan.stage)}</Chip></div><div className="text-[11px] leading-relaxed text-[var(--bone-dim)] break-all">{plan.currentFilename || 'Файл не найден'}</div><div className="text-[11px] leading-relaxed text-[var(--bone-dim)] break-all">{plan.suggestedFilename}</div></Link>)}</div></div>
    </section>
    </div>
  </main>;
}
