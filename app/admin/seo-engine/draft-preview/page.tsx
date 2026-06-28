// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V1, productSlug, productTitle } from '@/lib/storefront';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRODUCT_SELECT = 'canonical_product_id,product_slug,matched_etsy_listing_id,card_title,h1,product_type,material,color,primary_image_url,min_price,max_price,currency,storefront_candidate_flag';
const KEYWORD_SELECT = 'keyword,keyword_norm,priority_tier,validation_status,cleanup_pipeline_status,should_validate_api,should_hold,warning_flags';

const FALLBACK_PRODUCT = {
  canonical_product_id: '4511817111',
  product_slug: 'gold-futuristic-armor-set-choker-collar-shoulder-armor-and-arm-bracers-performance-outfit-4511817111',
  matched_etsy_listing_id: '4511817111',
  card_title: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit',
  h1: 'Gold Futuristic Armor Set, Choker Collar, Shoulder Armor and Arm Bracers, Performance Outfit',
  product_type: 'Armor',
  material: 'Fabric, Leather, Faux leather',
  color: 'Gold',
  primary_image_url: null,
  min_price: 79,
  max_price: 308,
  currency: 'EUR',
  storefront_candidate_flag: true,
};

async function loadData() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: FALLBACK_PRODUCT, keywords: [], warning: getMissingSupabaseEnvMessage(), fallbackUsed: true };
  const products = await supabase.from(STOREFRONT_VIEW_V1).select(PRODUCT_SELECT).limit(24);
  const product = (products.data || []).filter((item) => productSlug(item) && productTitle(item))[0] || FALLBACK_PRODUCT;
  const keywords = await supabase.from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1').select(KEYWORD_SELECT).eq('priority_tier', 'tier_1').limit(80);
  return { product, keywords: keywords.data || [], warning: products.error?.message || keywords.error?.message || null, fallbackUsed: !(products.data || []).length };
}

function bucket(brief, id, fallback) {
  return brief.semanticBuckets.find((item) => item.id === id)?.items?.map((item) => item.phrase) || fallback;
}

function makeDrafts(brief) {
  const components = bucket(brief, 'components', ['shoulder armor', 'arm bracers', 'choker collar']);
  const persona = bucket(brief, 'persona', ['futuristic warrior', 'sci fi armor outfit']);
  const event = bucket(brief, 'event', ['stage performance outfit', 'festival armor']);
  const material = bucket(brief, 'material_color', ['gold armor', 'metallic gold armor']);
  return [
    { label: 'Через деталь товара', primary: components[0], secondary: [components[1], material[0]], placement: 'title / H1 / intro / alt', title: `${components[0]} | Gold Futuristic Performance Armor`, note: 'Самый безопасный угол для карточки: опирается на реальную видимую деталь товара.' },
    { label: 'Через образ', primary: persona[0], secondary: [components[0], event[0]], placement: 'описание / FAQ / вторичные ключи', title: `${persona[0]} Outfit | Gold Futuristic Armor`, note: 'Подходит для похожего товара, чтобы не повторять тот же detail-first заголовок.' },
    { label: 'Через событие', primary: event[0], secondary: [event[1], components[0]], placement: 'коллекция / посадочная / внутренние ссылки', title: `${event[0]} | Gold Futuristic Armor Set`, note: 'Полезно для коллекций и сезонных страниц; не всегда лучший главный ключ карточки.' },
    { label: 'Через материал / поверхность', primary: material[0], secondary: [material[1], components[0]], placement: 'alt / image SEO / описание поверхности', title: `${material[0]} | Metallic Futuristic Armor`, note: 'Усиление визуального SEO: цвет, блеск, metallic/reflective surface без неверных материалов.' },
  ];
}

function Pill({ children }) {
  return <span className="rounded-full border border-[rgba(216,214,211,.10)] bg-black/20 px-2 py-1 text-[10px] text-[var(--bone-dim)]">{children}</span>;
}

function DraftCard({ draft }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4">
    <div className="flex items-start justify-between gap-3"><div><div className="text-bone text-[15px]">{draft.label}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{draft.placement}</div></div><FileText size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="mt-3 text-[11px] leading-relaxed"><div><span className="text-bone">Главный ключ:</span> <span className="text-[var(--bone-dim)]">{draft.primary}</span></div><div className="mt-2 flex flex-wrap gap-1.5">{draft.secondary.filter(Boolean).map((item) => <Pill key={item}>{item}</Pill>)}</div><div className="mt-2"><span className="text-bone">SEO title:</span> <span className="text-[var(--bone-dim)]">{draft.title}</span></div><div className="mt-2 text-[var(--bone-dim)]">{draft.note}</div></div>
  </div>;
}

export default async function SeoDraftPreviewPage() {
  const { product, keywords, warning, fallbackUsed } = await loadData();
  const brief = buildSeoPilotBrief(product, keywords);
  const drafts = makeDrafts(brief);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-7 pb-12">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5"><div><div className="eyebrow-gold mb-2">Админка · SEO · черновик по углу</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>SEO-черновик по выбранному углу</h1><p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Предпросмотр показывает, как меняется SEO-черновик в зависимости от угла. Записи в Supabase и публикации нет.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/angle-advisor" className="btn-ghost">Советник угла <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/metric-import" className="btn-ghost">Импорт метрик <ArrowUpRight size={13} /></Link></div></div>
    {warning || fallbackUsed ? <div className="mb-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-2 text-[12px] text-[var(--bone-dim)]">{warning || 'Включён защитный образец товара.'}</div> : null}
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 mb-5"><div className="eyebrow-gold mb-2">Товар для примера</div><div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">Адрес товара: /{brief.productSlug}</div></div>
    <div className="grid md:grid-cols-2 gap-4">{drafts.map((draft) => <DraftCard key={draft.label} draft={draft} />)}</div>
    <div className="mt-5 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">Операторское правило: сначала выбираем угол, потом проверяем метрики, потом собираем финальный черновик. Этот экран только показывает направление.</div>
  </section></main>;
}
