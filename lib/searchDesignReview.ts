import { createHash } from 'node:crypto';

export type CatalogIdentityEvidence = {
  canonical_product_id: string; primary_source_listing_id: string | null;
  matched_etsy_listing_id: string | null; raw_image_urls: string[] | null;
};

/** Retrieval heuristics for CPIM review, never a design-family classifier.
 * Generic/shared chart images are removed using the COMPLETE catalog scope.
 * Source listings, photos and connected components cannot approve a family. */
export function buildDesignReviewPairs(catalog: CatalogIdentityEvidence[], targetIds: string[]) {
  if (new Set(catalog.map(p => p.canonical_product_id)).size !== catalog.length) throw new Error('Duplicate product identity');
  const all = new Map(catalog.map(p => [p.canonical_product_id, p]));
  if (targetIds.some(id => !all.has(id))) throw new Error('Incomplete catalog coverage');
  const media = new Map(catalog.map(p => [p.canonical_product_id, new Set((p.raw_image_urls || []).filter(u => typeof u === 'string' && u.trim()))]));
  const frequency = new Map<string, number>();
  media.forEach(urls => urls.forEach(u => frequency.set(u, (frequency.get(u) || 0) + 1)));
  const rare = new Map([...media].map(([id, urls]) => [id, new Set([...urls].filter(u => frequency.get(u)! <= 3))]));
  const ids = [...new Set(targetIds)].sort();
  const proposals = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = all.get(ids[i])!, b = all.get(ids[j])!;
    const ar = rare.get(ids[i])!, br = rare.get(ids[j])!;
    const shared = [...ar].filter(u => br.has(u)).sort();
    const sameSource = Boolean(a.primary_source_listing_id && a.primary_source_listing_id === b.primary_source_listing_id);
    const sameListing = Boolean(a.matched_etsy_listing_id && a.matched_etsy_listing_id === b.matched_etsy_listing_id);
    const overlap = Math.min(ar.size, br.size) ? shared.length / Math.min(ar.size, br.size) : null;
    if (!sameSource && !sameListing && !(shared.length >= 2 && overlap !== null && overlap >= 0.5)) continue;
    const pair = [a.canonical_product_id, b.canonical_product_id];
    proposals.push({ proposal_key: 'design-review:' + createHash('sha256').update(pair.join('|')).digest('hex').slice(0, 24),
      product_ids: pair, shared_source_listing: sameSource, shared_etsy_listing: sameListing,
      shared_rare_media: shared, rare_media_counts: [ar.size, br.size], smaller_gallery_overlap: overlap,
      evidence_sha256: createHash('sha256').update(JSON.stringify({ pair, a, b, shared })).digest('hex'),
      status: 'review_required', design_family_key: null, reviewer: 'CPIM',
      required_decision: 'Same underlying physical design, different configurations of one design, or different pieces sharing a photoshoot? Attach product-scoped evidence and current revision.',
      can_merge_products: false, can_assign_family: false, can_index: false,
    });
  }
  return { policy_version: 'design_review_retrieval_v1', scope_product_count: catalog.length, target_product_count: ids.length,
    retrieval_parameters: { maximum_asset_product_frequency: 3, minimum_shared_assets: 2, minimum_smaller_gallery_overlap: 0.5 },
    parameter_meaning: 'Review prioritization only; not Google thresholds, uniqueness scores or approved inventory policy.',
    excluded_common_asset_count: [...frequency.values()].filter(n => n > 3).length,
    confirmed_distinct_design_count: null, transitive_merging_performed: false,
    proposals, unassigned_product_ids: ids, can_index: false,
  };
}
