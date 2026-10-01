import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSelectedEventEditorialGrammar } from '../../lib/seoEditorialCandidateSelection.ts';

const context = { selected_events: ['festival', 'rave'] };

test('preserves grammatical rave noun modifiers while pluralizing a standalone event', () => {
  const output = {
    seo_title: 'Rave Outfit',
    h1: 'Rave Outfit',
    meta_description: 'An outfit for festivals and rave nights.',
    intro: 'For festivals and rave culture.',
    pdp_blocks: [{ body: 'Made for festivals and rave.' }],
    generation_notes: [],
  };
  const result = normalizeSelectedEventEditorialGrammar(output, context);
  assert.equal(result.meta_description, output.meta_description);
  assert.equal(result.intro, output.intro);
  assert.equal(result.pdp_blocks[0].body, 'Made for festivals and raves.');
  assert.equal(result.seo_title, output.seo_title);
  assert.equal(result.h1, output.h1);
});

test('repairs the saved August regression without adding another note on repeat', () => {
  const output = {
    meta_description: 'Designed for Burning Man, festivals and raves styling.',
    intro: 'Designed for festivals and raves nights.',
    pdp_blocks: [{ body: 'For festivals and raves settings.' }],
    generation_notes: [],
  };
  const result = normalizeSelectedEventEditorialGrammar(output, context);
  assert.equal(result.meta_description, 'Designed for Burning Man, festivals and rave styling.');
  assert.equal(result.intro, 'Designed for festivals and rave nights.');
  assert.equal(result.pdp_blocks[0].body, 'For festivals and rave settings.');
  assert.deepEqual(normalizeSelectedEventEditorialGrammar(result, context), result);
});

test('leaves copy alone when rave is not part of the saved focus', () => {
  const output = { intro: 'Designed for festivals and raves nights.' };
  assert.equal(normalizeSelectedEventEditorialGrammar(output, { selected_events: ['stage'] }), output);
});
