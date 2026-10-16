// Pure projection of canonical persisted handoffs. It never changes runtime state.
// A human-assisted model review must never be shown as an autonomous GMEL worker.
import type { GrowthHandoffRow } from '@/lib/types';

type CaseRow = Record<string, unknown>;
export type GmelShadowReview = {
  state: 'PENDING' | 'OPERATOR_REVIEWED' | 'REJECTED' | 'STALE' | 'UNVERIFIED';
  verdict?: string;
  evidenceLevel?: string;
  businessOutcome?: string;
  reviewMethod?: string;
  completedAt?: string | null;
  limitations?: string;
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function gmelShadowReviewForCase(row: CaseRow, handoffs: GrowthHandoffRow[]): GmelShadowReview | null {
  if (row.case_type !== 'TSEO_INDEXABILITY_SHADOW' ||
      typeof row.case_id !== 'string' ||
      typeof row.ownership_epoch !== 'number') return null;

  const relevant = handoffs.filter(h =>
    h.case_id === row.case_id &&
    h.ownership_epoch === row.ownership_epoch &&
    h.source_domain === 'TSEO' &&
    h.target_domain === 'GMEL' &&
    h.expected_output_schema_code === 'GMEL_RELEASE_EVIDENCE_SCOPE_V1'
  ).sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const h = relevant[0];
  if (!h) return null;
  if (h.handoff_status === 'STALE') return { state: 'STALE' };
  if (h.handoff_status === 'REJECTED') return { state: 'REJECTED' };
  if (h.handoff_status === 'OPEN') return { state: 'PENDING' };
  if (h.handoff_status !== 'COMPLETED') return { state: 'UNVERIFIED' };

  const result = object(h.result_json);
  if (!result || result.verdict !== 'INTERNAL_RELEASE_CONSISTENCY_PASS' ||
      result.scope !== 'ACTIVE_SEARCH_RELEASE_INTENT_ONLY' ||
      result.actual_google_indexing_observable !== false ||
      result.evidence_level !== 'L0_OBSERVATION' ||
      result.business_outcome_state !== 'NOT_MEASURABLE') {
    return { state: 'UNVERIFIED' };
  }

  const method = typeof result.independent_review_method === 'string'
    ? result.independent_review_method
    : '';
  // Future autonomous reviewers will need a separately authenticated run receipt.
  // A JSON boolean by itself cannot prove that an agent executed a real task.
  const actualOperator = method === 'OPERATOR_ASSISTED_CHATGPT_SEPARATE_SQL_RECOUNT_NOT_AUTONOMOUS_GMEL_RUNTIME'
    && result.autonomous_gmel_agent_executed === false;

  if (!actualOperator) return { state: 'UNVERIFIED' };

  return {
    state: 'OPERATOR_REVIEWED',
    verdict: String(result.verdict),
    evidenceLevel: String(result.evidence_level),
    businessOutcome: String(result.business_outcome_state),
    reviewMethod: 'OPERATOR_ASSISTED_CHATGPT',
    completedAt: h.completed_at,
    limitations: typeof result.notes === 'string' ? result.notes.slice(0, 500) : undefined,
  };
}
