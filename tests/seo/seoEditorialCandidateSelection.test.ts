import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStrictlyBetterSeoEditorialCandidate,
  normalizeFinalSeoEditorialOutput,
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

test('accepts a net reduction when only editorial blocker classes change', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'copy_rhythm_issue', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), true);
});

test('rejects a net reduction that introduces an unselected event', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'customer_copy_uses_unselected_event_focus', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('rejects an editorial improvement that breaks primary placement', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'primary_missing_body', severity: 'blocker', keyword: 'warrior armor costume' },
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

test('removes deterministic brand padding from the final SEO title only', () => {
  const output = {
    seo_title: 'Gold Warrior Armor Costume for Burning Man | TheFEYA',
    h1: 'Gold Warrior Armor Costume for Burning Man',
    generation_notes: ['Model draft retained for audit.'],
  };
  assert.deepEqual(normalizeFinalSeoEditorialOutput(output), {
    seo_title: 'Gold Warrior Armor Costume for Burning Man',
    h1: 'Gold Warrior Armor Costume for Burning Man',
    generation_notes: [
      'Model draft retained for audit.',
      'Deterministic review normalization removed brand padding from the SEO title.',
    ],
  });
  assert.equal(output.seo_title, 'Gold Warrior Armor Costume for Burning Man | TheFEYA');
});
