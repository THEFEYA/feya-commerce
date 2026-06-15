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

type ProductRecord = StorefrontProduct & Record<string, unknown>;

const UNSAFE_MATERIAL_TERMS = ['ceramic', 'latex', 'lame', 'lamé', 'plastic'];
const KNOWN_COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sentenceCase(value: string) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function titleCase(value: string) {
  return cleanText(value)
    .split(' ')
    .map((word) => (word === 'TheFEYA' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
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
  const cleaned = cleanText(value.replace(/\s+\|\s+/g, ' '));
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = slice.slice(0, lastSpace > 40 ? lastSpace : maxLength).trim();
  return clipped.replace(/[,.&-]+$/, '').trim();
}

function rawProductText(product: StorefrontProduct) {
  const record = product as ProductRecord;
  return [
    product.material,
    product.product_type,
    product.category_label,
    product.world_label,
    product.card_title,
    product.h1,
    product.seo_title,
    record.source_title,
    record.raw_title,
  ]
    .map(textValue)
    .join(' ')
    .toLowerCase();
}

function ignoredUnsafeMaterialTerms(product: StorefrontProduct) {
  const raw = rawProductText(product);
  return UNSAFE_MATERIAL_TERMS.filter((term) => raw.includes(term));
}

function safeColorLabel(product: StorefrontProduct) {
  const label = colorLabel(product);
  return KNOWN_COLORS.includes(label) ? label : '';
}

function materialDetail(product: StorefrontProduct) {
  const raw = rawProductText(product);
  const hasMirrorMetallic = /metallic|reflective|mirror/.test(raw);
  const hasHolographic = /holographic|iridescent|\bholo\b/.test(raw);
  const hasAcrylic = /mirror\s*acrylic|acrylic/.test(raw);
  const hasVeganLeather = /vegan\s*leather|faux\s*leather/.test(raw);
  const hasLeather = !hasVeganLeather && /\bleather\b/.test(raw);

  if (hasAcrylic) return hasMirrorMetallic ? 'mirror acrylic' : 'acrylic';
  if (hasVeganLeather) {
    if (hasHolographic) return 'holographic vegan leather';
    if (hasMirrorMetallic) return 'metallic vegan leather';
    return 'vegan leather';
  }
  if (hasLeather) return hasMirrorMetallic ? 'metallic leather' : 'leather';
  if (hasHolographic) return 'holographic finish';
  if (hasMirrorMetallic) return 'mirror metallic finish';
  if (/\bchain\b/.test(raw)) return 'chain details';
  if (/silicone/.test(raw)) return 'silicone details';

  return 'handmade finish';
}

function visualDescriptor(product: StorefrontProduct) {
  const raw = rawProductText(product);
  const color = safeColorLabel(product);

  if (/holographic|iridescent|\bholo\b/.test(raw)) return 'Holographic';
  if (/mirror\s*acrylic|acrylic/.test(raw) && /mirror|reflective/.test(raw)) return 'Mirror Acrylic';
  if (/metallic|reflective|mirror/.test(raw)) return 'Metallic';
  return color;
}

function secondaryMaterialDetail(product: StorefrontProduct) {
  const visual = visualDescriptor(product).toLowerCase();
  const material = materialDetail(product);
  if (visual === 'metallic' && material.startsWith('metallic ')) return material.replace(/^metallic\s+/, '');
  if (visual === 'holographic' && material.startsWith('holographic ')) return material.replace(/^holographic\s+/, '');
  if (visual === 'mirror acrylic' && material === 'mirror acrylic') return 'acrylic';
  return material;
}

function productNoun(product: StorefrontProduct) {
  const category = categoryLabel(product);
  const text = `${product.product_type || ''} ${productTitle(product)}`.toLowerCase();

  if (/corset|bustier|breastplate|chest|acrylic top|overbust/.test(text) || category === 'Corsets') return 'Corset Top';
  if (/harness|garter|belt|choker|strap/.test(text) || category === 'Harness') return 'Harness Set';
  if (/mask|headpiece|helmet|crown/.test(text) || category === 'Masks') return 'Mask';
  if (/bodysuit|body|catsuit|jumpsuit/.test(text) || category === 'Bodysuits') return 'Bodysuit';
  if (/skirt/.test(text) || category === 'Skirts') return 'Skirt';
  if (/armor|shoulder|bracer|arm|spine|tail|wing|robot/.test(text) || category === 'Armor') return 'Armor Piece';

  return category.replace(/s$/, '') || 'Stage Look';
}

function worldPhrase(product: StorefrontProduct) {
  const raw = rawProductText(product);
  const world = worldLabel(product);

  if (/rave/.test(raw) && /festival/.test(raw)) return 'Rave and Festival Looks';
  if (/rave/.test(raw)) return 'Rave Looks';
  if (/burning\s*man/i.test(world) || /burning\s*man|desert/.test(raw)) return 'Burning Man Looks';
  if (/editorial/i.test(world)) return 'Editorial Looks';
  if (/festival|rave/i.test(world)) return 'Festival Looks';
  if (/stage|performance/i.test(world)) return 'Stage Looks';
  return world || 'Stage Looks';
}

function demandTitleCore(product: StorefrontProduct) {
  return uniqueParts([visualDescriptor(product), productNoun(product)]).join(' ');
}

function buildTitle(product: StorefrontProduct) {
  return clampDraft(`${titleCase(demandTitleCore(product))} for ${worldPhrase(product)} by TheFEYA`, 138);
}

function buildMeta(product: StorefrontProduct) {
  const core = demandTitleCore(product).toLowerCase();
  const material = secondaryMaterialDetail(product);
  const world = worldPhrase(product).toLowerCase();
  return clampDraft(`Shop a ${core} by TheFEYA, handmade with ${material} for ${world}, stage performance and event styling.`, 155);
}

function buildH1(product: StorefrontProduct) {
  return clampDraft(`${titleCase(demandTitleCore(product))} for ${worldPhrase(product)}`, 90);
}

function buildAlt(product: StorefrontProduct) {
  return clampDraft(`${titleCase(materialDetail(product))} ${productNoun(product)} by TheFEYA for ${worldPhrase(product)}`, 120);
}

function collectionHint(product: StorefrontProduct) {
  return `/collections/${categoryLabel(product).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function outline(product: StorefrontProduct) {
  const core = demandTitleCore(product);
  const world = worldPhrase(product);
  const material = secondaryMaterialDetail(product);
  return [
    `${sentenceCase(core)} by TheFEYA, designed as an original handmade look rather than a custom-from-scratch atelier piece.`,
    `Material and finish: ${material}; describe shine, texture, comfort and construction only from verified product facts.`,
    `Use case: ${world}, stage performance, festival styling, photoshoots and event looks where the product type is relevant.`,
    'Fit and sizing: mention adjustable/custom sizing only where supported by product data and brand policy.',
    'Care and production: keep the handmade disclaimer, production time and shipping language aligned with approved TheFEYA snippets.',
  ];
}

export function buildSeoDraftSuggestion(product: StorefrontProduct): SeoDraftSuggestion {
  const score = getSeoScore(product);
  const mediaPlan = getMediaSeoPlan(product);
  const ignoredTerms = ignoredUnsafeMaterialTerms(product);
  const safetyNotes = [
    'Draft only: do not publish without admin approval.',
    'Do not invent materials, components, sizes, discounts, delivery promises or event guarantees.',
    'Keep TheFEYA positioning: original handmade designs with limited sizing/color/detail adjustments.',
  ];
  if (ignoredTerms.length) safetyNotes.push(`Ignored unverified material terms from source data: ${ignoredTerms.join(', ')}.`);
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
