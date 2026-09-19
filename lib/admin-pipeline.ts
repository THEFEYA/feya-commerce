import type { StorefrontProduct } from '@/lib/types';
import { getProductFlags, type ProductReadiness, type ReadinessTone } from '@/lib/admin-readiness';

export type LaunchStageLabel = 'Blocked' | 'Needs Review' | 'Can Prepare SEO' | 'Can Prepare Feed' | 'Ready for Future Payment';
export type ContentStageLabel = 'Blocked' | 'Data Not Ready' | 'Needs Content Inputs' | 'Can Draft Content' | 'Can Review Content';

export type PipelineStage<TLabel extends string> = {
  label: TLabel;
  tone: ReadinessTone;
  note: string;
};

export function getLaunchStage(readiness: ProductReadiness): PipelineStage<LaunchStageLabel> {
  if (readiness.label === 'Blocked') {
    return { label: 'Blocked', tone: 'danger', note: 'Do not publish. Needs-fix event exists.' };
  }

  if (readiness.label === 'Draft' || readiness.label.startsWith('Needs ')) {
    return { label: 'Needs Review', tone: 'warning', note: 'Data/review layer is still open.' };
  }

  if (readiness.label === 'SEO Ready') {
    return { label: 'Can Prepare SEO', tone: 'neutral', note: 'Operational blockers are closed; SEO work can be prepared.' };
  }

  if (readiness.label === 'Ready for Storefront') {
    return { label: 'Can Prepare Feed', tone: 'success', note: 'Ready for collection/feed prep. Payment remains off.' };
  }

  return { label: 'Needs Review', tone: 'warning', note: 'Review product data first.' };
}

export function getContentStage(product: StorefrontProduct, readiness: ProductReadiness): PipelineStage<ContentStageLabel> {
  const flags = getProductFlags(product);

  if (readiness.label === 'Blocked') {
    return { label: 'Blocked', tone: 'danger', note: 'Product has a blocking review event.' };
  }

  if (readiness.label === 'Draft' || readiness.label.startsWith('Needs ')) {
    return { label: 'Data Not Ready', tone: 'warning', note: 'Wait for label/price/component/media checks.' };
  }

  if (!product.primary_image_url || flags.configs.length === 0) {
    return { label: 'Needs Content Inputs', tone: 'warning', note: 'Missing media or configuration context.' };
  }

  if (readiness.label === 'SEO Ready') {
    return { label: 'Can Draft Content', tone: 'success', note: 'Safe enough to prepare controlled copy drafts.' };
  }

  if (readiness.label === 'Ready for Storefront') {
    return { label: 'Can Review Content', tone: 'success', note: 'Ready for content QA and future SEO collection mapping.' };
  }

  return { label: 'Data Not Ready', tone: 'warning', note: 'Review product data first.' };
}
