import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { validateSeoKeywordPlacement } from '../../lib/seoKeywordPlacementValidator.ts';
import type { SeoPackDraftContract } from '../../lib/seoPackContract.ts';

function contract(keyword = 'gold shoulder armor'): SeoPackDraftContract {
  return {
    keyword_roles: {
      primary: [{ keyword, keyword_norm: keyword, role: 'primary' }],
      secondary: [],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as unknown as SeoPackDraftContract;
}

function output() {
  return {
    seo_title: 'Gold Shoulder Armor for Futuristic Festival Styling',
    h1: 'Gold Shoulder Armor with a Sculptural Silhouette',
    meta_description: 'Gold shoulder armor made for performance styling, editorial shoots and futuristic festival outfits.',
    intro: 'This gold shoulder armor frames the upper body with a sharp metallic profile. Its visual shape reads clearly on stage and in photos.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{ alt_text: 'Model wearing reflective gold shoulder pieces' }],
    pdp_blocks: [{ heading: 'About this piece', body: 'The armor creates a defined upper-body silhouette.' }],
  };
}

test('passes a naturally distributed primary keyword', () => {
  const result = validateSeoKeywordPlacement(output(), contract());
  assert.equal(result.ok, true);
  assert.deepEqual(result.placements[0].fields.slice(0, 4), ['seo_title', 'h1', 'meta_description', 'intro']);
});

test('blocks missing primary placement and commercial ALT language', () => {
  const draft = contract();
  draft.keyword_roles.faq_commercial = [{ keyword: 'buy armor online', keyword_norm: 'buy armor online', role: 'faq_commercial' }];
  const value = {
    ...output(),
    meta_description: 'A sculptural piece for festival and performance styling.',
    image_alt_candidates: [{ alt_text: 'Buy armor online with delivery' }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === 'primary_missing_meta_description'));
  assert.ok(result.issues.some((issue) => issue.code === 'commercial_language_in_image_alt'));
});

test('allows singular and plural grammatical variation', () => {
  const value = output();
  value.seo_title = 'Gold Shoulder Armors for Futuristic Festival Styling';
  const result = validateSeoKeywordPlacement(value, contract('gold shoulder armor'));
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_seo_title'), false);
});

test('does not count keyword tokens scattered across unrelated text as placement', () => {
  const value = output();
  value.seo_title = 'Gold Festival Piece with Sculptural Shoulder Details';
  const result = validateSeoKeywordPlacement(value, contract('gold shoulder armor'));
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_seo_title'), true);
});

test('blocks near-synonymous secondary phrases stacked in one bullet', () => {
  const draft = contract();
  draft.keyword_roles.secondary = [
    { keyword: 'futuristic shoulder armor', keyword_norm: 'futuristic shoulder armor', role: 'secondary' },
    { keyword: 'cyberpunk shoulder armor', keyword_norm: 'cyberpunk shoulder armor', role: 'secondary' },
  ];
  const value = output();
  value.pdp_blocks = [{
    heading: 'Ideal for',
    body: 'Futuristic shoulder armor and cyberpunk shoulder armor styling.',
  }];
  const result = validateSeoKeywordPlacement(value, draft);
  assert.ok(result.issues.some((issue) => issue.code === 'secondary_keyword_stack' && issue.severity === 'blocker'));
});

test('does not demand exact placement of every secondary phrase', () => {
  const draft = contract();
  draft.keyword_roles.secondary = [
    { keyword: 'futuristic shoulder armor', keyword_norm: 'futuristic shoulder armor', role: 'secondary' },
    { keyword: 'cyberpunk shoulder armor', keyword_norm: 'cyberpunk shoulder armor', role: 'secondary' },
  ];
  const result = validateSeoKeywordPlacement(output(), draft);
  assert.equal(result.issues.some((issue) => issue.code === 'secondary_keyword_unplaced'), false);
});
