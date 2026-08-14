import assert from 'node:assert/strict';
import test from 'node:test';
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

function multiComponentContract(keyword: string): SeoPackDraftContract {
  const value = contract(keyword);
  value.product_truth = {
    included_components: ['Shoulders', 'Harness', 'Skirt'],
  } as SeoPackDraftContract['product_truth'];
  return value;
}

function output() {
  return {
    seo_title: 'Gold Shoulder Armor for Futuristic Festival Styling',
    h1: 'Gold Shoulder Armor with a Sculptural Silhouette',
    meta_description: 'Gold shoulder armor made for performance styling, editorial shoots and futuristic festival outfits.',
    intro: 'This metallic gold armor frames the shoulders with a sharp profile. Its shape reads clearly on stage and in photos.',
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

test('accepts a close whole-product semantic variation in body copy without repeating the exact H1 phrase', () => {
  const value = {
    ...output(),
    seo_title: 'Warrior Armor Costume for Burning Man',
    h1: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Warrior armor costume for Burning Man with an original studio design.',
    intro: 'Made for the selected festival occasion.',
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This gold warrior-inspired armor outfit is designed for the approved festival setting.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, contract('warrior armor costume'));
  const primary = result.placements.find((item) => item.role === 'primary');
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_body'), false);
  assert.ok(primary?.fields.includes('pdp_blocks'));
  assert.equal(primary?.exact_occurrences, 3);
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

test('matches plural costumes to singular costume in natural primary body copy', () => {
  const value = {
    ...output(),
    seo_title: 'Halloween Costumes with Red Bodysuit',
    h1: 'Halloween Costumes with Red Bodysuit',
    meta_description: 'Halloween costumes with red bodysuit styling for a bold demon-inspired character.',
    intro: 'This red bodysuit costume is designed for Halloween and cosplay.',
  };
  const result = validateSeoKeywordPlacement(value, contract('halloween costumes with red bodysuit'));
  const primary = result.placements.find((item) => item.role === 'primary');
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_body'), false);
  assert.ok(primary?.fields.includes('intro'));
});

test('uses exact primary repetition as a stuffing guard rather than a density target', () => {
  const value = output();
  value.pdp_blocks = [{
    heading: 'About this piece',
    body: 'Gold shoulder armor gives this festival look its main product identity.',
  }, {
    heading: 'Ideal for',
    body: 'Gold shoulder armor for stage performers.',
  }];
  const result = validateSeoKeywordPlacement(value, contract('gold shoulder armor'));
  const issue = result.issues.find((item) => item.code === 'primary_exact_phrase_overused');
  assert.ok(issue);
  assert.match(issue?.message || '', /normal grammatical variation/);
  assert.ok(result.issues.some((item) => item.code === 'primary_exact_phrase_outside_owned_fields'));
});

test('blocks exact Primary repetition in body and ALT while allowing semantic body coverage', () => {
  const value = output();
  value.pdp_blocks = [{
    heading: 'About this piece',
    body: 'This metallic gold armor outfit frames the shoulders for performance styling.',
  }];
  value.image_alt_candidates = [{ alt_text: 'Model wearing gold shoulder armor outdoors' }];
  const result = validateSeoKeywordPlacement(value, contract());
  const issue = result.issues.find((item) => item.code === 'primary_exact_phrase_outside_owned_fields');
  assert.ok(issue);
  assert.match(issue?.message || '', /image_alt_candidates/);
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

test('one natural secondary phrase can cover a close variant without becoming a stack', () => {
  const draft = contract('warrior armor costume');
  draft.keyword_roles.secondary = [
    { keyword: 'gold shoulder armor', keyword_norm: 'gold shoulder armor', role: 'secondary' },
    { keyword: 'gold shoulders', keyword_norm: 'gold shoulders', role: 'secondary' },
  ];
  const value = {
    ...output(),
    seo_title: 'Warrior Armor Costume for Burning Man',
    h1: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Warrior armor costume for Burning Man with an original studio design.',
    intro: 'A complete outfit for the selected festival setting.',
    image_alt_candidates: [{ alt_text: 'Gold shoulder armor with matching skirt at a festival' }],
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This warrior armor costume is designed for Burning Man.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(result.issues.some((issue) => issue.code === 'secondary_keyword_stack'), false);
  assert.deepEqual(
    result.placements.filter((item) => item.role === 'secondary').map((item) => item.fields),
    [['image_alt_candidates'], ['image_alt_candidates']],
  );
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

test('recognizes natural secondary word order and inflection inside one ALT', () => {
  const draft = contract('warrior armor costume');
  draft.keyword_roles.secondary = [
    { keyword: 'gold shoulders', keyword_norm: 'gold shoulders', role: 'secondary' },
  ];
  const value = {
    ...output(),
    seo_title: 'Warrior Armor Costume for Burning Man',
    h1: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Warrior armor costume for Burning Man with an original studio design.',
    intro: 'Made for festival styling with a clear whole-product identity.',
    image_alt_candidates: [{ alt_text: 'Shoulder pieces and skirt in gold worn outdoors' }],
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This warrior armor costume is designed for Burning Man.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  const secondary = result.placements.find((item) => item.keyword === 'gold shoulders');
  assert.deepEqual(secondary?.fields, ['image_alt_candidates']);
  assert.equal(result.issues.some((issue) => issue.code === 'secondary_keyword_cluster_unrepresented'), false);
});

test('does not count secondary tokens split across separate display units', () => {
  const draft = contract('warrior armor costume');
  draft.keyword_roles.secondary = [
    { keyword: 'gold shoulders', keyword_norm: 'gold shoulders', role: 'secondary' },
  ];
  const value = {
    ...output(),
    seo_title: 'Warrior Armor Costume for Burning Man',
    h1: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Warrior armor costume for Burning Man with an original studio design.',
    intro: 'A gold finish supports the selected festival palette.',
    image_alt_candidates: [{ alt_text: 'Shoulder pieces worn outdoors' }],
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This warrior armor costume is designed for Burning Man.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(
    result.placements.find((item) => item.keyword === 'gold shoulders')?.fields.length,
    0,
  );
  assert.ok(result.issues.some((issue) => issue.code === 'secondary_keyword_cluster_unrepresented'));
});

test('blocks a component-only primary keyword for a confirmed outfit', () => {
  const result = validateSeoKeywordPlacement(output(), multiComponentContract('gold shoulder armor'));
  assert.ok(result.issues.some((issue) => issue.code === 'primary_keyword_scope_mismatch_for_multi_component_product'));
});

test('does not treat a component query with a generic costume suffix as whole-product intent', () => {
  const result = validateSeoKeywordPlacement(output(), multiComponentContract('gold shoulder armor costume'));
  assert.ok(result.issues.some((issue) => issue.code === 'primary_keyword_scope_mismatch_for_multi_component_product'));
});

test('accepts a whole-product primary scope for a confirmed outfit', () => {
  const value = {
    ...output(),
    seo_title: 'Gold Festival Armor Outfit for Burning Man',
    h1: 'Gold Festival Armor Outfit for Burning Man',
    meta_description: 'Gold festival armor outfit with shoulder armor, harness and skirt for Burning Man performances.',
    intro: 'This gold festival armor outfit combines shoulder armor, a harness and a skirt for Burning Man.',
  };
  const result = validateSeoKeywordPlacement(value, multiComponentContract('gold festival armor outfit'));
  assert.equal(result.issues.some((issue) => issue.code === 'primary_keyword_scope_mismatch_for_multi_component_product'), false);
});
