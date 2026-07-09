export const THEFEYA_SEO_DOCTRINE_VERSION = 'thefeya_seo_doctrine_v1' as const;

export const THEFEYA_RESEARCH_RELOAD_CHECKPOINT = {
  checkpoint_id: 'reload_latest_research_before_apply_publish_v1',
  required_before_stage: 'apply_to_product_or_publish_readiness',
  admin_note_ru:
    'Перед финальным apply-to-product / publish-readiness нужно попросить у пользователя заново загрузить последние SEO research-файлы и обновить doctrine, если исследования изменили правила.',
  agent_note_en:
    'Before implementing the final apply-to-product or publish-readiness stage, stop and ask the owner to re-upload the latest SEO research files. Do not rely only on summarized memory for the final doctrine.',
} as const;

export const THEFEYA_SEO_DOCTRINE = {
  version: THEFEYA_SEO_DOCTRINE_VERSION,
  purpose:
    'Evidence-first SEO content intelligence for TheFEYA product pages before first indexation. This is not a simple description generator.',
  operating_principles: [
    'Product Truth, visual truth, validated keyword metrics, portfolio differentiation, human review, and QA gates outrank fast generation.',
    'Generated copy must map into the existing PDP layout instead of creating a separate content world.',
    'OpenAI generation creates review drafts only. It must not publish, apply product changes, change storefront tables, or write final metadata by itself.',
    'Admin UI labels can be Russian, but customer-facing product copy must be natural English en-US until a separate localization workflow exists.',
    'No fake metrics. Search volume, competition, and trend signals must come from validated data sources only.',
    'Before final apply-to-product or publish-readiness automation, reload the latest research files from the owner and update this doctrine if needed.',
  ],
  customer_copy_principles: [
    'The opening must sell the product identity and buyer benefit first: designer studio, authorial look, event impact, visual confidence, and product purpose.',
    'Do not start customer-facing copy as an image audit or inventory note. Avoid openings like: The image shows, The listed materials, The product is listed as, The main focus is, This costume includes.',
    'Explain components after the hook, not as the first sentence unless the product itself is only a component and the wording is still attractive.',
    'Keep copy commercial but calm: attractive, specific, human, not overhyped, not manipulative, not generic AI sales language.',
    'Avoid filler words and weak catalog phrases: Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection, Perfect for any occasion.',
    'Use clear, short sentences. Avoid keyword stuffing, doorway-page style copy, repeated phrase skeletons, and long chained keyword titles.',
    'Use the product as a designer costume/look, not as a picture being described to another analyst.',
  ],
  length_rules: {
    seo_title: '45-68 characters, one owned search angle, no Edition, no keyword dump.',
    h1: '45-82 characters, human-readable product name, close to product identity but not a stuffed title clone.',
    meta_description: '125-158 characters, product identity + differentiator + use case; not a visual inventory sentence.',
    intro: '2-4 concise sentences; hook, authorial design, buyer benefit, event/use case, then product facts.',
  },
  pdp_block_plan: [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      intent: 'Polished product description under the PDP gallery/buy box. This should be the main buyer-facing story.',
    },
    {
      block_key: 'whats_included',
      placement: 'right_info_panel',
      intent: 'Included components based only on product facts. If unsure, mark human review instead of inventing exclusions.',
    },
    {
      block_key: 'sizing_fit',
      placement: 'right_info_panel',
      intent: 'Size chart, adjustable straps, fit flexibility, and optional custom measurements if needed.',
    },
    {
      block_key: 'shipping_delivery',
      placement: 'right_info_panel',
      intent: 'Production timing, standard shipping, express shipping, and manager contact for a specific date or faster production discussion.',
    },
    {
      block_key: 'materials_care',
      placement: 'right_info_panel',
      intent: 'Materials from product truth first, then care instructions. Avoid overclaiming durability.',
    },
    {
      block_key: 'customization',
      placement: 'right_info_panel',
      intent: 'Separate from sizing: color/detail, length, coverage, combinations of existing designs, or custom design within TheFEYA style.',
    },
    {
      block_key: 'returns_exchanges',
      placement: 'right_info_panel',
      intent: 'Short policy-link style block, not full legal policy inside product copy.',
    },
    {
      block_key: 'handmade_variation',
      placement: 'right_info_panel',
      intent: 'Handmade variation and styled/AI image note only when necessary, phrased calmly and not as a main sales deterrent.',
    },
    {
      block_key: 'related_collections',
      placement: 'review_only',
      intent: 'Internal linking hints to future event/style/persona/collection landing pages, not automatic links yet.',
    },
  ],
  buyer_facts: [
    'Typical made-to-order production: 3-5 business days.',
    'If the buyer needs an item for a specific date or faster production, they should contact the manager; faster options can be discussed but are not guaranteed automatically.',
    'Standard shipping: about 10-14 business days. Express shipping: about 6-9 business days when available.',
    'Sizing: products usually include adjustable straps and fit flexibility. Buyers should still use the size chart. If they have an individual figure or worry about fit, they can send measurements to the manager and the item can be made to their measurements when the design supports it.',
    'Customization is separate from sizing: length, coverage, color/detail adjustments, combinations of existing TheFEYA designs, or custom design within TheFEYA style can be discussed. Do not promise unrelated styles.',
    'Materials: use product facts first. When supported, describe vegan leather with a glossy mirror/metallic finish. Do not duplicate leather and faux leather as if they are separate materials unless the source confirms both.',
    'Care: wipe clean by hand, avoid machine washing, avoid long-term heavy pressure in tight storage, hang or store carefully when possible.',
    'Color: use colors available in variant options first. Other colors can be discussed individually only if the design supports it.',
    'Returns/exchanges/cancellations: mention that details are available in the store policy link. Do not overload product copy with full policy text.',
    'Gift note/card can be mentioned only as an optional request, not as a main SEO angle.',
  ],
  faq_strategy: [
    'FAQ must reduce purchase hesitation, not explain obvious image features.',
    'Useful FAQ intents: production timing, shipping timing, sizing/custom measurements, materials/care, color options, customization, what is included, returns/exchanges policy link.',
    'Do not ask: What is the main focus of this image/product? Buyers can see the product.',
    'Keep answers concise and practical. Avoid anxiety, over-warnings, exaggerated durability promises, and legal blocks inside FAQ.',
  ],
  visual_truth_strategy: [
    'Use the primary image as visual evidence for component, silhouette, visible color, material impression, styling context, and mood.',
    'Keep visual_truth internal. Do not make intro/meta/body sound like a computer vision report.',
    'Map visible facts to approved TheFEYA DNA when possible, but keep observed facts, selected DNA, and open style suggestions separate.',
    'Allow open style suggestions if the image genuinely shows something useful that is not in current DNA, but keep it cautious and review-only unless approved keywords and product truth support it.',
    'ALT text must use visible product facts, not aspirational claims. If a fact is uncertain, mark needs_image_review.',
  ],
  style_boundaries: [
    'Allowed when supported: post-apocalyptic, warrior, futuristic, Burning Man, stage, festival, glam, cyber, reflective, armor, performance, desert-inspired, editorial.',
    'Steampunk is not a default synonym for futuristic, leather, gold, Burning Man, apocalyptic, or shoulder armor. Use it only with clear retro-futuristic Victorian/industrial cues such as gears, brass machinery, antique machinery aesthetics, Victorian silhouettes, or corsetry as the dominant style.',
    'Do not use external franchise, cosplay character, celebrity, or protected brand references unless they are safe and explicitly allowed by product data.',
  ],
  portfolio_strategy: [
    'For Google, similarity is a portfolio differentiation tool, not a marketplace traffic-share panic gate.',
    'Similar products can coexist if they own distinct search angles, title skeletons, first paragraphs, image ALT story, and PDP differentiators.',
    'Do not copy the nearest catalog match phrase order, H1 skeleton, title skeleton, or opening paragraph.',
    'Preserve useful cluster terms when they are genuinely relevant, but create a distinct product angle inside the same cluster.',
    'Only block when there is near-duplicate risk, product mismatch, or missing facts; otherwise mark needs_review with a clear differentiation strategy.',
  ],
} as const;

export function buildThefeyaSeoDoctrineSystemLines() {
  return [
    `TheFEYA SEO doctrine version: ${THEFEYA_SEO_DOCTRINE.version}.`,
    THEFEYA_SEO_DOCTRINE.purpose,
    ...THEFEYA_SEO_DOCTRINE.operating_principles,
    'Customer copy principles:',
    ...THEFEYA_SEO_DOCTRINE.customer_copy_principles,
    'Visual truth principles:',
    ...THEFEYA_SEO_DOCTRINE.visual_truth_strategy,
    'Style boundaries:',
    ...THEFEYA_SEO_DOCTRINE.style_boundaries,
    'Portfolio differentiation principles:',
    ...THEFEYA_SEO_DOCTRINE.portfolio_strategy,
    `Research reload checkpoint: ${THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en}`,
  ];
}

export function buildThefeyaSeoDoctrineUserLines() {
  return [
    `Doctrine source: ${THEFEYA_SEO_DOCTRINE.version}.`,
    'Use these buyer-facing facts when relevant, without inventing new promises:',
    ...THEFEYA_SEO_DOCTRINE.buyer_facts.map((item) => `- ${item}`),
    '',
    'Use this FAQ strategy:',
    ...THEFEYA_SEO_DOCTRINE.faq_strategy.map((item) => `- ${item}`),
    '',
    'Use this PDP block plan:',
    ...THEFEYA_SEO_DOCTRINE.pdp_block_plan.map((block) => `- ${block.block_key} → ${block.placement}: ${block.intent}`),
    '',
    `Future checkpoint: ${THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en}`,
    '',
  ];
}

export function buildThefeyaSeoDoctrineGuardrails() {
  return [
    `Doctrine ${THEFEYA_SEO_DOCTRINE.version} must be present before OpenAI generation.`,
    THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en,
    'Do not implement final apply-to-product, publish-readiness, sitemap mutation, or production indexation automation until the latest research files are reloaded and reconciled.',
    'Any future apply/publish UI must show this research reload checkpoint as a blocking prerequisite until the owner confirms the latest research has been reviewed.',
  ];
}

export function summarizeThefeyaSeoDoctrine() {
  return {
    version: THEFEYA_SEO_DOCTRINE.version,
    purpose: THEFEYA_SEO_DOCTRINE.purpose,
    research_reload_checkpoint: THEFEYA_RESEARCH_RELOAD_CHECKPOINT,
    pdp_block_count: THEFEYA_SEO_DOCTRINE.pdp_block_plan.length,
    buyer_fact_count: THEFEYA_SEO_DOCTRINE.buyer_facts.length,
    faq_rule_count: THEFEYA_SEO_DOCTRINE.faq_strategy.length,
    visual_truth_rule_count: THEFEYA_SEO_DOCTRINE.visual_truth_strategy.length,
  };
}
