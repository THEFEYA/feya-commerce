import type { StorefrontProduct } from '@/lib/types';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import { buildSeoCollectionCandidates, type SeoCollectionCandidate } from '@/lib/seo-product-graph';

export type SeoCollectionPlanStage = 'Blocked' | 'Needs More Products' | 'Can Prepare SEO' | 'Can Prepare Feed' | 'High Priority';

export type SeoCollectionPlan = SeoCollectionCandidate & {
  planStage: SeoCollectionPlanStage;
  priorityScore: number;
  planNote: string;
};

export function getSeoCollectionPlan(candidate: SeoCollectionCandidate): SeoCollectionPlan {
  const priorityScore = candidate.readyForFeedCount * 5
    + candidate.canPrepareSeoCount * 3
    + candidate.productCount
    - candidate.blockedCount * 4;

  if (candidate.blockedCount > 0 && candidate.readyForFeedCount === 0 && candidate.canPrepareSeoCount === 0) {
    return {
      ...candidate,
      planStage: 'Blocked',
      priorityScore,
      planNote: 'All visible momentum is blocked. Fix product-level review issues before collection work.',
    };
  }

  if (candidate.productCount < 2) {
    return {
      ...candidate,
      planStage: 'Needs More Products',
      priorityScore,
      planNote: 'Collection is too thin for a strong SEO landing page. Keep as internal candidate.',
    };
  }

  if (candidate.readyForFeedCount >= 3 && candidate.blockedCount === 0) {
    return {
      ...candidate,
      planStage: 'High Priority',
      priorityScore,
      planNote: 'Strong candidate for first SEO collection planning batch.',
    };
  }

  if (candidate.readyForFeedCount > 0) {
    return {
      ...candidate,
      planStage: 'Can Prepare Feed',
      priorityScore,
      planNote: 'At least one product is feed-ready. Prepare collection content carefully; do not publish yet.',
    };
  }

  if (candidate.canPrepareSeoCount > 0) {
    return {
      ...candidate,
      planStage: 'Can Prepare SEO',
      priorityScore,
      planNote: 'Operational checks are close enough to start draft SEO planning.',
    };
  }

  return {
    ...candidate,
    planStage: 'Needs More Products',
    priorityScore,
    planNote: 'Not enough ready products for public collection planning yet.',
  };
}

export function buildSeoCollectionPlans(products: StorefrontProduct[], events: AdminReviewEvent[]) {
  return buildSeoCollectionCandidates(products, events)
    .map(getSeoCollectionPlan)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.productCount - a.productCount || a.label.localeCompare(b.label));
}

export function summarizeSeoCollectionPlans(plans: SeoCollectionPlan[]) {
  return plans.reduce((acc, plan) => {
    acc.total += 1;
    acc[plan.planStage] = (acc[plan.planStage] || 0) + 1;
    acc.readyForFeed += plan.readyForFeedCount > 0 ? 1 : 0;
    acc.withBlockers += plan.blockedCount > 0 ? 1 : 0;
    return acc;
  }, { total: 0, readyForFeed: 0, withBlockers: 0 } as Record<string, number>);
}
