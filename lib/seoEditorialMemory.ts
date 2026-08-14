export type SeoEditorialMemoryV6 = {
  contract_version: 'seo_editorial_memory_v6';
  source: 'owner_reference_001_plus_2026_08_14_finish_and_buyer_value_feedback';
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
export const SEO_EDITORIAL_MEMORY_V6: SeoEditorialMemoryV6 = {
  contract_version: 'seo_editorial_memory_v6',
  source: 'owner_reference_001_plus_2026_08_14_finish_and_buyer_value_feedback',
  use: 'positive_block_frames_only',
  canonical_left_order: [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ],
  positive_block_frames: {
    intro: '“This [body identity variant] is designed for [selected occasion], where its original studio design creates a bold, distinctive look.”',
    about_this_piece: 'Write 45-60 useful words in 2-3 sentences. Start from the occasion and actual body_identity_variant_en value. Use exactly the color-aware finish sentence supplied by claim_plan: gold/silver may look metal-inspired; black/red/white may look sleek and latex-like; holographic may show subtle color shifts. Never generalize one finish profile to another. Every other sentence adds a different value. What’s Included owns the parts list.',
    why_youll_love_it: [
      'Our original studio design gives the outfit a distinctive, memorable character that feels genuinely personal.',
      'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
      'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
    ],
    ideal_for: [
      '[Person] planning [selected look] for [specific event or movement need].',
      'Cosplayers building an original character around a studio-designed costume.',
      'Performers preparing a costume for a specific stage or production use.',
      'Creators styling a costume for photography, video or a live set.',
      'Stylists sourcing a design for a show or editorial.',
    ],
    studio_close: 'Say once that at TheFEYA we develop original pieces from our own ideas. Use body_identity_variant_en, never “body identity”. Translate one or two selected styles into natural shopper language once; never say “style pair” or list taxonomy. Present the finished product as bold, distinctive and memorable in its selected setting. Do not imply that the garment transforms, remains unfinished or requires the buyer to choose a final version. Never prescribe hair, makeup, accessories, footwear, props or other unsold garments.',
  },
  writing_moves: {
    about_this_piece: 'Real occasion, whole-product identity, one vivid supported detail, then why it matters in wear.',
    why_youll_love_it: 'Three different feature-to-outcome reasons. Design authorship appears once; material or fit families do not repeat.',
    ideal_for: 'Four or five distinct people and situations with varied sentence openings and no repeated who-need template.',
    studio_close: 'The final block is the only brand paragraph and the only TheFEYA mention. It closes on original design and personal expression.',
  },
};
