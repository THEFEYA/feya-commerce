import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSavedDraftPreviewResult } from '../../lib/seoSavedDraftPreview.ts';

test('maps a saved snapshot into the existing visual-preview result contract without OpenAI', () => {
  const result = buildSavedDraftPreviewResult({
    id: 'draft-1',
    canonical_product_id: 'product-1',
    matched_etsy_listing_id: '1885178663',
    product_slug: 'gold-warrior-armor-set',
    status: 'draft_generated',
    review_status: 'not_reviewed',
    source_mode: 'openai_draft',
    created_at: '2026-08-10T10:00:00.000Z',
    updated_at: '2026-08-10T10:01:00.000Z',
    agent_output_snapshot: {
      seo_title: 'Gold Warrior Armor Costume for Festivals',
      h1: 'Gold Warrior Armor Costume for Festivals',
      pdp_blocks: [
        { block_key: 'about_this_piece', heading: 'About this piece', body: 'Stored copy.' },
      ],
    },
    validation_result_snapshot: {
      structural_validation: { ok: true, status: 'valid', issues: [] },
      commercial_validation: { ok: true, status: 'valid', issues: [] },
      keyword_placement_validation: { ok: true, status: 'valid', issues: [] },
      assembled_seo_pack: { quality_gate: { ready_for_storage: true } },
    },
  });

  assert.equal(result.status, 'saved_draft_loaded');
  assert.equal(result.saved_draft.id, 'draft-1');
  assert.equal(result.generated_draft_output.pdp_blocks.length, 1);
  assert.equal(result.generated_draft_validation.ok, true);
  assert.equal(result.generated_draft_commercial_validation.ok, true);
  assert.equal(result.generated_draft_keyword_placement_validation.ok, true);
  assert.equal(result.assembled_seo_pack.quality_gate.ready_for_storage, true);
  assert.equal(result.openai_generation.writer_calls, 0);
  assert.equal(result.openai_generation.total_tokens, 0);
  assert.equal(result.read_only, true);
});

test('fails closed to empty validation objects when an old snapshot lacks validation sections', () => {
  const result = buildSavedDraftPreviewResult({
    id: 'draft-legacy',
    canonical_product_id: 'product-legacy',
    agent_output_snapshot: { seo_title: 'Legacy draft' },
    validation_result_snapshot: null,
  });

  assert.deepEqual(result.generated_draft_validation, {});
  assert.deepEqual(result.generated_draft_commercial_validation, {});
  assert.deepEqual(result.generated_draft_keyword_placement_validation, {});
  assert.equal(result.assembled_seo_pack, null);
  assert.equal(result.openai_generation.status, 'not_called_saved_snapshot');
});
