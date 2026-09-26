import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveStorefrontSellableOffer } from '../lib/storefrontSellableOffer.ts';
import { selectLaunchSources } from '../lib/searchLaunchSelection.ts';

// Offline evidence reconciliation, never a DB ownership writer or publisher.
const paths = ['docs/search/approved-catalog-query-plan-20260924.json',
  'docs/search/launch-scope-capture-20260924.json', 'docs/search/approved-catalog-content-capture-20260924.json',
  'docs/search/approved-catalog-storefront-capture-20260924.json', 'docs/search/metadata-distinction-review-20260924.json',
  'docs/search/approved-catalog-content-bindings-20260924.json', 'docs/search/owner-product-decisions-20260924.json'];
const texts = paths.map(p => readFileSync(p, 'utf8'));
const [plan, source, content, storefront, metadata, bindings, decisions] = texts.map(t => JSON.parse(t));
const selection = selectLaunchSources(bindings.entries, decisions.launch_selections);
const visibleIds = new Set(selection.visible.map(e => e.identity.canonical_product_id));
const sourceById = new Map<string, any>(source.drafts.map((r: any) => [r.canonical_product_id, r]));
const storeById = new Map<string, any>(storefront.products.map((r: any) => [r.canonical_product_id, r]));
const target = new Set<string>(content.products.map((r: any) => r.canonical_product_id));
assert.equal(target.size, 208); assert.equal(storeById.size, target.size);
const termProducts = new Map<string, any[]>();
const rows = content.products.map((draft: any) => {
  const original = sourceById.get(draft.canonical_product_id), product = storeById.get(draft.canonical_product_id);
  assert.ok(original && product); assert.equal(original.id, draft.id);
  assert.equal(original.full_record_md5, draft.full_record_md5);
  assert.equal(product.url_path, '/shop/' + draft.product_slug);
  const historical = structuredClone(original.primary_keywords);
  for (const keyword of historical) {
    assert.equal(keyword.keyword_norm, keyword.keyword_norm.trim().toLowerCase());
    const found = termProducts.get(keyword.keyword_norm) ?? [];
    assert.ok(!found.some(r => r.canonical_product_id === draft.canonical_product_id));
    found.push({ canonical_product_id: draft.canonical_product_id, seo_page_id: product.seo_page_id,
      draft_id: draft.id, scope_known: Boolean(keyword.region && keyword.language) });
    termProducts.set(keyword.keyword_norm, found);
  }
  return { canonical_product_id: draft.canonical_product_id, seo_page_id: product.seo_page_id,
    url_path: product.url_path, draft_id: draft.id, source_record_md5: draft.full_record_md5,
    source_decision_id: draft.source_decision_id, historical_primary: historical,
    product_intent: 'The particular product/design and its verified selectable offer. Shared shopping terms are supporting relevance unless this PDP is separately assigned their cluster.',
    ownership_proposal_codes: [] as string[],
    review_blockers: historical.length ? [] : ['primary_missing_from_both_captured_draft_and_latest_decision'],
    approval_preserved: true, source_identity_preserved: true,
    launch_disposition: visibleIds.has(draft.canonical_product_id) ? 'visible_candidate' : 'suppressed_by_owner',
  };
});
const candidates = new Map<string, any>(plan.page_candidates.map((r: any) => [r.candidate_code, r]));
const seenTerms = new Set<string>(), seenCodes = new Set<string>();
const clusters = plan.clusters.map((cluster: any) => {
  assert.ok(!seenCodes.has(cluster.proposal_code)); seenCodes.add(cluster.proposal_code);
  const relevant = new Map<string, any>();
  const observations = cluster.query_terms.map((term: string) => {
    assert.ok(!seenTerms.has(term), `Two accountable proposals for ${term}`); seenTerms.add(term);
    const matches = termProducts.get(term); assert.ok(matches?.length, `Unobserved query invented: ${term}`);
    for (const match of matches) relevant.set(match.canonical_product_id, match);
    return { query: term, selected_as_primary_product_ids: matches.map(r => r.canonical_product_id),
      meaning: 'Saved keyword selection, not measured ranking competition or eligible inventory.' };
  });
  const products = [...relevant.values()];
  const blockers = ['intent_and_secondary_query_review_pending', 'not_registered_in_existing_query_registry', 'production_release_not_approved'];
  let owner: Record<string, unknown> | null = null;
  if (cluster.disposition === 'candidate_hub_owner') {
    const c = candidates.get(cluster.proposed_owner_candidate_code); assert.ok(c);
    assert.equal(c.seo_page_id, null);
    owner = { candidate_code: c.candidate_code, seo_page_id: null, url_path: c.url_path };
    blockers.push('hub_inventory_design_depth_and_unique_value_not_approved');
  } else if (cluster.disposition === 'existing_pdp_candidate') {
    assert.equal(products.length, 1, 'A sole PDP proposal cannot silently choose among competing products');
    const p = storeById.get(products[0].canonical_product_id);
    owner = { canonical_product_id: p.canonical_product_id, seo_page_id: p.seo_page_id, url_path: p.url_path };
    blockers.push('product_truth_and_qualified_query_fit_review_pending');
    if (!visibleIds.has(p.canonical_product_id)) blockers.push('proposed_owner_suppressed_from_launch');
  } else {
    assert.equal(cluster.disposition, 'unresolved_model_owner'); blockers.push('physical_offer_or_model_owner_unresolved');
  }
  if (products.some(p => !p.scope_known)) blockers.push('historical_keyword_market_or_language_missing');
  if (products.some(p => metadata.rows.some((m: any) => m.canonical_product_id === p.canonical_product_id && m.status === 'held')))
    blockers.push('affected_product_metadata_or_physical_identity_review');
  if (products.some(p => metadata.rows.some((m: any) => m.canonical_product_id === p.canonical_product_id
    && m.remaining_non_metadata_holds?.includes('headpiece_focused_unique_value_review'))))
    blockers.push('headpiece_intent_unique_value_review_pending');
  for (const product of products) rows.find((r: any) => r.canonical_product_id === product.canonical_product_id)!.ownership_proposal_codes.push(cluster.proposal_code);
  return { ...cluster, query_cluster_id: null, proposed_scope: plan.scope, observations,
    proposed_primary_owner: owner, primary_owner_count: owner ? 1 : 0,
    registration_ready: false, blockers, owner_role: 'OSPM', truth_reviewer: 'CPIM', can_index: false };
});
assert.deepEqual([...seenTerms].sort(), [...termProducts.keys()].sort(), 'Every observed Primary must be accounted for');
const offers: Array<{ id: string; offer: ReturnType<typeof resolveStorefrontSellableOffer> }> = rows.map((r: any) => ({ id: r.canonical_product_id, offer: resolveStorefrontSellableOffer(storeById.get(r.canonical_product_id)) }));
const typeCodes: Record<string, string[]> = { 'TYPE-ARMOR': ['shoulders', 'shoulder_x1', 'shoulders_x2'], 'TYPE-HARNESS': ['harness'], 'TYPE-BODYSUIT': ['bodysuit'] };
const candidateEvidence = plan.page_candidates.map((candidate: any) => {
  const codes = typeCodes[candidate.candidate_code];
  const matches = codes ? offers.filter(r => visibleIds.has(r.id) && r.offer.status === 'ready' && r.offer.atomic_options.some(o => codes.includes(o.code))).map(r => r.id) : null;
  return { ...candidate, supporting_cluster_codes: clusters.filter((c: any) => c.proposed_owner_candidate_code === candidate.candidate_code).map((c: any) => c.proposal_code),
    configuration_match_rule: codes ? { mode: 'standalone_atomic_option', component_codes: codes } : null,
    configuration_match_product_ids: matches, configuration_match_count: matches?.length ?? null,
    confirmed_distinct_design_count: null, confirmed_orderable_count: null,
    meaning: 'Configuration matches within the 207 visible launch candidates after owner duplicate suppression; not distinct design counts, page eligibility or orderability.' };
});
const report = { contract_version: 'approved_catalog_query_audit_v1', mode: 'offline_proposal_not_registered',
  summary: { target_products: rows.length, products_with_primary: rows.filter((r: any) => r.historical_primary.length).length,
    visible_launch_candidates: visibleIds.size, source_records_suppressed_from_launch: selection.suppressed.length,
    missing_primary_products: rows.filter((r: any) => !r.historical_primary.length).length,
    distinct_primary_terms: seenTerms.size, repeated_exact_primary_terms: [...termProducts.values()].filter(v => v.length > 1).length,
    proposed_clusters: clusters.length, hub_owner_proposals: clusters.filter((c: any) => c.disposition === 'candidate_hub_owner').length,
    existing_pdp_owner_proposals: clusters.filter((c: any) => c.disposition === 'existing_pdp_candidate').length,
    unresolved_model_owners: clusters.filter((c: any) => !c.proposed_primary_owner).length,
    multiple_proposed_primary_owner_conflicts: 0, registered_owners_created: 0 },
  source_fingerprints: paths.map((path, i) => ({ path, sha256: createHash('sha256').update(texts[i]).digest('hex') })),
  implementation_fingerprints: ['scripts/audit-approved-query-plan.ts', 'lib/searchLaunchSelection.ts', 'lib/storefrontSellableOffer.ts', 'lib/storefrontOwnerReviewedCorrections.ts', 'lib/storefrontReconciledOfferCorrections.ts']
    .map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path, 'utf8')).digest('hex') })),
  metric_policy: 'Historical keyword objects preserved exactly; no volume sums, currency conversions, filled metrics, refreshed dates or inference of organic difficulty. Proposed US/en-US page scope does not supply missing metric targeting.',
  product_rows: rows, cluster_proposals: clusters, candidate_evidence: candidateEvidence,
  can_publish: false, can_index: false, production_writes: 0 };
assert.equal(JSON.stringify(source), JSON.stringify(JSON.parse(texts[1])), 'Input mutated');
const output = JSON.stringify(report, null, 2) + '\n', path = 'docs/search/approved-catalog-query-audit-20260924.json';
if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8'), output);
else writeFileSync(path, output);
console.log(JSON.stringify(report.summary));
