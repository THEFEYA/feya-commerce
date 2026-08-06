export type SeoEditorialMemoryV2 = {
  contract_version: 'seo_editorial_memory_v2';
  source: 'owner_reference_001_plus_2026_08_06_feedback';
  use: 'voice_rhythm_and_block_logic_only';
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ];
  positive_block_examples: {
    about_this_piece: string;
    why_youll_love_it: string[];
    ideal_for: string[];
    studio_close: string;
  };
  writing_moves: {
    about_this_piece: string;
    why_youll_love_it: string;
    ideal_for: string;
    studio_close: string;
  };
};

/**
 * A compact positive few-shot reference. Product facts in these examples are
 * never evidence for another product; the current claim plan remains the only
 * source of publishable claims. The examples teach cadence, specificity and
 * division of work between blocks instead of adding another paid blacklist.
 */
export const SEO_EDITORIAL_MEMORY_V2: SeoEditorialMemoryV2 = {
  contract_version: 'seo_editorial_memory_v2',
  source: 'owner_reference_001_plus_2026_08_06_feedback',
  use: 'voice_rhythm_and_block_logic_only',
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ],
  positive_block_examples: {
    about_this_piece: 'Made for festivals, cosplay and live performance, this warrior costume turns a futuristic character into a complete wearable look. A glossy finish gives the armor a polished metal effect, while the body-facing material stays comfortable through hours of movement. The result feels dramatic and personal.',
    why_youll_love_it: [
      'Our original studio design gives the costume a recognizable character that still feels personal.',
      'Adjustable straps make the fit quick to secure and easier to adapt.',
      'The material keeps its shape between events, so the costume is ready to wear again after careful storage.',
    ],
    ideal_for: [
      'Festival-goers planning a warrior look for long days of music and movement.',
      'Cosplayers creating an original futuristic or fantasy character of their own.',
      'Live performers looking for a costume that reads clearly on stage.',
      'DJs and content creators preparing visuals for sets, shoots or music videos.',
      'Costume stylists sourcing an original design for shows and editorial productions.',
    ],
    studio_close: 'At TheFEYA, we create original festival and stage fashion for people who want their look to feel personal. Our work moves between futuristic, fantasy and performance worlds, with every idea developed in our studio. This costume brings that creative point of view to a character that feels distinctly your own.',
  },
  writing_moves: {
    about_this_piece: 'Real occasion, whole-product identity, one vivid supported detail, then why it matters in wear.',
    why_youll_love_it: 'Three different feature-to-outcome reasons. Design authorship appears once; material or fit families do not repeat.',
    ideal_for: 'Four or five distinct people and situations with varied sentence openings and no repeated who-need template.',
    studio_close: 'The final block is the only brand paragraph and the only TheFEYA mention. It closes on original design and personal expression.',
  },
};
