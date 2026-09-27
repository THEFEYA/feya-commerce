/** Deterministic review policy. This module never grants publication/indexing. */
export const PAGE_FAMILIES = ['home', 'shop', 'type_hub', 'event_hub', 'style_hub', 'subhub', 'product', 'guide', 'trust'] as const;
export type PageFamily = typeof PAGE_FAMILIES[number];
export type EvidenceStatus = 'confirmed' | 'unknown' | 'rejected';
export type BasePage = {
  seo_page_id: string;
  page_type: 'product' | 'landing' | 'editorial';
  market_code: string;
  locale: string;
  url_path: string;
  portfolio_status: string;
};
export type MembershipEvidence = {
  canonical_product_id: string;
  design_family_key: string | null;
  status: 'eligible' | 'ineligible' | 'unknown';
  orderability: EvidenceStatus;
  truth_version: string | null;
  current_truth_version: string | null;
};
export type PageSpec = {
  family: PageFamily;
  primary_parent_page_id: string | null;
  accountable_owner: string;
  review_state: 'draft' | 'review' | 'approved' | 'hold';
  user_intent: string;
  primary_intent: string;
  unique_value_brief: string;
  intent_evidence_status: EvidenceStatus;
  truth_status: EvidenceStatus;
  utility_rationale: string | null;
  inventory_policy: { status: 'proposed' | 'approved'; minimum_distinct_designs: number } | null;
};
export type QueryOwnership = {
  seo_page_id: string;
  query_cluster_id: string;
  market_code: string;
  locale: string;
  ownership_role: string;
  ownership_status: string;
  effective_from: string;
  effective_to: string | null;
};
const HUBS = new Set<PageFamily>(['type_hub', 'event_hub', 'style_hub', 'subhub']);
const OPEN_OWNERSHIP = new Set(['intended', 'active', 'protected']);

export function expectedBasePageType(family: PageFamily): BasePage['page_type'] {
  return family === 'product' ? 'product' : family === 'guide' ? 'editorial' : 'landing';
}

export function isCanonicalPagePath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || /[?#\\\s%]/.test(value)) return false;
  if (value.includes('//') || value.split('/').some(part => part === '.' || part === '..')) return false;
  return value === '/' || (!value.endsWith('/') && !/^\/(?:admin|api|cart|checkout|account)(?:\/|$)/.test(value));
}

function scope(row: QueryOwnership) {
  return JSON.stringify([row.query_cluster_id, row.market_code, row.locale]);
}

export function auditOwnership(rows: QueryOwnership[], now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid audit timestamp');
  const current: QueryOwnership[] = [];
  const invalid: QueryOwnership[] = [];
  for (const row of rows) {
    if (row.ownership_role !== 'primary' || !OPEN_OWNERSHIP.has(row.ownership_status)) continue;
    const start = Date.parse(row.effective_from);
    const end = row.effective_to === null ? Infinity : Date.parse(row.effective_to);
    if (!Number.isFinite(start) || Number.isNaN(end) || end <= start || !row.query_cluster_id || !row.market_code || !row.locale) {
      invalid.push(row);
      continue;
    }
    if (start <= now.getTime() && now.getTime() < end) current.push(row);
  }
  const groups = new Map<string, QueryOwnership[]>();
  for (const row of current) groups.set(scope(row), [...(groups.get(scope(row)) || []), row]);
  const conflicts = [...groups.values()].filter(group => group.length > 1);
  return { current, invalid, conflicts };
}

export function assessSearchPage(input: {
  page: BasePage;
  spec: PageSpec | null;
  memberships: MembershipEvidence[];
  ownership: QueryOwnership[];
  now: Date;
}) {
  const { page, spec, memberships, ownership, now } = input;
  const reasons = new Set<string>();
  if (!isCanonicalPagePath(page.url_path)) reasons.add('invalid_public_path');
  if (page.portfolio_status !== 'active') reasons.add('portfolio_not_active');
  if (!spec) reasons.add('page_spec_missing');
  const audit = auditOwnership(ownership, now);
  const inScope = (row: QueryOwnership) => row.market_code === page.market_code && row.locale === page.locale;
  if (audit.invalid.some(row => row.seo_page_id === page.seo_page_id && inScope(row))) reasons.add('ownership_interval_invalid');
  if (audit.conflicts.some(group => group.some(row => row.seo_page_id === page.seo_page_id && inScope(row)))) reasons.add('primary_ownership_conflict');
  const primaryCount = audit.current.filter(row => row.seo_page_id === page.seo_page_id && inScope(row)).length;
  // A repeated product/configuration never increases eligible inventory depth.
  const byProduct = new Map<string, MembershipEvidence>();
  for (const member of memberships) {
    if (byProduct.has(member.canonical_product_id)) reasons.add('duplicate_product_membership');
    byProduct.set(member.canonical_product_id, member);
  }
  const eligible = [...byProduct.values()].filter(member => {
    if (member.status !== 'eligible') return false;
    if (!member.truth_version || member.truth_version !== member.current_truth_version) {
      reasons.add('membership_truth_stale_or_missing');
      return false;
    }
    return member.orderability === 'confirmed';
  });
  const designs = new Set(eligible.map(member => member.design_family_key).filter((key): key is string => Boolean(key?.trim())));
  if (spec) {
    if (page.page_type !== expectedBasePageType(spec.family)) reasons.add('family_page_type_mismatch');
    if (spec.review_state !== 'approved') reasons.add('spec_not_approved');
    if (!spec.accountable_owner.trim()) reasons.add('accountable_owner_missing');
    if (!spec.user_intent.trim() || !spec.primary_intent.trim()) reasons.add('intent_missing');
    if (!spec.unique_value_brief.trim()) reasons.add('unique_value_missing');
    if (spec.intent_evidence_status !== 'confirmed') reasons.add('intent_not_confirmed');
    if (spec.truth_status !== 'confirmed') reasons.add('page_truth_not_confirmed');
    if (spec.primary_parent_page_id === page.seo_page_id) reasons.add('self_parent');
    const utilityException = (spec.family === 'trust' || spec.family === 'guide') && Boolean(spec.utility_rationale?.trim());
    if (primaryCount === 0 && !utilityException) reasons.add('primary_owner_missing');
    if (HUBS.has(spec.family)) {
      if (eligible.some(member => !member.design_family_key?.trim())) reasons.add('design_family_unknown');
      const policy = spec.inventory_policy;
      if (!policy || policy.status !== 'approved') reasons.add('inventory_policy_not_approved');
      else if (!Number.isSafeInteger(policy.minimum_distinct_designs) || policy.minimum_distinct_designs < 1) reasons.add('invalid_inventory_policy');
      else if (designs.size < policy.minimum_distinct_designs) reasons.add('insufficient_distinct_designs');
    }
  }
  return {
    seo_page_id: page.seo_page_id,
    decision: reasons.size ? 'hold' as const : 'eligible_for_technical_review' as const,
    reason_codes: [...reasons].sort(),
    primary_ownership_count: primaryCount,
    eligible_product_count: eligible.length,
    distinct_design_count: designs.size,
    unknown_product_count: memberships.filter(member => member.status === 'unknown' || member.orderability === 'unknown').length,
    can_publish: false as const,
    can_index: false as const,
  };
}

export function findParentCycles(specs: Array<{ seo_page_id: string; primary_parent_page_id: string | null }>) {
  const parents = new Map(specs.map(spec => [spec.seo_page_id, spec.primary_parent_page_id]));
  const cycles = new Map<string, string[]>();
  for (const start of parents.keys()) {
    const path: string[] = [];
    let current: string | null | undefined = start;
    while (current) {
      const at = path.indexOf(current);
      if (at >= 0) {
        const cycle = path.slice(at).sort();
        cycles.set(cycle.join('|'), cycle);
        break;
      }
      path.push(current);
      current = parents.get(current);
    }
  }
  return [...cycles.values()];
}
