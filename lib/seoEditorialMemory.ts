export type SeoEditorialMemoryV5 = {
  contract_version: 'seo_editorial_memory_v5';
  source: 'owner_reference_001_plus_2026_08_10_final_pilot_feedback';
  use: 'positive_block_frames_only';
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ];
  positive_block_frames: {
    intro: string;
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
export const SEO_EDITORIAL_MEMORY_V5: SeoEditorialMemoryV5 = {
  contract_version: 'seo_editorial_memory_v5',
  source: 'owner_reference_001_plus_2026_08_10_final_pilot_feedback',
  use: 'positive_block_frames_only',
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ],
  positive_block_frames: {
    intro: '“This [body identity variant] is made for [selected occasion], giving you a starting point for [an original selected character or use].”',
    about_this_piece: 'Write 45-60 useful words in 2-3 sentences. Start from the occasion and actual body_identity_variant_en value. Use one combined finish sentence, for example: “Its glossy, mirror-like coating creates a polished metal look.” Every other sentence adds a different value and contains no finish synonym. What’s Included owns the parts list.',
    why_youll_love_it: [
      'Our original studio design lets you shape the finished character through your own styling choices.',
      'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
      'The material helps the costume keep its shape between wears, so it is ready for the next occasion.',
    ],
    ideal_for: [
      '[Person] planning [selected look] for [specific event or movement need].',
      'Cosplayers building an original character around a studio-designed costume.',
      'Performers preparing a costume for a specific stage or production use.',
      'Creators styling a costume for photography, video or a live set.',
      'Stylists sourcing a design for a show or editorial.',
    ],
    studio_close: 'Say once that at TheFEYA we develop festival and stage pieces from our own ideas. Use the actual body_identity_variant_en value, never “body identity”. Name the selected style pair once, then close with one plain buyer-value sentence about a visual identity that feels personal. Do not repeat “feels” in that sentence. Never prescribe hair, makeup, accessories, footwear, props or other unsold garments.',
  },
  writing_moves: {
    about_this_piece: 'Real occasion, whole-product identity, one vivid supported detail, then why it matters in wear.',
    why_youll_love_it: 'Three different feature-to-outcome reasons. Design authorship appears once; material or fit families do not repeat.',
    ideal_for: 'Four or five distinct people and situations with varied sentence openings and no repeated who-need template.',
    studio_close: 'The final block is the only brand paragraph and the only TheFEYA mention. It closes on original design and personal expression.',
  },
};
