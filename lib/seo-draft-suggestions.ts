import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorLabel, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import { getMediaSeoPlan } from '@/lib/media-seo';
import { getSeoScore } from '@/lib/seo-scoring';

export type SeoDraftSuggestion = {
  productSlug: string;
  titleDraft: string;
  metaDescriptionDraft: string;
  h1Draft: string;
  altTextDraft: string;
  collectionHint: string;
  descriptionOutline: string[];
  safetyNotes: string[];
};

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sentenceCase(value: string) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function uniqueParts(parts: string[]) {
  const seen = new Set<string>();
  return parts
    .map(cleanText)
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function clampDraft(value: string, maxLength: number) {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 40 ? lastSpace : maxLength).trim()}`;
}

function productMaterial(product: StorefrontProduct) {
  return textValue(product.material) || 'handmade material';
}

function buildTitle(product: StorefrontProduct) {
  const parts = uniqueParts([
    colorLabel(product),
    categoryLabel(product),
    productMaterial(product),
    worldLabel(product),
    'handmade festival stage outfit',
  ]);
  return clampDraft(parts.join(' | '), 138);
}

function buildMeta(product: StorefrontProduct) {
  const category = categoryLabel(product).toLowerCase();
  const color = colorLabel(product).toLowerCase();
  const world = worldLabel(product).toLowerCase();
  const material = productMaterial(product).toLowerCase();
  return clampDraft(`Shop a ${color} ${category} by TheFEYA, handmade in ${material} for ${world}, stage performance, festivals, photoshoots and statement event styling.`, 158);
}

function buildH1(product: StorefrontProduct) {
  return clampDraft(`${colorLabel(product)} ${categoryLabel(product)} for ${worldLabel(product)}`, 90);
}

function buildAlt(product: StorefrontProduct) {
  return clampDraft(`${colorLabel(product)} ${categoryLabel(product)} by TheFEYA, handmade ${productMaterial(product)} look for ${worldLabel(product)}`, 120);
}

function collectionHint(product: StorefrontProduct) {
  return `/collections/${categoryLabel(product).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function outline(product: StorefrontProduct) {
  const category = categoryLabel(product);
  const color = colorLabel(product);
  const world = worldLabel(product);
  const material = productMaterial(product);
  return [
    `${sentenceCase(color)} ${category.toLowerCase()} by TheFEYA, designed as an original handmade look rather than a custom-from-scratch atelier piece.`,
    `Material and finish: ${material}; describe shine, texture, comfort and construction only from verified product facts.`,
    `Use case: ${world}, stage performance, festival styling, photoshoots and event looks where the product type is relevant.`,
    'Fit and sizing: mention adjustable/custom sizing only where supported by product data and brand policy.',
    'Care and production: keep the handmade disclaimer, production time and shipping language aligned with approved TheFEYA snippets.',
  ];
}

export function buildSeoDraftSuggestion(product: StorefrontProduct): SeoDraftSuggestion {
  const score = getSeoScore(product);
  const mediaPlan = getMediaSeoPlan(product);
  const safetyNotes = [
    'Draft only: do not publish without admin approval.',
    'Do not invent materials, components, sizes, discounts, delivery promises or event guarantees.',
    'Keep TheFEYA positioning: original handmade designs with limited sizing/color/detail adjustments.',
  ];
  if (score.stage === 'Blocked') safetyNotes.push('Resolve blocked structured data inputs before using this draft publicly.');
  if (mediaPlan.stage !== 'Ready for Image Sitemap') safetyNotes.push('Complete Media SEO before using image sitemap or Pinterest exports.');

  return {
    productSlug: productSlug(product),
    titleDraft: buildTitle(product),
    metaDescriptionDraft: buildMeta(product),
    h1Draft: buildH1(product),
    altTextDraft: buildAlt(product),
    collectionHint: collectionHint(product),
    descriptionOutline: outline(product),
    safetyNotes,
  };
}

export function buildSeoDraftSuggestions(products: StorefrontProduct[]) {
  return products.map(buildSeoDraftSuggestion);
}
