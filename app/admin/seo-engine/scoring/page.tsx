// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, ShieldAlert, Upload } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_VIEW_V1, mainRegularPrice, productSlug, productTitle } from '@/lib/storefront';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { ScoringContractPanel } from '../briefs/ScoringContractPanel';
import { CsvScoringPreview } from './preview/CsvScoringPreview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PILOT_PRODUCT_SELECT = ['canonical_product_id','product_slug','matched_etsy_listing_id','card_title','h1','seo_title','meta_description','product_type','material','color','primary_image_url','min_price','max_price','currency','storefront_candidate_flag'].join(',');
const KEYWORD_SELECT = 'keyword,keyword_norm,priority_tier,validation_status,cleanup_pipeline_status,should_validate_api,should_hold,warning_flags';
const EMERGENCY_PILOT_PRODUCT = { canonical_product_id: '4511817111', product_slug: 'gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111', matched_etsy_listing_id: '4511817111', card_title: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit', h1: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit', product_type: 'Armor', material: 'Fabric, Leather, Faux leather', color: 'Gold', primary_image_url: null, min_price: 79, max_price: 308, currency: 'EUR', storefront_candidate_flag: true };

async function loadPilotData() {
  const supabase = getAdminReadClient();
  if (!supabase) return { product: EMERGENCY_PILOT_PRODUCT, keywords: [], warning: getMissingAdminDataEnvMessage(), fallbackUsed: true };
  const productsResult = await supabase.from(STOREFRONT_VIEW_V1).select(PILOT_PRODUCT_SELECT).limit(24);
  const products = productsResult.data || [];
  const product = products.filter((item) => productSlug(item) && productTitle(item)).sort((a, b) => {
    const score = (item) => Number(Boolean(item.primary_image_url)) * 25 + Number(Boolean(productSlug(item))) * 20 + Number(Boolean(mainRegularPrice(item))) * 20 + Number(/armor|festival|stage|rave|burning|corset|harness/i.test(productTitle(item))) * 20;
    return score(b) - score(a);
  })[0] || EMERGENCY_PILOT_PRODUCT;
  const keywordsResult = await supabase.from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1').select(KEYWORD_SELECT).eq('priority_tier', 'tier_1').limit(80);
  return { product, keywords: keywordsResult.data || [], warning: productsResult.error?.message || keywordsResult.error?.message || null, fallbackUsed: !products.length };
}

function Panel({ title, children, icon: Icon }) { return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div><div className="p-4">{children}</div></div>; }

export default async function SeoScoringContractPage() {
  const { product, keywords, warning, fallbackUsed } = await loadPilotData();
  const brief = buildSeoPilotBrief(product, keywords);
  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · ключевые слова</div>
          <h1>Оценка ключей</h1>
          <p>Проверяем импортированные метрики и объясняем роль каждого ключа. Этот экран ничего не публикует и не меняет Product Truth.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-engine/metric-import/validate" className="owner-button">Проверка CSV <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-engine/briefs" className="owner-button">SEO-бриф <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {warning || fallbackUsed ? <div className="owner-card is-warning" style={{ marginBottom: '18px' }}><div className="owner-status is-warning">Ограничение данных</div><p className="owner-card-copy">{warning || 'Включён защитный образец товара.'}</p></div> : null}
    <section className="owner-section" style={{ marginTop: 0 }}><Panel title="Загрузить CSV для оценки" icon={Upload}><CsvScoringPreview /></Panel></section>
    <section className="owner-section"><div className="grid lg:grid-cols-[1fr_320px] gap-5"><Panel title="Товар для расчётной модели"><div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">Адрес товара: /{brief.productSlug}</div><div className="mt-4 grid sm:grid-cols-2 gap-2">{brief.productFacts.map((fact) => <div key={fact.label} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5"><div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{fact.label}</div><div className="text-[12px] text-bone leading-snug">{fact.value}</div></div>)}</div></Panel><Panel title="Статус расчёта" icon={ShieldAlert}><div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">Это предварительная оценка: она показывает роли ключей, но ещё не сохраняет результат в Supabase.</div><div className="mt-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] text-[var(--bone-dim)]">Фраз в исходном пакете товара: <span className="text-bone">{brief.metricValidationPackage.length}</span></div></Panel></div></section>
    <section className="owner-section"><Panel title="Правила оценки ключей" icon={ShieldAlert}><ScoringContractPanel contract={brief.scoringContract} /></Panel></section>
    </div>
  </main>;
}
