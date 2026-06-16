import type { StorefrontProduct } from '@/lib/types';
import { productSlug, productTitle } from '@/lib/storefront';
import { getMediaSeoPlan } from '@/lib/media-seo';

export type SeoScoreStage = 'Blocked' | 'Needs Content' | 'Needs Media' | 'Needs SEO Work' | 'Ready for Draft' | 'Ready for Review';

type SeoProductRecord = StorefrontProduct & Record<string, unknown>;

export type SeoScore = {
  productSlug: string;
  title: string;
  stage: SeoScoreStage;
  overallScore: number;
  titleScore: number;
  metaScore: number;
  contentScore: number;
  mediaScore: number;
  structuredDataScore: number;
  notes: string[];
};

function textValue(product: SeoProductRecord, keys: string[]) {
  for (const key of keys) {
    const value = product[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTitle(title: string) {
  if (!title) return 0;
  const length = title.length;
  if (length >= 45 && length <= 120) return 92;
  if (length >= 28 && length < 45) return 72;
  if (length > 120 && length <= 150) return 66;
  return 44;
}

function scoreMeta(meta: string) {
  if (!meta) return 0;
  const length = meta.length;
  if (length >= 110 && length <= 160) return 92;
  if (length >= 70 && length < 110) return 70;
  if (length > 160 && length <= 220) return 58;
  return 38;
}

function scoreContent(description: string) {
  if (!description) return 0;
  const words = description.split(/\s+/).filter(Boolean).length;
  if (words >= 180) return 92;
  if (words >= 90) return 70;
  if (words >= 35) return 48;
  return 24;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

function scoreStructuredData(product: SeoProductRecord) {
  let score = 0;
  if (productTitle(product)) score += 25;
  if (product.primary_image_url) score += 25;
  if (hasValue(product.display_price_amount) || hasValue(product.price) || hasValue(product.price_amount)) score += 25;
  if (hasValue(product.slug) || hasValue(product.product_slug)) score += 25;
  return clampScore(score);
}

export function getSeoScore(product: StorefrontProduct): SeoScore {
  const seoProduct = product as SeoProductRecord;
  const slug = productSlug(product);
  const title = productTitle(product);
  const meta = textValue(seoProduct, ['meta_description', 'seo_description', 'description_meta']);
  const description = textValue(seoProduct, ['description', 'product_description', 'body', 'content']);
  const media = getMediaSeoPlan(product);

  const titleScore = scoreTitle(title);
  const metaScore = scoreMeta(meta);
  const contentScore = scoreContent(description);
  const mediaScore = media.stage === 'Ready for Image Sitemap' ? 90 : media.stage === 'Blocked' ? 0 : 45;
  const structuredDataScore = scoreStructuredData(seoProduct);
  const overallScore = clampScore((titleScore + metaScore + contentScore + mediaScore + structuredDataScore) / 5);

  const notes: string[] = [];
  if (titleScore < 75) notes.push('Title needs SEO review.');
  if (metaScore < 75) notes.push('Meta description draft is missing or weak.');
  if (contentScore < 75) notes.push('Product description needs a fuller site-native draft.');
  if (mediaScore < 75) notes.push('Media SEO must be completed before image sitemap readiness.');
  if (structuredDataScore < 75) notes.push('Structured data inputs need review.');

  let stage: SeoScoreStage = 'Ready for Review';
  if (structuredDataScore < 50) stage = 'Blocked';
  else if (contentScore < 75 || metaScore < 75) stage = 'Needs Content';
  else if (mediaScore < 75) stage = 'Needs Media';
  else if (titleScore < 75) stage = 'Needs SEO Work';
  else if (overallScore < 88) stage = 'Ready for Draft';

  return {
    productSlug: slug,
    title,
    stage,
    overallScore,
    titleScore,
    metaScore,
    contentScore,
    mediaScore,
    structuredDataScore,
    notes,
  };
}

export function buildSeoScores(products: StorefrontProduct[]) {
  return products.map(getSeoScore).sort((a, b) => {
    const order: Record<SeoScoreStage, number> = {
      'Blocked': 0,
      'Needs Content': 1,
      'Needs Media': 2,
      'Needs SEO Work': 3,
      'Ready for Draft': 4,
      'Ready for Review': 5,
    };
    return order[a.stage] - order[b.stage] || a.overallScore - b.overallScore || a.title.localeCompare(b.title);
  });
}

export function summarizeSeoScores(scores: SeoScore[]) {
  return scores.reduce((acc, score) => {
    acc.total += 1;
    acc[score.stage] = (acc[score.stage] || 0) + 1;
    acc.avgScore += score.overallScore;
    return acc;
  }, { total: 0, avgScore: 0 } as Record<string, number>);
}
