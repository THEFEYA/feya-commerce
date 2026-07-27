import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStrictlyBetterSeoEditorialCandidate,
  seoEditorialIssueSnapshot,
  shouldRunSeoEditorialRepair,
} from '../../lib/seoEditorialCandidateSelection.ts';

const validation = (issues: Array<Record<string, unknown>>) => ({
  ok: !issues.some((issue) => issue.severity === 'blocker'),
  issues,
});

test('skips the editorial rewrite when deterministic QA is clean', () => {
  assert.equal(shouldRunSeoEditorialRepair(validation([]), validation([])), false);
  assert.equal(
    shouldRunSeoEditorialRepair(validation([{ code: 'thin_copy', severity: 'warning' }])),
    true,
  );
});

test('accepts only a strict issue reduction', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repetition', severity: 'warning' },
    ]),
  ];
  assert.equal(
    isStrictlyBetterSeoEditorialCandidate(
      [validation([{ code: 'repetition', severity: 'warning' }])],
      baseline,
    ),
    true,
  );
  assert.equal(
    isStrictlyBetterSeoEditorialCandidate(
      [validation([
        { code: 'robotic_copy', severity: 'blocker' },
        { code: 'different_warning', severity: 'warning' },
      ])],
      baseline,
    ),
    false,
  );
});

test('rejects a repair that trades an old blocker for a new blocker', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'composition_repeat', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'unsupported_claim', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('keeps an auditable issue snapshot with keyword identity', () => {
  assert.deepEqual(
    seoEditorialIssueSnapshot(validation([
      { code: 'primary_missing_body', severity: 'blocker', keyword: 'Warrior Armor Costume' },
      { code: 'commercial_unplaced', severity: 'warning', keyword: 'buy costume online' },
    ])),
    {
      blocker_count: 1,
      warning_count: 1,
      blocker_keys: ['primary_missing_body:warrior armor costume'],
      warning_keys: ['commercial_unplaced:buy costume online'],
    },
  );
});
