export type SeoEditorialMemoryV3 = {
  contract_version: 'seo_editorial_memory_v3';
  source: 'owner_reference_001_plus_2026_08_07_pilot_feedback';
  use: 'positive_block_frames_only';
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ];
  positive_block_frames: {
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
 * Compact positive block frames. They teach division of work and sentence
 * logic without supplying a finished warrior-product paragraph that can be
 * copied across the catalog. The current claim plan remains the only source
 * of publishable product facts.
 */
export const SEO_EDITORIAL_MEMORY_V3: SeoEditorialMemoryV3 = {
  contract_version: 'seo_editorial_memory_v3',
  source: 'owner_reference_001_plus_2026_08_07_pilot_feedback',
  use: 'positive_block_frames_only',
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ],
  positive_block_frames: {
    about_this_piece: 'Open with “Made for [selected occasion], this [whole-product noun] ...” Then connect one assigned fact to one plain wearer result. Never list the product parts; What’s Included owns them.',
    why_youll_love_it: [
      'Our original studio design helps you create a character that feels personal.',
      'The supported wear fact makes the costume easier or more comfortable to wear in the named situation.',
      'The supported repeat-use fact leaves the piece ready for its next wear.',
    ],
    ideal_for: [
      '[Person] planning [selected look] for [specific event or movement need].',
      'Cosplayers creating a character of their own through a studio interpretation.',
      'Performers preparing a costume for a specific stage or production use.',
      'Creators styling a costume for photography, video or a live set.',
      'Stylists sourcing a design for a show or editorial.',
    ],
    studio_close: 'Start with: “At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal.” Add one product-specific bridge to a selected setting, then close on the wearer making the look their own.',
  },
  writing_moves: {
    about_this_piece: 'Real occasion, whole-product identity, one vivid supported detail, then why it matters in wear.',
    why_youll_love_it: 'Three different feature-to-outcome reasons. Design authorship appears once; material or fit families do not repeat.',
    ideal_for: 'Four or five distinct people and situations with varied sentence openings and no repeated who-need template.',
    studio_close: 'The final block is the only brand paragraph and the only TheFEYA mention. It closes on original design and personal expression.',
  },
};
