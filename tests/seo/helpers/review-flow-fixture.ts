// @ts-nocheck
import type { SeoAgentInputContract, SeoAgentOutputContract, SeoPackDraftContract } from '../../../lib/seoPackContract.ts';
// Synthetic transaction fixture, derived from an existing copy regression. Never FEYA measurement.
export function reviewFlowFixture(): { candidate: SeoAgentOutputContract; draft: SeoPackDraftContract; agentInput: SeoAgentInputContract } {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Festival Outfit for Burning Man and Rave',
    h1: 'Silver Festival Outfit for Burning Man',
    meta_description: 'Shop a silver festival outfit in mirror-finish vegan leather, created for Burning Man, raves, live performance, photography and video.',
    intro: 'Designed for Burning Man and rave nights, this complete silver set combines angular armor-inspired lines with a high-gloss mirror finish for a clear futuristic look in motion.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Metallic silver costume with choker, shoulder, top, belt and leg pieces',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'Silver mirror-finish surface',
        'Angular layered construction',
        'Choker, shoulder, top, belt and leg pieces',
      ],
      dna_matches: ['Futuristic styling', 'Cyberpunk styling', 'Cosmic styling'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: ['Do not claim protective armor function'],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'Built for festivals and raves, this complete silver costume combines angular, armor-inspired lines with a high-gloss mirror finish. The layered forms create a clear futuristic character for Burning Man, live performance, photography and video, while the vegan leather surface catches available light as the wearer moves.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the original studio design gives the costume a recognizable character that feels personal.\nThe mirror finish catches available light, helping the angular details stay visible in photos and during live performances.\nAdjustable straps provide room to adjust the fit for different body shapes and help the selected configuration sit securely.\nWith careful storage, the vegan leather pieces keep their shape between wears and stay ready for repeat use.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women developing an original alien character for Burning Man or rave appearances.\nFestival-goers who want a complete silver costume for long days and night sets.\nPerformers selecting an armor-inspired outfit for live shows and dance productions.\nContent creators planning cyberpunk or cosmic fashion photography and video.\nCostume stylists sourcing an original studio design for editorials and themed productions.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'At TheFEYA, our designers developed this piece as an original studio interpretation of futuristic and cosmic fashion. Its geometric lines give women a recognizable character for crowded festival spaces, stage appearances and creative shoots. The design supports personal expression through a confident alien-inspired form that remains true to our studio style.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'pass',
      notes: ['Owner-reviewed zero-token recovery after two paid drafts were blocked by wording-only QA.'],
    },
    generation_notes: ['Owner-reviewed manual recovery preserved the confirmed Product Truth and saved keyword decision without another writer call.'],
  };
  const context = {
    product_truth: {
      color: 'Silver',
      material: 'Vegan leather',
      included_components: ['Choker', 'Belt', 'Legs', 'Shoulders', 'Top'],
    },
    manual_focus: {
      material: ['silver', 'mirror', 'vegan leather', 'metallic'],
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'cyberpunk', 'cosmic'],
      persona: ['alien'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'silver festival outfit', keyword_norm: 'silver festival outfit', role: 'primary' }],
      secondary: [
        { keyword: 'futuristic armor costume', keyword_norm: 'futuristic armor costume', role: 'secondary' },
        { keyword: 'futuristic shoulder armor', keyword_norm: 'futuristic shoulder armor', role: 'secondary' },
        { keyword: 'cyberpunk shoulder armor', keyword_norm: 'cyberpunk shoulder armor', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  };

  candidate.pdp_blocks.find(block => block.block_key === 'main_description').body = 'At TheFEYA, we create original fashion for people who want to express their individuality. Our designs begin with imagination and a belief in the freedom to be yourself. We want our work to help you share your personality, celebrate your own ideas and make personal expression part of getting dressed.';
  candidate.qa_self_report.notes = ['Synthetic integration fixture; not live approval or demand evidence.'];
  candidate.generation_notes = ['Synthetic integration fixture. No AI call.'];
  const productId = '00000000-0000-4000-8000-000000000021';
  const draft = {
    ...context, canonical_product_id: productId, status: 'draft_ready',
    keyword_selection: { status: 'confirmed', mode: 'operator_decision', evidence_source: 'synthetic_test_only', confirmation_required: false },
    // Simulates the gate input; there is deliberately no invented volume or competition value.
    metrics_status: { status: 'validated', validated_count: 1 },
    qa_checks: {},
    product_truth: { ...context.product_truth, canonical_product_id: productId, title: 'Synthetic silver festival outfit', slug: 'synthetic-silver-festival-outfit', product_truth_source: 'seo_product_truth_v1', source_description_fragment: 'Synthetic configured outfit evidence for transaction tests.' },
  };
  return { candidate, draft, agentInput: { contract_version: 'seo_agent_input_v1', canonical_product_id: productId, product: draft.product_truth, manual_focus: context.manual_focus, metrics_status: draft.metrics_status } };
}
