// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';
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

async function loadPilotData() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: FALLBACK_PRODUCT, keywords: [], warning: getMissingSupabaseEnvMessage(), fallbackUsed: true };

  const productsResult = await supabase.from(STOREFRONT_VIEW_V1).select(PRODUCT_SELECT).limit(24);
  const product = (productsResult.data || []).filter((item) => productSlug(item) && productTitle(item))[0] || FALLBACK_PRODUCT;
  const keywordsResult = await supabase.from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1').select(KEYWORD_SELECT).eq('priority_tier', 'tier_1').limit(80);

  return {
    product,
    keywords: keywordsResult.data || [],
    warning: productsResult.error?.message || keywordsResult.error?.message || null,
    fallbackUsed: !(productsResult.data || []).length,
  };
}

function phrases(brief, bucketId, fallback = []) {
  const bucket = brief.semanticBuckets.find((item) => item.id === bucketId);
  return bucket?.items?.slice(0, 4).map((item) => item.phrase) || fallback;
}

function Pill({ children }) {
  return <span className="rounded-full border border-[rgba(216,214,211,.10)] bg-black/20 px-2 py-1 text-[10px] text-[var(--bone-dim)]">{children}</span>;
}

function AngleCard({ title, role, phrases, useFor, avoid }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4">
    <div className="flex items-start justify-between gap-3"><div><div className="text-bone text-[15px] leading-snug">{title}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{role}</div></div><Compass size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{phrases.map((item) => <Pill key={item}>{item}</Pill>)}</div>
    <div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]"><span className="text-bone">Использовать:</span> {useFor}</div>
    <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]"><span className="text-bone">Не делать:</span> {avoid}</div>
  </div>;
}

export default async function SeoAngleAdvisorPage() {
  const { product, keywords, warning, fallbackUsed } = await loadPilotData();
  const brief = buildSeoPilotBrief(product, keywords);

  const angles = [
    {
      title: 'Угол через деталь товара',
      role: 'лучше для product page primary',
      phrases: phrases(brief, 'components', ['shoulder armor', 'arm bracers', 'choker collar']),
      useFor: 'главный заголовок, H1, первый абзац, alt-текст, если деталь реально видна на фото.',
      avoid: 'не копировать тот же title на похожий товар; менять главную деталь или порядок смысла.',
    },
    {
      title: 'Угол через образ / персонажа',
      role: 'лучше для второго похожего товара',
      phrases: phrases(brief, 'persona', ['futuristic warrior', 'robot warrior costume', 'sci fi armor outfit']),
      useFor: 'описание, FAQ, вторичные ключи, storytelling без привязки к чужим брендам или франшизам.',
      avoid: 'не обещать персонажа, если товар визуально не поддерживает этот образ.',
    },
    {
      title: 'Угол через событие',
      role: 'лучше для collection / landing',
      phrases: phrases(brief, 'event', ['stage performance outfit', 'festival armor', 'burning man armor']),
      useFor: 'коллекции, внутренние ссылки, блок “where to wear”, сезонные landing pages.',
      avoid: 'не ставить слишком широкий event keyword главным ключом карточки, если есть точная деталь товара.',
    },
    {
      title: 'Угол через материал / поверхность',
      role: 'лучше для visual SEO и image SEO',
      phrases: phrases(brief, 'material_color', ['gold armor', 'metallic gold armor', 'reflective gold armor']),
      useFor: 'alt-тексты, описание поверхности, image filenames, secondary keywords.',
      avoid: 'не использовать неверный цвет, holographic, silicone или red, если этого нет в товаре.',
    },
    {
      title: 'Угол через long-tail',
      role: 'лучше для низкой конкуренции',
      phrases: phrases(brief, 'long_tail', ['gold futuristic shoulder armor', 'gold armor set for stage performance']),
      useFor: 'FAQ, body, meta description, внутренние ссылки, точные поисковые сценарии.',
      avoid: 'не превращать long-tail в спам; использовать естественно и только там, где он читабелен.',
    },
  ];

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · советник угла</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Советник уникального угла</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Экран не запрещает похожие товары. Он помогает развести их по смыслу: один товар вести через деталь, второй через образ, третий через событие, четвёртый через материал или long-tail.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/overlap-policy" className="btn-ghost">Политика похожести <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring/preview" className="btn-ghost">Preview scoring <ArrowUpRight size={13} /></Link></div>
      </div>

      {warning || fallbackUsed ? <div className="mb-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-2 text-[12px] text-[var(--bone-dim)]">{warning || 'Включён защитный образец товара.'}</div> : null}

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 mb-5">
        <div className="eyebrow-gold mb-2">Товар для примера</div>
        <div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div>
        <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Адрес товара: /{brief.productSlug}</div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">{angles.map((angle) => <AngleCard key={angle.title} {...angle} />)}</div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Операторское правило: похожесть не блокирует товар. Блокируется только почти дубль. Для похожих товаров система должна предлагать разные заголовки, разные первые абзацы, разные secondary keywords и разные места использования ключей.
      </div>
    </section>
  </main>;
}
