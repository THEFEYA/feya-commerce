/** Offline work-priority assessment. Never a storefront publication/quote gate. */
import { resolveStorefrontSellableOffer } from './storefrontSellableOffer.ts';

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value)
  ? value.filter((x): x is Row => Boolean(x) && typeof x === 'object' && !Array.isArray(x)) : [];
const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const nonemptyArray = (value: unknown) => Array.isArray(value) && value.length > 0;
const language = (value: unknown) => norm(value) === 'en-us' ? 'en' : norm(value);
const scope = (k: Row) => [norm(k.region), language(k.language), norm(k.keyword_norm || k.keyword)].join('|');
const observedSources = new Set(['google_keyword_planner', 'google_ads_csv', 'keyword_planner_csv', 'google_ads_api']);

export function assessLaunchCandidate(input: {
  product: Row; draft?: Row; bank: Row[]; deferredIds: ReadonlySet<string>;
}) {
  const { product, draft: d, bank, deferredIds } = input;
  const id = String(product.canonical_product_id || '');
  const reasons: string[] = [];
  const deferred = deferredIds.has(id);
  if (deferred) reasons.push('owner_deferred_family');
  if (!d) reasons.push('no_saved_draft');
  if (d && String(d.canonical_product_id) !== id) reasons.push('draft_product_mismatch');
  if (d?.review_status !== 'approved' || d?.status !== 'approved_draft' || d?.archived_at) reasons.push('approved_current_copy_missing');
  const offer = resolveStorefrontSellableOffer(product);
  if (offer.status !== 'ready') reasons.push('offer_composition_unresolved');
  const primary = rows(d?.primary_keywords);
  const selected = rows(d?.selected_primary_keywords);
  const k = primary.length === 1 ? primary[0] : {};
  if (primary.length !== 1 || !norm(k.keyword_norm || k.keyword)) reasons.push('single_primary_missing');
  if (!d?.source_decision_id || d.source_decision_id !== d.latest_decision_id) reasons.push('current_decision_link_unverified');
  if (selected.length !== 1 || scope(selected[0]) !== scope(k)) reasons.push('current_primary_differs');
  const decisionDate = Date.parse(String(d?.latest_decision_updated_at || ''));
  const draftDate = Date.parse(String(d?.updated_at || ''));
  if (!Number.isFinite(decisionDate) || !Number.isFinite(draftDate) || decisionDate > draftDate) reasons.push('decision_version_not_covered');
  const focus = record(d?.current_focus);
  if (!focus.sellable_offer_signature || focus.sellable_offer_signature !== offer.signature) reasons.push('offer_signature_not_covered');
  if (['approval_blockers', 'product_truth_blockers', 'snapshot_truth_blockers'].some(key => nonemptyArray(d?.[key]))) reasons.push('saved_draft_blockers');
  if (record(d?.metrics_status_snapshot).status !== 'validated') reasons.push('saved_metric_review_incomplete');
  const matchingBank = bank.filter(b => b.id === k.id && scope(b) === scope(k));
  const b = matchingBank.length === 1 ? matchingBank[0] : undefined;
  // Stored evidence only. Never turn a capture date into new measurement or infer target period.
  const checked = Date.parse(String(k.last_checked || ''));
  if (!b || !observedSources.has(norm(k.metric_source)) || b.metric_source !== k.metric_source
    || !k.region || !k.language || !Number.isFinite(checked) || checked > draftDate
    || typeof k.avg_monthly_searches !== 'number' || !Number.isFinite(k.avg_monthly_searches) || k.avg_monthly_searches < 0
    || b.avg_monthly_searches !== k.avg_monthly_searches || b.last_checked !== k.last_checked) reasons.push('primary_bank_evidence_unverified');
  return {
    canonical_product_id: id, draft_id: d?.id ?? null, source_decision_id: d?.source_decision_id ?? null,
    draft_record_md5: d?.full_record_md5 ?? null, title: d?.h1 ?? product.card_title,
    state: deferred ? 'deferred_expansion' : reasons.length ? 'review_backlog' : 'candidate_preflight',
    reasons, primary_keyword: k.keyword_norm || k.keyword || null,
    primary_scope: primary.length === 1 ? scope(k) : null,
    metric_evidence: b ? { keyword_id: b.id, source: b.metric_source, last_checked: b.last_checked,
      market: b.region, language: b.language, interpretation: 'stored historical evidence; not a new demand measurement' } : null,
    composition_status: offer.status, cqa_status: d?.cqa_status ?? null,
    // Candidate state cannot authorize any of these effects, including on empty reasons.
    can_publish: false as const, can_index: false as const, can_enable_checkout: false as const,
  };
}

export function findSavedPrimaryOverlaps(drafts: Row[]) {
  const groups = new Map<string, Set<string>>();
  for (const d of drafts.filter(d => d.review_status === 'approved' && !d.archived_at)) {
    const primary = rows(d.primary_keywords);
    if (primary.length !== 1 || !norm(primary[0].keyword_norm || primary[0].keyword)) continue;
    const key = scope(primary[0]);
    groups.set(key, new Set([...(groups.get(key) || []), String(d.canonical_product_id)]));
  }
  return [...groups.entries()].filter(([, ids]) => ids.size > 1).sort(([a], [b]) => a.localeCompare(b))
    .map(([primary_scope, ids]) => ({ primary_scope, product_ids: [...ids].sort(),
      interpretation: 'saved exact-primary overlap; intent conflict and query owner need review, not automatic merging' }));
}
