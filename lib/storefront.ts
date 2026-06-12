import type { StorefrontConfiguration, StorefrontMedia, StorefrontProduct } from '@/lib/types';

export const STOREFRONT_VIEW_V3 = 'feya_commerce_v_step7_storefront_products_api_v3';
export const SALE_RATE = 0.2;

export function asConfigurations(product: StorefrontProduct): StorefrontConfiguration[] {
  return Array.isArray(product.configurations) ? (product.configurations as StorefrontConfiguration[]) : [];
}

export function asMediaGallery(product: StorefrontProduct): StorefrontMedia[] {
  return Array.isArray(product.media_gallery) ? (product.media_gallery as StorefrontMedia[]) : [];
}

export function money(amount: number | null | undefined, currency = 'EUR', digits = 0) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: digits,
  }).format(Number(amount));
}

export function optionLabel(option: StorefrontConfiguration, index = 0) {
  return String(
    option.configuration_label ||
      option.configuration_name ||
      option.option_value ||
      option.raw_option_value ||
      option.raw_option_text ||
      option.title ||
      option.label ||
      `Option ${index + 1}`,
  );
}

export function optionPrice(option: StorefrontConfiguration) {
  const value = option.price_amount ?? option.price ?? option.amount ?? option.min_price ?? option.max_price;
  return typeof value === 'number' ? value : null;
}

export function fullSetOption(product: StorefrontProduct) {
  const options = asConfigurations(product);
  return (
    options.find((option, index) => /full\s*set|complete/i.test(optionLabel(option, index))) ||
    options.sort((a, b) => (optionPrice(b) || 0) - (optionPrice(a) || 0))[0] ||
    null
  );
}

export function mainRegularPrice(product: StorefrontProduct) {
  const full = fullSetOption(product);
  return optionPrice(full || {}) ?? product.max_price ?? product.min_price ?? null;
}

export function salePrice(amount: number | null | undefined) {
  if (amount == null) return null;
  return Math.round(Number(amount) * (1 - SALE_RATE));
}

export function productTitle(product: StorefrontProduct) {
  return product.card_title || product.h1 || 'Untitled piece';
}

export function splitTitle(product: StorefrontProduct) {
  const raw = product.h1 || product.card_title || 'Untitled piece';
  const [first, ...rest] = raw.split(',');
  return {
    title: (first || raw).trim(),
    subtitle: rest.join(',').trim(),
  };
}

export function categoryLabel(product: StorefrontProduct) {
  const text = `${product.product_type || ''} ${product.card_title || ''} ${product.h1 || ''}`.toLowerCase();
  if (/mask|headpiece|helmet|crown/.test(text)) return 'Masks';
  if (/corset|bustier|chest|breastplate|acrylic top/.test(text)) return 'Corsets';
  if (/harness|garter|belt|choker|strap/.test(text)) return 'Harness';
  if (/armor|shoulder|bracer|arm|spine|tail|wing|robot/.test(text)) return 'Armor';
  if (/bodysuit|body|catsuit|jumpsuit/.test(text)) return 'Bodysuits';
  if (/skirt/.test(text)) return 'Skirts';
  return 'Stage Looks';
}

export function colorLabel(product: StorefrontProduct) {
  const color = (product.color || '').trim();
  if (!color) return 'Mirror';
  const lower = color.toLowerCase();
  if (lower.includes('gold')) return 'Gold';
  if (lower.includes('silver')) return 'Silver';
  if (lower.includes('black')) return 'Black';
  if (lower.includes('white')) return 'White';
  if (lower.includes('red')) return 'Red';
  if (lower.includes('holo')) return 'Holographic';
  return color.split(',')[0] || 'Mirror';
}

export function slugFor(product: StorefrontProduct) {
  return product.product_slug || product.canonical_product_id;
}
