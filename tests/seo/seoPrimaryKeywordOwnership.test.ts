import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeoPrimaryKeywordOwnershipStrategy,
  getSeoPortfolioGenerationBlockers,
  PRIMARY_KEYWORD_CONFLICT_BLOCKER,
  PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER,
  PRIMARY_KEYWORD_PEER_REASSIGNMENT_PENDING,
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

test('blocks OpenAI before spending tokens when another product owns the exact Primary', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    targetProductTitle: 'Gold Warrior Armor Set',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-09T00:00:00.000Z',
    decisionRows: [
      {
        canonical_product_id: 'target-product',
        decision_status: 'draft',
        updated_at: '2026-08-08T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
      },
      {
        canonical_product_id: 'competing-product',
        matched_etsy_listing_id: '4340584466',
        product_slug: 'festival-armor-outfit-4340584466',
        decision_status: 'draft',
        updated_at: '2026-08-07T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'Warrior Armor Costume', role: 'primary' }],
      },
    ],
  });

  assert.ok(strategy);
  assert.equal(strategy.classification, 'NEEDS_KEYWORD_REASSIGNMENT');
  assert.equal(strategy.keyword_ownership.status, 'conflict');
  assert.equal(strategy.keyword_ownership.conflicts.length, 1);
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), [PRIMARY_KEYWORD_CONFLICT_BLOCKER]);
  assert.deepEqual(
    strategy.keyword_ownership.suggested_primary_alternatives.map((item) => item.keyword),
    ['futuristic armor costume'],
  );
});

test('passes exact Primary ownership while keeping later copy-similarity review mandatory', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-09T00:00:00.000Z',
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
  assert.match(strategy.keyword_ownership.limitations[0], /does not replace saved-draft copy similarity review/i);
});

test('fails closed when the current Listing Master portfolio map cannot be read', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    sourceError: 'temporary database read failure',
    checkedAt: '2026-08-09T00:00:00.000Z',
  });

  assert.ok(strategy);
  assert.equal(strategy.keyword_ownership.status, 'not_checked');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), [PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER]);
});

test('uses only the latest decision per product when checking Primary ownership', () => {
  const strategy = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-09T00:00:00.000Z',
    decisionRows: [
      {
        canonical_product_id: 'other-product',
        updated_at: '2026-08-01T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
      },
      {
        canonical_product_id: 'other-product',
        updated_at: '2026-08-08T00:00:00.000Z',
        selected_keywords_json: [{ keyword: 'festival armor outfit', role: 'primary' }],
      },
    ],
  });

  assert.ok(strategy);
  assert.equal(strategy.keyword_ownership.status, 'pass');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(strategy), []);
});

test('lets the current confirmed product reserve Primary when every peer selection is invalidated', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-09T00:00:00.000Z',
    decisionRows: [{
      canonical_product_id: 'peer-product',
      matched_etsy_listing_id: '4340584466',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    targetSelectionStatus: 'confirmed',
    peerSelections: [{
      canonical_product_id: 'peer-product',
      selection_status: 'needs_keyword_review',
      primary_keyword: 'warrior armor costume',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.classification, 'DIFFERENTIATE_BEFORE_PUBLISH');
  assert.equal(resolved.keyword_ownership.status, 'pass_with_pending_reassignment');
  assert.equal(resolved.keyword_ownership.reserved_owner_product_id, 'target-product');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), []);
  assert.deepEqual(resolved.publish_blockers, [PRIMARY_KEYWORD_PEER_REASSIGNMENT_PENDING]);
  assert.equal(resolved.keyword_ownership.conflicts[0].current_selection_status, 'needs_keyword_review');
});

test('keeps the paid writer blocked when a peer still has a confirmed exact Primary', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'target-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-09T00:00:00.000Z',
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
  assert.equal(resolved.keyword_ownership.status, 'conflict');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), [PRIMARY_KEYWORD_CONFLICT_BLOCKER]);
});

test('does not let a later save steal Primary from a human-approved peer draft', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'new-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-10T00:00:00.000Z',
    decisionRows: [{
      canonical_product_id: 'approved-product',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    targetSelectionStatus: 'confirmed',
    peerSelections: [{
      canonical_product_id: 'approved-product',
      selection_status: 'needs_keyword_review',
      primary_keyword: null,
      approved_draft_id: 'approved-draft-id',
      approved_draft_status: 'approved_draft',
      approved_primary_keyword: 'Warrior Armor Costume',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.keyword_ownership.status, 'conflict');
  assert.equal(resolved.keyword_ownership.approved_owner_product_id, 'approved-product');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), [PRIMARY_KEYWORD_CONFLICT_BLOCKER]);
  assert.equal(resolved.keyword_ownership.conflicts[0].approved_draft_id, 'approved-draft-id');
});

test('keeps an approved target as owner when an unapproved peer later confirms the same Primary', () => {
  const initial = buildSeoPrimaryKeywordOwnershipStrategy({
    targetProductId: 'approved-product',
    primaryKeyword: { keyword: 'warrior armor costume' },
    secondaryKeywords,
    productTruth,
    checkedAt: '2026-08-10T00:00:00.000Z',
    decisionRows: [{
      canonical_product_id: 'new-peer',
      selected_keywords_json: [{ keyword: 'warrior armor costume', role: 'primary' }],
    }],
  });
  const resolved = resolveSeoPrimaryOwnershipWithCurrentSelections(initial, {
    targetSelectionStatus: 'confirmed',
    targetApprovedDraftId: 'approved-draft-id',
    targetApprovedPrimaryKeyword: 'warrior armor costume',
    peerSelections: [{
      canonical_product_id: 'new-peer',
      selection_status: 'confirmed',
      primary_keyword: 'warrior armor costume',
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.keyword_ownership.status, 'pass_with_pending_reassignment');
  assert.equal(resolved.keyword_ownership.approved_owner_product_id, 'approved-product');
  assert.equal(resolved.keyword_ownership.reserved_owner_product_id, 'approved-product');
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), []);
});

test('fails closed when approved-draft ownership cannot be read', () => {
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
      selection_status: 'needs_keyword_review',
      primary_keyword: null,
      approved_draft_error: 'draft ownership read failed',
    }],
  });

  assert.ok(resolved);
  assert.deepEqual(getSeoPortfolioGenerationBlockers(resolved), [
    PRIMARY_KEYWORD_CONFLICT_BLOCKER,
    PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER,
  ]);
});
