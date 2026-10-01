import assert from 'node:assert/strict';
import test from 'node:test';
import { planKeywordPageRanges } from '../../lib/seoKeywordBankPagination.ts';

test('Keyword Bank pagination covers the complete current 4,834-row corpus', () => {
  const plan = planKeywordPageRanges(4_834, 6_000, 1_000);

  assert.equal(plan.truncated, false);
  assert.equal(plan.requested_rows, 4_834);
  assert.deepEqual(plan.ranges, [
    { from: 0, to: 999 },
    { from: 1_000, to: 1_999 },
    { from: 2_000, to: 2_999 },
    { from: 3_000, to: 3_999 },
    { from: 4_000, to: 4_833 },
  ]);
});

test('Keyword Bank pagination reports a hard cap instead of silently using partial data', () => {
  const plan = planKeywordPageRanges(6_501, 6_000, 1_000);

  assert.equal(plan.truncated, true);
  assert.equal(plan.requested_rows, 6_000);
  assert.deepEqual(plan.ranges.at(-1), { from: 5_000, to: 5_999 });
});
