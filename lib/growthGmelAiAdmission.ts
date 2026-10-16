/**
 * Growth OS: deterministic semantic-analysis admission, NOT a model executor.
 *
 * Canonical GMEL passport (2026-09-18): GMEL owns evidence limits and
 * measurement feasibility, not strategy, statistical tests by LLM, or writes.
 *
 * This guard cannot itself authorize spending: any future API worker MUST use
 * a separate atomic, owner-approved dollar reservation before calling a model.
 */
export type FeyaEvidenceSource = {
  source_code: string;
  health_state: string;
  freshness_state: string;
  checked_at?: string | null;
};

export type GmelAiPurpose = 'SEARCH_PERFORMANCE' | 'COMMERCIAL_OUTCOME';
export type GmelAiBlocker =
  | 'ROLE_NOT_SHADOW_OR_ACTIVE'
  | 'ROLE_ACTION_NOT_GRANTED'
  | 'CASE_NOT_OPEN'
  | 'CASE_OWNER_MISMATCH'
  | 'SOURCE_REGISTRY_MISSING'
  | 'ORGANIC_SEARCH_PERFORMANCE_UNAVAILABLE'
  | 'BEHAVIORAL_ANALYTICS_UNAVAILABLE'
  | 'COMMERCE_ORDER_TRUTH_UNAVAILABLE'
  | 'COMMERCE_REVENUE_TRUTH_UNAVAILABLE'
  | 'MEANINGFUL_NEW_QUESTION_MISSING'
  | 'SOURCE_EVIDENCE_NOT_FRESH'
  | 'MODEL_EXECUTOR_DISABLED'
  | 'OWNER_BUDGET_NOT_APPROVED'
  | 'PRICING_POLICY_MISSING'
  | 'SPEND_RESERVATION_UNAVAILABLE';

export type GmelRoleAdmission = {
  role_code: string;
  runtime_status: string;
  allowed_action_codes_json: unknown;
};

export type OwnerModelBudgetApproval = {
  // This must eventually be read from an audited, server-side approved policy.
  enabled: boolean;
  approved_by_owner: boolean;
  policy_version: string | null;
  approved_until: string | null;
  max_total_usd: number | null;
  remaining_usd: number | null;
  max_single_call_usd: number | null;
  price_contract_version: string | null;
  reserved_atomically: boolean;
};

export type GmelAdmissionInput = {
  role: GmelRoleAdmission | null;
  sources: FeyaEvidenceSource[];
  purpose: GmelAiPurpose;
  case_status: string;
  current_accountable_domain: string;
  question_is_new_and_semantic: boolean;
  model_executor_enabled: boolean;
  budget: OwnerModelBudgetApproval | null;
  now: Date;
};

export type GmelAdmissionDecision = {
  allowed_to_dispatch: boolean;
  status: 'NOT_OBSERVABLE' | 'WAITING_POLICY' | 'READY_WITH_ATOMIC_RESERVATION';
  blockers: GmelAiBlocker[];
  source_states: Record<string, string>;
  measurement_claim_allowed: false;
  production_mutation_allowed: false;
};

/** Ordered so the UI and future executor report the same root causes. */
const requirements: Record<GmelAiPurpose, readonly string[]> = {
  SEARCH_PERFORMANCE: ['ORGANIC_SEARCH_PERFORMANCE'],
  COMMERCIAL_OUTCOME: [
    'ORGANIC_SEARCH_PERFORMANCE',
    'BEHAVIORAL_ANALYTICS',
    'COMMERCE_ORDER_TRUTH',
    'COMMERCE_REVENUE_TRUTH',
  ],
};

const failureCodes: Record<string, GmelAiBlocker> = {
  ORGANIC_SEARCH_PERFORMANCE: 'ORGANIC_SEARCH_PERFORMANCE_UNAVAILABLE',
  BEHAVIORAL_ANALYTICS: 'BEHAVIORAL_ANALYTICS_UNAVAILABLE',
  COMMERCE_ORDER_TRUTH: 'COMMERCE_ORDER_TRUTH_UNAVAILABLE',
  COMMERCE_REVENUE_TRUTH: 'COMMERCE_REVENUE_TRUTH_UNAVAILABLE',
};

function liveSource(source: FeyaEvidenceSource | undefined, now: Date): boolean {
  if (!source || source.health_state !== 'HEALTHY' ||
      source.freshness_state !== 'FRESH' || !source.checked_at) return false;
  const seen = Date.parse(source.checked_at);
  const ageMs = now.getTime() - seen;
  // Match the existing source-health V2 hard upper ceiling; future timestamps
  // must not turn an unverified dataset into supposedly live evidence.
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 7 * 24 * 60 * 60 * 1000;
}

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Intentionally fail closed on missing/stale data and budget.
 * The `reserved_atomically` flag alone is NOT a reservation receipt.
 * An actual worker must verify its unique DB lease and reservation identity.
 */
export function evaluateGmelAiAdmission(input: GmelAdmissionInput): GmelAdmissionDecision {
  const blockers: GmelAiBlocker[] = [];
  const role = input.role;
  if (role?.role_code !== 'GMEL' ||
      !['SHADOW', 'ACTIVE'].includes(role.runtime_status)) {
    blockers.push('ROLE_NOT_SHADOW_OR_ACTIVE');
  }
  if (!Array.isArray(role?.allowed_action_codes_json) ||
      !role.allowed_action_codes_json.includes('RECORD_LEARNING_EVIDENCE')) {
    blockers.push('ROLE_ACTION_NOT_GRANTED');
  }
  if (!['OPEN', 'TRIAGED', 'INVESTIGATING'].includes(input.case_status)) {
    blockers.push('CASE_NOT_OPEN');
  }
  if (input.current_accountable_domain !== 'TSEO') {
    blockers.push('CASE_OWNER_MISMATCH');
  }
  if (!input.question_is_new_and_semantic) blockers.push('MEANINGFUL_NEW_QUESTION_MISSING');

  const byCode = new Map(input.sources.map(source => [source.source_code, source]));
  const sourceStates: Record<string, string> = {};
  for (const code of requirements[input.purpose]) {
    const source = byCode.get(code);
    sourceStates[code] = source ? `${source.health_state}/${source.freshness_state}` : 'MISSING';
    if (!source) blockers.push('SOURCE_REGISTRY_MISSING');
    if (!liveSource(source, input.now)) {
      blockers.push(failureCodes[code]);
      if (source?.health_state === 'HEALTHY' && source.freshness_state === 'FRESH') blockers.push('SOURCE_EVIDENCE_NOT_FRESH');
    }
  }

  if (!input.model_executor_enabled) blockers.push('MODEL_EXECUTOR_DISABLED');

  const budget = input.budget;
  const validDate = budget?.approved_until
    ? Date.parse(budget.approved_until) : NaN;
  const budgetApproved = budget?.enabled === true &&
    budget.approved_by_owner === true &&
    Boolean(budget.policy_version) &&
    Number.isFinite(validDate) &&
    validDate > input.now.getTime() &&
    positiveFinite(budget.max_total_usd) &&
    positiveFinite(budget.max_single_call_usd) &&
    positiveFinite(budget.remaining_usd) &&
    budget.max_single_call_usd <= budget.remaining_usd;

  if (!budgetApproved) blockers.push('OWNER_BUDGET_NOT_APPROVED');
  if (!budget?.price_contract_version) blockers.push('PRICING_POLICY_MISSING');
  if (!budget?.reserved_atomically) blockers.push('SPEND_RESERVATION_UNAVAILABLE');

  // Not every *_UNAVAILABLE status refers to measurement data:
  // SPEND_RESERVATION_UNAVAILABLE is a financial authorization blocker.
  const dataSourceErrors = new Set<GmelAiBlocker>(Object.values(failureCodes));
  const dataBlocked = blockers.some(code =>
    code === 'SOURCE_REGISTRY_MISSING' ||
    code === 'SOURCE_EVIDENCE_NOT_FRESH' ||
    dataSourceErrors.has(code));

  return {
    allowed_to_dispatch: blockers.length === 0,
    status: dataBlocked ? 'NOT_OBSERVABLE'
      : blockers.length > 0 ? 'WAITING_POLICY'
      : 'READY_WITH_ATOMIC_RESERVATION',
    blockers,
    source_states: sourceStates,
    measurement_claim_allowed: false,
    production_mutation_allowed: false,
  };
}
