import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSeoEditorialRewriteSkeleton,
  isStrictlyBetterSeoEditorialCandidate,
  mergeBoundedSeoEditorialRepair,
  normalizeBodyPrimaryVariation,
  normalizeDeterministicSeoIdentity,
  normalizeFinalSeoEditorialOutput,
  normalizeImageAltPrimaryVariation,
  normalizeMainDescriptionCliches,
  normalizeMainDescriptionSentenceBoundaries,
  normalizeMetaDescriptionSentenceCase,
  normalizeRepeatedAboutFinishClause,
  normalizeSingleSuppliedImageAltCandidate,
  seoEditorialIssueSnapshot,
  shouldSelectFinalSeoEditorialCandidate,
  shouldRunSeoEditorialRepair,
} from '../../lib/seoEditorialCandidateSelection.ts';

const validation = (issues: Array<Record<string, unknown>>) => ({
  ok: !issues.some((issue) => issue.severity === 'blocker'),
  issues,
});

test('removes rejected buyer copy before the final clean-sheet editor', () => {
  const output = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Rejected title',
    h1: 'Rejected H1',
    meta_description: 'Rejected meta.',
    intro: 'Rejected intro.',
    bullet_highlights: ['Rejected highlight.'],
    faq: [{ question: 'Rejected?', answer: 'Yes.', intent: 'other' }],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Rejected ALT',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [{ anchor: 'Festival looks', target_type: 'collection', reason: 'Relevant' }],
    visual_truth: {
      observed_product_facts: ['Gold shoulders are visible'],
      dna_matches: ['Shoulders'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'Rejected About.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'related_collections',
        placement: 'review_only',
        heading: 'Related collections',
        body: 'Preserved internal note.',
        source_basis: 'product_fact',
        needs_human_review: true,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      notes: ['Rejected self-assessment.'],
    },
    generation_notes: ['Rejected generation note.'],
  };

  assert.deepEqual(buildSeoEditorialRewriteSkeleton(output), {
    ...output,
    status: 'needs_review',
    seo_title: '',
    h1: '',
    meta_description: '',
    intro: '',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: '',
      truth_basis: 'visible_product_fact',
    }],
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: '',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'related_collections',
        placement: 'review_only',
        heading: 'Related collections',
        body: 'Preserved internal note.',
        source_basis: 'product_fact',
        needs_human_review: true,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  });
});

test('keeps SEO title and H1 on the reviewed Primary and selected event', () => {
  const output = {
    seo_title: 'Warrior Armor Costume Set with Gold Shoulders and Skirt',
    h1: 'Warrior Armor Costume Set with Gold Shoulders and Skirt',
    generation_notes: [],
  };

  assert.deepEqual(
    normalizeDeterministicSeoIdentity(output, {
      primary_keyword: 'warrior armor costume',
      selected_events: ['festival', 'Burning Man'],
    }),
    {
      seo_title: 'Warrior Armor Costume for Burning Man',
      h1: 'Warrior Armor Costume for Burning Man',
      generation_notes: [
        'Deterministic identity normalization used the reviewed Primary and operator-selected event for SEO title and H1.',
      ],
    },
  );
});

test('inflects a generic festival focus into an idiomatic plural identity', () => {
  const normalized = normalizeDeterministicSeoIdentity({
    seo_title: 'Draft title',
    h1: 'Draft H1',
    generation_notes: [],
  }, {
    primary_keyword: 'warrior armor costume',
    selected_events: ['festival'],
  });

  assert.equal(normalized.seo_title, 'Warrior Armor Costume for Festivals');
  assert.equal(normalized.h1, 'Warrior Armor Costume for Festivals');
});

test('adds a supported product color to the deterministic SEO identity', () => {
  const normalized = normalizeDeterministicSeoIdentity({
    seo_title: 'Draft title',
    h1: 'Draft H1',
    generation_notes: [],
  }, {
    primary_keyword: 'warrior armor costume',
    selected_events: ['festival'],
    product_color: 'Gold',
  });

  assert.equal(normalized.seo_title, 'Gold Warrior Armor Costume for Festivals');
  assert.equal(normalized.h1, 'Gold Warrior Armor Costume for Festivals');
  assert.match(normalized.generation_notes[0], /supported product color/);
});

test('uses an operator-confirmed color focus when canonical color is still under review', () => {
  const normalized = normalizeDeterministicSeoIdentity({
    seo_title: 'Needs Review Sci Fi Armor Costume for Burning Man',
    h1: 'Needs Review Sci Fi Armor Costume for Burning Man',
    generation_notes: [],
  }, {
    primary_keyword: 'sci fi armor costume',
    selected_events: ['burning man'],
    selected_materials: ['gold'],
    product_color: 'Needs review',
  });

  assert.equal(normalized.seo_title, 'Gold Sci Fi Armor Costume for Burning Man');
  assert.equal(normalized.h1, 'Gold Sci Fi Armor Costume for Burning Man');
  assert.match(normalized.generation_notes[0], /operator-selected color focus/);
});

test('repairs lowercase Meta sentence case without changing its claim', () => {
  const normalized = normalizeMetaDescriptionSentenceCase({
    meta_description: 'warrior armor costume with a glossy finish for festivals and cosplay.',
    generation_notes: [],
  });

  assert.equal(
    normalized.meta_description,
    'Warrior armor costume with a glossy finish for festivals and cosplay.',
  );
  assert.match(normalized.generation_notes[0], /Meta normalization/);
});

test('keeps one ALT candidate when the runtime supplies one primary image', () => {
  const normalized = normalizeSingleSuppliedImageAltCandidate({
    image_alt_candidates: [
      { image_role: 'primary', alt_text: 'Gold warrior outfit worn outdoors' },
      { image_role: 'detail', alt_text: 'Invented reflective shoulder detail' },
    ],
    generation_notes: [],
  });

  assert.deepEqual(normalized.image_alt_candidates, [
    { image_role: 'primary', alt_text: 'Gold warrior outfit worn outdoors' },
  ]);
  assert.match(normalized.generation_notes[0], /one ALT candidate/);
});

test('uses the reviewed whole-product variation when ALT repeats the exact Primary', () => {
  const normalized = normalizeImageAltPrimaryVariation({
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior armor costume worn by a performer against dark rocks',
    }],
    generation_notes: [],
  }, {
    primary_keyword: 'warrior armor costume',
    body_identity_variant: 'warrior armor outfit',
  });

  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'Gold warrior armor outfit worn by a performer against dark rocks',
  );
  assert.match(normalized.generation_notes[0], /whole-product variation in ALT/);
});

test('keeps exact Primary in owned SEO fields and replaces it only in body copy', () => {
  const normalized = normalizeBodyPrimaryVariation({
    seo_title: 'Warrior Armor Costume for Festivals',
    h1: 'Warrior Armor Costume for Festivals',
    meta_description: 'Choose a warrior armor costume with a glossy gold finish for festivals.',
    intro: 'This warrior armor costume is made for festival styling.',
    pdp_blocks: [{
      block_key: 'about_this_piece',
      placement: 'left_description',
      heading: 'About this piece',
      body: 'The warrior armor costume gives you a clear base for an original character.',
    }],
    image_alt_candidates: [{ alt_text: 'Gold warrior armor costume worn outdoors' }],
    generation_notes: [],
  }, {
    primary_keyword: 'warrior armor costume',
    body_identity_variant: 'warrior armor outfit',
  });

  assert.equal(normalized.seo_title, 'Warrior Armor Costume for Festivals');
  assert.match(normalized.meta_description, /warrior armor costume/);
  assert.equal(normalized.intro, 'This warrior armor outfit is made for festival styling.');
  assert.match(normalized.pdp_blocks[0].body, /warrior armor outfit/);
  assert.match(normalized.image_alt_candidates[0].alt_text, /warrior armor costume/);
  assert.match(normalized.generation_notes[0], /outside its owned SEO fields/);
});

test('removes a duplicated finish preamble from About without rewriting other sentences', () => {
  const normalized = normalizeRepeatedAboutFinishClause({
    pdp_blocks: [{
      block_key: 'about_this_piece',
      placement: 'left_description',
      body: 'For festivals and cosplay, this warrior armor outfit gives you a bold starting point. The material has a durable, glossy, mirror-like coating, and the glossy, mirror-like surface gives the costume a polished metal finish.',
    }],
    generation_notes: [],
  });

  assert.equal(
    normalized.pdp_blocks[0].body,
    'For festivals and cosplay, this warrior armor outfit gives you a bold starting point. The glossy, mirror-like surface gives the costume a polished metal finish.',
  );
  assert.match(normalized.generation_notes[0], /duplicated finish clause/);
});

test('repairs the cross-sentence finish repetition from the final paid control run', () => {
  const normalized = normalizeRepeatedAboutFinishClause({
    pdp_blocks: [{
      block_key: 'about_this_piece',
      placement: 'left_description',
      body: 'For festivals and cosplay, this warrior armor outfit brings a bold gold look with a durable, glossy, mirror-like coating. The glossy, mirror-like surface gives the costume a polished metal finish, so your character reads as striking from the first glance.',
    }],
    generation_notes: [],
  });

  assert.equal(
    normalized.pdp_blocks[0].body,
    'For festivals and cosplay, this warrior armor outfit brings a bold gold look with a durable, glossy, mirror-like coating. The outfit gives you a starting point for an original character while leaving the surrounding styling choices to you.',
  );
  assert.equal(
    normalized.pdp_blocks[0].body.match(/\b(?:glossy|mirror[- ]like|polished metal)\b/gi)?.length,
    2,
  );
});

test('repairs lowercase and missing punctuation only in the self-expression close', () => {
  const normalized = normalizeMainDescriptionSentenceBoundaries({
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        body: 'keep this untouched',
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        body: 'Our studio keeps the design ready for your next scene. make the look your own',
      },
    ],
    generation_notes: [],
  });

  assert.equal(normalized.pdp_blocks[0].body, 'keep this untouched');
  assert.equal(
    normalized.pdp_blocks[1].body,
    'Our studio keeps the design ready for your next scene. Make the look your own.',
  );
  assert.match(normalized.generation_notes[0], /sentence boundaries/);
});

test('removes the bounded step-into cliché without inventing a replacement claim', () => {
  const normalized = normalizeMainDescriptionCliches({
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        body: 'keep this untouched',
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        body: 'Designed for stage-ready styling, it helps you step into the scene and make the look your own.',
      },
    ],
    generation_notes: [],
  });

  assert.equal(normalized.pdp_blocks[0].body, 'keep this untouched');
  assert.equal(
    normalized.pdp_blocks[1].body,
    'Designed for stage-ready styling, it helps you make the look your own.',
  );
  assert.match(normalized.generation_notes[0], /sales cliché/);
});

test('repairs the bounded step-into wording found in the real About control run', () => {
  const normalized = normalizeMainDescriptionCliches({
    pdp_blocks: [{
      block_key: 'about_this_piece',
      placement: 'left_description',
      body: 'Built for festivals and cosplay, this warrior armor outfit brings a glossy, mirror-like coating that reads like polished metal on stage and in photos. The finish adds a bold gold effect, so your look feels striking the moment you step into it.',
    }],
    generation_notes: [],
  });

  assert.equal(
    normalized.pdp_blocks[0].body,
    'Built for festivals and cosplay, this warrior armor outfit brings a glossy, mirror-like coating that reads like polished metal on stage and in photos. The finish adds a bold gold effect, so your look feels striking when you put it on.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /step into/i);
});

test('replaces internal body-identity jargon and the stacked closing slogans from the final run', () => {
  const normalized = normalizeMainDescriptionCliches({
    pdp_blocks: [{
      block_key: 'main_description',
      placement: 'left_description',
      body: 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built to support an original futuristic or fantasy character. The gold body identity works beautifully for festival scenes, while you choose the surrounding styling. Finish it your way and make the look your own.',
    }],
    generation_notes: [],
  }, {
    selected_events: ['festival', 'cosplay'],
    selected_styles: ['futuristic', 'fantasy'],
  });

  assert.equal(
    normalized.pdp_blocks[0].body,
    'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built to support an original futuristic or fantasy character. It can lean futuristic or fantasy for festivals and cosplay. You choose the surrounding styling that completes the final look for the setting you have in mind.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /body identity|finish it your way/i);
});

test('skips the editorial rewrite when deterministic QA is clean', () => {
  assert.equal(shouldRunSeoEditorialRepair(validation([]), validation([])), false);
  assert.equal(
    shouldRunSeoEditorialRepair(validation([{ code: 'thin_copy', severity: 'warning' }])),
    true,
  );
});

test('accepts only a strict issue reduction', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repetition', severity: 'warning' },
    ]),
  ];
  assert.equal(
    isStrictlyBetterSeoEditorialCandidate(
      [validation([{ code: 'repetition', severity: 'warning' }])],
      baseline,
    ),
    true,
  );
  assert.equal(
    isStrictlyBetterSeoEditorialCandidate(
      [validation([
        { code: 'robotic_copy', severity: 'blocker' },
        { code: 'different_warning', severity: 'warning' },
      ])],
      baseline,
    ),
    false,
  );
});

test('prefers a QA-clean strong final editor when it does not add warnings', () => {
  assert.equal(
    shouldSelectFinalSeoEditorialCandidate(
      [validation([])],
      [validation([])],
    ),
    true,
  );
  assert.equal(
    shouldSelectFinalSeoEditorialCandidate(
      [validation([{ code: 'new_warning', severity: 'warning' }])],
      [validation([])],
    ),
    false,
  );
  assert.equal(
    shouldSelectFinalSeoEditorialCandidate(
      [validation([])],
      [validation([{ code: 'robotic_copy', severity: 'blocker' }])],
    ),
    true,
  );
});

test('rejects a repair that trades an old blocker for a new blocker', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'composition_repeat', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'unsupported_claim', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('accepts a net reduction when only editorial blocker classes change', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'copy_rhythm_issue', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), true);
});

test('rejects a net reduction that introduces an unselected event', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'customer_copy_uses_unselected_event_focus', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('rejects an editorial improvement that breaks primary placement', () => {
  const baseline = [
    validation([
      { code: 'robotic_copy', severity: 'blocker' },
      { code: 'repeated_idea', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'primary_missing_body', severity: 'blocker', keyword: 'warrior armor costume' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('rejects an editorial rewrite that removes blockers by collapsing About or benefits', () => {
  const baseline = [
    validation([
      { code: 'customer_copy_contains_robotic_editorial_jargon', severity: 'blocker' },
      { code: 'repeated_idea_fit_and_adjustability', severity: 'blocker' },
      { code: 'repeated_idea_reflective_finish', severity: 'blocker' },
    ]),
  ];
  const candidate = [
    validation([
      { code: 'pdp_block_about_this_piece_too_thin_0', severity: 'blocker' },
    ]),
  ];
  assert.equal(isStrictlyBetterSeoEditorialCandidate(candidate, baseline), false);
});

test('keeps an auditable issue snapshot with keyword identity', () => {
  assert.deepEqual(
    seoEditorialIssueSnapshot(validation([
      { code: 'primary_missing_body', severity: 'blocker', keyword: 'Warrior Armor Costume' },
      { code: 'commercial_unplaced', severity: 'warning', keyword: 'buy costume online' },
    ])),
    {
      blocker_count: 1,
      warning_count: 1,
      blocker_keys: ['primary_missing_body:warrior armor costume'],
      warning_keys: ['commercial_unplaced:buy costume online'],
    },
  );
});

test('removes deterministic brand padding from the final SEO title only', () => {
  const output = {
    seo_title: 'Gold Warrior Armor Costume for Burning Man | TheFEYA',
    h1: 'Gold Warrior Armor Costume for Burning Man',
    generation_notes: ['Model draft retained for audit.'],
  };
  assert.deepEqual(normalizeFinalSeoEditorialOutput(output), {
    seo_title: 'Gold Warrior Armor Costume for Burning Man',
    h1: 'Gold Warrior Armor Costume for Burning Man',
    generation_notes: [
      'Model draft retained for audit.',
      'Deterministic review normalization removed brand padding from the SEO title.',
    ],
  });
  assert.equal(output.seo_title, 'Gold Warrior Armor Costume for Burning Man | TheFEYA');
});

test('bounded residual repair changes only fields named by remaining issue codes', () => {
  const baseline = {
    seo_title: 'Warrior Armor Costume for Burning Man',
    intro: 'Accepted intro.',
    image_alt_candidates: [{ alt_text: 'Accepted ALT' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', body: 'Accepted About.' },
      { block_key: 'why_youll_love_it', body: 'Rejected benefits.' },
      { block_key: 'ideal_for', body: 'Accepted Ideal for.' },
      { block_key: 'main_description', body: 'Accepted studio close.' },
    ],
  };
  const candidate = {
    seo_title: 'Regressed title',
    intro: 'Regressed intro.',
    image_alt_candidates: [{ alt_text: 'Regressed ALT' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', body: 'Regressed About.' },
      { block_key: 'why_youll_love_it', body: 'Repaired benefits.' },
      { block_key: 'ideal_for', body: 'Regressed Ideal for.' },
      { block_key: 'main_description', body: 'Regressed studio close.' },
    ],
  };

  assert.deepEqual(
    mergeBoundedSeoEditorialRepair(
      baseline,
      candidate,
      validation([
        { code: 'why_youll_love_it_lacks_benefit_diversity', severity: 'blocker' },
        { code: 'why_youll_love_it_benefit_2_has_no_concrete_buyer_value', severity: 'blocker' },
      ]),
    ),
    {
      ...baseline,
      pdp_blocks: [
        { block_key: 'about_this_piece', body: 'Accepted About.' },
        { block_key: 'why_youll_love_it', body: 'Repaired benefits.' },
        { block_key: 'ideal_for', body: 'Accepted Ideal for.' },
        { block_key: 'main_description', body: 'Accepted studio close.' },
      ],
    },
  );
});

test('a whole-copy editorial issue can repair all customer-copy owners but not title or ALT', () => {
  const baseline = {
    seo_title: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Rejected meta.',
    intro: 'Rejected intro.',
    image_alt_candidates: [{ alt_text: 'Accepted ALT' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', body: 'Rejected About.' },
      { block_key: 'why_youll_love_it', body: 'Rejected benefits.' },
      { block_key: 'ideal_for', body: 'Rejected use cases.' },
      { block_key: 'main_description', body: 'Rejected studio close.' },
    ],
  };
  const candidate = {
    seo_title: 'Regressed title',
    meta_description: 'Repaired meta.',
    intro: 'Repaired intro.',
    image_alt_candidates: [{ alt_text: 'Regressed ALT' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', body: 'Repaired About.' },
      { block_key: 'why_youll_love_it', body: 'Repaired benefits.' },
      { block_key: 'ideal_for', body: 'Repaired use cases.' },
      { block_key: 'main_description', body: 'Repaired studio close.' },
    ],
  };

  assert.deepEqual(
    mergeBoundedSeoEditorialRepair(
      baseline,
      candidate,
      validation([{ code: 'repeated_idea_base_layer_styling', severity: 'blocker' }]),
    ),
    {
      ...candidate,
      seo_title: baseline.seo_title,
      image_alt_candidates: baseline.image_alt_candidates,
    },
  );
});

test('secondary semantic warning permits an ALT-only residual repair', () => {
  const baseline = {
    intro: 'Accepted intro.',
    image_alt_candidates: [{ alt_text: 'Shoulders and skirt outdoors' }],
  };
  const candidate = {
    intro: 'Regressed intro.',
    image_alt_candidates: [{ alt_text: 'Gold shoulder armor and skirt outdoors' }],
  };

  assert.deepEqual(
    mergeBoundedSeoEditorialRepair(
      baseline,
      candidate,
      validation([{ code: 'secondary_keyword_cluster_unrepresented', severity: 'warning' }]),
    ),
    {
      ...baseline,
      image_alt_candidates: candidate.image_alt_candidates,
    },
  );
});
