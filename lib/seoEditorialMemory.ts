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
    intro: 'Open with [selected occasion] + [body identity variant] + one product-specific reason this design suits that use. Do not reuse one fixed sentence skeleton across products.',
    about_this_piece: 'Write 45-60 useful words in 2-3 sentences. Start from the occasion and actual body_identity_variant_en value. Use exactly the color-aware finish sentence supplied by claim_plan: gold/silver may look metal-inspired; black/red/white may look sleek and latex-like; holographic may show subtle color shifts. Never generalize one finish profile to another. Every other sentence adds a different value. What’s Included owns the parts list.',
    why_youll_love_it: [
      '[Created by our designers / Developed in our fashion studio] + one product-specific design trait + a distinctive, memorable wearer value.',
      '[Supported material or fit feature] + feels comfortable against the body + one literal wearability outcome. The garment or material is the subject; never write “a comfortable feel supports”.',
      '[Careful storage] + a product-specific noun + keeps its shape between wears + a truthful repeat-use outcome.',
    ],
    ideal_for: [
      '[Person] seeking [selected look] for [specific selected occasion or production].',
      '[Event attendee] drawn to [selected style] for [specific movement or duration need].',
      '[Performer] choosing [supported character or outfit] for [stage or production use].',
      '[Creator] producing [supported visual context] for photography, video or a live set.',
      '[Stylist] selecting [product-relevant design] for a show or editorial.',
    ],
    studio_close: 'Mention TheFEYA once and use a natural first-person authorship phrase suited to this product: our designers, our fashion studio or our original design ideas. Use body_identity_variant_en, never “body identity”. Translate one or two selected styles into natural shopper language once; never say “style pair” or list taxonomy. Present the finished product as bold, distinctive and memorable in its selected setting. Do not imply that the garment transforms, remains unfinished or requires the buyer to choose a final version. Never prescribe hair, makeup, accessories, footwear, props or other unsold garments.',
  },
  writing_moves: {
    about_this_piece: 'Real occasion, whole-product identity, one vivid supported detail, then why it matters in wear.',
    why_youll_love_it: 'Three different feature-to-outcome reasons. Design authorship appears once; material or fit families do not repeat.',
    ideal_for: 'Four or five distinct people and situations. Lead with the person or role and never repeat one action frame such as planning across three bullets.',
    studio_close: 'The final block is the only brand paragraph and the only TheFEYA mention. It closes on product-specific designer authorship and personal expression without repeating a catalog template.',
  },
};
