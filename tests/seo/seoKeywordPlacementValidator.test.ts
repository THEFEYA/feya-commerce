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

test('allows a multi-component Primary to use a whole-product body variation without repeating inventory', () => {
  const draft = contract('skirt and top set festival');
  draft.product_truth = {
    included_components: ['Skirt Only', 'Top Only'],
  } as SeoPackDraftContract['product_truth'];
  const value = {
    ...output(),
    seo_title: 'Gold Skirt and Top Set Festival',
    h1: 'Gold Skirt and Top Set Festival',
    meta_description: 'Gold skirt and top set festival with a glossy finish for long festival days.',
    intro: 'This gold festival outfit brings an original studio design to long days of music.',
  };
  const result = validateSeoKeywordPlacement(value, draft);
  const primary = result.placements.find((item) => item.role === 'primary');
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_body'), false);
  assert.ok(primary?.fields.includes('intro'));
});

test('keeps paid harness and metallic-set Primaries in owned fields with natural body variations', () => {
  const cases = [
    {
      keyword: 'leather harness outfit',
      components: ['Choker', 'Garters', 'Chest Harness'],
      value: {
        ...output(),
        seo_title: 'Black Leather Harness Outfit for Festivals',
        h1: 'Black Leather Harness Outfit for Festivals',
        meta_description: 'Black leather harness outfit for men with a smooth high-gloss finish and bold punk character for festivals and Pride.',
        intro: 'For festivals and Pride, this black harness outfit gives men a bold punk character shaped by an original fashion-studio design.',
        pdp_blocks: [{ heading: 'About this piece', body: 'Made for festivals and Pride, this black leather harness costume gives men a bold punk character with an original fashion-studio design.' }],
      },
    },
    {
      keyword: 'metallic top and skirt set',
      components: ['Choker', 'Top', 'Skirt'],
      value: {
        ...output(),
        seo_title: 'Silver Metallic Top And Skirt Set for Festivals',
        h1: 'Silver Metallic Top And Skirt Set for Festivals',
        meta_description: 'Metallic top and skirt set for women, created for festivals, stage performance and bold futuristic styling.',
        intro: 'This silver festival outfit brings an original studio design to live performance.',
        pdp_blocks: [{ heading: 'About this piece', body: 'Created for festivals and stage performance, this complete metallic silver outfit gives dancers a memorable choice for live appearances.' }],
      },
    },
  ];

  for (const item of cases) {
    const draft = contract(item.keyword);
    draft.product_truth = { included_components: item.components } as SeoPackDraftContract['product_truth'];
    const result = validateSeoKeywordPlacement(item.value, draft);
    assert.deepEqual(
      result.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
      [],
      item.keyword,
    );
    assert.equal(result.placements[0].exact_occurrences, 3, item.keyword);
  }
});

test('keeps non-component Primary identity tokens mandatory in a multi-piece body variation', () => {
  const draft = contract('halloween costumes with red bodysuit');
  draft.product_truth = {
    included_components: ['Bodysuit', 'Forearm Covers', 'Tail'],
  } as SeoPackDraftContract['product_truth'];
  const value = {
    ...output(),
    seo_title: 'Halloween Costumes with Red Bodysuit',
    h1: 'Halloween Costumes with Red Bodysuit',
    meta_description: 'Halloween costumes with red bodysuit styling for an original studio character.',
    intro: 'This Halloween costume is designed for cosplay and stage appearances.',
    pdp_blocks: [],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(result.issues.some((issue) => issue.code === 'primary_missing_body'), true);
});

test('keeps the silver armor body natural without exact Primary repetition or nested secondary stacking', () => {
  const draft = contract('robot armor costume');
  draft.product_truth = {
    included_components: ['Bodysuit', 'Single Leg Cover'],
  } as SeoPackDraftContract['product_truth'];
  draft.keyword_roles.secondary = [
    { keyword: 'silver metallic bodysuit', keyword_norm: 'silver metallic bodysuit', role: 'secondary' },
    { keyword: 'metallic bodysuit', keyword_norm: 'metallic bodysuit', role: 'secondary' },
  ];
  const value = {
    ...output(),
    seo_title: 'Silver Robot Armor Costume for Stage',
    h1: 'Silver Robot Armor Costume for Stage',
    meta_description: 'Silver robot armor costume with a metal-inspired finish for stage and cosplay.',
    intro: 'This robot armor outfit is designed for the stage and cosplay.',
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This robot-inspired armor outfit creates a sleek silver bodysuit with a fashion-led metallic edge.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(result.issues.some((issue) => issue.code === 'primary_exact_phrase_outside_owned_fields'), false);
  assert.equal(result.issues.some((issue) => issue.code === 'primary_exact_phrase_overused'), false);
  assert.equal(result.issues.some((issue) => issue.code === 'secondary_keyword_stack'), false);
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

test('one literal phrase may contain a shorter measured secondary variation without becoming a stack', () => {
  const draft = contract('bodysuit halloween costume');
  draft.product_truth = {
    included_components: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
  } as SeoPackDraftContract['product_truth'];
  draft.keyword_roles.secondary = [
    { keyword: 'black bodysuit halloween costume', keyword_norm: 'black bodysuit halloween costume', role: 'secondary' },
    { keyword: 'black bodysuit halloween', keyword_norm: 'black bodysuit halloween', role: 'secondary' },
  ];
  const value = {
    ...output(),
    seo_title: 'Black Bodysuit Halloween Costume',
    h1: 'Black Bodysuit Halloween Costume',
    meta_description: 'Black bodysuit Halloween costume for women with a sleek finish.',
    intro: 'This Halloween outfit gives women a dark-fantasy character for cosplay.',
    pdp_blocks: [{
      heading: 'About this piece',
      body: 'This Halloween costume has a sculptural silhouette for original cosplay styling.',
    }],
  };
  const result = validateSeoKeywordPlacement(value, draft);
  assert.equal(result.issues.some((issue) => issue.code === 'secondary_keyword_stack'), false);
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
