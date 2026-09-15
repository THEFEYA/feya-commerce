import assert from 'node:assert/strict';
import test from 'node:test';
import { listingMasterFeedback, listingMasterSavedAxesMatch } from '../../lib/listingMasterFeedback.ts';

test('saved axes remain confirmed while Primary is pending, but edited axes do not', () => {
  const saved = { selection_verified: true, component: ['top', 'skirt'], event: ['festival'], persona: [], strategies: ['niche', 'demand'], keyword_type: 'all' };
  const active = { component: 'skirt,top', event: 'festival', persona: '', strategy: 'demand,niche', type: 'all' };
  assert.equal(listingMasterSavedAxesMatch(saved, active), true);
  assert.equal(listingMasterSavedAxesMatch(saved, { ...active, component: 'shoulders,skirt' }), false);
  const feedback = listingMasterFeedback({ hasProduct: true, decisionIsCurrent: false, axesSaved: true, statusCode: 'needs_keyword_review' });
  assert.match(feedback.title, /Оси сохранены/);
  assert.match(feedback.message, /Повторять оси не нужно/);
  assert.equal(feedback.tone, 'warning');
});

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

test('a read failure is not presented as a missing save or unconfirmed composition', () => {
  const feedback = listingMasterFeedback({ hasProduct: true, decisionIsCurrent: false, statusCode: 'data_unavailable' });
  assert.equal(feedback.title, 'Проверка временно недоступна');
  assert.match(feedback.message, /заново выбирать оси не нужно/);
  assert.equal(feedback.tone, 'warning');
});
