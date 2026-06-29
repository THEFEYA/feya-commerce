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
const STRATEGIES = ['balanced', 'demand', 'opportunity'];

const BUCKET_LABELS = {
  all: 'Все типы',
  product: 'Товарные',
  product_or_alt: 'Товар / ALT',
  collection: 'Категории',
  commercial_collection: 'Коммерческие',
  visual_collection: 'Визуальные',
  faq: 'FAQ',
};

const STRATEGY_LABELS = {
  balanced: 'Сбалансировано',
  demand: 'Больше спроса',
  opportunity: 'Низкая конкуренция + спрос',
};

const STRATEGY_NOTES = {
  balanced: 'По умолчанию: сначала совпадение с товаром, потом качество слова, спрос и конкуренция.',
  demand: 'Поднимает слова с большим средним спросом. Подходит для широкой посадочной и сильных категорий.',
  opportunity: 'Поднимает слова с ненулевым спросом и низкой/средней конкуренцией. Это не пустые слова, а шанс легче выйти выше.',
};

const COMPONENTS = ['armor', 'harness', 'bodysuit', 'mask', 'headpiece', 'choker', 'corset', 'skirt', 'chain', 'wings'];
const MATERIALS = ['gold', 'silver', 'black', 'white', 'metallic', 'holographic', 'leather', 'mirror', 'acrylic', 'reflective'];
const EVENTS = ['rave', 'festival', 'burning man', 'stage', 'edm', 'coachella', 'halloween', 'pride', 'drag', 'photoshoot'];

const COMPONENT_LABELS = {
  armor: 'броня / плечи', harness: 'harness', bodysuit: 'боди / комбинезон', mask: 'маска', headpiece: 'головной убор', choker: 'чокер', corset: 'корсет / топ', skirt: 'юбка', chain: 'цепи', wings: 'крылья',
};
const MATERIAL_LABELS = {
  gold: 'золото', silver: 'серебро', black: 'чёрный', white: 'белый', metallic: 'металлик', holographic: 'голографик', leather: 'кожа', mirror: 'зеркальный', acrylic: 'акрил', reflective: 'отражающий',
};
const EVENT_LABELS = {
  rave: 'rave', festival: 'festival', 'burning man': 'Burning Man', stage: 'stage', edm: 'EDM', coachella: 'Coachella', halloween: 'Halloween', pride: 'Pride', drag: 'drag', photoshoot: 'photoshoot',
};

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
    const subtitle = [row.source_shop_code || 'SHOP', row.matched_etsy_listing_id ? `Etsy ${row.matched_etsy_listing_id}` : row.primary_source_listing_id, row.product_type || 'Product'].filter(Boolean).join(' · ');
    const text = `${title} ${subtitle} ${row.product_type || ''} ${enrichment.primary_image_alt || ''} ${row.canonical_product_id || ''} ${row.matched_etsy_listing_id || ''}`.toLowerCase();
    return {
      id: row.canonical_product_id,
      title,
      subtitle,
      shop: row.source_shop_code || '',
      productType: row.product_type || '',
      readiness: row.readiness_status || row.publish_status || '',
      blocked: Boolean(row.do_not_publish_flag),
      imageUrl: enrichment.primary_image_url || '',
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
  if (!supabase) return { rows: [], totalCount: null, counts: {}, rawCount: null, error: getMissingSupabaseEnvMessage() };

  const safeBucket = BUCKETS.includes(filters.bucket) ? filters.bucket : 'all';
  const countEntries = await Promise.all(BUCKETS.map(async (item) => [item, await countBucket(supabase, item)]));
  const counts = Object.fromEntries(countEntries);

  let query = supabase.from('vw_seo_keyword_bank_v1_for_listing_master').select(COLUMNS, { count: 'exact' }).limit(LIMIT);
  if (safeBucket !== 'all') query = query.eq('bank_bucket', safeBucket);

  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: null, counts, rawCount: count ?? null, error: error.message };

  const matched = applyDnaMatching(data || [], filters);
  return { rows: matched, totalCount: matched.length, counts, rawCount: count ?? 0, error: null };
}

function currentFilters(searchParams) {
  const bucket = stringParam(searchParams?.bucket, 'all');
  const strategy = stringParam(searchParams?.strategy, 'balanced');
  return {
    bucket: BUCKETS.includes(bucket) ? bucket : 'all',
    strategy: STRATEGIES.includes(strategy) ? strategy : 'balanced',
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

function normalizeFilter(value) { return String(value || '').trim().toLowerCase(); }
function rowText(row) { return `${row.keyword || ''} ${row.keyword_norm || ''} ${row.source_clusters || ''} ${row.page_type || ''} ${row.bank_bucket || ''} ${row.reason || ''} ${row.notes || ''}`.toLowerCase(); }
function termsFor(value) { const clean = normalizeFilter(value); if (!clean) return []; return MATCH_SYNONYMS[clean] || [clean]; }
function matchesValue(text, value) { const terms = termsFor(value); if (!terms.length) return true; return terms.some((term) => text.includes(term)); }
function searchTokens(q) { return normalizeFilter(q).split(/\s+/).map((item) => item.trim()).filter((item) => item.length >= 2); }
function queryMatches(text, q) { const tokens = searchTokens(q); if (!tokens.length) return true; return tokens.every((token) => text.includes(token)); }
function hasActiveDna(filters) { return Boolean(filters.component || filters.material || filters.event || filters.q); }
function firstMatch(text, values) { return values.find((value) => matchesValue(text, value)) || ''; }

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
  return { ...filters, component: filters.component || inferred.component, material: filters.material || inferred.material, event: filters.event || inferred.event, inferred };
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
  if (filters.component && componentOk) { matchScore += 45; reasons.push(`совпало по составу +45: ${labelFor('component', filters.component)}`); }
  if (filters.material && materialOk) { matchScore += 35; reasons.push(`совпало по материалу/цвету +35: ${labelFor('material', filters.material)}`); }
  if (filters.event && eventOk) { matchScore += 35; reasons.push(`совпало по сценарию +35: ${labelFor('event', filters.event)}`); }
  if (filters.q && queryOk) { const qScore = Math.min(30, searchTokens(filters.q).length * 10); matchScore += qScore; reasons.push(`совпало с поиском +${qScore}: ${filters.q}`); }
  if (row.bank_bucket === 'product_or_alt') { matchScore += 8; reasons.push('подходит для товара/ALT +8'); }
  if (row.bank_bucket === 'product') { matchScore += 6; reasons.push('подходит для товара +6'); }
  if (row.bank_bucket === 'collection_visual') { matchScore += 4; reasons.push('подходит для визуальной посадочной +4'); }
  return { eligible, matchScore, reasons };
}

function strategyRank(row, strategy) {
  const match = Number(row.match_score || 0);
  const score = Number(row.score || 0);
  const volume = Number(row.avg_monthly_searches || 0);
  const competition = String(row.competition || '').toUpperCase();
  const competitionIndex = Number(row.competition_index || 0);
  const volumeBoost = volume >= 3000 ? 45 : volume >= 1000 ? 35 : volume >= 500 ? 26 : volume >= 200 ? 18 : volume >= 50 ? 10 : volume > 0 ? 5 : -25;
  const competitionOpportunity = competition === 'LOW' ? 35 : competition === 'MEDIUM' ? 18 : competition === 'HIGH' ? -18 : 0;
  const indexOpportunity = competitionIndex > 0 ? Math.max(-20, 24 - Math.round(competitionIndex / 4)) : 0;

  if (strategy === 'demand') return match * 1.2 + score + volumeBoost * 2;
  if (strategy === 'opportunity') return match * 1.35 + score + volumeBoost + competitionOpportunity + indexOpportunity;
  return match * 1.45 + score + volumeBoost + competitionOpportunity * 0.45;
}

function applyDnaMatching(rows, filters) {
  const active = hasActiveDna(filters);
  const enriched = rows.map((row) => {
    const match = matchRow(row, filters);
    return { ...row, match_score: active ? match.matchScore : null, match_reasons: match.reasons.join(' · '), strategy_rank: strategyRank({ ...row, match_score: active ? match.matchScore : 0 }, filters.strategy) };
  });
  const filtered = active ? enriched.filter((row) => matchRow(row, filters).eligible) : enriched;
  return filtered.sort((a, b) => {
    const strategyDiff = Number(b.strategy_rank || 0) - Number(a.strategy_rank || 0);
    if (strategyDiff) return strategyDiff;
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });
}

function asText(value, fallback = '—') { if (value == null || value === '') return fallback; if (Array.isArray(value)) return value.length ? value.join(', ') : fallback; return String(value); }
function formatNumber(value) { if (value == null) return '—'; const parsed = Number(value); if (!Number.isFinite(parsed)) return '—'; return new Intl.NumberFormat('en-US').format(parsed); }
function bucketCount(counts, bucket) { const value = counts?.[bucket]?.count; return value == null ? '—' : formatNumber(value); }
function countError(counts) { return Object.values(counts || {}).find((item) => item?.error)?.error || null; }
function labelFor(type, value) { if (type === 'component') return COMPONENT_LABELS[value] || value || '—'; if (type === 'material') return MATERIAL_LABELS[value] || value || '—'; if (type === 'event') return EVENT_LABELS[value] || value || '—'; return value || '—'; }
function competitionLabel(value) { const text = String(value || '').toUpperCase(); if (text === 'LOW') return 'Низкая'; if (text === 'MEDIUM') return 'Средняя'; if (text === 'HIGH') return 'Высокая'; if (text === 'UNKNOWN') return 'Нет данных'; return asText(value); }
function toneByBucket(value) { const text = asText(value, '').toLowerCase(); if (text.includes('product')) return 'success'; if (text.includes('commercial') || text.includes('visual') || text.includes('collection')) return 'gold'; if (text.includes('faq')) return 'warning'; return 'neutral'; }
function keywordUse(row) { const bucket = row.bank_bucket; if (bucket === 'product_or_alt') return 'Тег / ALT'; if (bucket === 'product') return 'Тег / заголовок'; if (bucket === 'commercial_collection') return 'Посадочная / meta'; if (bucket === 'visual_collection') return 'Визуальная посадочная'; if (bucket === 'collection') return 'Категория'; if (bucket === 'faq') return 'FAQ'; return 'Проверить'; }

function strategySignal(row) {
  const volume = Number(row.avg_monthly_searches || 0);
  const competition = String(row.competition || '').toUpperCase();
  const bucket = String(row.bank_bucket || '');
  if (volume > 0 && competition === 'LOW') return { label: 'низкая конкуренция', tone: 'success' };
  if (bucket.includes('product') && volume <= 500 && volume > 0 && competition !== 'HIGH') return { label: 'нишевый шанс', tone: 'success' };
  if (volume >= 1000 && competition === 'HIGH') return { label: 'большой спрос', tone: 'warning' };
  if (bucket.includes('collection')) return { label: 'для посадочной', tone: 'gold' };
  return { label: 'поддержка', tone: 'neutral' };
}

function productSeoStatus(product, filters, totalCount) {
  if (!product) return { label: 'товар не выбран', tone: 'neutral', note: 'выбери товар слева или работай вручную через ДНК-фильтры' };
  if (!filters.component && !filters.material && !filters.event) return { label: 'нужна ручная ДНК', tone: 'warning', note: 'авто-ДНК не распознала состав/материал/сценарий' };
  if (!totalCount) return { label: 'нет совпадений', tone: 'warning', note: 'сними один фильтр или поменяй тип слов' };
  return { label: 'готов к подбору', tone: 'success', note: 'есть одобренные слова под текущую ДНК' };
}

function buildHref(filters, patch = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.bucket && next.bucket !== 'all') params.set('bucket', next.bucket);
  if (next.strategy && next.strategy !== 'balanced') params.set('strategy', next.strategy);
  if (next.component) params.set('component', next.component);
  if (next.material) params.set('material', next.material);
  if (next.event) params.set('event', next.event);
  if (next.q) params.set('q', next.q);
  if (next.productId || next.product_id) params.set('product_id', next.productId || next.product_id);
  if (next.productQ || next.product_q) params.set('product_q', next.productQ || next.product_q);
  const query = params.toString();
  return query ? `/admin/listing-master?${query}` : '/admin/listing-master';
}
function productHref(product, filters = {}) { return buildHref(filters, { productId: product.id, component: '', material: '', event: '', q: '' }); }

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
  const border = tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${border} p-5 min-h-[138px]`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[38px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

function BucketLink({ bucket, active, counts, filters }) {
  const isActive = bucket === active;
  return <Link href={buildHref(filters, { bucket })} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>{BUCKET_LABELS[bucket] || bucket} · {bucketCount(counts, bucket)}</Link>;
}

function StrategyLink({ strategy, active, filters }) {
  const isActive = strategy === active;
  return <Link href={buildHref(filters, { strategy })} className={`rounded-2xl border p-4 transition-colors ${isActive ? 'border-[rgba(212,178,106,.60)] bg-[rgba(212,178,106,.11)]' : 'border-[rgba(216,214,211,.12)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}><div className="text-bone text-[13px]">{STRATEGY_LABELS[strategy]}</div><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{STRATEGY_NOTES[strategy]}</div></Link>;
}

function FilterChip({ type, value, filters, label }) {
  const active = filters[type] === value;
  const patch = { [type]: active ? '' : value };
  return <Link href={buildHref(filters, patch)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${active ? 'border-[rgba(108,183,138,.55)] bg-[rgba(108,183,138,.11)] text-[#a9dfbd]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone'}`}>{label || value}</Link>;
}

function PresetLink({ preset, filters }) {
  return <Link href={buildHref({ ...filters, bucket: preset.bucket, component: preset.component, material: preset.material, event: preset.event, q: '', productId: '' })} className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.055)] p-4 hover:border-[rgba(212,178,106,.45)] transition-colors"><div className="text-bone text-[13px]">{preset.label}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip tone="success">{labelFor('component', preset.component)}</Chip><Chip tone="gold">{labelFor('material', preset.material)}</Chip><Chip tone="warning">{labelFor('event', preset.event)}</Chip></div></Link>;
}

function ProductImage({ product, size = 'sm' }) {
  const classes = size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl';
  return <div className={`${classes} overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/25 flex items-center justify-center`}>{product?.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon size={size === 'lg' ? 18 : 16} className="text-[var(--smoke)]" />}</div>;
}

function ProductCard({ product, active, filters }) {
  const dna = inferProductDna(product);
  const hasDna = Boolean(dna.component || dna.material || dna.event);
  return <Link href={productHref(product, filters)} className={`grid grid-cols-[44px_1fr] gap-3 rounded-2xl border p-3 transition-colors ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.10)]' : 'border-[rgba(216,214,211,.10)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}><ProductImage product={product} /><div className="min-w-0"><div className="truncate text-[12px] text-bone">{product.title}</div><div className="mt-1 truncate text-[10px] text-[var(--bone-dim)]">{product.subtitle}</div><div className="mt-2 flex flex-wrap gap-1.5">{active ? <Chip tone="gold">выбран</Chip> : null}<Chip tone={hasDna ? 'success' : 'warning'}>{hasDna ? 'авто-ДНК' : 'ручная ДНК'}</Chip><Chip tone="neutral">не сохранено</Chip></div></div></Link>;
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
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · Listing Master · подбор SEO-слов</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Мастер листинга</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Выбираем товар, система определяет ДНК товара, затем подбирает одобренные слова из SEO-ядра. Сейчас это этап выбора ключей перед генерацией title, description, meta, FAQ и alt.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ядро <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div></div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить SEO-слова. Ответ базы: {error}</div> : null}
      {productsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Товары не загрузились: {productsError}</div> : null}
      {countsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из запросов к SEO-ядру не вернулся: {countsError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Metric icon={Database} label="Одобренных слов" value={bucketCount(counts, 'all')} note="Только approved из SEO-ядра." tone="success" /><Metric icon={PackageSearch} label="Товары" value={formatNumber(visibleProducts)} note={`Показано из ${formatNumber(totalProducts)}. Картинки: ${imageSource}.`} tone="success" /><Metric icon={Layers3} label="Товар / ALT" value={bucketCount(counts, 'product_or_alt')} note="Слова для тегов и alt." tone="success" /><Metric icon={SearchCheck} label="Найдено сейчас" value={formatNumber(totalCount ?? rows.length)} note={dnaActive ? 'По текущей ДНК и стратегии.' : 'Без ДНК-фильтра.'} tone="warning" /></div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6"><div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Как читать этот экран</div><p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Слева — поиск и выбор товара. Справа — ДНК товара: состав, материал/цвет и сценарий. Ниже — поиск внутри одобренного SEO-ядра. В таблице: “Совпадение” = насколько слово подходит выбранной ДНК, “Оценка” = внутренний SEO-балл, “Спрос” = средние поиски Google в месяц, “Конкуренция” = уровень из Google Keyword Planner, “Тип” = куда это слово лучше использовать.</p></div>

      <div className="grid xl:grid-cols-[440px_1fr] gap-6 mb-6">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 xl:sticky xl:top-6 self-start"><div className="flex items-center gap-2 eyebrow-gold mb-4"><PackageSearch size={14} /> Выбрать товар</div><form action="/admin/listing-master" className="mb-4 rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="flex gap-2"><input name="product_q" defaultValue={rawFilters.productQ} placeholder="Поиск товара: gold, harness, Etsy ID, первые слова" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-3 py-2 text-[12px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" /><button type="submit" className="btn-ghost"><Search size={13} /> Найти</button></div><div className="mt-2 flex flex-wrap gap-2"><Link href="/admin/listing-master" className="text-[11px] text-[var(--gold-warm)] hover:underline">Сбросить поиск и выбор</Link><span className="text-[11px] text-[var(--bone-dim)]">Найдено: {formatNumber(visibleProducts)}</span></div></form><div className="max-h-[calc(100vh-330px)] min-h-[420px] space-y-2 overflow-auto pr-1">{products.slice(0, 140).map((product) => <ProductCard key={product.id} product={product} active={selectedProduct?.id === product.id} filters={filters} />)}{!products.length && !productsError ? <div className="text-[12px] text-[var(--bone-dim)]">По этому поиску товаров не найдено.</div> : null}</div></div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2 eyebrow-gold"><SlidersHorizontal size={14} /> ДНК товара</div><Chip tone={seoStatus.tone}>{seoStatus.label}</Chip></div>{selectedProduct ? <div className="grid sm:grid-cols-[96px_1fr] gap-4 rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.055)] p-4 mb-4"><ProductImage product={selectedProduct} size="lg" /><div><div className="text-bone text-[18px] leading-snug">{selectedProduct.title}</div><div className="mt-1 text-[12px] text-[var(--bone-dim)]">{selectedProduct.subtitle}</div><div className="mt-3 flex flex-wrap gap-2"><Chip tone="success">состав: {labelFor('component', filters.component)}</Chip><Chip tone="gold">материал/цвет: {labelFor('material', filters.material)}</Chip><Chip tone="warning">сценарий: {labelFor('event', filters.event)}</Chip><Chip tone="neutral">SEO: не сохранено</Chip></div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Авто-ДНК: {labelFor('component', inferred.component)} / {labelFor('material', inferred.material)} / {labelFor('event', inferred.event)}. {seoStatus.note}</div></div></div> : <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mb-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Товар ещё не выбран. Можно работать вручную через фильтры, но нормальный сценарий — найти товар слева и выбрать его.</div>}<div className="space-y-4"><div><div className="eyebrow-dim mb-2">Состав / часть товара</div><div className="flex flex-wrap gap-2">{COMPONENTS.map((item) => <FilterChip key={item} type="component" value={item} filters={filters} label={labelFor('component', item)} />)}</div></div><div><div className="eyebrow-dim mb-2">Материал / цвет</div><div className="flex flex-wrap gap-2">{MATERIALS.map((item) => <FilterChip key={item} type="material" value={item} filters={filters} label={labelFor('material', item)} />)}</div></div><div><div className="eyebrow-dim mb-2">Сценарий / событие</div><div className="flex flex-wrap gap-2">{EVENTS.map((item) => <FilterChip key={item} type="event" value={item} filters={filters} label={labelFor('event', item)} />)}</div></div></div></div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-gold mb-3">Стратегия отбора слов</div><div className="grid gap-3 md:grid-cols-3">{STRATEGIES.map((strategy) => <StrategyLink key={strategy} strategy={strategy} active={filters.strategy} filters={filters} />)}</div></div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Поиск внутри одобренного SEO-ядра</div><div className="mb-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">Это не поиск товара. Это дополнительный фильтр по словам, которые уже прошли очистку и импортированы в Keyword Bank.</div><form action="/admin/listing-master" className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><input type="hidden" name="bucket" value={filters.bucket} /><input type="hidden" name="strategy" value={filters.strategy} /><input type="hidden" name="component" value={filters.component} /><input type="hidden" name="material" value={filters.material} /><input type="hidden" name="event" value={filters.event} /><input type="hidden" name="product_id" value={filters.productId} /><input type="hidden" name="product_q" value={filters.productQ} /><input name="q" defaultValue={filters.q} placeholder="Например: gold rave, burning man, chest harness" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-4 py-3 text-[13px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" /><div className="mt-3 flex flex-wrap gap-2"><button className="btn-ghost" type="submit">Применить поиск слов</button><Link href="/admin/listing-master" className="btn-ghost">Очистить товар/ДНК</Link></div></form><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{PRESETS.map((preset) => <PresetLink key={preset.label} preset={preset} filters={filters} />)}</div></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">{BUCKETS.map((bucket) => <BucketLink key={bucket} bucket={bucket} active={filters.bucket} counts={counts} filters={filters} />)}</div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow-dim">Активный подбор</div><h2 className="mt-2 text-bone text-[24px]">{BUCKET_LABELS[filters.bucket] || filters.bucket}</h2></div><div className="flex flex-wrap gap-2"><Chip tone="success">Показано {formatNumber(firstRows.length)}</Chip><Chip tone="warning">Найдено {formatNumber(totalCount ?? rows.length)}</Chip><Chip>Из выборки {formatNumber(rawCount ?? rows.length)}</Chip><Chip tone="gold">{STRATEGY_LABELS[filters.strategy]}</Chip></div></div><p className="mt-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Активные фильтры: товар={selectedProduct?.title || '—'} · состав={labelFor('component', filters.component)} · материал={labelFor('material', filters.material)} · сценарий={labelFor('event', filters.event)} · поиск слов={filters.q || '—'}.</p></div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.05fr_.44fr_.42fr_.60fr_.50fr_.55fr_.74fr_.82fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]"><div>Ключ</div><div>Совпадение</div><div>Оценка</div><div>Тип</div><div>Спрос</div><div>Конкуренция</div><div>Куда</div><div>Сигнал</div><div>Почему</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{firstRows.map((row, index) => { const signal = strategySignal(row); return <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.05fr_.44fr_.42fr_.60fr_.50fr_.55fr_.74fr_.82fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors"><div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div><div className="font-price text-[20px] text-[#a9dfbd]">{row.match_score == null ? '—' : row.match_score}</div><div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div><div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div><div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div><div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{competitionLabel(row.competition)}</Chip></div><div><Chip tone="gold">{keywordUse(row)}</Chip></div><div><Chip tone={signal.tone}>{signal.label}</Chip></div><div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.match_reasons || row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">Google: {formatNumber(row.avg_monthly_searches)} / {competitionLabel(row.competition)} · {asText(row.reason || row.notes, '')}</div></div></div>; })}{!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">По текущим фильтрам одобренных слов не найдено. Сними один фильтр, поменяй стратегию или выбери “Все типы”.</div> : null}</div></div>
    </section>
  </main>;
}
