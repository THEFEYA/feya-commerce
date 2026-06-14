import type { StorefrontProduct } from '@/lib/types';
import { productSlug, productTitle } from '@/lib/storefront';
import { getMediaSeoPlan, type MediaSeoPlan } from '@/lib/media-seo';
import { getProductEvents, getProductReadiness, type AdminReviewEvent, type ProductReadiness } from '@/lib/admin-readiness';

export type SearchStage = 'Blocked' | 'Needs SEO Review' | 'Needs Media' | 'Ready for Preview' | 'Ready for Search';

export type SearchPlan = {
  productSlug: string;
  title: string;
  imageUrl?: string | null;
  readiness: ProductReadiness;
  media: MediaSeoPlan;
  stage: SearchStage;
  hasSeoApproval: boolean;
};

export function getSearchPlan(product: StorefrontProduct, events: AdminReviewEvent[]): SearchPlan {
  const productEvents = getProductEvents(product, events);
  const readiness = getProductReadiness(product, productEvents);
  const media = getMediaSeoPlan(product);
  const hasSeoApproval = productEvents.some((event) => event.event_type === 'seo_ready_checked' && event.event_status === 'approved');

  let stage: SearchStage = 'Ready for Preview';
  if (readiness.label === 'Blocked' || media.stage === 'Blocked') stage = 'Blocked';
  else if (media.stage !== 'Ready for Image Sitemap') stage = 'Needs Media';
  else if (!hasSeoApproval) stage = 'Needs SEO Review';

  return {
    productSlug: productSlug(product),
    title: productTitle(product),
    imageUrl: product.primary_image_url,
    readiness,
    media,
    stage,
    hasSeoApproval,
  };
}

export function buildSearchPlans(products: StorefrontProduct[], events: AdminReviewEvent[]) {
  return products.map((product) => getSearchPlan(product, events)).sort((a, b) => {
    const order: Record<SearchStage, number> = {
      'Blocked': 0,
      'Needs SEO Review': 1,
      'Needs Media': 2,
      'Ready for Preview': 3,
      'Ready for Search': 4,
    };
    return order[a.stage] - order[b.stage] || a.title.localeCompare(b.title);
  });
}

export function summarizeSearchPlans(plans: SearchPlan[]) {
  return plans.reduce((acc, plan) => {
    acc.total += 1;
    acc[plan.stage] = (acc[plan.stage] || 0) + 1;
    acc.mediaReady += plan.media.stage === 'Ready for Image Sitemap' ? 1 : 0;
    acc.seoApproved += plan.hasSeoApproval ? 1 : 0;
    return acc;
  }, { total: 0, mediaReady: 0, seoApproved: 0 } as Record<string, number>);
}
