import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  projectRoleWorkEvidence,
  inspectRoleCapabilityFreshness,
  type RoleWorkEvidenceRow,
} from '../../lib/owner-ui/roleRuntimeEvidence.ts';

const at = new Date('2026-10-18T12:00:00Z');
const item = (change: Partial<RoleWorkEvidenceRow> = {}): RoleWorkEvidenceRow => ({
  case_id: 'case-1',
  current_accountable_domain: 'TSEO',
  case_status: 'OPEN',
  workflow_status: 'COMPLETED',
  title: 'TSEO shadow read',
  updated_at: '2026-10-16T12:00:00Z',
  workflow_updated_at: '2026-10-16T12:00:05Z',
  ...change,
});

test('a completed technical workflow cannot close its still-OPEN Growth Case', () => {
  const stats = projectRoleWorkEvidence([item()]).get('TSEO');
  assert.equal(stats?.active, 1);
  assert.equal(stats?.running, 0);
  assert.equal(stats?.pendingReview, 1);
  assert.equal(stats?.queued, 0);
  assert.equal(stats?.waiting, 0);
  assert.equal(stats?.latestTitle, 'TSEO shadow read');
});

test('a closed case is not running even if an old workflow was completed or running', () => {
  const work = [
    item({ case_status: 'CLOSED', workflow_status: 'COMPLETED' }),
    item({ case_id: 'case-2', case_status: 'MERGED', workflow_status: 'RUNNING' }),
  ];
  const stats = projectRoleWorkEvidence(work).get('TSEO');
  assert.equal(stats?.active, 0);
  assert.equal(stats?.pendingReview, 0);
  assert.equal(stats?.running, 0);
});

test('only the actual running state is shown as an executing worker', () => {
  const stats = projectRoleWorkEvidence([
    item({ workflow_status: 'RUNNING' }),
    item({ case_id: 'case-2', workflow_status: 'QUEUED' }),
    item({ case_id: 'case-3', workflow_status: 'WAITING_OWNER' }),
    item({ case_id: 'case-4', workflow_status: 'COMPLETED' }),
    item({ case_id: 'case-5', workflow_status: null }),
  ]).get('TSEO');
  assert.deepEqual(
    [stats?.active, stats?.running, stats?.queued, stats?.waiting, stats?.pendingReview],
    [5, 1, 1, 1, 1],
  );
});

test('duplicate case IDs and missing case identity or status cannot inflate live counters', () => {
  const stats = projectRoleWorkEvidence([
    item(), item({ workflow_status: 'RUNNING' }),
    item({ case_id: '', workflow_status: 'RUNNING' }),
    item({ case_id: 'case-2', case_status: null, workflow_status: 'RUNNING' }),
  ]).get('TSEO');
  assert.equal(stats?.active, 1);
  assert.equal(stats?.running, 0);
  assert.equal(stats?.pendingReview, 1);
});

test('historical capability snapshot is labelled stale, even when status says AVAILABLE', () => {
  const result = inspectRoleCapabilityFreshness([
    { owner_role: 'TSEO', updated_at: '2026-09-18T09:00:00Z' },
  ], 'TSEO', at);
  assert.equal(result.state, 'STALE_REGISTRY_SNAPSHOT');
  assert.equal(result.oldestRecordedAt, '2026-09-18T09:00:00.000Z');
});

test('a recently updated capability cannot hide older rows from the same role', () => {
  const result = inspectRoleCapabilityFreshness([
    { owner_role: 'GMEL', updated_at: '2026-09-18T09:00:00Z' },
    { owner_role: 'GMEL', updated_at: '2026-10-18T11:00:00Z' },
  ], 'GMEL', at);
  assert.equal(result.state, 'STALE_REGISTRY_SNAPSHOT');
  assert.equal(result.records, 2);
  assert.equal(result.newestRecordedAt, '2026-10-18T11:00:00.000Z');
});

test('missing, invalid and future capability dates must not be represented as fresh', () => {
  assert.equal(inspectRoleCapabilityFreshness([], 'TSEO', at).state, 'NOT_VERIFIABLE');
  assert.equal(inspectRoleCapabilityFreshness([
    { owner_role: 'TSEO', updated_at: '' },
  ], 'TSEO', at).state, 'NOT_VERIFIABLE');
  assert.equal(inspectRoleCapabilityFreshness([
    { owner_role: 'TSEO', updated_at: '2026-10-19T11:00:00Z' },
  ], 'TSEO', at).state, 'NOT_VERIFIABLE');
  assert.equal(inspectRoleCapabilityFreshness([
    { owner_role: 'TSEO', updated_at: '2026-10-18T10:00:00Z' },
  ], 'TSEO', at).state, 'RECENT_REGISTRY_SNAPSHOT');
});

test('owner Team UI uses authoritative case and capability evidence with no public write path', () => {
  const page = readFileSync('app/admin/roles/page.tsx', 'utf8');
  const drawer = readFileSync('components/admin/OwnerRoleDrawerClient.tsx', 'utf8');
  assert.match(page, /await connection\(\)/);
  assert.ok(page.indexOf('await connection()') < page.indexOf('new Date()'));
  assert.match(page, /projectRoleWorkEvidence\(work\)/);
  assert.match(page, /inspectRoleCapabilityFreshness\(capabilities, role.code/);
  assert.match(page, /feya_commerce_v_growth_capability_status_safe_v1/);
  assert.match(page, /Открытых кейсов/);
  assert.match(page, /Исполняется сейчас/);
  assert.match(page, /Ждёт проверки результата/);
  assert.doesNotMatch(page, /const closed = \['CLOSED', 'MERGED', 'COMPLETED'\]/);
  assert.match(drawer, /Актуальные возможности ещё не перепроверены/);
  assert.doesNotMatch(page + drawer, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(page + drawer, /OPENAI_API_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});
