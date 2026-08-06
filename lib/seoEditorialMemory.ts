export type SeoEditorialMemoryV1 = {
  contract_version: 'seo_editorial_memory_v1';
  source: 'owner_frozen_reference_001';
  use: 'voice_rhythm_and_block_logic_only';
  positive_block_templates: {
    about_this_piece: string;
    why_youll_love_it: string;
    ideal_for: string;
    studio_voice: string;
  };
};

/**
 * Compact runtime memory distilled from the owner-frozen reference in
 * docs/REFERENCE_EXAMPLE_001_WARRIOR_ARMOR.md. Placeholders deliberately keep
 * the reference's product facts out of drafts for other products.
 */
export const SEO_EDITORIAL_MEMORY_V1: SeoEditorialMemoryV1 = {
  contract_version: 'seo_editorial_memory_v1',
  source: 'owner_frozen_reference_001',
  use: 'voice_rhythm_and_block_logic_only',
  positive_block_templates: {
    about_this_piece: 'When your [approved occasion] look has to hold up through [real use], this is [whole product] you can actually live in.',
    why_youll_love_it: '[Supported feature], so [one concrete comfort, fit, repeat-wear or finish outcome].',
    ideal_for: '[Relevant person or professional role] who need [the product] for [one concrete approved occasion or production].',
    studio_voice: "At TheFEYA, we're an independent design team with our own take on festival and stage fashion. We make originals so you can find a design that feels like you.",
  },
};
