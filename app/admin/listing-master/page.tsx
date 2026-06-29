// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, ImageIcon, Layers3, PackageSearch, Search, SearchCheck, SlidersHorizontal, Sparkles, Tags } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LIMIT = 1200;
const DISPLAY_LIMIT = 220;
const PRODUCT_LIMIT = 500;
const COLUMNS = 'keyword,keyword_norm,bank_bucket,review_status,source_clusters,score,avg_monthly_searches,competition,competition_index,low_bid,high_bid,region,language,metric_source,page_type,role,role_label,last_checked,duplicate_count,reason,notes,source_files';
const ADMIN_PRODUCTS_VIEW = 'feya_commerce_v_step6_product_catalog_overview';
const STOREFRONT_ENRICHMENT_VIEW_V4 = 'feya_commerce_v_step7_storefront_products_api_v4';
const STOREFRONT_ENRICHMENT_VIEW = 'feya_commerce_v_step7_storefront_products_api';
const PRODUCT_SELECT = 'canonical_product_id,source_shop_code,primary_source_listing_id,matched_etsy_listing_id,draft_site_title,card_title,product_type,publish_status,readiness_status,do_not_publish_flag,updated_at';
const PRODUCT_ENRICHMENT_SELECT_V4 = 'canonical_product_id,product_slug,primary_image_url,primary_image_alt';
const PRODUCT_ENRICHMENT_SELECT = 'canonical_product_id,product_slug,matched_etsy_listing_id,primary_image_url,primary_image_alt';
const BUCKETS = ['all', 'product', 'product_or_alt', 'collection', 'commercial_collection', 'visual_collection', 'faq'];

const BUCKET_LABELS = {
  all: 'Все',
  product: 'Product',
  product_or_alt: 'Product / Alt',
  collection: 'Collection',
  commercial_collection: 'Commercial',
  visual_collection: 'Visual',
  faq: 'FAQ',
};

const COMPONENTS = ['armor', 'harness', 'bodysuit', 'mask', 'headpiece', 'choker', 'corset', 'skirt', 'chain', 'wings'];
const MATERIALS = ['gold', 'silver', 'black', 'white', 'metallic', 'holographic', 'leather', 'mirror', 'acrylic', 'reflective'];
const EVENTS = ['rave', 'festival', 'burning man', 'stage', 'edm', 'coachella', 'halloween', 'pride', 'drag', 'photoshoot'];

const MATCH_SYNONYMS = {
  armor: ['armor', 'armour', 'shoulder', 'bracer', 'arm cuff', 'robot', 'warrior', 'armored', 'armoured'],
  harness: ['harness', 'chest harness', 'body harness', 'chain harness', 'leg harness'],
  bodysuit: ['bodysuit', 'body suit', 'catsuit', 'romper', 'jumpsuit', 'overalls'],
  mask: ['mask', 'face mask', 'futuristic mask'],
  headpiece: ['headpiece', 'head piece', 'horn', 'crown', 'cleopatra'],
  choker: ['choker', 'collar'],
  corset: ['corset', 'top', 'bra', 'overbust'],
  skirt: ['skirt'],
  chain: ['chain', 'body chain'],
  wings: ['wings', 'wing'],
  gold: ['gold', 'golden'],
  silver: ['silver', 'chrome'],
  black: ['black'],
  white: ['white'],
  metallic: ['metallic', 'metal', 'futuristic'],
  holographic: ['holographic', 'holo', 'iridescent'],
  leather: ['leather', 'vegan leather'],
  mirror: ['mirror', 'mirrored'],
  acrylic: ['acrylic'],
  reflective: ['reflective', 'shiny'],
  rave: ['rave', 'edm'],
  festival: ['festival', 'coachella', 'tomorrowland'],
  'burning man': ['burning man', 'burningman'],
  stage: ['stage', 'performance', 'performer', 'dance performance', 'show'],
  edm: ['edm', 'rave'],
  coachella: ['coachella', 'festival'],
  halloween: ['halloween'],
  pride: ['pride', 'drag'],
  drag: ['drag', 'drag queen'],
  photoshoot: ['photoshoot', 'photo shoot'],
};

const PRESETS = [
  { label: 'Gold rave harness', bucket: 'product_or_alt', component: 'harness', material: 'gold', event: 'rave' },
  { label: 'Silver stage bodysuit', bucket: 'product_or_alt', component: 'bodysuit', material: 'silver', event: 'stage' },
  { label: 'Gold armor Burning Man', bucket: 'product_or_alt', component: 'armor', material: 'gold', event: 'burning man' },
  { label: 'Futuristic mask stage', bucket: 'product', component: 'mask', material: 'metallic', event: 'stage' },
  { label: 'Festival headpiece gold', bucket: 'product_or_alt', component: 'headpiece', material: 'gold', event: 'festival' },
];

async function countBucket(supabase, bucket) {
  let query = supabase.from('vw_seo_keyword_bank_v1_for_listing_master').select('keyword_norm', { count: 'exact', head: true });
  if (bucket !== 'all') query = query.eq('bank_bucket', bucket);
  const { count, error } = await query;
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function loadProducts(productQuery = '') {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], totalProducts: 0, visibleProducts: 0, error: getMissingSupabaseEnvMessage(), imageSource: 'none' };

  const [catalogResult, v4Result, apiResult] = await Promise.all([
    supabase.from(ADMIN_PRODUCTS_VIEW).select(PRODUCT_SELECT).limit(PRODUCT_LIMIT),
    supabase.from(STOREFRONT_ENRICHMENT_VIEW_V4).select(PRODUCT_ENRICHMENT_SELECT_V4).limit(PRODUCT_LIMIT),
    supabase.from(STOREFRONT_ENRICHMENT_VIEW).select(PRODUCT_ENRICHMENT_SELECT).limit(PRODUCT_LIMIT),
  ]);

  if (catalogResult.error) return { products: [], totalProducts: 0, visibleProducts: 0, error: catalogResult.error.message, imageSource: 'none' };

  const enrichmentByProductId = new Map();
  const enrichmentByEtsyId = new Map();
  let imageSource = 'none';

  function remember(item, source) {
    if (!item) return;
    const existing = item.canonical_product_id ? enrichmentByProductId.get(item.canonical_product_id) : null;
    const merged = { ...(existing || {}), ...item, imageSource: item.primary_image_url ? source : existing?.imageSource };
    if (item.canonical_product_id) enrichmentByProductId.set(item.canonical_product_id, merged);
    if (item.matched_etsy_listing_id) enrichmentByEtsyId.set(String(item.matched_etsy_listing_id), merged);
    if (item.primary_image_url && imageSource === 'none') imageSource = source;
  }

  (apiResult.data || []).forEach((item) => remember(item, 'storefront_api'));
  (v4Result.data || []).forEach((item) => remember(item, 'storefront_api_v4'));

  const allProducts = (catalogResult.data || []).map((row) => {
    const byId = enrichmentByProductId.get(row.canonical_product_id) || {};
    const byEtsy = row.matched_etsy_listing_id ? enrichmentByEtsyId.get(String(row.matched_etsy_listing_id)) || {} : {};
    const enrichment = byId.primary_image_url ? byId : byEtsy.primary_image_url ? byEtsy : byId;
    const title = row.card_title || row.draft_site_title || row.matched_etsy_listing_id || row.canonical_product_id;
    const subtitle = [
      row.source_shop_code || 'SHOP',
      row.matched_etsy_listing_id ? `Etsy ${row.matched_etsy_listing_id}` : row.primary_source_listing_id,
      row.product_type || 'Product',
    ].filter(Boolean).join(' · ');
    const imageUrl = enrichment.primary_image_url || '';
    const text = `${title} ${subtitle} ${row.product_type || ''} ${enrichment.primary_image_alt || ''} ${row.canonical_product_id || ''} ${row.matched_etsy_listing_id || ''}`.toLowerCase();
    return {
      id: row.canonical_product_id,
      title,
      subtitle,
      shop: row.source_shop_code || '',
      productType: row.product_type || '',
      readiness: row.readiness_status || row.publish_status || '',
      blocked: Boolean(row.do_not_publish_flag),
      imageUrl,
      imageAlt: enrichment.primary_image_alt || '',
      imageSource: enrichment.imageSource || '',
      slug: enrichment.product_slug || row.canonical_product_id,
      etsyId: row.matched_etsy_listing_id || row.primary_source_listing_id || '',
      text,
    };
  }).sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));

  const tokens = searchTokens(productQuery);
  const products = tokens.length ? allProducts.filter((product) => tokens.every((token) => product.text.includes(token))) : allProducts;

  return { products, totalProducts: allProducts.length, visibleProducts: products.length, error: null, imageSource };
}

async function loadRows(filters) {
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return {
      rows: [],
      totalCount: null,
      counts: {},
      rawCount: null,
      error: getMissingSupabaseEnvMessage(),
    };
  }

  const safeBucket = BUCKETS.includes(filters.bucket) ? filters.bucket : 'all';
  const countEntries = await Promise.all(BUCKETS.map(async (item) => [item, await countBucket(supabase, item)]));
  const counts = Object.fromEntries(countEntries);

  let query = supabase
    .from('vw_seo_keyword_bank_v1_for_listing_master')
    .select(COLUMNS, { count: 'exact' })
    .limit(LIMIT);

  if (safeBucket !== 'all') query = query.eq('bank_bucket', safeBucket);

  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: null, counts, rawCount: count ?? null, error: error.message };

  const matched = applyDnaMatching(data || [], filters);

  return { rows: matched, totalCount: matched.length, counts, rawCount: count ?? 0, error: null };
}

function currentFilters(searchParams) {
  const bucket = stringParam(searchParams?.bucket, 'all');
  return {
    bucket: BUCKETS.includes(bucket) ? bucket : 'all',
    component: normalizeFilter(stringParam(searchParams?.component, '')),
    material: normalizeFilter(stringParam(searchParams?.material, '')),
    event: normalizeFilter(stringParam(searchParams?.event, '')),
    q: stringParam(searchParams?.q, '').trim().toLowerCase(),
    productId: stringParam(searchParams?.product_id, '').trim(),
    productQ: stringParam(searchParams?.product_q, '').trim().toLowerCase(),
  };
}

function stringParam(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return fallback;
}

function normalizeFilter(value) {
  return String(value || '').trim().toLowerCase();
}

function rowText(row) {
  return `${row.keyword || ''} ${row.keyword_norm || ''} ${row.source_clusters || ''} ${row.page_type || ''} ${row.bank_bucket || ''} ${row.reason || ''} ${row.notes || ''}`.toLowerCase();
}

function termsFor(value) {
  const clean = normalizeFilter(value);
  if (!clean) return [];
  return MATCH_SYNONYMS[clean] || [clean];
}

function matchesValue(text, value) {
  const terms = termsFor(value);
  if (!terms.length) return true;
  return terms.some((term) => text.includes(term));
}

function searchTokens(q) {
  return normalizeFilter(q).split(/\s+/).map((item) => item.trim()).filter((item) => item.length >= 2);
}

function queryMatches(text, q) {
  const tokens = searchTokens(q);
  if (!tokens.length) return true;
  return tokens.every((token) => text.includes(token));
}

function hasActiveDna(filters) {
  return Boolean(filters.component || filters.material || filters.event || filters.q);
}

function firstMatch(text, values) {
  return values.find((value) => matchesValue(text, value)) || '';
}

function inferProductDna(product) {
  if (!product) return { component: '', material: '', event: '', q: '' };
  const text = product.text || '';
  return {
    component: firstMatch(text, COMPONENTS),
    material: firstMatch(text, MATERIALS),
    event: firstMatch(text, EVENTS),
    q: '',
  };
}

function applyProductAutoDna(filters, product) {
  const inferred = inferProductDna(product);
  return {
    ...filters,
    component: filters.component || inferred.component,
    material: filters.material || inferred.material,
    event: filters.event || inferred.event,
    inferred,
  };
}

function matchRow(row, filters) {
  const text = rowText(row);
  const componentOk = matchesValue(text, filters.component);
  const materialOk = matchesValue(text, filters.material);
  const eventOk = matchesValue(text, filters.event);
  const queryOk = queryMatches(text, filters.q);
  const eligible = componentOk && materialOk && eventOk && queryOk;

  let matchScore = 0;
  const reasons = [];
  if (filters.component && componentOk) { matchScore += 45; reasons.push(`component +45: ${filters.component}`); }
  if (filters.material && materialOk) { matchScore += 35; reasons.push(`material +35: ${filters.material}`); }
  if (filters.event && eventOk) { matchScore += 35; reasons.push(`event +35: ${filters.event}`); }
  if (filters.q && queryOk) { const qScore = Math.min(30, searchTokens(filters.q).length * 10); matchScore += qScore; reasons.push(`search +${qScore}: ${filters.q}`); }
  if (row.bank_bucket === 'product_or_alt') { matchScore += 8; reasons.push('bucket +8: product_or_alt'); }
  if (row.bank_bucket === 'product') { matchScore += 6; reasons.push('bucket +6: product'); }
  if (row.bank_bucket === 'collection_visual') { matchScore += 4; reasons.push('bucket +4: visual'); }

  return { eligible, matchScore, reasons };
}

function applyDnaMatching(rows, filters) {
  const active = hasActiveDna(filters);
  const enriched = rows.map((row) => {
    const match = matchRow(row, filters);
    return { ...row, match_score: active ? match.matchScore : null, match_reasons: match.reasons.join(' · ') };
  });

  const filtered = active ? enriched.filter((row) => matchRow(row, filters).eligible) : enriched;

  return filtered.sort((a, b) => {
    const matchDiff = Number(b.match_score || 0) - Number(a.match_score || 0);
    if (matchDiff) return matchDiff;
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function formatNumber(value) {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('en-US').format(parsed);
}

function bucketCount(counts, bucket) {
  const value = counts?.[bucket]?.count;
  return value == null ? '—' : formatNumber(value);
}

function countError(counts) {
  return Object.values(counts || {}).find((item) => item?.error)?.error || null;
}

function toneByBucket(value) {
  const text = asText(value, '').toLowerCase();
  if (text.includes('product')) return 'success';
  if (text.includes('commercial') || text.includes('visual') || text.includes('collection')) return 'gold';
  if (text.includes('faq')) return 'warning';
  return 'neutral';
}

function keywordUse(row) {
  const bucket = row.bank_bucket;
  if (bucket === 'product_or_alt') return 'Tag / ALT';
  if (bucket === 'product') return 'Tag / Title';
  if (bucket === 'commercial_collection') return 'Collection / Meta';
  if (bucket === 'visual_collection') return 'Visual collection';
  if (bucket === 'collection') return 'Collection';
  if (bucket === 'faq') return 'FAQ';
  return 'Review';
}

function strategySignal(row) {
  const volume = Number(row.avg_monthly_searches || 0);
  const competition = String(row.competition || '').toUpperCase();
  const bucket = String(row.bank_bucket || '');
  if (bucket.includes('product') && volume <= 500 && competition !== 'HIGH') return { label: 'точный шанс', tone: 'success' };
  if (volume >= 1000 && competition === 'HIGH') return { label: 'широкий спрос', tone: 'warning' };
  if (bucket.includes('collection')) return { label: 'для посадочной', tone: 'gold' };
  return { label: 'поддержка', tone: 'neutral' };
}

function productSeoStatus(product, filters, totalCount) {
  if (!product) return { label: 'товар не выбран', tone: 'neutral', note: 'выбери товар слева или работай руками через DNA' };
  if (!filters.component && !filters.material && !filters.event) return { label: 'нужна ручная DNA', tone: 'warning', note: 'авто-DNA не распознала component/material/event' };
  if (!totalCount) return { label: 'нет совпадений', tone: 'warning', note: 'сними один фильтр или поменяй bucket' };
  return { label: 'готов к подбору', tone: 'success', note: 'есть approved keywords под текущую DNA' };
}

function buildHref(filters, patch = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.bucket && next.bucket !== 'all') params.set('bucket', next.bucket);
  if (next.component) params.set('component', next.component);
  if (next.material) params.set('material', next.material);
  if (next.event) params.set('event', next.event);
  if (next.q) params.set('q', next.q);
  if (next.productId || next.product_id) params.set('product_id', next.productId || next.product_id);
  if (next.productQ || next.product_q) params.set('product_q', next.productQ || next.product_q);
  const query = params.toString();
  return query ? `/admin/listing-master?${query}` : '/admin/listing-master';
}

function productHref(product) {
  return `/admin/listing-master?product_id=${encodeURIComponent(product.id)}`;
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : tone === 'warning'
        ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
        : tone === 'gold'
          ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'
          : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const border = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${border} p-5 min-h-[138px]`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

function BucketLink({ bucket, active, counts, filters }) {
  const isActive = bucket === active;
  return <Link href={buildHref(filters, { bucket })} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>
    {BUCKET_LABELS[bucket] || bucket} · {bucketCount(counts, bucket)}
  </Link>;
}

function FilterChip({ type, value, filters, label }) {
  const active = filters[type] === value;
  const patch = { [type]: active ? '' : value };
  return <Link href={buildHref(filters, patch)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${active ? 'border-[rgba(108,183,138,.55)] bg-[rgba(108,183,138,.11)] text-[#a9dfbd]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone'}`}>
    {label || value}
  </Link>;
}

function PresetLink({ preset }) {
  return <Link href={buildHref({ bucket: preset.bucket, component: preset.component, material: preset.material, event: preset.event, q: '', productId: '', productQ: '' })} className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.055)] p-4 hover:border-[rgba(212,178,106,.45)] transition-colors">
    <div className="text-bone text-[13px]">{preset.label}</div>
    <div className="mt-2 flex flex-wrap gap-1.5"><Chip tone="success">{preset.component}</Chip><Chip tone="gold">{preset.material}</Chip><Chip tone="warning">{preset.event}</Chip></div>
  </Link>;
}

function ProductImage({ product, size = 'sm' }) {
  const classes = size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl';
  return <div className={`${classes} overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/25 flex items-center justify-center`}>
    {product?.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon size={size === 'lg' ? 18 : 16} className="text-[var(--smoke)]" />}
  </div>;
}

function ProductCard({ product, active, selectedProduct }) {
  const dna = inferProductDna(product);
  const hasDna = Boolean(dna.component || dna.material || dna.event);
  return <Link href={productHref(product)} className={`grid grid-cols-[44px_1fr] gap-3 rounded-2xl border p-3 transition-colors ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.10)]' : 'border-[rgba(216,214,211,.10)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}>
    <ProductImage product={product} />
    <div className="min-w-0">
      <div className="truncate text-[12px] text-bone">{product.title}</div>
      <div className="mt-1 truncate text-[10px] text-[var(--bone-dim)]">{product.subtitle}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {active ? <Chip tone="gold">выбран</Chip> : null}
        <Chip tone={hasDna ? 'success' : 'warning'}>{hasDna ? 'auto DNA' : 'ручная DNA'}</Chip>
        <Chip tone="neutral">не сохранено</Chip>
      </div>
    </div>
  </Link>;
}

export default async function AdminListingMasterPage({ searchParams }) {
  const rawFilters = currentFilters(searchParams);
  const { products, totalProducts, visibleProducts, error: productsError, imageSource } = await loadProducts(rawFilters.productQ);
  const selectedProduct = products.find((product) => product.id === rawFilters.productId) || null;
  const filters = applyProductAutoDna(rawFilters, selectedProduct);
  const { rows, totalCount, counts, rawCount, error } = await loadRows(filters);
  const firstRows = rows.slice(0, DISPLAY_LIMIT);
  const countsError = countError(counts);
  const dnaActive = hasActiveDna(filters);
  const inferred = filters.inferred || {};
  const seoStatus = productSeoStatus(selectedProduct, filters, totalCount ?? rows.length);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Listing Master · SEO Tags P2</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Listing Master</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only слой мастера листинга: поиск товара, авто-DNA, approved keywords и объяснение, почему ключ предложен. Сохранение статуса “готово/черновик” будет следующим шагом через отдельную Supabase-таблицу.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить Listing Master keywords. Ответ базы: {error}</div> : null}
      {productsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Товары не загрузились: {productsError}</div> : null}
      {countsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из bucket count-запросов не вернулся: {countsError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric icon={Database} label="Всего approved" value={bucketCount(counts, 'all')} note="Пул view для Listing Master." tone="success" />
        <Metric icon={PackageSearch} label="Товары" value={formatNumber(visibleProducts)} note={`Показано из ${formatNumber(totalProducts)}. Images: ${imageSource}.`} tone="success" />
        <Metric icon={Layers3} label="Product / Alt" value={bucketCount(counts, 'product_or_alt')} note="Точные material/component слова." tone="success" />
        <Metric icon={SearchCheck} label="Matched сейчас" value={formatNumber(totalCount ?? rows.length)} note={dnaActive ? 'Результат текущей DNA товара.' : 'Без DNA-фильтра: общий approved-пул.'} tone="warning" />
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Логика подбора</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Сначала фильтруем approved bank по DNA товара: component + material + event + search. Потом сортируем: Match score → SEO score → volume → keyword. Match показывает совпадение с товаром; SEO score показывает качество ключа из банка; volume/competition помогают понять спрос и сложность. Hold/Reject сюда не попадают.</p>
      </div>

      <div className="grid xl:grid-cols-[440px_1fr] gap-6 mb-6">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="flex items-center gap-2 eyebrow-gold mb-4"><PackageSearch size={14} /> Выбрать товар</div>
          <form action="/admin/listing-master" className="mb-4 rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
            <div className="flex gap-2">
              <input name="product_q" defaultValue={rawFilters.productQ} placeholder="Поиск: gold, harness, Etsy ID, первые слова названия" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-3 py-2 text-[12px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" />
              <button type="submit" className="btn-ghost"><Search size={13} /> Найти</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2"><Link href="/admin/listing-master" className="text-[11px] text-[var(--gold-warm)] hover:underline">Сбросить поиск и выбор</Link><span className="text-[11px] text-[var(--bone-dim)]">Найдено: {formatNumber(visibleProducts)}</span></div>
          </form>
          <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
            {products.slice(0, 120).map((product) => <ProductCard key={product.id} product={product} active={selectedProduct?.id === product.id} selectedProduct={selectedProduct} />)}
            {!products.length && !productsError ? <div className="text-[12px] text-[var(--bone-dim)]">По этому поиску товаров не найдено.</div> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2 eyebrow-gold"><SlidersHorizontal size={14} /> Product DNA</div><Chip tone={seoStatus.tone}>{seoStatus.label}</Chip></div>
            {selectedProduct ? <div className="grid sm:grid-cols-[96px_1fr] gap-4 rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.055)] p-4 mb-4">
              <ProductImage product={selectedProduct} size="lg" />
              <div>
                <div className="text-bone text-[18px] leading-snug">{selectedProduct.title}</div>
                <div className="mt-1 text-[12px] text-[var(--bone-dim)]">{selectedProduct.subtitle}</div>
                <div className="mt-3 flex flex-wrap gap-2"><Chip tone="success">component: {filters.component || '—'}</Chip><Chip tone="gold">material: {filters.material || '—'}</Chip><Chip tone="warning">event: {filters.event || '—'}</Chip><Chip tone="neutral">SEO: не сохранено</Chip></div>
                <div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Auto detected: {inferred.component || '—'} / {inferred.material || '—'} / {inferred.event || '—'}. {seoStatus.note}</div>
              </div>
            </div> : <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mb-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Товар ещё не выбран. Сейчас можно работать руками через DNA filters, но боевой сценарий — найти товар слева и выбрать его.</div>}

            <div className="space-y-4">
              <div><div className="eyebrow-dim mb-2">Component</div><div className="flex flex-wrap gap-2">{COMPONENTS.map((item) => <FilterChip key={item} type="component" value={item} filters={filters} />)}</div></div>
              <div><div className="eyebrow-dim mb-2">Material / Color</div><div className="flex flex-wrap gap-2">{MATERIALS.map((item) => <FilterChip key={item} type="material" value={item} filters={filters} />)}</div></div>
              <div><div className="eyebrow-dim mb-2">Event / Context</div><div className="flex flex-wrap gap-2">{EVENTS.map((item) => <FilterChip key={item} type="event" value={item} filters={filters} />)}</div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="eyebrow-dim mb-2">Search inside approved bank</div>
            <form action="/admin/listing-master" className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
              <input type="hidden" name="bucket" value={filters.bucket} />
              <input type="hidden" name="component" value={filters.component} />
              <input type="hidden" name="material" value={filters.material} />
              <input type="hidden" name="event" value={filters.event} />
              <input type="hidden" name="product_id" value={filters.productId} />
              <input type="hidden" name="product_q" value={filters.productQ} />
              <input name="q" defaultValue={filters.q} placeholder="Например: gold rave, burning man, chest harness" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-4 py-3 text-[13px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" />
              <div className="mt-3 flex flex-wrap gap-2"><button className="btn-ghost" type="submit">Применить поиск</button><Link href="/admin/listing-master" className="btn-ghost">Очистить товар/DNA</Link></div>
            </form>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {PRESETS.map((preset) => <PresetLink key={preset.label} preset={preset} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {BUCKETS.map((bucket) => <BucketLink key={bucket} bucket={bucket} active={filters.bucket} counts={counts} filters={filters} />)}
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="eyebrow-dim">Активный подбор</div><h2 className="mt-2 text-bone text-[24px]">{BUCKET_LABELS[filters.bucket] || filters.bucket}</h2></div>
          <div className="flex flex-wrap gap-2"><Chip tone="success">Показано {formatNumber(firstRows.length)}</Chip><Chip tone="warning">Matched {formatNumber(totalCount ?? rows.length)}</Chip><Chip>Из выборки {formatNumber(rawCount ?? rows.length)}</Chip></div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Активные фильтры: product={selectedProduct?.title || '—'} · component={filters.component || '—'} · material={filters.material || '—'} · event={filters.event || '—'} · search={filters.q || '—'}. Таблица ограничена первыми {formatNumber(DISPLAY_LIMIT)} строками.</p>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1.05fr_.40fr_.42fr_.55fr_.45fr_.45fr_.70fr_.75fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]">
          <div>Ключ</div><div>Match</div><div>Score</div><div>Bucket</div><div>Volume</div><div>Comp</div><div>Use</div><div>Signal</div><div>Why</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {firstRows.map((row, index) => {
            const signal = strategySignal(row);
            return <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.05fr_.40fr_.42fr_.55fr_.45fr_.45fr_.70fr_.75fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
              <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
              <div className="font-price text-[20px] text-[#a9dfbd]">{row.match_score == null ? '—' : row.match_score}</div>
              <div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div>
              <div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div>
              <div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div>
              <div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{asText(row.competition)}</Chip></div>
              <div><Chip tone="gold">{keywordUse(row)}</Chip></div>
              <div><Chip tone={signal.tone}>{signal.label}</Chip></div>
              <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.match_reasons || row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">{asText(row.reason || row.notes, '')}</div></div>
            </div>;
          })}
          {!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">По текущим DNA-фильтрам approved keywords не найдены. Сними один фильтр или используй bucket “Все”.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
