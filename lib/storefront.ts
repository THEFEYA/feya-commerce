import type { StorefrontConfiguration, StorefrontMedia, StorefrontProduct } from '@/lib/types';

export const STOREFRONT_VIEW_V4 = 'feya_commerce_v_step7_storefront_products_api_v4';
export const STOREFRONT_VIEW_V3 = 'feya_commerce_v_step7_storefront_products_api_v3';
export const STOREFRONT_VIEW_V2 = 'feya_commerce_v_step7_storefront_products_api_v2';
export const STOREFRONT_VIEW_V1 = 'feya_commerce_v_step7_storefront_products_api';
export const STOREFRONT_MEDIA_FAST_VIEW = 'feya_commerce_v_step7_product_media_gallery_fast_v1';
export const SALE_PERCENT = 0;
export const SALE_RATE = 0;

export const STOREFRONT_CARD_SELECT = [
  'canonical_product_id','product_slug','matched_etsy_listing_id','source_url','card_title','h1','seo_title','meta_description','product_type','material','color','size_mode','production_profile','shipping_profile','handmade_flag','styled_imagery_flag','primary_image_url','primary_image_alt','secondary_image_url','hover_image_url','video_url','media_count','has_video','min_price','max_price','currency','has_fallback_price','has_sampler_excluded_price','public_configuration_count','public_price_row_count','pdp_option_count','has_multiple_pdp_options','storefront_candidate_flag'
].join(',');

export const STOREFRONT_V4_BASE_CARD_SELECT = [
  'canonical_product_id','product_slug','matched_etsy_listing_id','source_url','card_title','h1','seo_title','meta_description','product_type','material','color','size_mode','production_profile','shipping_profile','handmade_flag','styled_imagery_flag','primary_image_url','primary_image_alt','secondary_image_url','hover_image_url','video_url','media_count','has_video','min_price','max_price','currency'
].join(',');

export const STOREFRONT_V4_CARD_SELECT = [
  STOREFRONT_V4_BASE_CARD_SELECT,
  'price_contract_version','price_source_mode','price_confidence_status','has_unverified_discount','has_russian_public_label','needs_price_review','needs_label_review','full_set_display_price_amount','component_sum_display_price_amount','full_set_savings_amount','full_set_savings_percent','category_label','world_label','canonical_color_label','color_options'
].join(',');

export const STOREFRONT_PDP_SELECT = [STOREFRONT_CARD_SELECT, 'configurations', 'media_gallery'].join(',');
export const STOREFRONT_V4_PDP_SELECT = [STOREFRONT_V4_CARD_SELECT, 'configurations', 'media_gallery'].join(',');
export const STOREFRONT_MEDIA_FAST_SELECT = [
  'product_slug','primary_image_url','primary_image_alt','secondary_image_url','hover_image_url','video_url','has_video','media_count','media_gallery'
].join(',');
export const STOREFRONT_FALLBACK_CARD_SELECT = [
  'canonical_product_id','product_slug','matched_etsy_listing_id','source_url','card_title','h1','seo_title','meta_description','product_type','material','color','size_mode','production_profile','shipping_profile','handmade_flag','styled_imagery_flag','primary_image_url','primary_image_alt','min_price','max_price','currency','has_fallback_price','has_sampler_excluded_price','public_configuration_count','public_price_row_count','storefront_candidate_flag'
].join(',');

const CYRILLIC_OPTION_LABELS: Record<string, string> = {
  'трусики': 'Panties',
  'подвязки': 'Garters',
  'юбка': 'Skirt',
  'вершина': 'Top',
  'топ': 'Top',
  'только топ': 'Top',
  'топ и юбка': 'Top + Skirt',
  'полный комплект': 'Full Set',
  'полный набор': 'Full Set',
  'комплект': 'Full Set',
  'маска': 'Mask',
  'плечо': 'Shoulder',
  'одно плечо': 'Single Shoulder',
  'плечи': 'Shoulders',
  'браслет': 'Bracelet',
  'чокер': 'Choker',
  'колье': 'Choker',
  'воротник': 'Choker',
  'корсет': 'Corset',
  'боди': 'Bodysuit',
  'крылья': 'Wings',
  'пояс': 'Belt',
  'хвост': 'Tail',
  'спина': 'Spine',
  'позвоночник': 'Spine',
  'перчатки': 'Gloves',
  'головной убор': 'Headpiece',
  'корона': 'Headpiece',
  'чехлы для ног': 'Leg Covers',
  'наручи для предплечья': 'Forearm Bracers',
  'наручи *2': 'Arm Bracers',
  'элементы защиты бицепсов': 'Biceps Armor',
  'верхняя накидка (ткань)': 'Cape Overlay',
  'нагрудный ремень': 'Chest Harness',
  'женский наряд': "Women's Outfit",
  'мужской наряд': "Men's Outfit",
  'золото': 'Gold',
  'серебро': 'Silver',
  'черный': 'Black',
  'чёрный': 'Black',
  'белый': 'White',
  'красный': 'Red',
};

function hasCyrillic(value: string) {
  return /[А-Яа-яЁё]/.test(value);
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringField(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function publicOptionLabel(value: unknown, index = 0) {
  const raw = String(value || '').trim();
  if (!raw) return `Option ${index + 1}`;
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (CYRILLIC_OPTION_LABELS[normalized]) return CYRILLIC_OPTION_LABELS[normalized];
  if (hasCyrillic(raw)) return `Option ${index + 1}`;
  return raw;
}

export function formatPrice(amount: number | null | undefined, currency = 'EUR') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount));
}
export function asConfigurations(product: StorefrontProduct): StorefrontConfiguration[] {
  return Array.isArray(product.configurations) ? product.configurations as StorefrontConfiguration[] : [];
}
export function asMediaGallery(product: StorefrontProduct): StorefrontMedia[] {
  return Array.isArray(product.media_gallery) ? product.media_gallery as StorefrontMedia[] : [];
}
export function optionLabel(option: StorefrontConfiguration, index = 0) {
  const preferred = option.public_label || option.configuration_label || option.configuration_name || option.option_value || option.title || option.label;
  if (preferred) return publicOptionLabel(preferred, index);
  return `Option ${index + 1}`;
}
export function optionKey(option: StorefrontConfiguration, index = 0) {
  return String(option.configuration_id || option.configuration_price_id || option.source_price_row_id || option.sellable_configuration_id || index);
}
export function optionPrice(option: StorefrontConfiguration | null | undefined) {
  if (!option) return null;
  return toNumber(option.display_price_amount)
    ?? toNumber(option.sale_price_amount)
    ?? toNumber(option.base_price_amount)
    ?? toNumber(option.price_amount)
    ?? toNumber(option.price)
    ?? toNumber(option.amount)
    ?? toNumber(option.min_price)
    ?? toNumber(option.max_price);
}
export function optionCompareAtPrice(option: StorefrontConfiguration | null | undefined) {
  if (!option) return null;
  return toNumber(option.compare_at_price_amount);
}
export function optionDiscountPercent(option: StorefrontConfiguration | null | undefined) {
  if (!option) return null;
  return toNumber(option.discount_percent);
}
export function componentCode(option: StorefrontConfiguration | null | undefined) {
  return stringField(option?.component_code) || null;
}
function normalizedOptionLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function isFullSet(label: string) {
  return /full\s*set|complete\s*set|complete\s*look/i.test(label);
}
export function isFullSetOption(option: StorefrontConfiguration | null | undefined, index = 0) {
  if (!option) return false;
  if (option.is_full_set === true) return true;
  return isFullSet(optionLabel(option, index));
}
export function sortedOptions(product: StorefrontProduct) {
  const byLabel = new Map<string, StorefrontConfiguration>();
  asConfigurations(product).forEach((option, index) => {
    const label = optionLabel(option, index);
    const key = normalizedOptionLabel(label);
    const current = byLabel.get(key);
    if (!current || (optionPrice(option) || 0) > (optionPrice(current) || 0)) byLabel.set(key, option);
  });
  return Array.from(byLabel.values()).sort((a, b) => {
    const aLabel = optionLabel(a), bLabel = optionLabel(b);
    const aFull = isFullSetOption(a) || isFullSet(aLabel), bFull = isFullSetOption(b) || isFullSet(bLabel);
    if (aFull !== bFull) return aFull ? 1 : -1;
    const aSort = Number(a.sort_order || 0), bSort = Number(b.sort_order || 0);
    if (aSort !== bSort) return aSort - bSort;
    return (optionPrice(a) || 0) - (optionPrice(b) || 0);
  });
}
export function fullSetOption(product: StorefrontProduct) {
  const options = sortedOptions(product);
  return options.find((option, index) => isFullSetOption(option, index)) || [...options].sort((a, b) => (optionPrice(b) || 0) - (optionPrice(a) || 0))[0] || null;
}
export function mainRegularPrice(product: StorefrontProduct) {
  return optionPrice(fullSetOption(product)) ?? toNumber(product.full_set_display_price_amount) ?? product.max_price ?? product.min_price ?? null;
}
export function mainCompareAtPrice(product: StorefrontProduct) {
  return optionCompareAtPrice(fullSetOption(product));
}
export function salePrice(regular: number | null | undefined) {
  return regular == null ? null : Number(regular);
}
export function productTitle(product: StorefrontProduct) {
  return product.card_title || product.h1 || 'Atelier piece';
}
export function productSlug(product: StorefrontProduct) {
  return product.product_slug || product.canonical_product_id;
}
export function splitTitle(raw: string | null | undefined) {
  const t = (raw || '').trim();
  if (!t) return { head: 'Atelier piece', tail: '' };
  const idx = t.indexOf(',');
  if (idx > 0 && idx < 70) return { head: t.slice(0, idx).trim(), tail: t.slice(idx + 1).trim() };
  const words = t.split(/\s+/);
  if (words.length > 8) return { head: words.slice(0, 8).join(' '), tail: words.slice(8).join(' ') };
  return { head: t, tail: '' };
}
export function categoryLabel(product: StorefrontProduct) {
  const explicit = stringField(product.category_label);
  if (explicit) return explicit;
  const text = `${product.product_type || ''} ${productTitle(product)}`.toLowerCase();
  if (/mask|headpiece|helmet|crown/.test(text)) return 'Masks';
  if (/corset|bustier|chest|breastplate|acrylic top/.test(text)) return 'Corsets';
  if (/harness|garter|belt|choker|strap/.test(text)) return 'Harness';
  if (/armor|shoulder|bracer|arm|spine|tail|wing|robot/.test(text)) return 'Armor';
  if (/bodysuit|body|catsuit|jumpsuit/.test(text)) return 'Bodysuits';
  if (/skirt/.test(text)) return 'Skirts';
  return 'Stage Looks';
}
export function worldLabel(product: StorefrontProduct) {
  const explicit = stringField(product.world_label);
  if (explicit) return explicit;
  const text = `${productTitle(product)} ${product.meta_description || ''} ${product.product_type || ''}`.toLowerCase();
  if (/burning\s*man|desert/.test(text)) return 'Burning Man';
  if (/festival|rave/.test(text)) return 'Festival Look';
  if (/stage|performance|dance|show/.test(text)) return 'Stage Look';
  if (/editorial|red carpet|fashion/.test(text)) return 'Editorial';
  return categoryLabel(product);
}
export function colorLabel(product: StorefrontProduct) {
  const explicit = stringField(product.canonical_color_label);
  if (explicit) return explicit;
  const text = `${product.color || ''} ${productTitle(product)} ${product.material || ''}`.toLowerCase();
  if (text.includes('gold')) return 'Gold';
  if (text.includes('silver')) return 'Silver';
  if (text.includes('black')) return 'Black';
  if (text.includes('white')) return 'White';
  if (text.includes('red')) return 'Red';
  if (/holo|iridescent/.test(text)) return 'Holographic';
  return (product.color || '').split(',')[0] || 'Mirror';
}
export function colorOptions(product: StorefrontProduct) {
  if (Array.isArray(product.color_options) && product.color_options.length) return product.color_options.filter(Boolean);
  const text = `${product.color || ''} ${productTitle(product)} ${product.material || ''}`.toLowerCase();
  const values = ['Gold','Silver','Black','White','Red','Holographic'].filter((c) => c === 'Holographic' ? /holo|iridescent/.test(text) : text.includes(c.toLowerCase()));
  return values.length ? values : [colorLabel(product)];
}
export function getMedia(product: StorefrontProduct) {
  const unique = new Map<string, StorefrontMedia>();
  asMediaGallery(product)
    .filter((m) => m?.url)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .forEach((item) => {
      const url = String(item.url);
      if (!unique.has(url)) unique.set(url, item);
    });
  const gallery = Array.from(unique.values());
  if (gallery.length) return gallery;
  const fallbacks = [product.primary_image_url, product.secondary_image_url, product.hover_image_url]
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index)
    .map((url, index) => ({ url, alt: index === 0 ? product.primary_image_alt : productTitle(product), media_type: 'image', position: index + 1 }));
  return fallbacks as StorefrontMedia[];
}
