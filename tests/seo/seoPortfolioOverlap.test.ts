import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runSeoPortfolioOverlapCheck,
  selectSeoPortfolioComparisonDrafts,
  tokenizeSeoPortfolioDraft,
} from '../../lib/seoPortfolioOverlap.ts';

function draft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'draft-a',
    canonical_product_id: 'product-a',
    product_slug: 'silver-rave-skirt',
    status: 'draft_generated',
    review_status: 'not_reviewed',
    created_at: '2026-08-11T12:00:00Z',
    seo_title: 'Silver Rave Outfit With Skirt for Festivals',
    h1: 'Silver Rave Outfit With Skirt for Festivals',
    meta_description: 'Silver rave outfit with skirt and a polished metal finish.',
    intro: 'A silver festival piece for music events.',
    keyword_roles_snapshot: {
      primary: [{
        keyword_norm: 'rave outfit with skirt',
        role: 'primary',
        metric_source: 'google_keyword_planner',
        competition: 'HIGH',
        last_checked: '2026-06-29',
      }],
      hold: [{ keyword_norm: 'unrelated hold phrase', role: 'hold' }],
      reject: [{ keyword_norm: 'unrelated reject phrase', role: 'reject' }],
    },
    agent_output_snapshot: {
      pdp_blocks: [{
        block_key: 'about_this_piece',
        heading: 'About this piece',
        body: 'Layered silver shoulder pieces create a crisp sculptural line above the matching skirt.',
      }],
      image_alt_candidates: [{ alt_text: 'Silver skirt and shoulder outfit at a festival' }],
    },
    ...overrides,
  };
}

test('portfolio tokenization ignores metric and review provenance but includes PDP copy', () => {
  const tokens = tokenizeSeoPortfolioDraft(draft());
  assert.equal(tokens.has('google'), false);
  assert.equal(tokens.has('planner'), false);
  assert.equal(tokens.has('competition'), false);
  assert.equal(tokens.has('2026-06-29'), false);
  assert.equal(tokens.has('hold'), false);
  assert.equal(tokens.has('reject'), false);
  assert.equal(tokens.has('layered'), true);
  assert.equal(tokens.has('shoulder'), true);
  assert.equal(tokens.has('about'), false);
});

test('portfolio comparison uses one approved representative per other product', () => {
  const candidates = [
    draft({ id: 'same-product', canonical_product_id: 'product-a' }),
    draft({ id: 'older-other', canonical_product_id: 'product-b', created_at: '2026-08-01T00:00:00Z' }),
    draft({ id: 'newer-other', canonical_product_id: 'product-b', created_at: '2026-08-10T00:00:00Z' }),
    draft({ id: 'approved-other', canonical_product_id: 'product-b', status: 'approved_draft', review_status: 'approved', created_at: '2026-08-05T00:00:00Z' }),
  ];
  const selected = selectSeoPortfolioComparisonDrafts(candidates, 'product-a');
  assert.deepEqual(selected.map((item) => item.id), ['approved-other']);
});

test('shared technical metadata alone cannot create a cannibalization warning', () => {
  const current = draft();
  const different = draft({
    id: 'draft-b',
    canonical_product_id: 'product-b',
    product_slug: 'black-horned-mask',
    seo_title: 'Black Horned Mask for Stage Performance',
    h1: 'Black Horned Mask for Stage Performance',
    meta_description: 'A black horned face piece for theatrical stage characters.',
    intro: 'A dramatic face accessory for performers and costume productions.',
    agent_output_snapshot: {
      pdp_blocks: [{ body: 'Curved horns frame the face while keeping the stage character visually focused.' }],
      image_alt_candidates: [{ alt_text: 'Black horned mask worn on stage' }],
    },
    keyword_roles_snapshot: {
      primary: [{
        keyword_norm: 'black horned mask',
        role: 'primary',
        metric_source: 'google_keyword_planner',
        competition: 'HIGH',
        last_checked: '2026-06-29',
      }],
      hold: [{ keyword_norm: 'unrelated hold phrase', role: 'hold' }],
      reject: [{ keyword_norm: 'unrelated reject phrase', role: 'reject' }],
    },
  });
  const result = runSeoPortfolioOverlapCheck(current, [different], '2026-08-11T00:00:00Z');
  assert.equal(result.status, 'pass');
  assert.equal(result.comparison_count, 1);
  assert.equal(result.top_matches[0].shared_tokens.includes('competition'), false);
});

test('genuinely duplicated customer copy remains a blocker', () => {
  const current = draft();
  const duplicate = draft({ id: 'draft-b', canonical_product_id: 'product-b' });
  const result = runSeoPortfolioOverlapCheck(current, [duplicate], '2026-08-11T00:00:00Z');
  assert.equal(result.status, 'blocker');
  assert.equal(result.max_similarity_pct, 100);
});
