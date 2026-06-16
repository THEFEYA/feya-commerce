import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, productTitle, worldLabel } from '@/lib/storefront';

export type PublicCollection = {
  slug: string;
  title: string;
  description: string;
  kind: 'category' | 'world';
  match: string[];
};

export const PUBLIC_COLLECTIONS: PublicCollection[] = [
  {
    slug: 'corsets',
    title: 'Corsets',
    description: 'Handmade corset tops, mirror acrylic pieces and structured statement tops by TheFEYA.',
    kind: 'category',
    match: ['corsets', 'corset', 'bustier', 'acrylic top', 'breastplate', 'chest plate'],
  },
  {
    slug: 'harness',
    title: 'Harness',
    description: 'Harness sets, garters, belts, chokers and strap-based stage styling pieces.',
    kind: 'category',
    match: ['harness', 'garter', 'belt', 'choker', 'strap'],
  },
  {
    slug: 'masks',
    title: 'Masks and Headpieces',
    description: 'Masks, headpieces, crowns and character pieces for performance and editorial styling.',
    kind: 'category',
    match: ['masks', 'mask', 'headpiece', 'helmet', 'crown'],
  },
  {
    slug: 'bodysuits',
    title: 'Bodysuits',
    description: 'Bodysuits and body-based looks for stage, performance and festival styling.',
    kind: 'category',
    match: ['bodysuits', 'bodysuit', 'body', 'catsuit', 'jumpsuit'],
  },
  {
    slug: 'skirts',
    title: 'Skirts',
    description: 'Skirts and lower-body statement pieces designed to complete TheFEYA looks.',
    kind: 'category',
    match: ['skirts', 'skirt'],
  },
  {
    slug: 'armor',
    title: 'Armor Pieces',
    description: 'Shoulders, arms, spine, wings, tails and armor-inspired statement pieces.',
    kind: 'category',
    match: ['armor', 'shoulder', 'bracer', 'arm', 'spine', 'tail', 'wing', 'robot'],
  },
  {
    slug: 'stage-looks',
    title: 'Stage Looks',
    description: 'Statement pieces for stage performance, shows, dance and visual productions.',
    kind: 'world',
    match: ['stage look', 'stage', 'performance', 'dance', 'show'],
  },
  {
    slug: 'festival-looks',
    title: 'Festival Looks',
    description: 'Festival and rave-ready statement pieces for bold event styling.',
    kind: 'world',
    match: ['festival look', 'festival', 'rave'],
  },
  {
    slug: 'burning-man-looks',
    title: 'Burning Man Looks',
    description: 'Desert and Burning Man-ready handmade statement pieces by TheFEYA.',
    kind: 'world',
    match: ['burning man', 'desert'],
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function productSearchText(product: StorefrontProduct) {
  return normalize([
    categoryLabel(product),
    worldLabel(product),
    product.product_type,
    product.material,
    product.color,
    productTitle(product),
    product.h1,
    product.seo_title,
    product.meta_description,
  ].filter(Boolean).join(' '));
}

export function getPublicCollection(slug: string) {
  return PUBLIC_COLLECTIONS.find((collection) => collection.slug === slug) || null;
}

export function productMatchesCollection(product: StorefrontProduct, collection: PublicCollection) {
  const text = productSearchText(product);
  return collection.match.some((term) => text.includes(normalize(term)));
}

export function collectionsForProduct(product: StorefrontProduct) {
  return PUBLIC_COLLECTIONS.filter((collection) => productMatchesCollection(product, collection));
}

export function productsForCollection(products: StorefrontProduct[], slug: string) {
  const collection = getPublicCollection(slug);
  if (!collection) return [];
  return products.filter((product) => productMatchesCollection(product, collection));
}

export function summarizeCollections(products: StorefrontProduct[]) {
  return PUBLIC_COLLECTIONS.map((collection) => ({
    ...collection,
    products: productsForCollection(products, collection.slug),
  })).filter((collection) => collection.products.length > 0);
}
