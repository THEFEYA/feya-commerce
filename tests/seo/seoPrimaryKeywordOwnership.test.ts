import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeoPrimaryKeywordOwnershipStrategy,
  getSeoPrimaryConflictBlockersForDecision,
  getSeoPortfolioGenerationBlockers,
  PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER,
  resolveSeoPrimaryOwnershipWithCurrentSelections,
} from '../../lib/seoPrimaryKeywordOwnership.ts';

const productTruth = {
  sellable_offer: {
    component_labels: ['Headpiece', 'Leg Covers', 'Shoulders', 'Top'],
  },
  color: 'Gold',
  material: 'Faux leather',
};

const secondaryKeywords = [
  {
    keyword: 'gold shoulder armor',
    role: 'secondary',
    avg_monthly_searches: 210,
    competition: 'HIGH',
    metric_source: 'google_keyword_planner',
    last_checked: '2026-06-29',
  },
  {
    keyword: 'futuristic armor costume',
    role: 'secondary',
    avg_monthly_searches: 10,
    competition: 'MEDIUM',
    metric_source: 'google_keyword_planner',
    last_checked: '2026-06-29',
  },
];

test('monitors an exact Google Primary overlap without blocking generation', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    targetProductTitle: 'Gold Warrior Armor Set',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-09-18T00:00:00.000Z',
    decisionRows: [
      {
        canonical_product_id: 'target-product',
        decision_status: 'draft',
        updated_at: '2026-09-18T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
      },
      {
        canonical_product_id: 'competing-product',
        matched_etsy_listing_id: '4340584466',
        product_slug: 'festival-armor-outfit-4340584466',
        decision_status: 'draft',
        updated_at: '2026-09-17T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'Warrior Armor Costume', role: 'primary' }],
      },
    ],
  });

  assert.ok(strategy);
  assert.equal(strategy.classification, 'DIFFERENTIATE_BEFORE_PUBLISH');
  assert.equal(strategy.risk_level, 'medium');
  assert.equal(strategy.keyword_ownership.status, 'pass_with_overlap_monitoring');
  assert.equal(strategy.keyword_ownership.conflicts.length, 1);
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), []);
  assert.deepEqual(strategy.publish_blockers, []);
  assert.equal(strategy.recommended_generation_mode, 'normal_generation_shared_primary_monitored');
  assert.match(String(strategy.agent_instruction_summary || ''), /not, by itself, a Google generation or publication blocker/i);
});

test('passes when the exact Primary is not used by another current product decision', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-09-18T00:00:00.000Z',
    decisionRows: [
      {
        canonical_product_id: 'other-product',
        decision_status: 'draft',
        selected_keywords_json: [{ keyword: 'festival armor outfit', role: 'primary' }],
      },
    ],
  });

  assert.ok(strategy);
  assert.equal(strategy.classification, 'PORTFOLIO_EXPANSION_OK');
  assert.equal(strategy.keyword_ownership.status, 'pass');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), []);
});

test('fails closed when the current portfolio map cannot be read', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    sourceError: 'temporary database read failure',
    checkedAt: '2026-09-18T00:00:00.000Z',
  });

  assert.ok(strategy);
  assert.equal(strategy.keyword_ownership.status, 'not_checked');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), [PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER]);
});

test('uses only the latest decision per product when checking Primary overlap', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-09-18T00:00:00.000Z',
    decisionRows: [
      {
        canonical_product_id: 'other-product',
        updated_at: '2026-09-01T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
      },
      {
        canonical_product_id: 'other-product',
        updated_at: '2026-09-17T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'festival armor outfit', role: 'primary' }],
      },
    ],
  });

  assert.ok(strategy);
  assert.equal(strategy.keyword_ownership.status, 'pass');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), []);
});

test('fast queue preflight records duplicate Primary as non-blocking overlap', () => {
  const target = {
    canonical_product_id: 'target-product',
    updated_at: '2026-09-18T00:00:00.000Z',
    selected_keywords_json: [{ keyword: 'futuristic armor costume', role: 'primary' }],
  };
  const peer = {
    canonical_product_id: 'peer-product',
    updated_at: '2026-09-17T00:00:00.000Z',
    selected_keywords_json: [{ keyword: 'Futuristic Armor Costume', role: 'primary' }],
  };

  assert.deepEqual(
    getSeoPrimaryConflictBlockersForDecision(target, [target, peer]),
    [],
  );
});

test('resolver enriches current peer state but keeps shared Primary non-blocking', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    decisionRows: [{
      canonical_product_id: 'peer-product',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    targetSelectionStatus: 'confirmed',
    peerSelections: [{
      canonical_product_id: 'peer-product',
      selection_status: 'confirmed',
      primary_keyword: 'warrior armor costume',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.keyword_ownership.status, 'pass_with_overlap_monitoring');
  assert.equal(resolved.keyword_ownership.conflicts[0].current_selection_status, 'confirmed');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), []);
  assert.deepEqual(resolved.publish_blockers, []);
});

test('approved peer using the same Primary remains monitoring metadata, not exclusive ownership', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'new-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    decisionRows: [{
      canonical_product_id: 'approved-product',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    targetSelectionStatus: 'confirmed',
    peerSelections: [{
      canonical_product_id: 'approved-product',
      selection_status: 'confirmed',
      primary_keyword: 'warrior armor costume',
      approved_draft_id: 'approved-draft-id',
      approved_draft_status: 'approved_draft',
      approved_primary_keyword: 'Warrior Armor Costume',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.keyword_ownership.status, 'pass_with_overlap_monitoring');
  assert.equal(resolved.keyword_ownership.approved_owner_product_id, undefined);
  assert.equal(resolved.keyword_ownership.conflicts[0].approved_draft_id, 'approved-draft-id');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), []);
});

test('fails closed only when peer/approved-draft state cannot be read', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    decisionRows: [{
      canonical_product_id: 'peer-product',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    peerSelections: [{
      canonical_product_id: 'peer-product',
      selection_status: 'needs_keyword_review',
      primary_keyword: null,
      approved_draft_error: 'draft ownership read failed',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.keyword_ownership.status, 'not_checked');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), [
    PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER,
  ]);
});
