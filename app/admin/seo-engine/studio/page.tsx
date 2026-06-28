// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, DatabaseZap, FileText, Gauge, Layers3, Search, ShieldAlert, Sparkles } from 'lucide-react';
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

function productKey(product) {
  return String(product?.canonical_product_id || product?.matched_etsy_listing_id || productSlug(product) || '');
}

function matchesProduct(product, selected) {
  if (!selected) return false;
  return [product?.canonical_product_id, product?.matched_etsy_listing_id, productSlug(product)].filter(Boolean).map(String).includes(String(selected));
}

function searchText(product) {
  return [productTitle(product), product?.h1, product?.product_type, product?.material, product?.color, productKey(product), productSlug(product)].filter(Boolean).join(' ').toLowerCase();
}

function productHref(productId, q) {
  const params = new URLSearchParams();
  if (productId) params.set('product', productId);
  if (q) params.set('q', q);
  const query = params.toString();
  return `/admin/seo-engine/studio${query ? `?${query}` : ''}`;
}

async function loadData(selectedProductId, q) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: FALLBACK_PRODUCT, products: [FALLBACK_PRODUCT], allCount: 1, keywords: [], warning: getMissingSupabaseEnvMessage(), fallbackUsed: true };

  const productsResult = await supabase.from(STOREFRONT_VIEW_V1).select(PRODUCT_SELECT).limit(160);
  const allProducts = (productsResult.data || []).filter((item) => productSlug(item) && productTitle(item));
  const needle = String(q || '').trim().toLowerCase();
  const filteredProducts = needle ? allProducts.filter((item) => searchText(item).includes(needle)) : allProducts;
  const selectedProduct = allProducts.find((item) => matchesProduct(item, selectedProductId));
  const product = selectedProduct || filteredProducts[0] || allProducts[0] || FALLBACK_PRODUCT;
  const keywordsResult = await supabase.from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1').select(KEYWORD_SELECT).eq('priority_tier', 'tier_1').limit(80);

  return {
    product,
    products: filteredProducts.length ? filteredProducts : allProducts.slice(0, 24),
    allCount: allProducts.length,
    keywords: keywordsResult.data || [],
    warning: productsResult.error?.message || keywordsResult.error?.message || null,
    fallbackUsed: !allProducts.length,
  };
}

function statusTone(status) {
  if (status === 'готово') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]';
  if (status === 'блокер') return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]';
  return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
}

function Chip({ children, status = 'ожидает' }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${statusTone(status)}`}>{children}</span>;
}

function Panel({ title, children, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div><div className="p-4">{children}</div></div>;
}

function StepCard({ step }) {
  return <Link href={step.href} className="block rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 hover:border-[rgba(212,178,106,.35)] transition-colors"><div className="flex items-start justify-between gap-3"><div><div className="text-bone text-[14px] leading-snug">{step.title}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{step.subtitle}</div></div><step.icon size={16} className="text-[var(--gold-warm)]" /></div><div className="mt-3"><Chip status={step.status}>{step.status}</Chip></div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">{step.description}</div></Link>;
}

function PhraseList({ items }) {
  return <div className="flex flex-wrap gap-1.5">{items.filter(Boolean).slice(0, 9).map((item) => <span key={item} className="rounded-full border border-[rgba(216,214,211,.10)] bg-black/20 px-2 py-1 text-[10px] text-[var(--bone-dim)]">{item}</span>)}</div>;
}

function ProductSearch({ q }) {
  return <form action="/admin/seo-engine/studio" className="mb-3 grid md:grid-cols-[1fr_auto_auto] gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--smoke)]" /><input name="q" defaultValue={q} placeholder="Поиск: armor, choker, gold, bodysuit, ID, материал..." className="w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/25 pl-9 pr-3 py-2.5 text-[12px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" /></div><button className="btn-ghost" type="submit">Найти</button><Link href="/admin/seo-engine/studio" className="btn-ghost">Сбросить</Link></form>;
}

function ProductSelector({ products, activeKey, q }) {
  return <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">{products.slice(0, 24).map((item) => { const key = productKey(item); const active = key === activeKey; return <Link key={key} href={productHref(key, q)} className={`rounded-xl border p-3 transition-colors ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.08)]' : 'border-[rgba(216,214,211,.10)] bg-black/15 hover:border-[rgba(212,178,106,.30)]'}`}><div className="text-bone text-[11px] leading-snug line-clamp-2">{productTitle(item)}</div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[9px] text-[var(--smoke)]">ID {key}</span>{active ? <Chip status="готово">выбран</Chip> : <span className="text-[9px] text-[var(--gold-warm)]">выбрать</span>}</div></Link>; })}</div>;
}

export default async function SeoContentStudioPage({ searchParams }) {
  const params = await searchParams;
  const selectedProductId = params?.product || '';
  const q = String(params?.q || '').trim();
  const { product, products, allCount, keywords, warning, fallbackUsed } = await loadData(selectedProductId, q);
  const activeKey = productKey(product);
  const brief = buildSeoPilotBrief(product, keywords);
  const semanticCount = brief.metricValidationPackage.length;
  const candidateCount = brief.candidateKeywords.length;
  const productReady = brief.blockerChecks.filter((item) => item.status === 'blocker').length === 0;
  const studioQuery = activeKey ? `?product=${encodeURIComponent(activeKey)}${q ? `&q=${encodeURIComponent(q)}` : ''}` : q ? `?q=${encodeURIComponent(q)}` : '';
  const steps = [
    { title: '1. Товар', subtitle: 'ДНК и факты', status: productReady ? 'готово' : 'блокер', icon: FileText, href: `/admin/seo-engine/briefs${studioQuery}`, description: 'Проверяем реальные детали, цвет, материал, цену, фото и то, что нельзя обещать.' },
    { title: '2. Ключи', subtitle: 'seed + semantic map', status: semanticCount ? 'готово' : 'блокер', icon: Layers3, href: `/admin/seo-engine/briefs${studioQuery}`, description: 'Собираем фразы из Product DNA, компонентов, событий, материала, образа и длинных запросов.' },
    { title: '3. Метрики', subtitle: 'CSV / API позже', status: 'ожидает', icon: DatabaseZap, href: '/admin/seo-engine/metric-import', description: 'Экспортируем CSV, получаем volume/competition/bids/trend из внешнего источника, импортируем обратно.' },
    { title: '4. Оценка', subtitle: 'scoring preview', status: 'ожидает', icon: Gauge, href: '/admin/seo-engine/scoring/preview', description: 'После метрик считаем роли: главный, вторичный, поддержка, long-tail, удержать или исключить.' },
    { title: '5. Угол', subtitle: 'уникальность похожих товаров', status: 'готово', icon: Sparkles, href: `/admin/seo-engine/angle-advisor${studioQuery}`, description: 'Разводим похожие товары по смыслу: деталь, образ, событие, материал или точный длинный запрос.' },
    { title: '6. Черновик', subtitle: 'title / H1 / meta / FAQ / alt', status: 'ожидает', icon: FileText, href: `/admin/seo-engine/draft-preview${studioQuery}`, description: 'Собираем будущий SEO-pack по выбранному углу, но пока не сохраняем и не публикуем.' },
    { title: '7. QA', subtitle: 'human / truth / unique', status: 'ожидает', icon: ShieldAlert, href: '/admin/seo-engine/overlap-policy', description: 'Проверяем правду товара, водность, повторы, похожесть, keyword stuffing и ручное утверждение.' },
    { title: '8. Одобрить', subtitle: 'будущая запись', status: 'ожидает', icon: CheckCircle2, href: `/admin/seo-engine/draft-preview${studioQuery}`, description: 'Финальный операторский gate перед сохранением в будущую таблицу SEO-черновиков.' },
  ];

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-7 pb-12">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5"><div><div className="eyebrow-gold mb-2">Админка · SEO Content Studio</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Единая SEO-воронка</h1><p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Главный рабочий центр: выбираем товар и ведём его по цепочке от ключей и метрик до угла, черновика, QA и будущего утверждения.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/metric-import" className="btn-ghost">Скачать CSV метрик <ArrowUpRight size={13} /></Link><Link href={`/admin/seo-engine/draft-preview${studioQuery}`} className="btn-ghost">Черновик <ArrowUpRight size={13} /></Link></div></div>
    {warning || fallbackUsed ? <div className="mb-5 rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-2 text-[12px] text-[var(--bone-dim)]">{warning || 'Включён защитный образец товара.'}</div> : null}
    <div className="mb-5"><Panel title="Выбор товара из каталога" icon={Layers3}><ProductSearch q={q} /><div className="mb-3 flex flex-wrap gap-2 text-[11px] text-[var(--bone-dim)]"><span>Загружено товаров: {allCount}</span><span>Показано по фильтру: {products.length}</span>{q ? <span>Поиск: “{q}”</span> : null}</div><ProductSelector products={products} activeKey={activeKey} q={q} /><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Поиск работает внутри загруженного storefront catalog slice. Следующий слой — pagination/load more, чтобы пройти весь каталог без перегруза.</div></Panel></div>
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 mb-5"><Panel title="Текущий товар" icon={FileText}><div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">Адрес товара: /{brief.productSlug}</div><div className="mt-4 grid sm:grid-cols-2 gap-2">{brief.productFacts.map((fact) => <div key={fact.label} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5"><div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{fact.label}</div><div className="text-[12px] text-bone leading-snug">{fact.value}</div></div>)}</div></Panel><Panel title="Готовность к практике" icon={Gauge}><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] text-[var(--smoke)]">Фраз на проверку</div><div className="text-bone text-[20px]">{semanticCount}</div></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] text-[var(--smoke)]">Ключей из очереди</div><div className="text-bone text-[20px]">{candidateCount}</div></div></div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Практический следующий шаг: скачать CSV метрик для выбранного товара, заполнить реальные volume/competition/source/date, затем вернуться в scoring preview.</div></Panel></div>
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">{steps.map((step) => <StepCard key={step.title} step={step} />)}</div>
    <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5 mb-5"><Panel title="Что уже можно делать сейчас" icon={CheckCircle2}><div className="space-y-2 text-[12px] leading-relaxed text-[var(--bone-dim)]"><div>1. Найти и выбрать реальный товар из каталога.</div><div>2. Проверить товарную ДНК и семантические корзины.</div><div>3. Скачать CSV-шаблон метрик.</div><div>4. Получить реальные метрики вручную или через внешний сервис.</div><div>5. Выбрать угол и посмотреть будущий SEO-черновик.</div></div></Panel><Panel title="Что ещё блокирует генерацию финального SEO Pack" icon={ShieldAlert}><div className="grid sm:grid-cols-2 gap-2">{['Нет подтверждённых метрик', 'Нет сохранения в таблицу SEO-черновиков', 'Нет backend-генерации через OpenAI', 'Нет humanizer/QA save gate', 'Нет pagination/load more по всему каталогу', 'Нет финального approval workflow'].map((item) => <div key={item} className="rounded-xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.06)] p-3 text-[11px] text-[var(--bone-dim)]">{item}</div>)}</div></Panel></div>
    <Panel title="Первые фразы для проверки метрик" icon={Layers3}><PhraseList items={brief.metricValidationPackage.map((item) => item.phrase)} /></Panel>
  </section></main>;
}
