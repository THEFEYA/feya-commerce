/**
 * FEYA G2b: exactly one HUMAN TSEO L0 case-triage intent.
 *
 * Pure fail-closed contract; Core's existing feya_fn_transition_growth_case_v1
 * remains the only case status mutation. This module does not admit new agents,
 * change SEO, execute paid models, or infer business results.
 */
import { createHash } from 'node:crypto';
import {
  evaluateOwnerL0ReviewRequest,
  type ShadowCase,
  type ShadowWorkflow,
  type ExistingShadowReview,
  type CurrentSearchRelease,
} from './shadowL0ReviewRequest.ts';

export const OWNER_CASE_TRIAGE_ACTION = 'TRIAGE_TSEO_L0_V1' as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CaseTriageInput = {
  action: typeof OWNER_CASE_TRIAGE_ACTION;
  case_id: string;
  expected_status: 'OPEN';
  expected_ownership_epoch: number;
  expected_case_event_id: string;
  request_id: string;
  reason: string;
  confirm_l0_limits: true;
};
type RecordLike = Record<string,unknown>;
type TriageCase = ShadowCase & { case_code: string };
type CaseEvent = {
  case_event_id: string;
  case_id: string;
  event_type: string;
  to_status: string | null;
  ownership_epoch: number;
  idempotency_key?: string | null;
};
type TriageWorkflow = ShadowWorkflow & { workflow_run_id: string; workflow_type: string };
type Handoff = {
  handoff_id?: string;
  case_id?: string;
  ownership_epoch?: number | null;
  source_domain?: string | null;
  target_domain?: string | null;
  handoff_status?: string | null;
  expected_output_schema_code?: string | null;
};
type Attention = {
  attention_id: string;
  case_id: string;
  attention_type: string;
  attention_status: string;
  context_json: unknown;
  resolution_json: unknown;
};
type AttentionEvent = {
  attention_id: string;
  event_type: string;
  to_status: string | null;
  decision_code: string | null;
  actor_user_id?: string | null;
};
export type TriageEvidence = {
  caseRow: TriageCase | null;
  latestCaseEvent: CaseEvent | null;
  workflow: TriageWorkflow | null;
  handoff: Handoff | null;
  review: ExistingShadowReview;
  activeSearch: CurrentSearchRelease | null;
  attention: Attention | null;
  latestAttentionEvent: AttentionEvent | null;
};
export type TriageReason =
  'READY' | 'CASE_MISMATCH' | 'STALE_CASE_EVENT' | 'WORKFLOW_OR_RELEASE_MISSING' |
  'HANDOFF_UNVERIFIED' | 'OWNER_L0_NOT_CONFIRMED';
export type TriageVerdict = { allowed: boolean; reason: TriageReason };

function object(value: unknown): RecordLike | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordLike : null;
}
function inputKeys(raw: RecordLike) {
  return Object.keys(raw).sort().join(',');
}
function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** Exact schema: the browser cannot supply arbitrary case status, policies, or URLs. */
export function parseOwnerCaseTriageInput(raw: unknown): CaseTriageInput {
  const value = object(raw);
  if (!value ||
    inputKeys(value) !== 'action,case_id,confirm_l0_limits,expected_case_event_id,expected_ownership_epoch,expected_status,reason,request_id' ||
    value.action !== OWNER_CASE_TRIAGE_ACTION ||
    !validUuid(value.case_id) || !validUuid(value.expected_case_event_id) ||
    !validUuid(value.request_id) ||
    value.expected_status !== 'OPEN' || value.confirm_l0_limits !== true ||
    typeof value.expected_ownership_epoch !== 'number' ||
    !Number.isSafeInteger(value.expected_ownership_epoch) ||
    value.expected_ownership_epoch < 1 ||
    typeof value.reason !== 'string') {
    throw new Error('invalid_case_triage_request');
  }
  const reason = value.reason.trim().replace(/\s+/g,' ');
  if (reason.length < 20 || reason.length > 500 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(reason)) {
    throw new Error('invalid_case_triage_reason');
  }
  return {
    action: OWNER_CASE_TRIAGE_ACTION,
    case_id: value.case_id,
    expected_status: 'OPEN',
    expected_ownership_epoch: value.expected_ownership_epoch,
    expected_case_event_id: value.expected_case_event_id,
    request_id: value.request_id,
    reason,
    confirm_l0_limits: true,
  };
}

export function checkOwnerCaseTriageEvidence(
  input: CaseTriageInput, evidence: TriageEvidence,
): TriageVerdict {
  const reject=(reason:TriageReason):TriageVerdict=>({allowed:false,reason});
  const c=evidence.caseRow;
  if (!c || c.case_id !== input.case_id || !validUuid(c.case_id) ||
    c.case_type !== 'TSEO_INDEXABILITY_SHADOW' || c.case_status !== 'OPEN' ||
    c.current_accountable_domain !== 'TSEO' ||
    c.ownership_epoch !== input.expected_ownership_epoch ||
    !c.case_code) return reject('CASE_MISMATCH');

  const e=evidence.latestCaseEvent;
  if (!e || e.case_id!==input.case_id ||
    e.case_event_id!==input.expected_case_event_id ||
    e.event_type!=='CASE_CREATED' || e.to_status!=='OPEN' ||
    e.ownership_epoch!==c.ownership_epoch) return reject('STALE_CASE_EVENT');

  const w=evidence.workflow;
  if (!w || !validUuid(w.workflow_run_id) ||
    w.workflow_type!=='RECORD_INDEXABILITY_PROPOSAL' ||
    !evaluateOwnerL0ReviewRequest(c,w,evidence.review,evidence.activeSearch).allowed)
    return reject('WORKFLOW_OR_RELEASE_MISSING');

  const h=evidence.handoff;
  if (!h || !validUuid(h.handoff_id) || h.case_id!==input.case_id ||
    h.ownership_epoch!==c.ownership_epoch ||
    h.source_domain!=='TSEO' || h.target_domain!=='GMEL' ||
    h.handoff_status!=='COMPLETED' ||
    h.expected_output_schema_code!=='GMEL_RELEASE_EVIDENCE_SCOPE_V1')
    return reject('HANDOFF_UNVERIFIED');

  const a=evidence.attention;
  const decision=evidence.latestAttentionEvent;
  const ctx=object(a?.context_json);
  const resolved=object(a?.resolution_json);
  if (!a || !validUuid(a.attention_id) || a.case_id!==input.case_id ||
    a.attention_type!=='HUMAN_ACTION' || a.attention_status!=='RESOLVED' ||
    !ctx || ctx.signal_code!=='TSEO_SHADOW_L0_QA_REQUEST' ||
    ctx.signal_scope!=='INTERNAL_SEARCH_RELEASE_INTENT_ONLY' ||
    ctx.case_id!==input.case_id || ctx.case_code!==c.case_code ||
    ctx.ownership_epoch!==c.ownership_epoch ||
    ctx.workflow_run_id!==w.workflow_run_id || ctx.handoff_id!==h.handoff_id ||
    ctx.review_method!==evidence.review?.reviewMethod ||
    ctx.evidence_level!=='L0_OBSERVATION' || ctx.model_calls!==0 ||
    ctx.changes_applied!==0 || ctx.actual_google_indexing_observable!==false ||
    !resolved || resolved.source!=='OWNER_L0_SHADOW_DECISION' ||
    resolved.case_id!==input.case_id ||
    resolved.ownership_epoch!==c.ownership_epoch ||
    resolved.workflow_run_id!==w.workflow_run_id ||
    resolved.handoff_id!==h.handoff_id ||
    resolved.decision_code!=='CONFIRM_INTERNAL_L0_ONLY' ||
    resolved.decision_scope!=='INTERNAL_SEARCH_RELEASE_INTENT_ONLY' ||
    resolved.evidence_level!=='L0_OBSERVATION' ||
    resolved.independent_agent_qa!=='NOT_RUN' ||
    resolved.model_calls!==0 || resolved.changes_applied!==0 ||
    resolved.business_outcome_state!=='NOT_MEASURABLE' ||
    resolved.actual_google_indexing_observable!==false ||
    !decision || decision.attention_id!==a.attention_id ||
    decision.event_type!=='RESOLVED' || decision.to_status!=='RESOLVED' ||
    decision.decision_code!=='CONFIRM_INTERNAL_L0_ONLY' ||
    !validUuid(decision.actor_user_id)) {
    return reject('OWNER_L0_NOT_CONFIRMED');
  }
  return {allowed:true,reason:'READY'};
}

/**
 * Bind retries to immutable INTENT + human identity; caller cannot reuse a
 * UUID to get a success receipt for a different target, reason, epoch or actor.
 * Existing Core RPC might return a historical receipt on key replay BEFORE
 * checking parameters: this hash AND mandatory readback prevent false success.
 */
export function ownerCaseTriageIdempotencyKey(
  input: CaseTriageInput, authenticatedUserId: string,
): string {
  if (!validUuid(authenticatedUserId)) throw new Error('invalid_owner_identity');
  const packed = [
    'FEYA_G2B_OWNER_TSEO_CASE_TRIAGE_V1',
    authenticatedUserId.toLowerCase(),
    input.case_id.toLowerCase(),
    input.expected_status,
    input.expected_ownership_epoch,
    input.expected_case_event_id.toLowerCase(),
    'TRIAGED',
    input.action,
    input.reason,
    input.request_id.toLowerCase(),
  ];
  return 'G2B_' + createHash('sha256').update(JSON.stringify(packed)).digest('hex');
}
type TransitionReceipt = {
  case_id?:unknown;previous_status?:unknown;new_status?:unknown;ownership_epoch?:unknown;
};
type CurrentCase = {
  case_id?:unknown;case_status?:unknown;current_accountable_domain?:unknown;ownership_epoch?:unknown;
};
type PersistedTransition = {
  case_id?:unknown;event_type?:unknown;from_status?:unknown;to_status?:unknown;
  ownership_epoch?:unknown;actor_type?:unknown;actor_user_id?:unknown;
  reason?:unknown;idempotency_key?:unknown;
};
/** Perform this check AFTER the database RPC, AND on retried requests. */
export function attestOwnerCaseTriageWrite(
  input:CaseTriageInput,authenticatedUserId:string,
  receipt:TransitionReceipt|null,
  current:CurrentCase|null,
  events:readonly PersistedTransition[],
):boolean {
  if (!validUuid(authenticatedUserId)) return false;
  const key=ownerCaseTriageIdempotencyKey(input,authenticatedUserId);
  if (!current || current.case_id!==input.case_id ||
    current.case_status!=='TRIAGED' || current.current_accountable_domain!=='TSEO' ||
    current.ownership_epoch!==input.expected_ownership_epoch || events.length!==1) return false;
  const event=events[0];
  if (event.case_id!==input.case_id || event.event_type!=='STATUS_TRANSITIONED' ||
    event.from_status!=='OPEN'||event.to_status!=='TRIAGED' ||
    event.ownership_epoch!==input.expected_ownership_epoch ||
    event.actor_type!=='human' ||
    event.actor_user_id!==authenticatedUserId ||
    event.reason!==input.reason || event.idempotency_key!==key) return false;
  if (!receipt) return true; // Lost HTTP response / retry: an exact persisted event is sufficient.
  return receipt.case_id===input.case_id && receipt.previous_status==='OPEN' &&
    receipt.new_status==='TRIAGED' && receipt.ownership_epoch===input.expected_ownership_epoch;
}
