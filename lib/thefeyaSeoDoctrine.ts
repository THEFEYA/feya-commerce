export const THEFEYA_SEO_DOCTRINE_VERSION = 'thefeya_seo_doctrine_v4' as const;

export const THEFEYA_RESEARCH_RELOAD_CHECKPOINT = {
  checkpoint_id: 'reload_latest_research_before_apply_publish_v1',
  required_before_stage: 'apply_to_product_or_publish_readiness',
  admin_note_ru:
    'Перед финальным apply-to-product / publish-readiness нужно попросить у пользователя заново загрузить последние SEO research-файлы и обновить doctrine, если исследования изменили правила.',
  agent_note_en:
    'Before implementing the final apply-to-product or publish-readiness stage, stop and ask the owner to re-upload the latest SEO research files. Do not rely only on summarized memory for the final doctrine.',
} as const;

export const THEFEYA_VARIATION_EDITING_CHECKPOINT = {
  checkpoint_id: 'unify_variations_included_components_pdp_sitemap_v1',
  required_before_stage: 'apply_to_product_or_catalog_scale_editing',
  admin_note_ru:
    'Перед массовым применением SEO к товарам нужно спроектировать единый редактор, где вариации, комплектация, PDP-блоки, slug/meta и sitemap не живут в разных мирах.',
  agent_note_en:
    'Before catalog-scale apply-to-product editing, design one canonical editing flow for product variations, included components, PDP blocks, slug/meta data, and sitemap updates. Do not split those facts across disconnected systems.',
} as const;

export const THEFEYA_CANONICAL_RIGHT_PDP_PANEL = [
  {
    block_key: 'sizing_fit',
    heading: 'Sizing & fit',
    body:
      'Use the size chart in the product photos to choose your size. Most TheFEYA pieces adjust with straps, so the fit can be fine-tuned on the body. For custom measurements or a special fit request, leave a note with your order or contact the manager.',
  },
  {
    block_key: 'production_timing',
    heading: 'Production time',
    body:
      'Made-to-order production usually takes 3-5 business days. If you need the piece for a specific date or want priority production, contact the manager in advance so timing can be discussed.',
  },
  {
    block_key: 'shipping_delivery',
    heading: 'Shipping & delivery',
    body: 'Standard shipping takes about 10-14 business days. Express shipping takes about 6-9 business days.',
  },
  {
    block_key: 'care',
    heading: 'Care',
    body:
      'The piece is easy to clean by hand with alcohol wipes or mild cleaning products. Prefer not to machine wash. Store carefully, ideally hanging, and avoid long-term heavy pressure so it keeps its shape for years.',
  },
  {
    block_key: 'customization',
    heading: 'Customization',
    body:
      'Sizing is separate from design customization. Different colors, detail changes, shorter or longer elements, more open or more covered versions, combinations of existing TheFEYA designs, or a custom design within TheFEYA style can be discussed.',
  },
  {
    block_key: 'returns_exchanges',
    heading: 'Returns & exchanges',
    body: 'For cancellation, return, and exchange details, use the store policy link.',
  },
  {
    block_key: 'handmade_variation',
    heading: 'Handmade variation',
    body:
      'Every piece is handmade individually, so small natural differences in finish, shape, or shade can appear within normal handmade tolerance.',
  },
] as const;

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
    'Product variations, included components, PDP text blocks, slug/meta data, and future sitemap updates must be handled by one canonical product editing flow, not by disconnected one-off text patches.',
    'Do not tell the buyer to clarify standard included components with the manager when components are present in variations or source description. That destroys trust and conversion.',
    'The right PDP panel is canonical brand/store policy content and should not be regenerated uniquely by OpenAI for every product. OpenAI owns the left product-specific description, SEO fields, visual truth, ALT candidates, and review-only linking hints.',
  ],
  customer_copy_principles: [
    'The opening must sell the product identity and buyer benefit first: designer studio, authorial look, event impact, visual confidence, and product purpose.',
    'Do not start customer-facing copy as an image audit or inventory note. Avoid openings like: The image shows, The listed materials, The product is listed as, The main focus is, This costume includes.',
    'Never write customer copy as if reporting database fields to an analyst. Avoid phrases like listed as, indicated as, specified as, if available, when available, when supported, confirm before ordering, clarify before ordering, or ask the manager what is included.',
    'Explain components after the hook, not as the first sentence unless the product itself is only a component and the wording is still attractive.',
    'Keep copy commercial but calm: attractive, specific, human, not overhyped, not manipulative, not generic AI sales language.',
    'Avoid filler words and weak catalog phrases: Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection, Perfect for any occasion.',
    'Use clear, short sentences. Avoid keyword stuffing, doorway-page style copy, repeated phrase skeletons, and long chained keyword titles.',
    'Use the product as a designer costume/look, not as a picture being described to another analyst.',
    'Main PDP description must be substantial enough to review: a short intro alone is not enough. Use structured sections similar to strong Etsy descriptions only where they improve clarity: why you will like it, ideal for, what is included, material/finish, sizing notes when product-specific, and event/styling value.',
  ],
  length_rules: {
    seo_title: '45-68 characters, one owned search angle, no Edition, no keyword dump.',
    h1: '45-82 characters, human-readable product name, close to product identity but not a stuffed title clone.',
    meta_description: '125-158 characters, product identity + differentiator + use case; not a visual inventory sentence.',
    intro: '2-4 concise sentences; hook, authorial design, buyer benefit, event/use case, then product facts.',
    main_description: '220-420 words across left_description PDP blocks before final trim. It must be readable, scannable, and not overstuffed.',
  },
  pdp_block_plan: [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      intent: 'Opening story under the PDP gallery/buy box. Lead with design value, event impact, use case, and buyer benefit before product facts.',
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      intent: 'Short scannable buyer-benefit bullets. Example angles: handmade-to-order, light but strong, adjustable straps when visible/known, bold reflective/mirror effect, strong content/event presence. Do not repeat generic hype.',
    },
    {
      block_key: 'ideal_for',
      placement: 'left_description',
      intent: 'Use-case bullets based on approved DNA and visual truth: Burning Man, festival, stage, photoshoot, performer/DJ/dancer/editorial looks when supported. Do not invent unrelated audiences.',
    },
    {
      block_key: 'whats_included',
      placement: 'left_description',
      intent: 'Included components based on product variations and/or original Etsy source text. Do not send the buyer to clarify standard included components with a manager. If source data is missing, mark needs_human_review internally but keep the buyer-facing body neutral and non-alarming.',
    },
    {
      block_key: 'material',
      placement: 'left_description',
      intent: 'Product-specific material and finish block in the main text. For supported products: vegan/faux leather with a glossy mirror coating or glossy metallic coating, soft against the body, reinforced/doubled for structure and shape retention. Do not say textured leather or structural texture for glossy mirror products.',
    },
    {
      block_key: 'related_collections',
      placement: 'review_only',
      intent: 'Internal linking hints to future event/style/persona/collection landing pages, not automatic links yet.',
    },
  ],
  right_panel_policy: [
    'Right PDP panel is canonical and reused across products. Do not ask OpenAI to generate unique right-panel copy for every product.',
    'Right panel may be edited manually as a brand/store policy component, but it is not part of per-product SEO generation.',
    'Product-specific composition, material nuances, visible style, event angle, and benefits belong in left_description blocks.',
  ],
  buyer_facts: [
    'Typical made-to-order production: 3-5 business days.',
    'If the buyer needs the item for a specific date or wants priority production, they should contact the manager in advance; faster production can be discussed.',
    'Standard shipping: about 10-14 business days. Express shipping: about 6-9 business days.',
    'Sizing: each product has a size chart. Buyers should use the size chart to choose a size, but most TheFEYA pieces include adjustable straps, so exact measurements do not need to be perfect. Custom measurements are available via order notes or manager contact for unusual body shapes or special fit requests.',
    'Customization is separate from sizing: different color, detail changes, shorter/longer elements, more open or more covered versions, combinations of existing TheFEYA designs, or custom design within TheFEYA style can be discussed. Do not promise unrelated styles.',
    'Materials: use product facts first. When supported, describe vegan/faux leather with a glossy mirror coating or glossy metallic coating, reinforced/doubled for structure and shape retention, and a soft body-facing side. Do not write listed as, indicated as, textured leather, or structural texture in customer-facing copy.',
    'Care: the item is easy to clean by hand with alcohol wipes or mild cleaning products. Prefer not to machine wash. Avoid long-term heavy pressure, tight folded storage, or placing heavy objects on it. Hanging or careful storage helps keep its shape and serve for years.',
    'Color: use colors available in variant options first. Other colors can be discussed individually when the design can support them.',
    'Returns/exchanges/cancellations: mention that details are available in the store policy link. Do not overload product copy with full policy text.',
    'Gift note/card can be mentioned only as an optional request, not as a main SEO angle.',
    'Included components should come from variations, product configuration, or original Etsy source text. Do not ask the buyer to clarify normal components before ordering.',
  ],
  faq_strategy: [
    'Product PDP should not show a separate FAQ block by default because it duplicates the right information panel and global store FAQ.',
    'The top-level faq array in seo_agent_output_v1 should normally be empty or review-only suggestions for future global FAQ, not rendered inside the product tile/PDP.',
    'Useful global FAQ intents later: production timing, shipping timing, sizing/custom measurements, materials/care, color options, customization, returns/exchanges policy link.',
    'Do not ask: What is included in the order? as a generic FAQ because each product has different included components and this belongs in the product description/variations.',
    'Do not ask: What is the main focus of this image/product? Buyers can see the product.',
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
    'Right PDP panel policy:',
    ...THEFEYA_SEO_DOCTRINE.right_panel_policy,
    'Visual truth principles:',
    ...THEFEYA_SEO_DOCTRINE.visual_truth_strategy,
    'Style boundaries:',
    ...THEFEYA_SEO_DOCTRINE.style_boundaries,
    'Portfolio differentiation principles:',
    ...THEFEYA_SEO_DOCTRINE.portfolio_strategy,
    `Research reload checkpoint: ${THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en}`,
    `Variation editing checkpoint: ${THEFEYA_VARIATION_EDITING_CHECKPOINT.agent_note_en}`,
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
    'Use this PDP block plan for AI-owned generated content:',
    ...THEFEYA_SEO_DOCTRINE.pdp_block_plan.map((block) => `- ${block.block_key} → ${block.placement}: ${block.intent}`),
    '',
    'Do not generate right_info_panel blocks. The canonical right panel is fixed by the storefront system:',
    ...THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => `- ${block.heading}: ${block.body}`),
    '',
    `Future checkpoint: ${THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en}`,
    `Future variation/editing checkpoint: ${THEFEYA_VARIATION_EDITING_CHECKPOINT.agent_note_en}`,
    '',
  ];
}

export function buildThefeyaSeoDoctrineGuardrails() {
  return [
    `Doctrine ${THEFEYA_SEO_DOCTRINE.version} must be present before OpenAI generation.`,
    THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en,
    THEFEYA_VARIATION_EDITING_CHECKPOINT.agent_note_en,
    'Do not implement final apply-to-product, publish-readiness, sitemap mutation, or production indexation automation until the latest research files are reloaded and reconciled.',
    'Any future apply/publish UI must show this research reload checkpoint as a blocking prerequisite until the owner confirms the latest research has been reviewed.',
    'Any future catalog-scale editing UI must keep variations, included components, PDP blocks, slug/meta, and sitemap updates in one canonical flow.',
    'Do not render top-level faq as a product PDP FAQ block by default; product-specific details must live in PDP sections and global FAQ belongs outside the product tile.',
    'Do not let OpenAI generate unique right_info_panel blocks for each product. The right panel is canonical static PDP content.',
  ];
}

export function summarizeThefeyaSeoDoctrine() {
  return {
    version: THEFEYA_SEO_DOCTRINE.version,
    purpose: THEFEYA_SEO_DOCTRINE.purpose,
    research_reload_checkpoint: THEFEYA_RESEARCH_RELOAD_CHECKPOINT,
    variation_editing_checkpoint: THEFEYA_VARIATION_EDITING_CHECKPOINT,
    pdp_block_count: THEFEYA_SEO_DOCTRINE.pdp_block_plan.length,
    canonical_right_panel_count: THEFEYA_CANONICAL_RIGHT_PDP_PANEL.length,
    buyer_fact_count: THEFEYA_SEO_DOCTRINE.buyer_facts.length,
    faq_rule_count: THEFEYA_SEO_DOCTRINE.faq_strategy.length,
    visual_truth_rule_count: THEFEYA_SEO_DOCTRINE.visual_truth_strategy.length,
  };
}
