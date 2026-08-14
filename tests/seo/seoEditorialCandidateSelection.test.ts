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
  normalizeSeoEditorialCandidate,
  normalizeSelectedEventEditorialCasing,
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

test('does not append an event already owned by the reviewed Primary', () => {
  const normalized = normalizeDeterministicSeoIdentity({
    seo_title: 'Draft title',
    h1: 'Draft H1',
    generation_notes: [],
  }, {
    primary_keyword: 'skirt and top set festival',
    selected_events: ['festival'],
    product_color: 'Gold',
  });

  assert.equal(normalized.seo_title, 'Gold Skirt And Top Set Festival');
  assert.equal(normalized.h1, 'Gold Skirt And Top Set Festival');
});

test('repairs the Festival Set control copy without another writer call', () => {
  const normalized = normalizeSeoEditorialCandidate({
    seo_title: 'Gold Skirt And Top Set Festival for Festivals',
    h1: 'Gold Skirt And Top Set Festival for Festivals',
    meta_description: 'Gold skirt and top set festival with a glossy finish and festival-ready glam for festivals and cosplay.',
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        body: 'For festivals, this skirt and top outfit festival brings a bold gold look with a durable, glossy, mirror-like coating. Its polished metal look gives your outfit a striking finish that feels ready for standout moments.',
      },
      {
        block_key: 'main_description',
        body: 'We shape the gold details for a glam presence that feels confident and personal. We keep the design expressive so your finished visual identity feels distinctly yours.',
      },
    ],
    generation_notes: [],
  }, {
    primary_keyword: 'skirt and top set festival',
    selected_events: ['festival'],
    product_color: 'Gold',
  });

  assert.equal(normalized.seo_title, 'Gold Skirt And Top Set Festival');
  assert.equal(
    normalized.meta_description,
    'Gold skirt and top set festival with a glossy finish and festival-ready glam for festivals.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /polished metal look gives/);
  assert.match(normalized.pdp_blocks[0].body, /crowded festival settings/);
  assert.match(normalized.pdp_blocks[1].body, /glamorous, recognizable character/);
  assert.doesNotMatch(normalized.pdp_blocks[1].body, /visual identity|silhouette|starting point|final look/i);
});

test('repairs the Holographic Set control copy without another writer call', () => {
  const normalized = normalizeSeoEditorialCandidate({
    pdp_blocks: [
      {
        block_key: 'ideal_for',
        body: [
          'Women planning an expressive costume for a live music production.',
          'Festival-goers planning a dancer look for a long day of music and movement.',
          'Live performers preparing a dancer look for a stage show or theatrical role.',
          'Content creators planning dancer visuals for rave shoots or music videos.',
          'Costume stylists sourcing an original glam piece for themed shows or editorials.',
        ].join('\n'),
      },
      {
        block_key: 'main_description',
        body: 'We design this piece to help you build a look that feels vivid, modern, and personal. We pair holographic shine with glam attitude so your visual identity feels unmistakably yours.',
      },
    ],
    generation_notes: [],
  }, {
    primary_keyword: 'rave skirt and top set',
    selected_events: ['rave', 'stage'],
    product_color: 'Holographic',
  });

  assert.match(normalized.pdp_blocks[0].body, /Rave-goers planning a holographic look/);
  assert.match(normalized.pdp_blocks[0].body, /iridescent visuals/);
  assert.equal(normalized.pdp_blocks[0].body.match(/\bdancer\b/gi)?.length, 1);
  assert.match(normalized.pdp_blocks[1].body, /shiny surface and subtle color shifts/);
  assert.doesNotMatch(normalized.pdp_blocks[1].body, /visual identity|metallic|reflective|mirrored|sparkling/i);
});

test('repairs the Black Bodysuit Set control copy without another writer call', () => {
  const normalized = normalizeSeoEditorialCandidate({
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        body: 'Made for Halloween and cosplay, this outfit centers a black bodysuit with a dramatic glossy finish. Its glossy, mirror-like coating creates a polished metal look. The shape reads bold and clean, with a goth-fantasy mood that feels ready for an original character.',
      },
      {
        block_key: 'ideal_for',
        body: [
          'Women preparing an expressive costume for a live music production.',
          'Festival-goers planning a goth look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
      },
      {
        block_key: 'main_description',
        body: 'At TheFEYA, we develop pieces from our own ideas, so the result feels personal rather than copied. That gives you room to shape a visual identity that feels personal to you.',
      },
    ],
    generation_notes: [],
  }, {
    primary_keyword: 'halloween costume with black bodysuit',
    selected_events: ['halloween', 'cosplay'],
    product_color: 'Black',
  });

  assert.match(normalized.pdp_blocks[0].body, /continuous dark base for the costume/);
  assert.match(normalized.pdp_blocks[0].body, /smooth, high-gloss surface/);
  assert.match(normalized.pdp_blocks[0].body, /latex-like character/);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /metal/i);
  assert.match(normalized.pdp_blocks[1].body, /Party-goers planning a dark look/);
  assert.equal(normalized.pdp_blocks[1].body.match(/\bgoth\b/gi)?.length, 1);
  assert.match(normalized.pdp_blocks[2].body, /bold, distinctive, and personal/);
  assert.doesNotMatch(normalized.pdp_blocks[2].body, /copied|visual identity|finished character|starting point/i);
});

test('repairs the Red Bodysuit Arms Set control copy without another writer call', () => {
  const normalized = normalizeSeoEditorialCandidate({
    meta_description: 'Red Halloween costumes with red bodysuit for festivals and cosplay, with a polished metal look and a goth-inspired finish.',
    intro: 'This complete Complete halloween costumes with red bodysuit is made for Halloween and cosplay, giving you a starting point for an original goth or fantasy demon character with a leather bodysuit costume edge.',
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Red complete Complete halloween costumes with red bodysuit in a side pose with raised leg',
    }],
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        body: 'This costume is made for Halloween and cosplay, bringing your look into a bold goth or fantasy direction. Its glossy, mirror-like coating creates a polished metal look, while the red shape keeps the finish striking from every angle.',
      },
      {
        block_key: 'ideal_for',
        body: [
          'Women preparing an expressive costume for a live music production.',
          'Festival-goers planning a demon look for a long day of music and movement.',
          'Cosplayers building an original goth or fantasy character around a studio-designed costume.',
          'Content creators planning fantasy visuals for Halloween shoots or music videos.',
          'Costume stylists sourcing an original goth piece for themed shows or editorials.',
        ].join('\n'),
      },
      {
        block_key: 'main_description',
        body: 'We build our pieces at TheFEYA from our own ideas, so your outfit feels original rather than copied. We lean into goth and fantasy cues to help you create a visual identity that feels personal. That lets you decide how the finished character should look.',
      },
    ],
    generation_notes: [],
  }, {
    primary_keyword: 'halloween costumes with red bodysuit',
    selected_events: ['halloween', 'cosplay'],
    product_color: 'Red',
  });

  assert.match(normalized.meta_description, /glossy bodysuit and a bold demon-inspired character/);
  assert.equal(normalized.intro, 'This red bodysuit costume creates a bold demon-inspired character for Halloween and cosplay with a glossy leather look.');
  assert.match(normalized.image_alt_candidates[0].alt_text, /forearm covers and tail/);
  assert.doesNotMatch(normalized.image_alt_candidates[0].alt_text, /halloween costumes with red bodysuit/i);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /direction/i);
  assert.match(normalized.pdp_blocks[0].body, /latex-like look/);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /metal/i);
  assert.equal(normalized.pdp_blocks[1].body.match(/\bgoth\b/gi)?.length, 1);
  assert.doesNotMatch(normalized.pdp_blocks[2].body, /goth|fantasy/i);
});

test('repairs the Silver Bodysuit Legs Set control copy without another writer call', () => {
  const normalized = normalizeSeoEditorialCandidate({
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        body: 'For stage and cosplay, this robot armor outfit brings a bold futuristic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The finish helps the piece stand out under bright lights, making it feel ready for performances, photos, and high-impact moments.',
      },
      {
        block_key: 'main_description',
        body: 'We design at TheFEYA from our own ideas, creating a robot armor outfit for women who want a stronger presence on stage. We keep the look original so you can build a character of your own through personal styling choices. We want the final impression to feel futuristic, bold, and unmistakably yours.',
      },
    ],
    generation_notes: [],
  }, {
    primary_keyword: 'robot armor costume',
    selected_events: ['stage', 'cosplay'],
    selected_styles: ['post apocalyptic', 'cyberpunk', 'sci fi'],
    included_components: ['Bodysuit', 'Single Leg Cover'],
    product_color: 'Silver',
  });

  assert.match(normalized.pdp_blocks[0].body, /sci-fi armor costume/);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /futuristic/i);
  assert.match(normalized.pdp_blocks[1].body, /glossy, metal-inspired finish/);
  assert.match(normalized.pdp_blocks[1].body, /distinctive, glamorous character/);
  assert.doesNotMatch(normalized.pdp_blocks[1].body, /futuristic|personal styling choices|visual identity|silhouette|starting point|final interpretation/i);
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
    generation_notes: [
      'Targeted repair kept for audit.',
      'Deterministic identity normalization used the reviewed Primary, supported product color and operator-selected event for SEO title and H1.',
    ],
  }, {
    primary_keyword: 'sci fi armor costume',
    selected_events: ['burning man'],
    selected_materials: ['gold'],
    product_color: 'Needs review',
  });

  assert.equal(normalized.seo_title, 'Gold Sci Fi Armor Costume for Burning Man');
  assert.equal(normalized.h1, 'Gold Sci Fi Armor Costume for Burning Man');
  assert.deepEqual(normalized.generation_notes, [
    'Targeted repair kept for audit.',
    'Deterministic identity normalization used the reviewed Primary, operator-selected color focus and event for SEO title and H1.',
  ]);
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

test('restores selected named-event casing across customer-visible copy', () => {
  const normalized = normalizeSelectedEventEditorialCasing({
    seo_title: 'Sci Fi Armor Costume for burning man',
    h1: 'Sci Fi Armor Costume for Burning Man',
    meta_description: 'Gold armor for burning man and festival styling.',
    intro: 'This outfit is made for burning man.',
    pdp_blocks: [{
      block_key: 'about_this_piece',
      heading: 'About this piece',
      body: 'For burning man, the outfit creates a polished desert look.',
    }],
    image_alt_candidates: [{ alt_text: 'Gold outfit worn at burning man' }],
    generation_notes: [],
  }, {
    selected_events: ['burning man', 'festival'],
  });

  assert.equal(normalized.seo_title, 'Sci Fi Armor Costume for Burning Man');
  assert.equal(normalized.meta_description, 'Gold armor for Burning Man and festival styling.');
  assert.equal(normalized.intro, 'This outfit is made for Burning Man.');
  assert.match(normalized.pdp_blocks[0].body, /^For Burning Man,/);
  assert.equal(normalized.image_alt_candidates[0].alt_text, 'Gold outfit worn at Burning Man');
  assert.match(normalized.generation_notes[0], /public casing/);
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
    'For festivals and cosplay, this warrior armor outfit brings a bold gold look with a durable, glossy, mirror-like coating. Its original studio design gives the gold outfit a distinctive, memorable character that feels confident at festivals, performances, and cosplay events.',
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
    'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built to support an original futuristic or fantasy character. It can lean futuristic or fantasy for festivals and cosplay. The original studio design gives the outfit a distinctive, memorable character that feels personal.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /body identity|finish it your way|final look|visual identity|starting point/i);
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
