import type { StorefrontProduct } from '@/lib/types';
import { getProductEvents, getProductReadiness, type AdminReviewEvent } from '@/lib/admin-readiness';
import { productSlug, productTitle, worldLabel } from '@/lib/storefront';
import { getLaunchStage } from '@/lib/admin-pipeline';

export type SeoGraphAxis = 'piece' | 'occasion' | 'style' | 'color' | 'material';

export type SeoCollectionCandidate = {
  axis: SeoGraphAxis;
  key: string;
  label: string;
  href: string;
  productCount: number;
  readyForFeedCount: number;
  canPrepareSeoCount: number;
  blockedCount: number;
  sampleProducts: Array<{
    title: string;
    slug: string;
    imageUrl?: string | null;
    readiness: string;
    launchStage: string;
  }>;
};

const STYLE_RULES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: 'mirror', label: 'Mirror Looks', patterns: [/\bmirror\b/i, /reflect/i, /metallic/i] },
  { key: 'armor', label: 'Armor Looks', patterns: [/\barmor\b/i, /warrior/i, /robot/i, /chest\s*plate/i] },
  { key: 'harness', label: 'Harness Looks', patterns: [/harness/i, /garter/i, /belt/i, /strap/i] },
  { key: 'goddess', label: 'Goddess Looks', patterns: [/goddess/i, /queen/i, /cleopatra/i, /egypt/i] },
  { key: 'cosmic', label: 'Cosmic Looks', patterns: [/cosmic/i, /alien/i, /sci[-\s]?fi/i, /space/i] },
  { key: 'festival', label: 'Festival Looks', patterns: [/festival/i, /rave/i, /burning\s*man/i, /desert/i] },
  { key: 'stage', label: 'Stage Looks', patterns: [/stage/i, /performance/i, /dance/i, /show/i] },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'unknown';
}

function cleanLabel(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function productText(product: StorefrontProduct) {
  return [
    productTitle(product),
    product.product_type,
    product.category_label,
    product.world_label,
    product.material,
    product.color,
    product.canonical_color_label,
  ].filter(Boolean).join(' ');
}

function addCandidate(map: Map<string, SeoCollectionCandidate>, axis: SeoGraphAxis, label: string, product: StorefrontProduct, events: AdminReviewEvent[]) {
  const clean = cleanLabel(label);
  if (!clean || clean.toLowerCase() === 'product') return;

  const key = `${axis}:${slugify(clean)}`;
  const readiness = getProductReadiness(product, getProductEvents(product, events));
  const launchStage = getLaunchStage(readiness);
  const existing = map.get(key) || {
    axis,
    key,
    label: clean,
    href: `/collections/${axis}/${slugify(clean)}`,
    productCount: 0,
    readyForFeedCount: 0,
    canPrepareSeoCount: 0,
    blockedCount: 0,
    sampleProducts: [],
  };

  existing.productCount += 1;
  if (launchStage.label === 'Can Prepare Feed') existing.readyForFeedCount += 1;
  if (launchStage.label === 'Can Prepare SEO') existing.canPrepareSeoCount += 1;
  if (launchStage.label === 'Blocked') existing.blockedCount += 1;
  if (existing.sampleProducts.length < 4) {
    existing.sampleProducts.push({
      title: productTitle(product),
      slug: productSlug(product),
      imageUrl: product.primary_image_url,
      readiness: readiness.label,
      launchStage: launchStage.label,
    });
  }

  map.set(key, existing);
}

export function buildSeoCollectionCandidates(products: StorefrontProduct[], events: AdminReviewEvent[]) {
  const map = new Map<string, SeoCollectionCandidate>();

  for (const product of products) {
    addCandidate(map, 'piece', product.category_label || product.product_type || '', product, events);
    addCandidate(map, 'occasion', product.world_label || worldLabel(product), product, events);
    addCandidate(map, 'color', product.canonical_color_label || product.color || '', product, events);
    addCandidate(map, 'material', product.material || '', product, events);

    const text = productText(product);
    for (const rule of STYLE_RULES) {
      if (rule.patterns.some((pattern) => pattern.test(text))) {
        addCandidate(map, 'style', rule.label, product, events);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const scoreA = a.readyForFeedCount * 4 + a.canPrepareSeoCount * 2 + a.productCount - a.blockedCount * 2;
    const scoreB = b.readyForFeedCount * 4 + b.canPrepareSeoCount * 2 + b.productCount - b.blockedCount * 2;
    return scoreB - scoreA || b.productCount - a.productCount || a.label.localeCompare(b.label);
  });
}

export function summarizeSeoGraph(candidates: SeoCollectionCandidate[]) {
  return candidates.reduce((acc, candidate) => {
    acc.total += 1;
    acc[candidate.axis] = (acc[candidate.axis] || 0) + 1;
    acc.readyForFeed += candidate.readyForFeedCount > 0 ? 1 : 0;
    acc.blocked += candidate.blockedCount > 0 ? 1 : 0;
    return acc;
  }, { total: 0, readyForFeed: 0, blocked: 0, piece: 0, occasion: 0, style: 0, color: 0, material: 0 } as Record<string, number>);
}
