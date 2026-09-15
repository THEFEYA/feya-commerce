import assert from 'node:assert/strict';
import test from 'node:test';
import { listingMasterFeedback } from '../../lib/listingMasterFeedback.ts';

test('a saved, current decision advances to preview instead of requesting another save', () => {
  const feedback = listingMasterFeedback({ hasProduct: true, decisionIsCurrent: true, statusCode: 'ready' });
  assert.equal(feedback.tone, 'success');
  assert.match(feedback.message, /Повторять выбор не нужно/);
  assert.match(feedback.message, /Preview/);
});

test('applying a changed focus never claims database persistence', () => {
  const feedback = listingMasterFeedback({ hasProduct: true, decisionIsCurrent: false, statusCode: 'ready', searchApplied: true });
  assert.equal(feedback.tone, 'warning');
  assert.match(feedback.title, /ещё не сохранены/);
});

test('a truth or keyword blocker is never presented as ready for generation', () => {
  for (const statusCode of ['blocked_product_truth', 'needs_keyword_review', 'no_keywords']) {
    const feedback = listingMasterFeedback({ hasProduct: true, decisionIsCurrent: true, statusCode });
    assert.equal(feedback.tone, 'warning');
  }
  assert.equal(listingMasterFeedback({ hasProduct: false, decisionIsCurrent: true, statusCode: 'ready' }).tone, 'warning');
});
