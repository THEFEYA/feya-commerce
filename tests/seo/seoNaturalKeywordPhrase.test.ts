import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDeterministicSeoIdentity } from '../../lib/seoEditorialCandidateSelection.ts';
import { validateSeoKeywordPlacement } from '../../lib/seoKeywordPlacementValidator.ts';
import type { SeoPackDraftContract } from '../../lib/seoPackContract.ts';

test('a known search-query word order becomes natural copy without changing the saved keyword', () => {
  const keyword = 'skirt and top set festival';
  const draft = { product_truth: { included_components: ['Top', 'Skirt'] }, keyword_roles: { primary: [{ keyword }], secondary: [] } } as unknown as SeoPackDraftContract;
  const output = normalizeDeterministicSeoIdentity({
    seo_title: '', h1: '',
    meta_description: 'Gold festival skirt and top set with a cosmic look for Burning Man.',
    intro: 'This gold festival outfit brings a futuristic mood to desert events.',
    pdp_blocks: [],
  }, { primary_keyword: keyword, selected_events: ['burning man', 'festival'], product_color: 'Gold' });
  assert.equal(output.seo_title, 'Gold Festival Skirt And Top Set for Burning Man');
  assert.equal(output.h1, output.seo_title);
  assert.equal(validateSeoKeywordPlacement(output, draft).ok, true);
  assert.equal(draft.keyword_roles.primary[0].keyword, keyword);
  const repeated = validateSeoKeywordPlacement({ ...output, intro: 'Gold festival skirt and top set for everyone.' }, draft);
  assert.ok(repeated.issues.some(issue => issue.code === 'primary_exact_phrase_outside_owned_fields'));
});


test('harness fashion query keeps its intent in a grammatical photoshoot title', () => {
  const keyword = 'leather body harness fashion';
  const draft = { product_truth: { included_components: ['Harness'] }, keyword_roles: { primary: [{ keyword }], secondary: [] } } as unknown as SeoPackDraftContract;
  const context = { primary_keyword: keyword, selected_events: ['photoshoot'], selected_materials: ['brown', 'leather'] };
  const output = normalizeDeterministicSeoIdentity({
    seo_title: '', h1: '',
    meta_description: 'Brown leather body harness for fashion photoshoots, with a classic menswear character.',
    intro: 'For men’s fashion photoshoots, this brown leather body harness has a classic character.',
    pdp_blocks: [],
  }, context);
  assert.equal(output.seo_title, 'Brown Leather Body Harness for Fashion Photoshoots');
  assert.equal(output.h1, output.seo_title);
  assert.equal(validateSeoKeywordPlacement(output, draft).ok, true);
  assert.equal(draft.keyword_roles.primary[0].keyword, keyword);
  assert.deepEqual(normalizeDeterministicSeoIdentity(output, context), output);
});
