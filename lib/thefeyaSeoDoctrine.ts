export const THEFEYA_SEO_DOCTRINE_VERSION = 'thefeya_seo_doctrine_v8' as const;

export const THEFEYA_RESEARCH_RELOAD_CHECKPOINT = {
  checkpoint_id: 'reload_latest_research_before_apply_publish_v1',
  required_before_stage: 'apply_to_product_or_publish_readiness',
  admin_note_ru: 'Перед финальным apply-to-product / publish-readiness нужно попросить у пользователя заново загрузить последние SEO research-файлы и обновить doctrine, если исследования изменили правила.',
  agent_note_en: 'Before implementing the final apply-to-product or publish-readiness stage, stop and ask the owner to re-upload the latest SEO research files. Do not rely only on summarized memory for the final doctrine.',
} as const;

export const THEFEYA_VARIATION_EDITING_CHECKPOINT = {
  checkpoint_id: 'unify_variations_included_components_pdp_sitemap_v1',
  required_before_stage: 'apply_to_product_or_catalog_scale_editing',
  admin_note_ru: 'Перед массовым применением SEO к товарам нужно спроектировать единый редактор, где вариации, комплектация, PDP-блоки, slug/meta и sitemap не живут в разных мирах.',
  agent_note_en: 'Before catalog-scale apply-to-product editing, design one canonical editing flow for product variations, included components, PDP blocks, slug/meta data, and sitemap updates. Do not split those facts across disconnected systems.',
} as const;

export const THEFEYA_BRAND_VALUE_PILLARS = [
  'Studio-created design based on an original in-house concept, not a copied mass-market costume template.',
  'A strong stage and camera silhouette that supports a memorable visual identity for performers, creators and public-facing buyers.',
  'Visual impact may be described as designed to stand out, photograph clearly, become more memorable and support greater shareability or organic attention. Never guarantee likes, followers, popularity, sales, press coverage or audience reactions.',
  'Adjustable straps, standard sizing and custom measurements are canonical studio facts for the fixed right PDP panel.',
  'Comfort, softness against the body, reinforcement, durability and shape retention may be described only when supported by actual material and construction evidence.',
  'Handmade and made-to-order value must explain studio craft, fit or purposeful construction. It must not repeat the same originality argument in different words.',
  'The studio can discuss selected changes while preserving its distinctive visual language; operational customization details belong only in the fixed right PDP panel.',
] as const;

function rightPanelBlock(block_key: string, heading: string, lines: readonly string[]) {
  return {
    block_key,
    heading,
    lines,
    body: lines.join('\n'),
  };
}

export const THEFEYA_CANONICAL_RIGHT_PDP_PANEL = [
  rightPanelBlock('sizing_fit', 'Sizing & fit', [
    'Use our size chart to choose your standard size.',
    'Our pieces are easy to adjust with straps for a comfortable, secure fit.',
    'For custom measurements or a special fit request, leave a note with your order or contact us before production.',
  ]),
  rightPanelBlock('production_timing', 'Production time', [
    'Standard made-to-order production usually takes 3-5 business days.',
    'Need it sooner? Contact us before ordering to discuss rush production.',
  ]),
  rightPanelBlock('shipping_delivery', 'Shipping & delivery', [
    'Standard shipping: 10-14 business days.',
    'Express shipping: 6-9 business days.',
  ]),
  rightPanelBlock('material', 'Material', [
    'We use durable vegan leather with a glossy mirror-like coating.',
    'The material feels comfortable against the body and helps the piece keep its sculptural shape.',
  ]),
  rightPanelBlock('care', 'Care', [
    'Stains and surface marks are easy to remove with alcohol wipes or a mild cleaning product. Wipe the piece carefully by hand.',
    'Machine washing is not recommended.',
    'Store the piece carefully, preferably on a hanger, and avoid tight folding or long-term heavy pressure so it keeps its shape.',
  ]),
  rightPanelBlock('customization', 'Made to order & customization', [
    'Need an individual change? Contact us before production.',
    'We can discuss adjustments to color, size, length, fit, coverage or selected details while keeping the result within our studio style.',
  ]),
] as const;

export const THEFEYA_SEO_DOCTRINE = {
  version: THEFEYA_SEO_DOCTRINE_VERSION,
  purpose: 'Evidence-first SEO content intelligence for TheFEYA product pages before first indexation. This is not a simple description generator.',
  operating_principles: [
    'Product Truth, visual truth, validated keyword metrics, portfolio differentiation, human review and QA gates outrank fast generation.',
    'Generated copy must map into the existing PDP layout instead of creating a separate content world.',
    'OpenAI generation creates review drafts only. It must not publish, apply product changes, change storefront tables or write final metadata by itself.',
    'Admin UI labels can be Russian, but customer-facing product copy must be natural English en-US until a separate localization workflow exists.',
    'No fake metrics. Search volume, competition and trend signals must come from validated data sources only.',
    'Before final apply-to-product or publish-readiness automation, reload the latest research files from the owner and update this doctrine if needed.',
    'Product variations, included components, PDP text blocks, slug/meta data and future sitemap updates must be handled by one canonical product editing flow, not by disconnected one-off text patches.',
    'The existing storefront PDP is the visual source of truth. Admin previews must reuse its structure, spacing, order, icons and interaction patterns rather than imitate it in a parallel component.',
    'The complete right PDP information panel is immutable canonical storefront copy. OpenAI must never generate, rewrite, paraphrase or reorder it.',
    'What’s included is a separate dynamic storefront block rendered only from confirmed configuration mapping. It is not part of the fixed copy and is never written by OpenAI.',
    'The canonical admin review destination is the existing SEO storefront preview. Temporary generation routes must redirect into that workspace instead of creating parallel screens.',
  ],
  brand_value_pillars: THEFEYA_BRAND_VALUE_PILLARS,
  customer_copy_principles: [
    'Describe the product first. The brand name must not become the main repeated keyword of a product page.',
    'Do not place TheFEYA in seo_title, H1 or meta_description. Across intro and all generated left-description blocks combined, use the brand name no more than once.',
    'Prefer the single permitted TheFEYA mention inside the final Designed for self-expression paragraph, where the studio speaks directly as we and our, never as they, their or a third-party narrator.',
    'The Russian concept авторский дизайн should be expressed in natural English as a studio-created design based on an original in-house concept, a signature studio design or a design created in our studio. Do not rely on the vague phrase original design by itself.',
    'The opening must sell product identity and buyer benefit first: silhouette, use case, visual confidence and supported product properties.',
    'Do not start customer-facing copy as an image audit, inventory note or source-data disclaimer. Avoid openings like The image shows, The listed materials, The product description says, The source lists, Product Truth confirms or The safest wording is.',
    'Never write customer copy as if reporting database fields to an analyst. Never mention official product data, verification before publication, review status, source rows or internal uncertainty in buyer-facing text.',
    'Keep copy commercial but calm: attractive, specific and human, without generic AI sales language or empty pseudo-benefits.',
    'Avoid filler words and weak catalog phrases: Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection and Perfect for any occasion.',
    'Use clear, short sentences. Avoid keyword stuffing, doorway-page copy, repeated phrase skeletons and long chained keyword titles.',
    'Main PDP copy must remain product-specific and concise. Required generated left-description order: About this piece, Why you’ll love it, Ideal for, Designed for self-expression.',
    'Why you’ll love it must contain 3-5 genuinely different purchase reasons. A design-authorship point and a handmade-not-mass-produced point count as the same idea and must not appear as separate duplicate bullets.',
    'Weak styling filler is not a benefit. Do not use works over minimal clothing, easy to build into a look, part of a complete look, creates a clear accent, works as a centerpiece or without additional design elements.',
    'Material and finish claims must sound final and buyer-facing. When supported, explain vegan or faux leather, softness against the body, reinforcement, shape retention and a glossy mirror-like finish. Never describe the process of deciding which wording is safe.',
    'Never promise that a buyer will receive likes, followers, popularity, viral reach, sales, press attention or guaranteed reactions. Safe language may say that a recognizable visual identity can make photos, performances and social content more memorable and shareable, supporting organic attention, reactions, saves and comments.',
    'The final Designed for self-expression block is about our studio, our young independent design team, our original in-house ideas, our distinctive style, self-expression and how we help buyers build a memorable visual identity.',
    'The same block may mention that our store offers a broad range of outfits for festivals, performances, photoshoots and other events, and that buyers can choose a design matching their style or discuss a new idea with us.',
    'Do not place operational customization details such as changing color, size, length, fit or coverage inside Designed for self-expression. Those facts belong only in the fixed right panel.',
  ],
  length_rules: {
    seo_title: '45-68 characters, one owned search angle, no brand-name padding, no Edition and no keyword dump.',
    h1: '45-82 characters, human-readable product name, close to product identity but not a stuffed title clone.',
    meta_description: '125-158 characters, product identity plus differentiator and use case; not a visual inventory sentence or brand repetition.',
    intro: '2-4 concise sentences; product hook, buyer benefit, event/use case and supported facts.',
    main_description: '180-320 words across generated left-description blocks before final trim. It must be readable, specific and free of repeated arguments.',
  },
  pdp_block_plan: [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      intent: 'Opening product story under the gallery and buy box. Lead with the product silhouette, use case and buyer benefit. Weave supported material and finish facts into this block naturally instead of creating an audit-style material report.',
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      intent: 'Write 3-5 concise benefit bullets with genuinely different supported categories: studio-created concept, stage/camera presence, adjustable fit, body comfort, reinforced durability or shape retention, and reflective finish. Use no more than one design-or-handmade uniqueness bullet.',
    },
    {
      block_key: 'ideal_for',
      placement: 'left_description',
      intent: 'Use-case bullets based on approved DNA, validated keywords and visual truth: Burning Man, festival, stage, photoshoot, performer, DJ, dancer or editorial looks when supported. Do not invent unrelated audiences.',
    },
    {
      block_key: 'main_description',
      placement: 'left_description',
      intent: 'Heading must be Designed for self-expression. Speak directly in first person as TheFEYA: we, our studio, our team and our work. Explain that we are a young independent team of designers and makers creating bold outfits from original in-house ideas and a distinctive visual language. Show how we help buyers express individuality and build a recognizable visual identity for festivals, stage, camera and social content. You may say that a strong look can become more memorable and shareable and can support organic attention, reactions, saves and comments, without guaranteeing outcomes. Mention the breadth of our store across festivals, performances, photoshoots and other events, and invite the buyer to choose a design matching their style or discuss a new idea with us. Do not mention changing color, size, length, fit, coverage or other operational customization details here.',
    },
    {
      block_key: 'related_collections',
      placement: 'review_only',
      intent: 'Internal linking hints to future event, style, persona or collection landing pages, not automatic links yet.',
    },
  ],
  right_panel_policy: [
    'THEFEYA_CANONICAL_RIGHT_PDP_PANEL is one fixed immutable source for both live PDP and admin preview.',
    'OpenAI must never generate, rewrite, paraphrase, translate, reorder or append any right-panel block.',
    'What’s included is the first dynamic right-panel block only when confirmed configuration data exists. Hide it when component or public-label truth is unresolved; never invent filler contents.',
    'What’s included comes from approved configuration and component mapping data for the currently selected option.',
    'Sizing & fit, Production time, Shipping & delivery, Material, Care and Made to order & customization are fixed canonical blocks and identical for all products.',
    'Returns, exchanges and cancellation copy is not repeated in the quick right panel because policy links already exist under the purchase controls.',
    'Product-specific material nuances, visible style, event angle and benefits belong in the generated left description.',
  ],
  buyer_facts: [
    'Typical made-to-order production: 3-5 business days.',
    'For rush production or an earlier dispatch date, the buyer should contact the studio before ordering.',
    'Standard shipping: 10-14 business days. Express shipping: 6-9 business days.',
    'Sizing: use the size chart. The studio’s pieces are easy to adjust with straps. Custom measurements or a special fit request can be left with the order or discussed before production.',
    'Customization is separate from generated product copy: color, size, detail, length, coverage and fit changes can be discussed in the fixed right panel while keeping the result within the studio style.',
    'Material: durable vegan leather with a glossy mirror-like coating, comfortable against the body and supportive of the sculptural shape.',
    'Care: stains and surface marks are easy to remove with alcohol wipes or mild cleaning products. Wipe by hand, avoid machine washing, tight folded storage and long-term heavy pressure.',
    'Returns, exchanges and cancellations are available through the store-policy links under the purchase controls and are not duplicated in the quick right panel.',
    'Gift note or card can be mentioned only as an optional request, not as a main SEO angle.',
    'Included components come from approved configuration mapping and are rendered by the storefront right panel, not invented by the model.',
    ...THEFEYA_BRAND_VALUE_PILLARS,
  ],
  faq_strategy: [
    'Product PDP should not show a separate FAQ block by default because it duplicates the right information panel and global store FAQ.',
    'The top-level faq array in seo_agent_output_v1 should normally be empty or contain review-only suggestions for future global FAQ, not rendered inside the PDP.',
    'Useful global FAQ intents later: production timing, shipping timing, sizing and custom measurements, materials and care, color options, customization and the returns policy link.',
    'Do not ask What is included in the order as a generic FAQ because each configuration has different included components and this belongs in the dynamic right panel.',
    'Do not ask What is the main focus of this image or product. Buyers can see the product.',
  ],
  visual_truth_strategy: [
    'Use the primary image as visual evidence for component, silhouette, visible color, material impression, styling context and mood.',
    'Keep visual_truth internal. Do not make intro, meta or body sound like a computer-vision report.',
    'Map visible facts to approved product DNA when possible, but keep observed facts, selected DNA and open style suggestions separate.',
    'Allow open style suggestions if the image genuinely shows something useful that is not in current DNA, but keep it cautious and review-only unless approved keywords and product truth support it.',
    'ALT text must use visible product facts, not aspirational claims. If a fact is uncertain, mark needs_image_review.',
    'Styled accessories, face coverings, capes, props, background scenery and model styling must not be described as part of the sold product unless Product Truth confirms they are included.',
  ],
  style_boundaries: [
    'Allowed when supported: post-apocalyptic, warrior, futuristic, Burning Man, stage, festival, glam, cyber, reflective, armor, performance, desert-inspired and editorial.',
    'Steampunk is not a default synonym for futuristic, leather, gold, Burning Man, apocalyptic or shoulder armor. Use it only with clear retro-futuristic Victorian or industrial cues such as gears, brass machinery, antique machinery aesthetics, Victorian silhouettes or corsetry as the dominant style.',
    'Do not use external franchise, cosplay character, celebrity or protected brand references unless they are safe and explicitly allowed by product data.',
  ],
  portfolio_strategy: [
    'For Google, similarity is a portfolio differentiation tool, not a marketplace traffic-share panic gate.',
    'Similar products can coexist if they own distinct search angles, title skeletons, first paragraphs, image ALT stories and PDP differentiators.',
    'Do not copy the nearest catalog match phrase order, H1 skeleton, title skeleton or opening paragraph.',
    'Preserve useful cluster terms when genuinely relevant, but create a distinct product angle inside the same cluster.',
    'Only block when there is near-duplicate risk, product mismatch or missing facts; otherwise mark needs_review with a clear differentiation strategy.',
  ],
} as const;

export function buildThefeyaSeoDoctrineSystemLines() {
  return [
    `TheFEYA SEO doctrine version: ${THEFEYA_SEO_DOCTRINE.version}.`,
    THEFEYA_SEO_DOCTRINE.purpose,
    ...THEFEYA_SEO_DOCTRINE.operating_principles,
    'Brand value pillars:',
    ...THEFEYA_SEO_DOCTRINE.brand_value_pillars,
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
    ...THEFEYA_SEO_DOCTRINE.buyer_facts,
    'Required generated PDP block plan:',
    ...THEFEYA_SEO_DOCTRINE.pdp_block_plan.map((block) => `${block.block_key} (${block.placement}): ${block.intent}`),
    'Right panel policy:',
    ...THEFEYA_SEO_DOCTRINE.right_panel_policy,
    `Research checkpoint: ${THEFEYA_RESEARCH_RELOAD_CHECKPOINT.agent_note_en}`,
    `Variation/data checkpoint: ${THEFEYA_VARIATION_EDITING_CHECKPOINT.agent_note_en}`,
  ];
}

export function buildThefeyaSeoDoctrineGuardrails() {
  return [
    `Doctrine version must be visible in readiness/debug output: ${THEFEYA_SEO_DOCTRINE.version}.`,
    'Do not generate or overwrite final product data until the research reload checkpoint has been cleared by the owner.',
    'Do not split product facts between disconnected variation, included-components, PDP-copy, slug/meta and sitemap flows.',
    'Use the live storefront PDP component as the visual source of truth for admin preview.',
    'Treat the complete right PDP panel as immutable code-owned storefront content.',
    'Do not generate, paraphrase, reorder or append any right-panel block.',
    'Render What’s included only from confirmed configuration mapping, and hide it when unresolved.',
    'Do not output product FAQ inside PDP by default.',
    'Do not present visual analysis, Product Truth diagnostics, source wording or review instructions as buyer-facing sales copy.',
    'Do not use the brand name as a repeated product keyword.',
    'Do not use weak styling filler or duplicate originality arguments as Why you’ll love it benefits.',
    'Designed for self-expression must use first-person studio voice and explain buyer self-expression, not third-person narration or repeated product specifications.',
    'Do not guarantee popularity, likes, followers, viral reach, sales or audience reactions. Non-guaranteed language about memorability, shareability and organic attention is allowed.',
    'Do not use steampunk unless visual and product evidence clearly support it.',
  ];
}

export function summarizeThefeyaSeoDoctrine() {
  return {
    version: THEFEYA_SEO_DOCTRINE.version,
    pdp_block_count: THEFEYA_SEO_DOCTRINE.pdp_block_plan.length,
    right_panel_block_count: THEFEYA_CANONICAL_RIGHT_PDP_PANEL.length,
    buyer_fact_count: THEFEYA_SEO_DOCTRINE.buyer_facts.length,
    brand_value_pillar_count: THEFEYA_BRAND_VALUE_PILLARS.length,
    visual_truth_rule_count: THEFEYA_SEO_DOCTRINE.visual_truth_strategy.length,
    research_reload_checkpoint: THEFEYA_RESEARCH_RELOAD_CHECKPOINT,
    variation_editing_checkpoint: THEFEYA_VARIATION_EDITING_CHECKPOINT,
  };
}
