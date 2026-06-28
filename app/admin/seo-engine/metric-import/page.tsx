// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, DatabaseZap, ShieldAlert } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V1, productSlug, productTitle } from '@/lib/storefront';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoMetricImportContract } from '@/lib/seoMetricImportContract';
import { CsvMetricTemplateButton } from './CsvMetricTemplateButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRODUCT_SELECT = 'canonical_product_id,product_slug,matched_etsy_listing_id,card_title,h1,product_type,material,color,primary_image_url,min_price,max_price,currency,storefront_candidate_flag';
const KEYWORD_SELECT = 'keyword,keyword_norm,priority_tier,validation_status,cleanup_pipeline_status,should_validate_api,should_hold,warning_flags';
const FALLBACK_PRODUCT = { canonical_product_id: '4511817111', product_slug: 'gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111', matched_etsy_listing_id: '4511817111', card_title: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit', h1: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit', product_type: 'Armor', material: 'Fabric, Leather, Faux leather', color: 'Gold', primary_image_url: null, min_price: 79, max_price: 308, currency: 'EUR', storefront_candidate_flag: true };

function keyOf(product) { return String(product?.canonical_product_id || product?.matched_etsy_listing_id || productSlug(product) || ''); }
function isSelected(product, selected) { return selected && [product?.canonical_product_id, product?.matched_etsy_listing_id, productSlug(product)].filter(Boolean).map(String).includes(String(selected)); }
function queryFor(productId, q) { const params = new URLSearchParams(); if (productId) params.set('product', productId); if (q) params.set('q', q); const value = params.toString(); return value ? `?${value}` : ''; }
async function loadPilotData(selectedProductId) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: FALLBACK_PRODUCT, keywords: [], warning: getMissingSupabaseEnvMessage(), fallbackUsed: true };
  const productsResult = await supabase.from(STOREFRONT_VIEW_V1).select(PRODUCT_SELECT).limit(160);
  const products = (productsResult.data || []).filter((item) => productSlug(item) && productTitle(item));
  const product = products.find((item) => isSelected(item, selectedProductId)) || products[0] || FALLBACK_PRODUCT;
  const keywordsResult = await supabase.from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1').select(KEYWORD_SELECT).eq('priority_tier', 'tier_1').limit(80);
  return { product, keywords: keywordsResult.data || [], warning: productsResult.error?.message || keywordsResult.error?.message || null, fallbackUsed: !products.length };
}
function Panel({ title, children, icon: Icon }) { return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div><div className="p-4">{children}</div></div>; }
function Pill({ children, danger = false }) { return <span className={`rounded-full border px-2 py-1 text-[10px] ${danger ? 'border-[rgba(196,64,88,.30)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : 'border-[rgba(216,214,211,.10)] text-[var(--bone-dim)] bg-black/20'}`}>{children}</span>; }
function ColumnCard({ column }) { return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="flex items-start justify-between gap-2"><div className="text-bone text-[12px]">{column.label}</div>{column.required ? <Pill danger>обязательно</Pill> : <Pill>опционально</Pill>}</div><div className="mt-1 text-[10px] text-[var(--smoke)]">{column.key}</div><div className="mt-2 text-[10px] leading-relaxed text-[var(--bone-dim)]">{column.purpose}</div></div>; }

export default async function SeoMetricImportPage({ searchParams }) {
  const params = await searchParams;
  const selectedProductId = params?.product || '';
  const q = String(params?.q || '').trim();
  const { product, keywords, warning, fallbackUsed } = await loadPilotData(selectedProductId);
  const activeKey = keyOf(product);
  const query = queryFor(activeKey, q);
  const brief = buildSeoPilotBrief(product, keywords);
  const contract = buildSeoMetricImportContract(brief.metricValidationPackage.map((item) => item.phrase));

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-7 pb-12">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5"><div><div className="eyebrow-gold mb-2">Админка · SEO · импорт метрик</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>CSV метрики для выбранного товара</h1><p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Шаблон строится по товару, выбранному в Studio. Записи в Supabase нет: это ручной мост до Google Ads API / DataForSEO.</p></div><div className="flex flex-wrap gap-2"><CsvMetricTemplateButton candidates={brief.metricValidationPackage} /><Link href={`/admin/seo-engine/studio${query}`} className="btn-ghost">Назад в Studio <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/metric-import/validate" className="btn-ghost">Проверить CSV <ArrowUpRight size={13} /></Link></div></div>
    {warning || fallbackUsed ? <div className="mb-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-2 text-[12px] text-[var(--bone-dim)]">{warning || 'Включён защитный образец товара.'}</div> : null}
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-5"><Panel title="Выбранный товар" icon={DatabaseZap}><div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">ID: {activeKey} · Адрес товара: /{brief.productSlug}</div><div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">CSV содержит seed-фразы именно для этого товара. Поля метрик пустые, потому что их должен заполнить подтверждённый внешний источник.</div></Panel><Panel title="Готовность CSV" icon={ShieldAlert}><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] text-[var(--smoke)]">Фраз</div><div className="text-bone text-[20px]">{brief.metricValidationPackage.length}</div></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] text-[var(--smoke)]">Режим</div><div className="text-bone text-[13px]">без записи</div></div></div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Unique key позже: {contract.uniqueKey.join(' + ')}</div></Panel></div>
    <div className="grid lg:grid-cols-2 gap-5 mb-5"><Panel title="Источники метрик"><div className="grid sm:grid-cols-2 gap-3">{contract.sources.map((source) => <div key={source.id} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="flex items-start justify-between gap-2"><div className="text-bone text-[13px]">{source.label}</div><Pill>{source.trust}</Pill></div><div className="mt-2 text-[10px] leading-relaxed text-[var(--bone-dim)]">{source.role}</div><div className="mt-2"><Pill danger={!source.allowedForScoring}>{source.allowedForScoring ? 'можно для scoring' : 'только support'}</Pill></div></div>)}</div></Panel><Panel title="Правила безопасности"><div className="space-y-2 text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>1. OpenAI не заполняет volume, competition или CPC.</div><div>2. Без source/date/region ключ не идёт в финальный scoring.</div><div>3. Google Trends — только seasonal support, не volume.</div><div>4. После заполнения CSV переходи в проверку CSV.</div></div></Panel></div>
    <Panel title="Колонки для импорта"><div className="mb-3 text-[11px] text-[var(--bone-dim)]">Обязательные поля должны быть в CSV или API response.</div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{[...contract.requiredColumns, ...contract.optionalColumns].map((column) => <ColumnCard key={column.key} column={column} />)}</div></Panel>
    <div className="mt-5"><Panel title="CSV/API template preview"><pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 border border-[rgba(216,214,211,.08)] p-3 text-[10px] leading-relaxed text-[var(--bone-dim)]">{JSON.stringify(contract.sampleRows, null, 2)}</pre></Panel></div>
  </section></main>;
}
