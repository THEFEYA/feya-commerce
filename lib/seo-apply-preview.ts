import type { StorefrontProduct } from '@/lib/types';
import { productSlug, productTitle } from '@/lib/storefront';
import { buildSeoDraftSuggestion } from '@/lib/seo-draft-suggestions';
import { getSeoScore } from '@/lib/seo-scoring';
import type { AdminReviewEvent } from '@/lib/admin-readiness';

export type SeoApplyPreviewStatus = 'Blocked' | 'Pending Approval' | 'Ready for Change Set';

export type SeoApplyFieldPreview = {
  field: 'seo_title' | 'meta_description' | 'h1' | 'primary_image_alt';
  currentValue: string;
  proposedValue: string;
  changed: boolean;
};

export type SeoApplyPreview = {
  productSlug: string;
  title: string;
  status: SeoApplyPreviewStatus;
  score: number;
  fields: SeoApplyFieldPreview[];
  blockers: string[];
};

type SeoRecord = StorefrontProduct & Record<string, unknown>;

function textValue(product: SeoRecord, keys: string[]) {
  for (const key of keys) {
    const value = product[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function hasSeoApproval(product: StorefrontProduct, events: AdminReviewEvent[]) {
  const slug = productSlug(product);
  return events.some((event) => event.product_slug === slug && event.event_type === 'seo_ready_checked' && event.event_status === 'approved');
}

function field(field: SeoApplyFieldPreview['field'], currentValue: string, proposedValue: string): SeoApplyFieldPreview {
  const current = currentValue.trim();
  const proposed = proposedValue.trim();
  return { field, currentValue: current, proposedValue: proposed, changed: current !== proposed };
}

export function getSeoApplyPreview(product: StorefrontProduct, events: AdminReviewEvent[]): SeoApplyPreview {
  const record = product as SeoRecord;
  const draft = buildSeoDraftSuggestion(product);
  const score = getSeoScore(product);
  const blockers: string[] = [];
  const approved = hasSeoApproval(product, events);

  if (!approved) blockers.push('SEO draft is not approved yet.');
  if (score.stage === 'Blocked') blockers.push('Product is blocked by SEO scoring.');

  let status: SeoApplyPreviewStatus = 'Ready for Change Set';
  if (!approved) status = 'Pending Approval';
  if (score.stage === 'Blocked') status = 'Blocked';

  return {
    productSlug: productSlug(product),
    title: productTitle(product),
    status,
    score: score.overallScore,
    fields: [
      field('seo_title', textValue(record, ['seo_title', 'meta_title', 'title']), draft.titleDraft),
      field('meta_description', textValue(record, ['meta_description', 'seo_description', 'description_meta']), draft.metaDescriptionDraft),
      field('h1', textValue(record, ['h1', 'seo_h1', 'title']), draft.h1Draft),
      field('primary_image_alt', textValue(record, ['primary_image_alt', 'image_alt', 'alt_text']), draft.altTextDraft),
    ],
    blockers,
  };
}

export function buildSeoApplyPreviews(products: StorefrontProduct[], events: AdminReviewEvent[]) {
  return products.map((product) => getSeoApplyPreview(product, events)).sort((a, b) => {
    const order: Record<SeoApplyPreviewStatus, number> = {
      'Blocked': 0,
      'Pending Approval': 1,
      'Ready for Change Set': 2,
    };
    return order[a.status] - order[b.status] || a.title.localeCompare(b.title);
  });
}

export function summarizeSeoApplyPreviews(previews: SeoApplyPreview[]) {
  return previews.reduce((acc, preview) => {
    acc.total += 1;
    acc[preview.status] = (acc[preview.status] || 0) + 1;
    acc.changedFields += preview.fields.filter((fieldPreview) => fieldPreview.changed).length;
    return acc;
  }, { total: 0, changedFields: 0 } as Record<string, number>);
}
