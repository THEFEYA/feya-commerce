/**
 * G2a — one honest owner-facing route for an EXISTING Growth Case.
 *
 * Read-only projection; not a Case FSM implementation or a source of approval.
 * Never equate workflow completion, a GMEL handoff or L0 human review with
 * independent QA, source admission, case CLOSED, or business measurement.
 * Fields must be explicitly selected by the protected owner server page.
 */
export type CaseRouteRow = {
  case_id?: unknown;
  case_status?: unknown;
  workflow_status?: unknown;
  current_accountable_domain?: unknown;
  ownership_epoch?: unknown;
};
export type CaseRouteEventRow = {
  case_event_id?: unknown;
  case_id?: unknown;
  event_type?: unknown;
  from_status?: unknown;
  to_status?: unknown;
  ownership_epoch?: unknown;
  created_at?: unknown;
};
export type CaseRouteHandoffRow = {
  handoff_id?: unknown;
  case_id?: unknown;
  source_domain?: unknown;
  target_domain?: unknown;
  handoff_status?: unknown;
  created_at?: unknown;
  completed_at?: unknown;
};
export type CaseRouteWorkflowEventRow = {
  workflow_event_id?: unknown;
  case_id?: unknown;
  event_type?: unknown;
  created_at?: unknown;
};
export type CaseRouteAttentionRow = {
  attention_id?: unknown;
  case_id?: unknown;
  source_code?: unknown;
  attention_status?: unknown;
  created_at?: unknown;
  resolved_at?: unknown;
};
export type CaseRouteAttentionEventRow = {
  attention_event_id?: unknown;
  attention_id?: unknown;
  event_type?: unknown;
  to_status?: unknown;
  decision_code?: unknown;
  created_at?: unknown;
};
export type CaseRouteMeasurementSpecRow = {
  measurement_spec_id?: unknown;
  case_id?: unknown;
  spec_hash?: unknown;
  locked_at?: unknown;
  measurement_status?: unknown;
  created_at?: unknown;
};
export type CaseRouteMeasurementOutcomeRow = {
  outcome_id?: unknown;
  measurement_spec_id?: unknown;
  measurement_spec_hash?: unknown;
  outcome_state?: unknown;
  created_at?: unknown;
};
export type CaseRouteInput = {
  caseRow: CaseRouteRow;
  caseEvents: readonly CaseRouteEventRow[];
  workflowEvents: readonly CaseRouteWorkflowEventRow[];
  handoffs: readonly CaseRouteHandoffRow[];
  attention: readonly CaseRouteAttentionRow[];
  attentionEvents: readonly CaseRouteAttentionEventRow[];
  specs: readonly CaseRouteMeasurementSpecRow[];
  outcomes: readonly CaseRouteMeasurementOutcomeRow[];
};
export type CaseTimelineEntry = {
  id: string;
  kind: 'CASE' | 'WORKFLOW' | 'HANDOFF' | 'OWNER';
  at: string;
  label: string;
};
export type CaseRouteTruth = {
  caseId: string;
  caseStatus: string;
  caseOwner: string;
  ownershipEpoch: number | null;
  workflowStatus: string;
  /** For audit only; never reinterpret event totals as all-case completion. */
  timeline: CaseTimelineEntry[];
  eventContinuity: 'VERIFIED_LATEST' | 'NO_EVENT_HISTORY' | 'EVENT_STATUS_MISMATCH' | 'EVENT_EPOCH_MISMATCH';
  ownerL0: 'CONFIRMED_INTERNAL_ONLY' | 'REQUEST_PENDING' | 'OTHER_RECORDED_DECISION' | 'UNVERIFIED_OR_ABSENT';
  measurement: 'NO_PLAN' | 'DRAFT_ONLY' | 'LOCKED_NO_OUTCOME' | 'RECORDED_OUTCOME';
  independentQa: 'NOT_ATTESTED';
  permissibleNextStep: 'TRIAGED' | null;
  /** Pure information: no write endpoint or actor grant is inferred from FSM. */
  canExecuteTransition: false;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/i;
const VALID_CASE_STATUS = new Set([
  'OPEN','TRIAGED','INVESTIGATING','DECISION_READY','ACTIONING','MEASURING',
  'LEARNING','CLOSED','BLOCKED','DEFERRED','CANCELLED','NOT_OBSERVABLE',
]);
function value(raw: unknown, max = 80): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : '';
}
function uuid(raw: unknown): string {
  const s = value(raw, 48);
  return UUID.test(s) ? s : '';
}
function date(raw: unknown): string | null {
  const v = value(raw, 64);
  if (!v || !Number.isFinite(Date.parse(v))) return null;
  return new Date(v).toISOString();
}
function positiveEpoch(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1 ? raw : null;
}
function timestampSort<T extends { created_at?: unknown }>(rows: readonly T[]): T[] {
  return [...rows].sort((a,b) => (date(a.created_at) || '').localeCompare(date(b.created_at) || ''));
}

export function projectGrowthCaseRoute(input: CaseRouteInput): CaseRouteTruth | null {
  const caseId = uuid(input.caseRow.case_id);
  const caseStatus = value(input.caseRow.case_status);
  const owner = value(input.caseRow.current_accountable_domain);
  if (!caseId || !VALID_CASE_STATUS.has(caseStatus) || !owner) return null;
  const epoch = positiveEpoch(input.caseRow.ownership_epoch);
  const workflowStatus = value(input.caseRow.workflow_status) || 'UNKNOWN';
  const matchingCaseEvents = timestampSort(input.caseEvents.filter(e =>
    uuid(e.case_id) === caseId && uuid(e.case_event_id) && date(e.created_at)));
  const latest = matchingCaseEvents.at(-1);
  let eventContinuity: CaseRouteTruth['eventContinuity'] = 'VERIFIED_LATEST';
  if (!latest) eventContinuity = 'NO_EVENT_HISTORY';
  else if (value(latest.to_status) !== caseStatus) eventContinuity = 'EVENT_STATUS_MISMATCH';
  else if (positiveEpoch(latest.ownership_epoch) !== epoch || epoch === null)
    eventContinuity = 'EVENT_EPOCH_MISMATCH';

  const relatedAttention = timestampSort(input.attention.filter(a =>
    uuid(a.case_id) === caseId && uuid(a.attention_id) &&
    value(a.source_code) === 'TSEO_SHADOW_L0_QA_REQUEST'));
  const attentionById = new Map(relatedAttention.map(a => [uuid(a.attention_id), a]));
  const relevantDecisions = timestampSort(input.attentionEvents.filter(e =>
    uuid(e.attention_event_id) && attentionById.has(uuid(e.attention_id)) && date(e.created_at)));
  const ownerConfirmed = relevantDecisions.some(e =>
    value(e.decision_code) === 'CONFIRM_INTERNAL_L0_ONLY' &&
    value(e.to_status) === 'RESOLVED' &&
    value(attentionById.get(uuid(e.attention_id))?.attention_status) === 'RESOLVED');
  const ownerL0: CaseRouteTruth['ownerL0'] = ownerConfirmed
    ? 'CONFIRMED_INTERNAL_ONLY'
    : relatedAttention.some(a => ['OPEN','ACKNOWLEDGED'].includes(value(a.attention_status)))
      ? 'REQUEST_PENDING'
      : relevantDecisions.length ? 'OTHER_RECORDED_DECISION' : 'UNVERIFIED_OR_ABSENT';

  const validSpecs = input.specs.filter(s =>
    uuid(s.case_id) === caseId && uuid(s.measurement_spec_id));
  const locked = validSpecs.filter(s => date(s.locked_at) && SHA.test(value(s.spec_hash, 70)));
  const lockedById = new Map(locked.map(s =>
    [uuid(s.measurement_spec_id), value(s.spec_hash, 70)]));
  const hasLinkedOutcome = input.outcomes.some(o =>
    uuid(o.outcome_id) && uuid(o.measurement_spec_id) &&
    lockedById.has(uuid(o.measurement_spec_id)) &&
    lockedById.get(uuid(o.measurement_spec_id)) === value(o.measurement_spec_hash, 70));
  const measurement: CaseRouteTruth['measurement'] = hasLinkedOutcome ? 'RECORDED_OUTCOME'
    : locked.length ? 'LOCKED_NO_OUTCOME'
      : validSpecs.length ? 'DRAFT_ONLY' : 'NO_PLAN';

  const timeline: CaseTimelineEntry[] = [];
  for (const e of matchingCaseEvents) {
    const type = value(e.event_type);
    if (type !== 'CASE_CREATED' && type !== 'STATUS_TRANSITIONED' && type !== 'OWNERSHIP_TRANSFERRED') continue;
    timeline.push({
      id: 'case:' + uuid(e.case_event_id), kind: 'CASE', at: date(e.created_at)!,
      label: type === 'CASE_CREATED' ? 'Кейс зарегистрирован'
        : type === 'STATUS_TRANSITIONED'
          ? 'Статус кейса: ' + value(e.from_status) + ' → ' + value(e.to_status)
          : 'Ответственная роль изменена',
    });
  }
  const workflows = timestampSort(input.workflowEvents.filter(e =>
    uuid(e.case_id) === caseId && uuid(e.workflow_event_id) && date(e.created_at)));
  for (const e of workflows) {
    const type = value(e.event_type);
    const labels: Record<string,string> = {
      WORKFLOW_CREATED: 'Техническая работа зарегистрирована',
      WORKFLOW_CLAIMED: 'Технический workflow был запущен',
      WORKFLOW_COMPLETED: 'Технический workflow завершён (не кейс)',
      WORKFLOW_FAILED: 'Техническая работа завершилась ошибкой',
      WORKFLOW_RETRY_SCHEDULED: 'Повтор технического этапа запланирован',
    };
    if (!labels[type]) continue;
    timeline.push({
      id:'workflow:'+uuid(e.workflow_event_id),kind:'WORKFLOW',at:date(e.created_at)!,
      label:labels[type],
    });
  }
  for (const h of input.handoffs) {
    if (uuid(h.case_id) !== caseId || !uuid(h.handoff_id) || !date(h.created_at)) continue;
    timeline.push({
      id:'handoff:'+uuid(h.handoff_id),kind:'HANDOFF',at:date(h.created_at)!,
      label:'Передача '+value(h.source_domain)+' → '+value(h.target_domain)+' зарегистрирована',
    });
    if (value(h.handoff_status) === 'COMPLETED' && date(h.completed_at)) {
      timeline.push({
        id:'handoff-done:'+uuid(h.handoff_id),kind:'HANDOFF',at:date(h.completed_at)!,
        label:'Передача между ролями закрыта (независимая QA не доказана)',
      });
    }
  }
  for (const e of relevantDecisions) {
    const decision = value(e.decision_code);
    timeline.push({
      id:'owner:'+uuid(e.attention_event_id),kind:'OWNER',at:date(e.created_at)!,
      label:decision === 'CONFIRM_INTERNAL_L0_ONLY' && value(e.to_status)==='RESOLVED'
        ? 'Владелец подтвердил только внутренний факт L0'
        : 'Решение владельца записано (без закрытия кейса)',
    });
  }
  timeline.sort((a,b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  return {
    caseId,caseStatus,caseOwner:owner,ownershipEpoch:epoch,workflowStatus,
    timeline:timeline.slice(-80),eventContinuity,ownerL0,measurement,
    independentQa:'NOT_ATTESTED',
    permissibleNextStep:eventContinuity==='VERIFIED_LATEST' && caseStatus==='OPEN'
      ? 'TRIAGED' : null,
    canExecuteTransition:false,
  };
}
