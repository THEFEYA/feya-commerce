// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, Layers3, ShieldAlert, Sparkles, UploadCloud } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V1, mainRegularPrice, productSlug, productTitle } from '@/lib/storefront';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PILOT_PRODUCT_SELECT = [
  'canonical_product_id',
  'product_slug',
  'matched_etsy_listing_id',
  'source_url',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'size_mode',
  'production_profile',
  'shipping_profile',
  'handmade_flag',
  'styled_imagery_flag',
  'primary_image_url',
  'primary_image_alt',
  'min_price',
  'max_price',
  'currency',
  'has_fallback_price',
  'has_sampler_excluded_price',
  'public_configuration_count',
  'public_price_row_count',
  'storefront_candidate_flag',
].join(',');

const KEYWORD_SELECT = 'keyword,keyword_norm,priority_tier,queue_suggested_page_level,queue_keyword_axis,queue_keyword_pattern,validation_status,cleanup_pipeline_status,should_validate_api,should_hold,warning_flags';

const EMERGENCY_PILOT_PRODUCT = {
  canonical_product_id: '4511817111',
  product_slug: 'gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111',
  matched_etsy_listing_id: '4511817111',
  card_title: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit',
  h1: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit',
  product_type: 'Armor',
  material: 'Fabric, Leather, Faux leather',
  color: 'Gold',
  primary_image_url: null,
  primary_image_alt: 'Gold futuristic armor set with choker collar, shoulder armor and arm bracers',
  min_price: 79,
  max_price: 308,
  currency: 'EUR',
  storefront_candidate_flag: true,
};

async function loadProducts(supabase) {
  const result = await supabase
    .from(STOREFRONT_VIEW_V1)
    .select(PILOT_PRODUCT_SELECT)
    .limit(24);

  return { rows: result.data || [], error: result.error?.message || null };
}

async function loadKeywordFirstWave(supabase) {
  const result = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select(KEYWORD_SELECT)
    .eq('priority_tier', 'tier_1')
    .limit(80);

  return { rows: result.data || [], error: result.error?.message || null };
}

function productScore(product) {
  let score = 0;
  const title = productTitle(product).toLowerCase();
  if (product.primary_image_url) score += 25;
  if (productSlug(product)) score += 20;
  if (mainRegularPrice(product)) score += 20;
  if (product.product_type || product.card_title) score += 15;
  if (/armor|festival|stage|rave|burning|corset|harness/i.test(title)) score += 20;
  return score;
}

function pickPilotProduct(products) {
  const usable = products.filter((product) => productSlug(product) && productTitle(product));
  return usable.sort((a, b) => productScore(b) - productScore(a))[0] || null;
}

async function loadPilotData() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: EMERGENCY_PILOT_PRODUCT, keywords: [], error: getMissingSupabaseEnvMessage(), productError: null, keywordError: null, fallbackUsed: true };

  const productsResult = await loadProducts(supabase);
  const pickedProduct = pickPilotProduct(productsResult.rows);
  const product = pickedProduct || EMERGENCY_PILOT_PRODUCT;
  const fallbackUsed = !pickedProduct;

  let keywordsResult = { rows: [], error: null };
  try {
    keywordsResult = await loadKeywordFirstWave(supabase);
  } catch (err) {
    keywordsResult = { rows: [], error: err instanceof Error ? err.message : 'keyword query failed' };
  }

  return {
    product,
    keywords: keywordsResult.rows,
    error: productsResult.error || null,
    productError: productsResult.error,
    keywordError: keywordsResult.error,
    fallbackUsed,
  };
}

function statusLabel(status) {
  const labels = {
    pass: 'готово',
    warning: 'проверить',
    blocker: 'блокер',
    blocked: 'заблокировано',
    needs_metric_validation: 'нужны метрики',
    needs_metrics: 'нужны метрики',
    ready_for_human_draft_preview: 'готово к черновику',
    tier_1: 'приоритет 1',
    tier_2: 'приоритет 2',
    queued: 'в очереди',
    validated: 'метрики подтверждены',
    preview_only: 'только предпросмотр',
    no_writes: 'без записи в базу',
  };
  return labels[String(status || '').toLowerCase()] || status || 'нет данных';
}

function strategyLabel(bucket) {
  const labels = {
    component_exact: 'деталь товара',
    style_event: 'стиль / событие',
    material_color: 'цвет / материал',
    rejected_mismatch: 'не подходит',
  };
  return labels[bucket] || 'стратегия не определена';
}

function sourceLabel(source) {
  const labels = {
    product_fact: 'факт товара',
    strategy_seed: 'гипотеза',
    queue_match: 'из очереди',
  };
  return labels[source] || 'источник';
}

function toneClass(status) {
  if (status === 'pass' || status === 'ready_for_human_draft_preview' || status === 'component_exact') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]';
  if (status === 'blocker' || status === 'blocked' || status === 'rejected_mismatch') return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]';
  return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
}

function Chip({ children, status = 'warning', compact = false }) {
  return <span className={`inline-flex rounded-full border ${compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} uppercase tracking-[0.14em] ${toneClass(status)}`}>{children}</span>;
}

function Panel({ title, children, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div>
    <div className="p-4">{children}</div>
  </div>;
}

function StatusStrip({ error, keywordError, fallbackUsed }) {
  if (!error && !keywordError && !fallbackUsed) return null;
  return <div className="grid md:grid-cols-3 gap-2 mb-5">
    <div className={`rounded-xl border px-3 py-2 text-[12px] ${error ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] text-[var(--bone-dim)]' : 'border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] text-[#a9dfbd]'}`}>Товар: {error ? 'предупреждение по базе' : 'загружен'}</div>
    <div className={`rounded-xl border px-3 py-2 text-[12px] ${keywordError ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] text-[var(--bone-dim)]' : 'border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] text-[#a9dfbd]'}`}>Ключи: {keywordError ? 'требуют лёгкой догрузки' : 'первая волна загружена'}</div>
    <div className={`rounded-xl border px-3 py-2 text-[12px] ${fallbackUsed ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] text-[var(--bone-dim)]' : 'border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] text-[#a9dfbd]'}`}>Режим: {fallbackUsed ? 'защитный образец' : 'живые данные'}</div>
  </div>;
}

function MetricPackageTable({ rows }) {
  return <div className="max-h-[420px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]">
    <div className="grid grid-cols-[1fr_145px_190px_110px] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10">
      <div>Фраза</div><div>Корзина</div><div>Куда проверять</div><div>Статус</div>
    </div>
    <div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.map((row, index) => <div key={`${row.bucketId}-${row.phrase}-${index}`} className="grid grid-cols-[1fr_145px_190px_110px] gap-3 px-3 py-2 text-[11px] leading-relaxed">
      <div><div className="text-bone text-[12px]">{row.phrase}</div><div className="mt-0.5 text-[10px] text-[var(--smoke)]">{sourceLabel(row.source)} · {row.reason}</div></div>
      <div className="text-[var(--bone-dim)]">{row.bucketLabel}</div>
      <div className="text-[var(--bone-dim)]">{row.suggestedPlacement}</div>
      <div><Chip status="warning" compact>{statusLabel(row.status)}</Chip></div>
    </div>)}</div>
  </div>;
}

export default async function SeoEngineBriefsPage() {
  const { product, keywords, error, keywordError, fallbackUsed } = await loadPilotData();
  const brief = product ? buildSeoPilotBrief(product, keywords) : null;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · первый бриф</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,60px)' }}>Первый SEO-бриф</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Контрольный экран перед созданием SEO-черновика: система сама выбирает товар, проверяет факты, подтягивает первую волну ключей и показывает, что мешает двигаться дальше. Записи в базу и публикации нет.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin/seo" className="btn-ghost">Готовность SEO <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine" className="btn-ghost">SEO-система <ArrowUpRight size={13} /></Link></div>
      </div>

      <StatusStrip error={error} keywordError={keywordError} fallbackUsed={fallbackUsed} />

      {!brief ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">Не удалось собрать первый бриф: нет товара.</div> : null}

      {brief ? <>
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 mb-5">
          <Panel title="Товар для проверки" icon={FileText}>
            <div className="grid md:grid-cols-[112px_1fr] gap-4 items-start">
              <div className="relative h-32 rounded-xl overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">нет фото</div>}</div>
              <div>
                <h2 className="text-bone text-[18px] leading-tight">{brief.productTitle}</h2>
                <div className="mt-2 text-[11px] text-[var(--bone-dim)] flex flex-wrap items-center gap-2">
                  <span>Адрес товара: /{brief.productSlug}</span>
                  <Link href={`/shop/${brief.productSlug}`} className="text-[var(--gold-warm)] hover:text-white transition-colors inline-flex items-center gap-1">открыть товар <ArrowUpRight size={11} /></Link>
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-2">{brief.productFacts.map((fact) => <div key={fact.label} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5"><div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{fact.label}</div><div className="text-[12px] text-bone leading-snug">{fact.value}</div></div>)}</div>
              </div>
            </div>
          </Panel>

          <Panel title="Решение системы" icon={brief.status === 'blocked' ? ShieldAlert : CheckCircle2}>
            <div className="flex flex-wrap gap-1.5 mb-3"><Chip status={brief.status} compact>{statusLabel(brief.status)}</Chip><Chip status="warning" compact>только предпросмотр</Chip><Chip status="warning" compact>без записи в базу</Chip></div>
            <p className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{brief.status === 'blocked' ? 'Пока нельзя делать SEO-черновик: сначала закрыть блокеры ниже.' : 'Можно готовить черновик для ручной проверки, но публиковать ещё нельзя.'}</p>
          </Panel>
        </div>

        <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-5 mb-5">
          <Panel title="Проверки качества" icon={ShieldAlert}>
            <div className="space-y-2">{brief.blockerChecks.map((check) => <div key={check.label} className="grid grid-cols-[118px_84px_1fr] gap-2 items-center rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-2.5"><div className="text-bone text-[12px]">{check.label}</div><Chip status={check.status} compact>{statusLabel(check.status)}</Chip><div className="text-[11px] leading-relaxed text-[var(--bone-dim)]">{check.note}</div></div>)}</div>
          </Panel>

          <Panel title="Релевантные ключи из очереди" icon={UploadCloud}>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{brief.candidateKeywords.length ? brief.candidateKeywords.map((keyword, index) => <div key={`${keyword.keyword_norm || keyword.keyword}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5"><div className="flex items-start justify-between gap-2"><div className="text-bone text-[13px] leading-snug">{keyword.keyword || keyword.keyword_norm}</div><div className="text-[10px] text-[var(--gold-warm)]">{keyword.pilot_relevance_score || 0}</div></div><div className="mt-1.5 text-[10px] leading-relaxed text-[var(--bone-dim)]">{strategyLabel(keyword.pilot_strategy_bucket)} · {statusLabel(keyword.validation_status)}{keyword.should_validate_api ? ' · нужны метрики' : ''}</div><div className="mt-1 text-[10px] leading-relaxed text-[var(--smoke)]">{keyword.pilot_relevance_reason}</div></div>) : <div className="text-[12px] text-[var(--bone-dim)]">В текущей очереди нет достаточно точных ключей для этого товара. Ниже система показывает семантическую карту для расширения.</div>}</div>
          </Panel>
        </div>

        <Panel title="Семантическая карта для проверки метрик" icon={Layers3}>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{brief.semanticBuckets.map((bucket) => <div key={bucket.id} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-bone text-[14px] leading-snug">{bucket.label}</div><div className="mt-1 text-[10px] leading-relaxed text-[var(--smoke)]">{bucket.purpose}</div></div><div className="text-[10px] text-[var(--gold-warm)]">{bucket.items.length}</div></div><div className="mt-3 space-y-2">{bucket.items.slice(0, 6).map((item) => <div key={`${bucket.id}-${item.phrase}`} className="rounded-lg border border-[rgba(216,214,211,.08)] bg-black/20 p-2"><div className="text-[12px] text-bone leading-snug">{item.phrase}</div><div className="mt-1 text-[10px] leading-relaxed text-[var(--bone-dim)]">{sourceLabel(item.source)} · нужны метрики</div><div className="mt-1 text-[10px] leading-relaxed text-[var(--smoke)]">{item.reason}</div></div>)}</div></div>)}</div>
          <div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Эти фразы не считаются финальными ключами. Это карта для следующего шага: отправить релевантные группы на Google Ads / CSV / eRank / DataForSEO, получить частотность, конкуренцию, сезонность и затем выбрать стратегию текста.</div>
        </Panel>

        <div className="mt-5">
          <Panel title={`Пакет на проверку метрик · ${brief.metricValidationPackage.length} фраз`} icon={UploadCloud}>
            <MetricPackageTable rows={brief.metricValidationPackage} />
            <div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Это read-only пакет. Он не пишет данные в Supabase и не считается финальным SEO-ядром. Следующий инженерный шаг — привязать такой пакет к Google Ads dry-run / CSV export / eRank/DataForSEO import и вернуть реальные метрики для scoring.</div>
          </Panel>
        </div>

        <div className="mt-5">
          <Panel title="Предпросмотр SEO-черновика" icon={Sparkles}>
            <div className="grid lg:grid-cols-[.85fr_1fr] gap-5">
              <div className="space-y-3">
                <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">SEO-заголовок</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-bone text-[13px] leading-relaxed">{brief.draftPreview.seoTitle}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">Главный заголовок H1</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-bone text-[13px] leading-relaxed">{brief.draftPreview.h1}</div></div>
                <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">Описание для Google</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-bone text-[13px] leading-relaxed">{brief.draftPreview.metaDescription}</div></div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">Черновой текст и тезисы</div>
                <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]"><p>{brief.draftPreview.intro}</p><ul className="mt-3 space-y-1.5 list-disc pl-5">{brief.draftPreview.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>
              </div>
            </div>
          </Panel>
        </div>
      </> : null}
    </section>
  </main>;
}
