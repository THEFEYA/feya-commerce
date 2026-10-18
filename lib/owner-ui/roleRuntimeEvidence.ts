/**
 * Owner role runtime evidence is a projection of persisted Growth Cases.
 * Finishing one technical workflow is NOT closing the case or executing an AI agent.
 * Only case_status authorizes a case-closure claim; only workflow_status RUNNING
 * authorizes a "currently running" counter.
 */
export type RoleWorkEvidenceRow = {
  case_id?: string | null;
  current_accountable_domain?: string | null;
  case_status?: string | null;
  workflow_status?: string | null;
  title?: string | null;
  workflow_updated_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
};

export type RoleWorkEvidenceStats = {
  active: number; // OPEN cases, not running workers; compatible with the existing drawer.
  running: number;
  queued: number;
  waiting: number;
  pendingReview: number;
  latestTitle: string | null;
  latestAt: string | null;
};

const CLOSED_CASES = new Set(['CLOSED', 'MERGED', 'CANCELLED']);
const RUNNING_WORKFLOWS = new Set(['RUNNING', 'EXECUTING']);
const QUEUED_WORKFLOWS = new Set(['QUEUED', 'PENDING', 'READY']);
const WAITING_WORKFLOWS = new Set(['BLOCKED', 'FAILED', 'RETRY_PENDING', 'WAITING', 'WAITING_OWNER']);

function status(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function dateValue(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Deduplicate by canonical case id, including across accidental repeated view rows. */
export function projectRoleWorkEvidence(rows: readonly RoleWorkEvidenceRow[]) {
  const byRole = new Map<string, RoleWorkEvidenceStats>();
  const seen = new Set<string>();
  for (const row of rows) {
    const role = status(row.current_accountable_domain);
    const id = typeof row.case_id === 'string' ? row.case_id.trim() : '';
    if (!role || !id || seen.has(id)) continue;
    seen.add(id);

    const previous = byRole.get(role) || {
      active: 0, running: 0, queued: 0, waiting: 0, pendingReview: 0,
      latestTitle: null, latestAt: null,
    };

    // A closed case can still be the last real work item, but is never "in work".
    const caseState = status(row.case_status);
    const workflow = status(row.workflow_status);
    if (caseState && !CLOSED_CASES.has(caseState)) {
      previous.active += 1;
      if (RUNNING_WORKFLOWS.has(workflow)) previous.running += 1;
      else if (QUEUED_WORKFLOWS.has(workflow)) previous.queued += 1;
      else if (workflow === 'COMPLETED') previous.pendingReview += 1;
      else if (WAITING_WORKFLOWS.has(workflow) || workflow.startsWith('WAITING_'))
        previous.waiting += 1;
      // Missing workflow state does not manufacture a running or waiting worker.
    }

    const candidate = [row.workflow_updated_at, row.updated_at, row.closed_at]
      .map(dateValue).filter((value): value is number => value !== null);
    const latest = candidate.length ? Math.max(...candidate) : null;
    const old = dateValue(previous.latestAt);
    if (latest !== null && (old === null || latest > old)) {
      previous.latestAt = new Date(latest).toISOString();
      previous.latestTitle = typeof row.title === 'string' ? row.title.trim() || null : null;
    }
    byRole.set(role, previous);
  }
  return byRole;
}

export type RoleCapabilityEvidenceRow = {
  owner_role?: string | null;
  updated_at?: string | null;
};
export type RoleCapabilityFreshness = {
  state: 'RECENT_REGISTRY_SNAPSHOT' | 'STALE_REGISTRY_SNAPSHOT' | 'NOT_VERIFIABLE';
  oldestRecordedAt: string | null;
  newestRecordedAt: string | null;
  records: number;
};

/**
 * "Recent" means merely recently edited in the registry, not verified against live APIs.
 * Check the OLDEST capability row for the role; one recent row must not hide old ones.
 * Invalid/future timestamps fail closed. No mutation, live-service probe or role activation.
 */
export function inspectRoleCapabilityFreshness(
  rows: readonly RoleCapabilityEvidenceRow[],
  roleCode: string,
  now: Date = new Date(),
): RoleCapabilityFreshness {
  const selected = rows.filter(row => status(row.owner_role) === status(roleCode));
  const unknown: RoleCapabilityFreshness = {
    state: 'NOT_VERIFIABLE', oldestRecordedAt: null, newestRecordedAt: null,
    records: selected.length,
  };
  if (!selected.length || !Number.isFinite(now.getTime())) return unknown;

  const times = selected.map(row => dateValue(row.updated_at));
  if (times.some(time => time === null || time! > now.getTime() + 30000)) return unknown;
  const numbers = times as number[];
  const oldest = Math.min(...numbers);
  const newest = Math.max(...numbers);
  const age = now.getTime() - oldest;
  return {
    state: age > 14 * 24 * 60 * 60 * 1000
      ? 'STALE_REGISTRY_SNAPSHOT' : 'RECENT_REGISTRY_SNAPSHOT',
    oldestRecordedAt: new Date(oldest).toISOString(),
    newestRecordedAt: new Date(newest).toISOString(),
    records: selected.length,
  };
}
