// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Sparkles, UploadCloud } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_VIEW_V1, mainRegularPrice, productSlug, productTitle } from '@/lib/storefront';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    .select(STOREFRONT_CARD_SELECT)
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
  const product = pickPilotProduct(productsResult.rows) || EMERGENCY_PILOT_PRODUCT;
  const fallbackUsed = !pickPilotProduct(productsResult.rows);

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

function toneClass(status) {
  if (status === 'pass') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]';
  if (status === 'blocker') return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]';
  return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
}

function Chip({ children, status = 'warning' }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${toneClass(status)}`}>{children}</span>;
}

function Panel({ title, children, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold mb-1">{title}</div></div>{Icon ? <Icon size={17} className="text-[var(--gold-warm)]" /> : null}</div>
    <div className="p-5">{children}</div>
  </div>;
}

export default async function SeoEngineBriefsPage() {
  const { product, keywords, error, keywordError, fallbackUsed } = await loadPilotData();
  const brief = product ? buildSeoPilotBrief(product, keywords) : null;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO Engine · Pilot</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Первый SEO-бриф</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Контролируемый read-only pilot: товар выбирается автоматически по качеству данных, ключи берутся лёгкой первой волной. Ничего не записывается в Supabase и ничего не публикуется.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin/seo" className="btn-ghost">SEO readiness <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine" className="btn-ghost">SEO Engine <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-7">Storefront query warning: {error}</div> : null}
      {keywordError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-7">Keyword query warning: {keywordError}. Pilot продолжает работу по товару; ключи будут догружены следующим лёгким слоем.</div> : null}
      {fallbackUsed ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-7">Включён аварийный выбор товара из подтверждённого storefront sample. Это временная защита от timeout, не публикация.</div> : null}
      {!brief ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">Не удалось собрать pilot: нет товара.</div> : null}

      {brief ? <>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 mb-6">
          <Panel title="Товар для пилота" icon={FileText}>
            <div className="grid md:grid-cols-[130px_1fr] gap-5 items-start">
              <div className="relative h-40 rounded-xl overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[11px] uppercase tracking-[0.18em] text-[var(--smoke)]">no image</div>}</div>
              <div>
                <h2 className="text-bone text-[22px] leading-tight">{brief.productTitle}</h2>
                <div className="mt-3 text-[12px] text-[var(--bone-dim)]">/{brief.productSlug}</div>
                <div className="mt-5 grid sm:grid-cols-2 gap-3">{brief.productFacts.map((fact) => <div key={fact.label} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-1">{fact.label}</div><div className="text-[13px] text-bone">{fact.value}</div></div>)}</div>
              </div>
            </div>
          </Panel>

          <Panel title="Решение gate" icon={brief.status === 'blocked' ? ShieldAlert : CheckCircle2}>
            <div className="flex flex-wrap gap-2 mb-4"><Chip status={brief.status === 'blocked' ? 'blocker' : 'warning'}>{brief.status}</Chip><Chip status="warning">preview only</Chip><Chip status="warning">no DB writes</Chip></div>
            <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">{brief.decision}</p>
          </Panel>
        </div>

        <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-6 mb-6">
          <Panel title="Quality gate" icon={ShieldAlert}>
            <div className="space-y-3">{brief.blockerChecks.map((check) => <div key={check.label} className="grid grid-cols-[140px_auto_1fr] gap-3 items-center rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-3"><div className="text-bone text-[13px]">{check.label}</div><Chip status={check.status}>{check.status}</Chip><div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{check.note}</div></div>)}</div>
          </Panel>

          <Panel title="Tier-1 keyword candidates" icon={UploadCloud}>
            <div className="grid sm:grid-cols-2 gap-3">{brief.candidateKeywords.length ? brief.candidateKeywords.map((keyword, index) => <div key={`${keyword.keyword_norm || keyword.keyword}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-bone text-[14px] leading-snug">{keyword.keyword || keyword.keyword_norm}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip status="warning">{keyword.priority_tier || 'tier'}</Chip><Chip status="warning">{keyword.validation_status || 'queued'}</Chip>{keyword.should_validate_api ? <Chip status="warning">нужны метрики</Chip> : null}</div></div>) : <div className="text-[13px] text-[var(--bone-dim)]">Релевантные tier-1 ключи не найдены или keyword query временно не ответил. Это не блокирует выбор товара, но блокирует финальный scoring.</div>}</div>
          </Panel>
        </div>

        <Panel title="SEO draft preview" icon={Sparkles}>
          <div className="grid lg:grid-cols-[.8fr_1fr] gap-6">
            <div className="space-y-4">
              <div><div className="eyebrow-dim mb-2">SEO title</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-bone text-[15px] leading-relaxed">{brief.draftPreview.seoTitle}</div></div>
              <div><div className="eyebrow-dim mb-2">H1</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-bone text-[15px] leading-relaxed">{brief.draftPreview.h1}</div></div>
              <div><div className="eyebrow-dim mb-2">Meta description</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-bone text-[15px] leading-relaxed">{brief.draftPreview.metaDescription}</div></div>
            </div>
            <div>
              <div className="eyebrow-dim mb-2">Intro / bullets</div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] leading-relaxed text-[var(--bone-dim)]"><p>{brief.draftPreview.intro}</p><ul className="mt-4 space-y-2 list-disc pl-5">{brief.draftPreview.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>
            </div>
          </div>
        </Panel>
      </> : null}
    </section>
  </main>;
}
