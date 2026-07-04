// @ts-nocheck
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Database, ImageIcon, Layers3, PackageSearch, Save, Search, SearchCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LIMIT = 1200;
const DISPLAY_LIMIT = 220;
const PRODUCT_LIMIT = 500;
const KEYWORD_SNAPSHOT_LIMIT = 30;
const KEYWORD_COLUMNS = 'keyword,keyword_norm,bank_bucket,review_status,source_clusters,score,avg_monthly_searches,competition,competition_index,low_bid,high_bid,region,language,metric_source,page_type,role,role_label,last_checked,duplicate_count,reason,notes,source_files';
const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const FOCUS_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,color_options,category_label,world_label,primary_image_url,primary_image_alt,secondary_image_url,hover_image_url,media_gallery,parent_components_json,child_components_json,component_groups_json,component_count,child_component_count,needs_component_review_count,has_component_review_risk,seo_brief_readiness_status,seo_brief_priority_order,context_primary,context_secondary,persona,style_visual,style_mood,gender,audience_focus,focus_text';
const FALLBACK_STOREFRONT_VIEW = 'feya_commerce_v_step7_storefront_products_api_v4';
const FALLBACK_STOREFRONT_SELECT = 'canonical_product_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,color_options,category_label,world_label,primary_image_url,primary_image_alt,secondary_image_url,hover_image_url,media_gallery';
const KEYWORD_BANK_VIEW = 'vw_seo_keyword_bank_v1_for_listing_master';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';

const KEYWORD_TYPES = ['all', 'product', 'product_or_alt', 'collection', 'commercial_collection', 'visual_collection', 'faq'];
const STRATEGIES = ['demand', 'opportunity', 'niche'];
const DEFAULT_STRATEGY = 'opportunity';

const KEYWORD_TYPE_LABELS = {
  all: 'Все типы использования',
  product: 'Товарные слова',
  product_or_alt: 'Товар / ALT',
  collection: 'Категории',
  commercial_collection: 'Коммерческие посадочные',
  visual_collection: 'Визуальный поиск',
  faq: 'FAQ / вопросы',
};

const STRATEGY_LABELS = {
  demand: 'Больше спроса',
  opportunity: 'Перспективные',
  niche: 'Нишевые',
};

const STRATEGY_NOTES = {
  demand: 'Поднимает слова с большим средним спросом. Полезно для сильных категорий и широких углов.',
  opportunity: 'Ненулевой спрос + ниже конкуренция. Основной режим, чтобы не выбирать мёртвые слова и не лезть только в самые тяжёлые.',
  niche: 'Более узкие long-tail слова под конкретный товар, но с отсечкой против пустых запросов.',
};

const COMPONENTS = ['corset', 'bra', 'harness', 'bodysuit', 'skirt', 'panties', 'arms', 'shoulders', 'legs', 'mask', 'headpiece', 'choker', 'wings', 'spine', 'tail'];
const MATERIALS = ['gold', 'silver', 'black', 'white', 'mirror', 'acrylic', 'leather', 'vegan leather', 'metallic', 'holographic', 'reflective', 'chain'];
const EVENTS = ['rave', 'festival', 'burning man', 'stage', 'edm', 'edc', 'coachella', 'halloween', 'pride', 'drag', 'photoshoot'];

const COMPONENT_LABELS = {
  corset: 'корсет',
  bra: 'bra / лиф',
  harness: 'harness / портупея',
  bodysuit: 'боди / комбинезон',
  skirt: 'юбка',
  panties: 'panties / трусики',
  arms: 'руки / arms',
  shoulders: 'плечи / shoulders',
  legs: 'ноги / legs',
  mask: 'маска',
  headpiece: 'головной убор',
  choker: 'чокер',
  wings: 'крылья',
  spine: 'спина / spine',
  tail: 'хвост / tail',
};
const MATERIAL_LABELS = {
  gold: 'золото',
  silver: 'серебро',
  black: 'чёрный',
  white: 'белый',
  mirror: 'зеркальный',
  acrylic: 'акрил',
  leather: 'кожа',
  'vegan leather': 'vegan leather',
  metallic: 'металлик',
  holographic: 'голографик',
  reflective: 'отражающий',
  chain: 'цепи / chain detail',
};
const EVENT_LABELS = {
  rave: 'rave',
  festival: 'festival',
  'burning man': 'Burning Man',
  stage: 'stage / выступление',
  edm: 'EDM',
  edc: 'EDC',
  coachella: 'Coachella',
  halloween: 'Halloween',
  pride: 'Pride',
  drag: 'drag',
  photoshoot: 'photoshoot',
};

const MATCH_SYNONYMS = {
  corset: ['corset', 'overbust', 'underbust', 'bodice'],
  bra: ['bra', 'bralette', 'bustier'],
  harness: ['harness', 'chest harness', 'body harness', 'chain harness', 'garter harness'],
  bodysuit: ['bodysuit', 'body suit', 'catsuit', 'leotard', 'jumpsuit'],
  skirt: ['skirt', 'mini skirt', 'open skirt'],
  panties: ['panties', 'underwear', 'briefs'],
  arms: ['arms', 'arm', 'bracelet', 'bracelets', 'bracer', 'bracers', 'arm cuff', 'arm cuffs', 'armlet', 'armlets', 'glove', 'gloves', 'bicep', 'forearm'],
  shoulders: ['shoulder', 'shoulders', 'shoulder piece', 'shoulder_piece', 'shoulder armor', 'shoulder armour'],
  legs: ['legs', 'leg', 'garter', 'garters', 'leg covers', 'leg cover', 'leg harness', 'leg armor', 'leg armour', 'leg warmers'],
  mask: ['mask', 'face mask', 'futuristic mask'],
  headpiece: ['headpiece', 'head piece', 'horn', 'horns', 'crown', 'halo', 'headdress', 'cleopatra'],
  choker: ['choker', 'collar', 'neck collar', 'neck piece'],
  wings: ['wings', 'wing'],
  spine: ['spine', 'back piece', 'backpiece'],
  tail: ['tail'],
  gold: ['gold', 'golden'],
  silver: ['silver', 'chrome'],
  black: ['black'],
  white: ['white'],
  mirror: ['mirror', 'mirrored'],
  acrylic: ['acrylic'],
  leather: ['leather', 'faux leather'],
  'vegan leather': ['vegan leather', 'faux leather'],
  metallic: ['metallic', 'metal', 'futuristic'],
  holographic: ['holographic', 'holo', 'iridescent'],
  reflective: ['reflective', 'shiny'],
  chain: ['chain', 'chains', 'body chain', 'chain detail'],
  rave: ['rave', 'edm'],
  festival: ['festival', 'coachella', 'tomorrowland', 'electric forest'],
  'burning man': ['burning man', 'burningman'],
  stage: ['stage', 'performance', 'performer', 'dance performance', 'show'],
  edm: ['edm', 'rave'],
  edc: ['edc', 'electric daisy carnival'],
  coachella: ['coachella', 'festival'],
  halloween: ['halloween'],
  pride: ['pride'],
  drag: ['drag', 'drag queen', 'drag king'],
  photoshoot: ['photoshoot', 'photo shoot'],
};

const PRESETS = [
  { label: 'Золотой rave harness', type: 'product_or_alt', component: 'harness', material: 'gold', event: 'rave' },
  { label: 'Серебряный stage bodysuit', type: 'product_or_alt', component: 'bodysuit', material: 'silver', event: 'stage' },
  { label: 'Золотые плечи Burning Man', type: 'product_or_alt', component: 'shoulders', material: 'gold', event: 'burning man' },
  { label: 'Футуристическая маска для сцены', type: 'product', component: 'mask', material: 'metallic', event: 'stage' },
  { label: 'Золотой festival headpiece', type: 'product_or_alt', component: 'headpiece', material: 'gold', event: 'festival' },
];

async function saveDecisionAction(formData) {
  'use server';
  const productId = stringParam(formData.get('canonical_product_id'), '').trim();
  const supabase = getSupabaseServiceClient();
  if (!productId || !supabase) redirect('/admin/listing-master?saved=error');

  const manualFocus = {
    component: normalizeFilter(stringParam(formData.get('component'), '')),
    material: normalizeFilter(stringParam(formData.get('material'), '')),
    event: normalizeFilter(stringParam(formData.get('event'), '')),
    q: normalizeFilter(stringParam(formData.get('q'), '')),
    keyword_type: stringParam(formData.get('type'), 'all'),
  };

  const selectedStrategy = STRATEGIES.includes(stringParam(formData.get('strategy'), DEFAULT_STRATEGY)) ? stringParam(formData.get('strategy'), DEFAULT_STRATEGY) : DEFAULT_STRATEGY;
  const payload = {
    canonical_product_id: productId,
    product_slug: stringParam(formData.get('product_slug'), '') || null,
    matched_etsy_listing_id: stringParam(formData.get('matched_etsy_listing_id'), '') || null,
    auto_focus_json: parseJsonField(formData.get('auto_focus_json'), {}),
    manual_focus_json: manualFocus,
    selected_strategy: selectedStrategy,
    selected_keywords_json: parseJsonField(formData.get('selected_keywords_json'), []),
    rejected_keywords_json: [],
    decision_status: 'draft',
    decision_note: 'Сохранено из Мастера листинга перед генерацией SEO-текста',
  };

  const { error } = await supabase.from(DECISIONS_TABLE).insert(payload);
  const redirectFilters = {
    type: manualFocus.keyword_type,
    strategy: selectedStrategy,
    component: manualFocus.component,
    material: manualFocus.material,
    event: manualFocus.event,
    q: manualFocus.q,
    productId,
  };
  redirect(`${buildHref(redirectFilters)}&saved=${error ? 'error' : 'ok'}`);
}

async function countKeywordType(supabase, type) {
  let query = supabase.from(KEYWORD_BANK_VIEW).select('keyword_norm', { count: 'exact', head: true });
  if (type !== 'all') query = query.eq('bank_bucket', type);
  const { count, error } = await query;
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function loadDecisionMap() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return new Map();
  const { data } = await supabase
    .from(DECISIONS_TABLE)
    .select('canonical_product_id,decision_status,selected_strategy,updated_at,created_at')
    .limit(2000);
  const map = new Map();
  (data || [])
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .forEach((row) => {
      if (row?.canonical_product_id && !map.has(row.canonical_product_id)) map.set(row.canonical_product_id, row);
    });
  return map;
}

async function loadProducts(productQuery = '', productCategory = '') {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return { products: [], totalProducts: 0, visibleProducts: 0, categories: [], error: getMissingSupabaseEnvMessage(), imageSource: 'none' };

  let result = await supabase.from(FOCUS_VIEW).select(FOCUS_SELECT).limit(PRODUCT_LIMIT);
  let imageSource = 'Product Focus v1';
  let focusError = null;

  if (result.error) {
    focusError = result.error.message;
    result = await supabase.from(FALLBACK_STOREFRONT_VIEW).select(FALLBACK_STOREFRONT_SELECT).limit(PRODUCT_LIMIT);
    imageSource = result.error ? 'ошибка Product Focus' : 'fallback storefront v4';
  }

  if (result.error) return { products: [], totalProducts: 0, visibleProducts: 0, categories: [], error: `${focusError || 'Product Focus'} / ${result.error.message}`, imageSource };

  const decisions = await loadDecisionMap();
  const allProducts = (result.data || []).map((row) => {
    const product = normalizeProductFocus(row);
    product.decision = decisions.get(product.id) || null;
    return product;
  }).sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));

  const categories = buildProductCategories(allProducts);
  const safeCategory = productCategory && categories.some((item) => item.key === productCategory) ? productCategory : '';
  const categoryFiltered = safeCategory ? allProducts.filter((product) => product.categoryKey === safeCategory) : allProducts;
  const tokens = searchTokens(productQuery);
  const products = tokens.length ? categoryFiltered.filter((product) => tokens.every((token) => product.text.includes(token))) : categoryFiltered;

  return { products, totalProducts: allProducts.length, visibleProducts: products.length, categories, activeCategory: safeCategory, error: focusError ? `Product Focus v1 недоступен, включён fallback: ${focusError}` : null, imageSource };
}

function normalizeProductFocus(row) {
  const title = row.card_title || row.h1 || row.seo_title || row.product_slug || row.canonical_product_id;
  const parentComponents = arrayValues(row.parent_components_json);
  const childComponents = arrayValues(row.child_components_json);
  const componentGroups = arrayValues(row.component_groups_json);
  const categoryName = row.category_label || row.product_type || 'Без категории';
  const subtitle = [categoryName, row.world_label, row.canonical_color_label || row.color].filter(Boolean).join(' · ');
  const text = [row.focus_text, title, subtitle, row.product_type, row.material, row.canonical_color_label, row.color, row.category_label, row.world_label, row.primary_image_alt, parentComponents.join(' '), childComponents.join(' '), componentGroups.join(' '), row.canonical_product_id, row.matched_etsy_listing_id].filter(Boolean).join(' ').toLowerCase();
  return {
    id: row.canonical_product_id,
    title,
    subtitle,
    productType: row.product_type || '',
    materialRaw: row.material || '',
    colorRaw: row.canonical_color_label || row.color || '',
    categoryLabel: categoryName,
    categoryKey: categoryKey(categoryName),
    worldLabel: row.world_label || '',
    readiness: row.seo_brief_readiness_status || '',
    imageUrl: row.primary_image_url || '',
    imageAlt: row.primary_image_alt || '',
    imageSource: 'listing_master_focus_v1',
    slug: row.product_slug || row.canonical_product_id,
    etsyId: row.matched_etsy_listing_id || '',
    parentComponents,
    childComponents,
    componentGroups,
    componentCount: Number(row.component_count || 0),
    childComponentCount: Number(row.child_component_count || 0),
    needsComponentReviewCount: Number(row.needs_component_review_count || 0),
    hasComponentReviewRisk: Boolean(row.has_component_review_risk),
    text,
  };
}

async function loadRows(filters) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], totalCount: null, counts: {}, rawCount: null, error: getMissingSupabaseEnvMessage() };

  const safeType = KEYWORD_TYPES.includes(filters.type) ? filters.type : 'all';
  const countEntries = await Promise.all(KEYWORD_TYPES.map(async (item) => [item, await countKeywordType(supabase, item)]));
  const counts = Object.fromEntries(countEntries);

  let query = supabase.from(KEYWORD_BANK_VIEW).select(KEYWORD_COLUMNS, { count: 'exact' }).limit(LIMIT);
  if (safeType !== 'all') query = query.eq('bank_bucket', safeType);

  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: null, counts, rawCount: count ?? null, error: error.message };

  const matched = applyDnaMatching(data || [], filters);
  return { rows: matched, totalCount: matched.length, counts, rawCount: count ?? 0, error: null };
}

function currentFilters(searchParams) {
  const type = stringParam(searchParams?.type || searchParams?.bucket, 'all');
  const strategy = stringParam(searchParams?.strategy, DEFAULT_STRATEGY);
  return {
    type: KEYWORD_TYPES.includes(type) ? type : 'all',
    strategy: STRATEGIES.includes(strategy) ? strategy : DEFAULT_STRATEGY,
    component: normalizeFilter(stringParam(searchParams?.component, '')),
    material: normalizeFilter(stringParam(searchParams?.material, '')),
    event: normalizeFilter(stringParam(searchParams?.event, '')),
    q: stringParam(searchParams?.q, '').trim().toLowerCase(),
    productId: stringParam(searchParams?.product_id, '').trim(),
    productQ: stringParam(searchParams?.product_q, '').trim().toLowerCase(),
    productCategory: normalizeFilter(stringParam(searchParams?.product_category, '')),
    saved: stringParam(searchParams?.saved, '').trim(),
  };
}

function stringParam(value, fallback = '') { if (typeof value === 'string') return value; if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; return fallback; }
function parseJsonField(value, fallback) { try { return JSON.parse(stringParam(value, '')); } catch { return fallback; } }
function arrayValues(value) { if (Array.isArray(value)) return value.map(String).filter(Boolean); if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean); } catch { return value ? [value] : []; } } return []; }
function categoryKey(value) { return normalizeFilter(value).replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
function buildProductCategories(products) { const map = new Map(); products.forEach((product) => { const key = product.categoryKey || 'без-категории'; const label = product.categoryLabel || 'Без категории'; const current = map.get(key) || { key, label, count: 0 }; current.count += 1; map.set(key, current); }); return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); }
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
  return { component: firstMatch(text, COMPONENTS), material: firstMatch(text, MATERIALS), event: firstMatch(text, EVENTS), q: '' };
}
function applyProductAutoDna(filters, product) { const inferred = inferProductDna(product); return { ...filters, component: filters.component || inferred.component, material: filters.material || inferred.material, event: filters.event || inferred.event, inferred }; }

function matchRow(row, filters) {
  const text = rowText(row);
  const componentOk = matchesValue(text, filters.component);
  const materialOk = matchesValue(text, filters.material);
  const eventOk = matchesValue(text, filters.event);
  const queryOk = queryMatches(text, filters.q);
  const eligible = componentOk && materialOk && eventOk && queryOk;
  let matchScore = 0;
  const reasons = [];
  if (filters.component && componentOk) { matchScore += 45; reasons.push(`состав +45: ${labelFor('component', filters.component)}`); }
  if (filters.material && materialOk) { matchScore += 35; reasons.push(`материал/цвет +35: ${labelFor('material', filters.material)}`); }
  if (filters.event && eventOk) { matchScore += 35; reasons.push(`сценарий +35: ${labelFor('event', filters.event)}`); }
  if (filters.q && queryOk) { const qScore = Math.min(30, searchTokens(filters.q).length * 10); matchScore += qScore; reasons.push(`поиск +${qScore}: ${filters.q}`); }
  if (row.bank_bucket === 'product_or_alt') { matchScore += 8; reasons.push('товар/ALT +8'); }
  if (row.bank_bucket === 'product') { matchScore += 6; reasons.push('товар +6'); }
  if (row.bank_bucket === 'visual_collection') { matchScore += 4; reasons.push('визуальный поиск +4'); }
  return { eligible, matchScore, reasons };
}

function strategyRank(row, strategy) {
  const match = Number(row.match_score || 0);
  const score = Number(row.score || 0);
  const volume = Number(row.avg_monthly_searches || 0);
  const competition = String(row.competition || '').toUpperCase();
  const competitionIndex = Number(row.competition_index || 0);
  const bucket = String(row.bank_bucket || '');
  const keyword = String(row.keyword || '').toLowerCase();
  const volumeBoost = volume >= 3000 ? 45 : volume >= 1000 ? 35 : volume >= 500 ? 26 : volume >= 200 ? 18 : volume >= 50 ? 10 : volume > 0 ? 5 : -25;
  const competitionOpportunity = competition === 'LOW' ? 35 : competition === 'MEDIUM' ? 18 : competition === 'HIGH' ? -18 : 0;
  const indexOpportunity = competitionIndex > 0 ? Math.max(-20, 24 - Math.round(competitionIndex / 4)) : 0;
  const longTailBoost = keyword.split(/\s+/).length >= 3 ? 22 : 0;
  const commercialIntentBoost = /buy|price|cost|order|shop|for sale|outfit|costume|set|wear|clothing/.test(keyword) || bucket.includes('commercial') ? 16 : 0;
  if (strategy === 'demand') return match * 1.15 + score + volumeBoost * 2 + commercialIntentBoost * 0.35;
  if (strategy === 'niche') return match * 1.7 + score + longTailBoost + competitionOpportunity + commercialIntentBoost * 0.25 - Math.max(0, volumeBoost - 30);
  return match * 1.35 + score + volumeBoost + competitionOpportunity + indexOpportunity + commercialIntentBoost * 0.4;
}
function applyDnaMatching(rows, filters) { const active = hasActiveDna(filters); const enriched = rows.map((row) => { const match = matchRow(row, filters); const matchScore = active ? match.matchScore : null; return { ...row, match_score: matchScore, match_reasons: match.reasons.join(' · '), strategy_rank: strategyRank({ ...row, match_score: active ? match.matchScore : 0 }, filters.strategy) }; }); const filtered = active ? enriched.filter((row) => matchRow(row, filters).eligible) : enriched; return filtered.sort((a, b) => { const strategyDiff = Number(b.strategy_rank || 0) - Number(a.strategy_rank || 0); if (strategyDiff) return strategyDiff; const scoreDiff = Number(b.score || 0) - Number(a.score || 0); if (scoreDiff) return scoreDiff; const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0); if (volumeDiff) return volumeDiff; return String(a.keyword || '').localeCompare(String(b.keyword || '')); }); }

function asText(value, fallback = '—') { if (value == null || value === '') return fallback; if (Array.isArray(value)) return value.length ? value.join(', ') : fallback; return String(value); }
function formatNumber(value) { if (value == null) return '—'; const parsed = Number(value); if (!Number.isFinite(parsed)) return '—'; return new Intl.NumberFormat('en-US').format(parsed); }
function keywordTypeCount(counts, type) { const value = counts?.[type]?.count; return value == null ? '—' : formatNumber(value); }
function countError(counts) { return Object.values(counts || {}).find((item) => item?.error)?.error || null; }
function labelFor(type, value) { if (type === 'component') return COMPONENT_LABELS[value] || value || '—'; if (type === 'material') return MATERIAL_LABELS[value] || value || '—'; if (type === 'event') return EVENT_LABELS[value] || value || '—'; return value || '—'; }
function competitionLabel(value) { const text = String(value || '').toUpperCase(); if (text === 'LOW') return 'Низкая'; if (text === 'MEDIUM') return 'Средняя'; if (text === 'HIGH') return 'Высокая'; if (text === 'UNKNOWN') return 'Нет данных'; return asText(value); }
function toneByKeywordType(value) { const text = asText(value, '').toLowerCase(); if (text.includes('product')) return 'success'; if (text.includes('commercial') || text.includes('visual') || text.includes('collection')) return 'gold'; if (text.includes('faq')) return 'warning'; return 'neutral'; }
function keywordUse(row) { const type = row.bank_bucket; if (type === 'product_or_alt') return 'Товар / ALT'; if (type === 'product') return 'Title / описание'; if (type === 'commercial_collection') return 'Посадочная / meta'; if (type === 'visual_collection') return 'ALT / картинки'; if (type === 'collection') return 'Категория'; if (type === 'faq') return 'FAQ'; return 'Проверить'; }
function keywordSnapshot(rows) { return rows.slice(0, KEYWORD_SNAPSHOT_LIMIT).map((row) => ({ keyword: row.keyword, keyword_norm: row.keyword_norm, bank_bucket: row.bank_bucket, score: row.score, avg_monthly_searches: row.avg_monthly_searches, competition: row.competition, match_score: row.match_score, strategy_rank: row.strategy_rank, reason: row.match_reasons || row.reason || row.notes || '' })); }
function autoFocusSnapshot(product, inferred) { return { inferred, product: product ? { canonical_product_id: product.id, slug: product.slug, etsy_id: product.etsyId, title: product.title, product_type: product.productType, material: product.materialRaw, color: product.colorRaw, category_label: product.categoryLabel, world_label: product.worldLabel, parent_components: product.parentComponents, child_components: product.childComponents, component_groups: product.componentGroups, has_component_review_risk: product.hasComponentReviewRisk, needs_component_review_count: product.needsComponentReviewCount } : null }; }
function savedMessage(value) { if (value === 'ok') return { tone: 'success', text: 'Черновик решения сохранён. Теперь его можно использовать для SEO-задания и будущей аналитики.' }; if (value === 'error') return { tone: 'warning', text: 'Черновик не сохранился. Нужно проверить серверный ключ Supabase или доступ к таблице решений.' }; return null; }
function decisionLabel(decision) { if (!decision) return null; const status = String(decision.decision_status || '').toLowerCase(); if (status === 'draft') return { text: 'черновик решения', tone: 'warning' }; if (status === 'approved') return { text: 'подтверждено', tone: 'success' }; if (status === 'applied') return { text: 'применено', tone: 'success' }; if (status === 'ready_for_generation') return { text: 'готово к тексту', tone: 'gold' }; return { text: status || 'есть решение', tone: 'gold' }; }
function strategySignal(row) { const volume = Number(row.avg_monthly_searches || 0); const competition = String(row.competition || '').toUpperCase(); const type = String(row.bank_bucket || ''); const keyword = String(row.keyword || '').toLowerCase(); if (/buy|price|cost|order|shop|for sale/.test(keyword) || type.includes('commercial')) return { label: 'покупательский intent', tone: 'gold' }; if (volume > 0 && competition === 'LOW') return { label: 'лёгкий шанс', tone: 'success' }; if (type.includes('product') && volume <= 500 && volume > 0 && competition !== 'HIGH') return { label: 'нишевая точка', tone: 'success' }; if (volume >= 1000 && competition === 'HIGH') return { label: 'большой спрос', tone: 'warning' }; if (type.includes('visual')) return { label: 'визуальный слой', tone: 'gold' }; if (type.includes('collection')) return { label: 'для посадочной', tone: 'gold' }; return { label: 'поддержка', tone: 'neutral' }; }
function productSeoStatus(product, filters, totalCount) { if (!product) return { label: 'товар не выбран', tone: 'neutral', note: 'выбери товар слева или работай вручную через ДНК-фильтры' }; if (!filters.component && !filters.material && !filters.event) return { label: 'нужна ручная ДНК', tone: 'warning', note: 'авто-ДНК не распознала состав/материал/сценарий' }; if (!totalCount) return { label: 'нет совпадений', tone: 'warning', note: 'сними один фильтр или поменяй тип использования слов' }; return { label: 'готов к черновику', tone: 'success', note: 'есть одобренные слова под текущий фокус товара' }; }
function buildHref(filters, patch = {}) { const next = { ...filters, ...patch }; const params = new URLSearchParams(); if (next.type && next.type !== 'all') params.set('type', next.type); if (next.strategy && next.strategy !== DEFAULT_STRATEGY) params.set('strategy', next.strategy); if (next.component) params.set('component', next.component); if (next.material) params.set('material', next.material); if (next.event) params.set('event', next.event); if (next.q) params.set('q', next.q); if (next.productId || next.product_id) params.set('product_id', next.productId || next.product_id); if (next.productQ || next.product_q) params.set('product_q', next.productQ || next.product_q); if (next.productCategory || next.product_category) params.set('product_category', next.productCategory || next.product_category); const query = params.toString(); return query ? `/admin/listing-master?${query}` : '/admin/listing-master'; }
function productHref(product, filters = {}) { return buildHref(filters, { productId: product.id, component: '', material: '', event: '', q: '' }); }

function Chip({ children, tone = 'neutral' }) { const className = tone === 'success' ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]' : tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : tone === 'gold' ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>; }
function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) { const border = tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]'; return <div className={`rounded-2xl border ${border} p-5 min-h-[138px]`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[38px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>; }
function KeywordTypeLink({ type, active, counts, filters }) { const isActive = type === active; return <Link href={buildHref(filters, { type })} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>{KEYWORD_TYPE_LABELS[type] || type} · {keywordTypeCount(counts, type)}</Link>; }
function ProductCategoryLink({ item, active, filters }) { const isActive = item.key === active; return <Link href={buildHref(filters, { productCategory: item.key, productId: '', component: '', material: '', event: '', q: '' })} className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.60)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>{item.label} · {item.count}</Link>; }
function StrategyLink({ strategy, active, filters }) { const isActive = strategy === active; return <Link href={buildHref(filters, { strategy })} className={`rounded-2xl border p-4 transition-colors ${isActive ? 'border-[rgba(212,178,106,.60)] bg-[rgba(212,178,106,.11)]' : 'border-[rgba(216,214,211,.12)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}><div className="text-bone text-[13px]">{STRATEGY_LABELS[strategy]}</div><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{STRATEGY_NOTES[strategy]}</div></Link>; }
function FilterChip({ type, value, filters, label }) { const active = filters[type] === value; const patch = { [type]: active ? '' : value }; return <Link href={buildHref(filters, patch)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${active ? 'border-[rgba(108,183,138,.55)] bg-[rgba(108,183,138,.11)] text-[#a9dfbd]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone'}`}>{label || value}</Link>; }
function PresetLink({ preset, filters }) { return <Link href={buildHref({ ...filters, type: preset.type, component: preset.component, material: preset.material, event: preset.event, q: '', productId: '' })} className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.055)] p-4 hover:border-[rgba(212,178,106,.45)] transition-colors"><div className="text-bone text-[13px]">{preset.label}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip tone="success">{labelFor('component', preset.component)}</Chip><Chip tone="gold">{labelFor('material', preset.material)}</Chip><Chip tone="warning">{labelFor('event', preset.event)}</Chip></div></Link>; }
function ProductImage({ product, size = 'sm' }) { const classes = size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl'; return <div className={`${classes} overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/25 flex items-center justify-center`}>{product?.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon size={size === 'lg' ? 18 : 16} className="text-[var(--smoke)]" />}</div>; }
function ProductCard({ product, active, filters }) { const dna = inferProductDna(product); const hasDna = Boolean(dna.component || dna.material || dna.event); const decision = decisionLabel(product.decision); return <Link href={productHref(product, filters)} className={`grid grid-cols-[44px_1fr] gap-3 rounded-2xl border p-3 transition-colors ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.10)]' : 'border-[rgba(216,214,211,.10)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}><ProductImage product={product} /><div className="min-w-0"><div className="truncate text-[12px] text-bone">{product.title}</div><div className="mt-1 truncate text-[10px] text-[var(--bone-dim)]">{product.subtitle}</div><div className="mt-2 flex flex-wrap gap-1.5">{active ? <Chip tone="gold">выбран</Chip> : null}<Chip tone={hasDna ? 'success' : 'warning'}>{hasDna ? 'авто-фокус' : 'ручной фокус'}</Chip>{decision ? <Chip tone={decision.tone}>{decision.text}</Chip> : null}{product.hasComponentReviewRisk ? <Chip tone="warning">проверить ДНК</Chip> : null}</div></div></Link>; }

export default async function AdminListingMasterPage({ searchParams }) {
  const rawFilters = currentFilters(searchParams);
  const { products, totalProducts, visibleProducts, categories, activeCategory, error: productsError, imageSource } = await loadProducts(rawFilters.productQ, rawFilters.productCategory);
  const selectedProduct = products.find((product) => product.id === rawFilters.productId) || null;
  const filters = applyProductAutoDna(rawFilters, selectedProduct);
  const { rows, totalCount, counts, rawCount, error } = await loadRows(filters);
  const firstRows = rows.slice(0, DISPLAY_LIMIT);
  const countsError = countError(counts);
  const dnaActive = hasActiveDna(filters);
  const inferred = filters.inferred || {};
  const seoStatus = productSeoStatus(selectedProduct, filters, totalCount ?? rows.length);
  const saved = savedMessage(rawFilters.saved);
  const autoFocus = autoFocusSnapshot(selectedProduct, inferred);
  const selectedKeywords = keywordSnapshot(firstRows);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · Мастер листинга · подбор SEO-слов</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Мастер листинга</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Сначала система предлагает фокус из безопасного представления данных. Ты можешь поправить состав, материал/цвет, событие и режим. Потом сохраняем черновик решения, чтобы дальше подготовить SEO-задание, предпросмотр текста и проверку качества перед утверждением.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ядро <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/briefs" className="btn-ghost">SEO-задание <ArrowUpRight size={13} /></Link></div></div>
      {saved ? <div className={`rounded-2xl border p-5 text-[var(--bone-dim)] mb-7 ${saved.tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]'}`}>{saved.text}</div> : null}
      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить SEO-слова. Ответ базы: {error}</div> : null}
      {productsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Предупреждение по товарам: {productsError}</div> : null}
      {countsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из запросов к SEO-ядру не вернулся: {countsError}</div> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Metric icon={Database} label="Одобренных слов" value={keywordTypeCount(counts, 'all')} note="Только approved из SEO-ядра." tone="success" /><Metric icon={PackageSearch} label="Товары" value={formatNumber(visibleProducts)} note={`Показано из ${formatNumber(totalProducts)}. Источник: ${imageSource}.`} tone="success" /><Metric icon={Layers3} label="Товар / ALT" value={keywordTypeCount(counts, 'product_or_alt')} note="Слова для карточки и картинок." tone="success" /><Metric icon={SearchCheck} label="Найдено сейчас" value={formatNumber(totalCount ?? rows.length)} note={dnaActive ? 'По текущему фокусу и режиму.' : 'Без ДНК-фильтра.'} tone="warning" /></div>
      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6"><div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Как читать этот экран</div><p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Фокус товара берётся из безопасного представления данных: название, тип товара, материал, цвет, мир/категория, изображения и component mapping. Ручная правка сохраняется как черновик решения. “SEO-задание” — это brief для будущей генерации текста. “Проверка качества” — это human QA: ручная проверка смысла, правды, воды, дублей и человеческого стиля перед утверждением.</p></div>
      <div className="grid xl:grid-cols-[440px_1fr] gap-6 mb-6"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 xl:sticky xl:top-6 self-start"><div className="flex items-center gap-2 eyebrow-gold mb-4"><PackageSearch size={14} /> Выбрать товар</div><form action="/admin/listing-master" className="mb-4 rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><input type="hidden" name="product_category" value={activeCategory || ''} /><div className="flex gap-2"><input name="product_q" defaultValue={rawFilters.productQ} placeholder="Поиск товара: gold, harness, Etsy ID, первые слова" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-3 py-2 text-[12px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" /><button type="submit" className="btn-ghost"><Search size={13} /> Найти</button></div><div className="mt-2 flex flex-wrap gap-2"><Link href="/admin/listing-master" className="text-[11px] text-[var(--gold-warm)] hover:underline">Сбросить поиск и выбор</Link><span className="text-[11px] text-[var(--bone-dim)]">Найдено: {formatNumber(visibleProducts)}</span></div></form><div className="mb-4"><div className="eyebrow-dim mb-2">Категории товара</div><div className="flex flex-wrap gap-2"><Link href={buildHref(rawFilters, { productCategory: '', productId: '', component: '', material: '', event: '', q: '' })} className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${!activeCategory ? 'border-[rgba(212,178,106,.60)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)]'}`}>Все · {formatNumber(totalProducts)}</Link>{categories.slice(0, 10).map((item) => <ProductCategoryLink key={item.key} item={item} active={activeCategory} filters={rawFilters} />)}</div></div><div className="max-h-[calc(100vh-390px)] min-h-[360px] space-y-2 overflow-auto pr-1">{products.slice(0, 140).map((product) => <ProductCard key={product.id} product={product} active={selectedProduct?.id === product.id} filters={filters} />)}{!products.length && !productsError ? <div className="text-[12px] text-[var(--bone-dim)]">По этому поиску товаров не найдено.</div> : null}</div></div>
        <div className="space-y-6"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2 eyebrow-gold"><SlidersHorizontal size={14} /> Фокус товара</div><Chip tone={seoStatus.tone}>{seoStatus.label}</Chip></div>{selectedProduct ? <div className="grid sm:grid-cols-[96px_1fr] gap-4 rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.055)] p-4 mb-4"><ProductImage product={selectedProduct} size="lg" /><div><div className="text-bone text-[18px] leading-snug">{selectedProduct.title}</div><div className="mt-1 text-[12px] text-[var(--bone-dim)]">{selectedProduct.subtitle}</div><div className="mt-3 flex flex-wrap gap-2"><Chip tone="success">состав: {labelFor('component', filters.component)}</Chip><Chip tone="gold">материал/цвет: {labelFor('material', filters.material)}</Chip><Chip tone="warning">сценарий: {labelFor('event', filters.event)}</Chip>{decisionLabel(selectedProduct.decision) ? <Chip tone={decisionLabel(selectedProduct.decision).tone}>{decisionLabel(selectedProduct.decision).text}</Chip> : null}{selectedProduct.hasComponentReviewRisk ? <Chip tone="warning">ДНК needs review: {selectedProduct.needsComponentReviewCount}</Chip> : null}</div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Источник: {selectedProduct.categoryLabel || '—'} · {selectedProduct.worldLabel || '—'} · components: {selectedProduct.parentComponents.join(', ') || '—'} / {selectedProduct.childComponents.join(', ') || '—'}. {seoStatus.note}</div></div></div> : <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mb-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Товар ещё не выбран. Можно работать вручную через фильтры, но нормальный сценарий — найти товар слева и выбрать его.</div>}<div className="space-y-4"><div><div className="eyebrow-dim mb-2">Состав / часть товара</div><div className="flex flex-wrap gap-2">{COMPONENTS.map((item) => <FilterChip key={item} type="component" value={item} filters={filters} label={labelFor('component', item)} />)}</div></div><div><div className="eyebrow-dim mb-2">Материал / цвет / деталь</div><div className="flex flex-wrap gap-2">{MATERIALS.map((item) => <FilterChip key={item} type="material" value={item} filters={filters} label={labelFor('material', item)} />)}</div></div><div><div className="eyebrow-dim mb-2">Сценарий / событие</div><div className="flex flex-wrap gap-2">{EVENTS.map((item) => <FilterChip key={item} type="event" value={item} filters={filters} label={labelFor('event', item)} />)}</div></div></div></div>
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-gold mb-3">Режим подбора слов</div><div className="grid gap-3 md:grid-cols-3">{STRATEGIES.map((strategy) => <StrategyLink key={strategy} strategy={strategy} active={filters.strategy} filters={filters} />)}</div></div>
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Поиск внутри одобренного SEO-ядра</div><form action="/admin/listing-master" className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><input type="hidden" name="type" value={filters.type} /><input type="hidden" name="strategy" value={filters.strategy} /><input type="hidden" name="component" value={filters.component} /><input type="hidden" name="material" value={filters.material} /><input type="hidden" name="event" value={filters.event} /><input type="hidden" name="product_id" value={filters.productId} /><input type="hidden" name="product_q" value={filters.productQ} /><input type="hidden" name="product_category" value={filters.productCategory} /><input name="q" defaultValue={filters.q} placeholder="Например: gold rave, burning man, chest harness" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-4 py-3 text-[13px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" /><div className="mt-3 flex flex-wrap gap-2"><button className="btn-ghost" type="submit">Применить поиск слов</button><Link href="/admin/listing-master" className="btn-ghost">Очистить товар/ДНК</Link></div></form><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{PRESETS.map((preset) => <PresetLink key={preset.label} preset={preset} filters={filters} />)}</div></div>
          <form action={saveDecisionAction} className="rounded-2xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.055)] p-5"><div className="eyebrow-gold mb-2">Зафиксировать решение</div><p className="text-[12px] leading-relaxed text-[var(--bone-dim)] mb-4">Сохранит выбранный фокус, режим и первые {KEYWORD_SNAPSHOT_LIMIT} предложенных ключей как черновик решения. Это не публикует товар и не генерирует текст.</p><input type="hidden" name="canonical_product_id" value={selectedProduct?.id || ''} /><input type="hidden" name="product_slug" value={selectedProduct?.slug || ''} /><input type="hidden" name="matched_etsy_listing_id" value={selectedProduct?.etsyId || ''} /><input type="hidden" name="component" value={filters.component} /><input type="hidden" name="material" value={filters.material} /><input type="hidden" name="event" value={filters.event} /><input type="hidden" name="q" value={filters.q} /><input type="hidden" name="type" value={filters.type} /><input type="hidden" name="strategy" value={filters.strategy} /><input type="hidden" name="auto_focus_json" value={JSON.stringify(autoFocus)} /><input type="hidden" name="selected_keywords_json" value={JSON.stringify(selectedKeywords)} /><button className="btn-ghost" type="submit" disabled={!selectedProduct}><Save size={13} /> Сохранить черновик решения</button></form>
        </div></div>
      <div className="flex flex-wrap gap-2 mb-6">{KEYWORD_TYPES.map((type) => <KeywordTypeLink key={type} type={type} active={filters.type} counts={counts} filters={filters} />)}</div>
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow-dim">Активный подбор</div><h2 className="mt-2 text-bone text-[24px]">{KEYWORD_TYPE_LABELS[filters.type] || filters.type}</h2></div><div className="flex flex-wrap gap-2"><Chip tone="success">Показано {formatNumber(firstRows.length)}</Chip><Chip tone="warning">Найдено {formatNumber(totalCount ?? rows.length)}</Chip><Chip>Из выборки {formatNumber(rawCount ?? rows.length)}</Chip><Chip tone="gold">{STRATEGY_LABELS[filters.strategy]}</Chip></div></div><p className="mt-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Активные фильтры: товар={selectedProduct?.title || '—'} · состав={labelFor('component', filters.component)} · материал={labelFor('material', filters.material)} · сценарий={labelFor('event', filters.event)} · поиск слов={filters.q || '—'}.</p></div>
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.05fr_.44fr_.42fr_.70fr_.50fr_.58fr_.74fr_.82fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]"><div>Ключ</div><div>Совпадение</div><div>SEO-оценка</div><div>Тип использования</div><div>Средний спрос</div><div>Конкуренция</div><div>Куда</div><div>Сигнал</div><div>Почему</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{firstRows.map((row, index) => { const signal = strategySignal(row); return <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.05fr_.44fr_.42fr_.70fr_.50fr_.58fr_.74fr_.82fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors"><div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div><div className="font-price text-[20px] text-[#a9dfbd]">{row.match_score == null ? '—' : row.match_score}</div><div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div><div><Chip tone={toneByKeywordType(row.bank_bucket)}>{KEYWORD_TYPE_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div><div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div><div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{competitionLabel(row.competition)}</Chip></div><div><Chip tone="gold">{keywordUse(row)}</Chip></div><div><Chip tone={signal.tone}>{signal.label}</Chip></div><div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.match_reasons || row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">Google: {formatNumber(row.avg_monthly_searches)} / {competitionLabel(row.competition)} · {asText(row.reason || row.notes, '')}</div></div></div>; })}{!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">По текущим фильтрам одобренных слов не найдено. Сними один фильтр, поменяй режим или выбери “Все типы использования”.</div> : null}</div></div>
    </section>
  </main>;
}
