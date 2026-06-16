import type { StorefrontProduct } from '@/lib/types';
import { productSlug, productTitle } from '@/lib/storefront';

export type MediaSeoStage = 'Blocked' | 'Needs Alt Text' | 'Needs Filename' | 'Needs Export' | 'Ready for Image Sitemap';

export type MediaSeoPlan = {
  productSlug: string;
  title: string;
  imageUrl?: string | null;
  currentFilename: string;
  suggestedFilename: string;
  stage: MediaSeoStage;
  exportRequired: boolean;
  resizeRecommended: boolean;
  imageSitemapEligible: boolean;
  pinterestExportEligible: boolean;
  notes: string[];
};

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 78) || 'feya-product';
}

export function imageFilenameFromUrl(url?: string | null) {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
  } catch {
    return String(url).split('/').filter(Boolean).pop() || '';
  }
}

function isGenericFilename(filename: string) {
  const value = filename.toLowerCase();
  if (!value) return true;
  return /^(img|image|photo|pic|dsc)[-_\d.]/.test(value)
    || value.includes('fullxfull')
    || value.includes('il_')
    || value.length < 12;
}

function hasWebExtension(filename: string) {
  return /\.(webp|jpg|jpeg|png)$/i.test(filename);
}

export function getMediaSeoPlan(product: StorefrontProduct): MediaSeoPlan {
  const slug = productSlug(product);
  const title = productTitle(product);
  const imageUrl = product.primary_image_url;
  const currentFilename = imageFilenameFromUrl(imageUrl);
  const suggestedFilename = `${safeSlug(title)}-${slug}-01.webp`;
  const notes: string[] = [];

  const hasImage = Boolean(imageUrl);
  const hasAlt = Boolean(product.primary_image_alt && String(product.primary_image_alt).trim().length > 10);
  const genericFilename = isGenericFilename(currentFilename);
  const webExtension = hasWebExtension(currentFilename);
  const exportRequired = !hasImage || genericFilename || Boolean(imageUrl && /etsystatic|googleusercontent|cdn|images/i.test(String(imageUrl)));
  const resizeRecommended = Boolean(imageUrl && !/\.webp(\?|$)/i.test(String(imageUrl)));

  if (!hasImage) notes.push('Missing primary image.');
  if (!hasAlt) notes.push('Alt text needs product-specific rewrite.');
  if (genericFilename) notes.push('Use short descriptive SEO filename on export.');
  if (!webExtension) notes.push('Normalize export format for web usage.');
  if (exportRequired) notes.push('Run FEYA media export before image sitemap and Pinterest export.');
  if (resizeRecommended) notes.push('Resize or convert image for web performance.');

  let stage: MediaSeoStage = 'Ready for Image Sitemap';
  if (!hasImage) stage = 'Blocked';
  else if (!hasAlt) stage = 'Needs Alt Text';
  else if (genericFilename || !webExtension) stage = 'Needs Filename';
  else if (exportRequired || resizeRecommended) stage = 'Needs Export';

  const imageSitemapEligible = stage === 'Ready for Image Sitemap';
  const pinterestExportEligible = imageSitemapEligible;

  return {
    productSlug: slug,
    title,
    imageUrl,
    currentFilename,
    suggestedFilename,
    stage,
    exportRequired,
    resizeRecommended,
    imageSitemapEligible,
    pinterestExportEligible,
    notes,
  };
}

export function buildMediaSeoPlans(products: StorefrontProduct[]) {
  return products.map(getMediaSeoPlan).sort((a, b) => {
    const order: Record<MediaSeoStage, number> = {
      'Blocked': 0,
      'Needs Alt Text': 1,
      'Needs Filename': 2,
      'Needs Export': 3,
      'Ready for Image Sitemap': 4,
    };
    return order[a.stage] - order[b.stage] || a.title.localeCompare(b.title);
  });
}

export function summarizeMediaSeoPlans(plans: MediaSeoPlan[]) {
  return plans.reduce((acc, plan) => {
    acc.total += 1;
    acc[plan.stage] = (acc[plan.stage] || 0) + 1;
    acc.exportRequired += plan.exportRequired ? 1 : 0;
    acc.resizeRecommended += plan.resizeRecommended ? 1 : 0;
    acc.imageSitemapEligible += plan.imageSitemapEligible ? 1 : 0;
    acc.pinterestExportEligible += plan.pinterestExportEligible ? 1 : 0;
    return acc;
  }, { total: 0, exportRequired: 0, resizeRecommended: 0, imageSitemapEligible: 0, pinterestExportEligible: 0 } as Record<string, number>);
}
