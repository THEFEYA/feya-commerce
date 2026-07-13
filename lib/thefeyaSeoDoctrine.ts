export const THEFEYA_SEO_DOCTRINE_VERSION = 'thefeya_seo_doctrine_v14' as const;

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
  'TheFEYA is an independent team of designers and makers with a fresh point of view on festival, stage and performance fashion. Never describe the team as small or use company size as a selling point.',
  'Original studio design matters because our different design ideas help buyers find a piece that feels true to their own style and build a bold, recognizable look around it. State that buyer value directly without comparisons to standard templates, generic costumes or mass production.',
  'The studio helps people express individuality through clothing. It is safe to say that a supported design is made to stand out at a festival, on stage or in photographs; never promise compliments, likes, followers, virality or universal attention.',
  'A strong stage and camera silhouette may support a memorable visual identity for performers, creators and public-facing buyers when the product and selected use cases support it.',
  'Describe visual impact through observable product qualities and supported use cases. Do not mention algorithms, organic attention, reactions, saves, comments or social metrics in product copy.',
  'Adjustable straps, standard sizing and custom measurements are canonical studio facts for the fixed right PDP panel.',
  'Comfort, softness against the body, reinforcement, durability and shape retention may be described only when supported by actual material and construction evidence.',
  'Handmade and made-to-order value must explain studio craft, fit or purposeful construction. It must not repeat the same originality argument in different words.',
  'The studio can discuss selected changes while preserving its distinctive visual language; operational customization details belong only in the fixed right PDP panel.',
] as const;

export const THEFEYA_BENEFIT_GENERATION_POLICY = [
  'Why you’ll love it is a purchase-decision block, not a second description and not an SEO keyword container.',
  'Write 3-4 bullets. Never invent a fifth bullet merely to fill space.',
  'Every bullet must connect one supported feature or studio truth to a useful buyer outcome. Use the mental test: feature or proof -> so what changes for the buyer.',
  'Use at least three distinct value families when evidence exists: distinctive studio design; easy dressing or adjustment; body comfort; structure, shape retention or durability; verified finish behavior.',
  'Include exactly one design-authorship benefit. State the real buyer value directly: our original design ideas give the buyer a distinctive piece they can use to build a festival or stage look that feels personal. Do not compare it with a standard template, generic costume or mass production.',
  'Prefer practical buyer concerns over abstract art criticism: quick to put on, easier to adjust, comfortable against the body, keeps its shape between wears, remains useful for future events, or has a verified light-catching finish.',
  'A style, event, persona or audience is a use case for Ideal for, not a purchase benefit. Do not use works for warrior, futuristic or desert styling as a Why bullet.',
  'A visual observation is not automatically a benefit. Contrast, visual depth, dramatic line, armored presence, attitude, mood and individual feel are too abstract unless tied to a concrete buyer outcome.',
  'Never describe shape retention as keeping its form during movement. Explain the useful result literally: the supported material or layered construction helps the piece keep its shape between wears, resist creasing or remain reusable for future events.',
  'If construction, structure or build appears in more than one Why bullet, rewrite the block. Different wording for the same construction idea is not benefit diversity.',
  'Do not describe dark clothing, goggles, masks, props, background scenery or other styling as a property or advantage of the sold product.',
  'The fixed right panel may provide evidence, but do not copy its wording. Translate supported operational facts into a concise outcome, such as quick adjustment, easier dressing or shape retention.',
  'Do not force primary or secondary keywords into Why you’ll love it. Place product queries naturally in title, H1, meta, intro or About this piece; preserve the benefit block for conversion clarity.',
  'Comparative price, tax, discount, bulk-order, service-quality, assortment and delivery-superiority claims are store-level promises. Do not generate them in a product benefit block without a separate approved policy and evidence source.',
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
    'For custom measurements or a special fit request, add the details to your order note.',
  ]),
  rightPanelBlock('production_timing', 'Production time', [
    'Standard made-to-order production usually takes 3-5 business days.',
    'Need it sooner? Ask about rush production before ordering.',
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
    'For an individual change, contact us before production.',
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
    'Translate the idea of авторский дизайн into a concrete customer benefit rather than a literal internal-process phrase. Explain what is distinctive about the supported silhouette, construction or design language; omit the point when no product-specific value can be stated.',
    'The opening must begin with the buyer job: the event, style or complete look the person is trying to create. Then explain how this product helps achieve it using supported product facts.',
    'Directional image-audit details such as left, right, positioned high, visible from the front or clearly visible belong only in image ALT or internal visual truth. Do not use them in SEO title, H1, meta description, intro, About, Why, Ideal for or Designed for self-expression.',
    'Do not turn anatomical geometry into a customer benefit. Phrases such as sculptural profile of the left shoulder, expressive upper-body form, upper-body line and shoulder silhouette describe coordinates, not a reason to buy.',
    'Event words must describe a real use case, not an invented atmosphere. Ban desert light, open light, desert-ready and ready for the desert from customer copy.',
    'Do not start customer-facing copy as an image audit, inventory note or source-data disclaimer. Avoid openings like The image shows, The listed materials, The product description says, The source lists, Product Truth confirms or The safest wording is.',
    'Never write customer copy as if reporting database fields to an analyst. Never mention official product data, verification before publication, review status, source rows or internal uncertainty in buyer-facing text.',
    'Keep copy commercial but calm: attractive, specific and human, without generic AI sales language or empty pseudo-benefits.',
    'Avoid filler words and weak catalog phrases: Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection and Perfect for any occasion.',
    'Use clear, short sentences. Avoid keyword stuffing, doorway-page copy, repeated phrase skeletons and long chained keyword titles.',
    'Do not expand a clear product name merely to reach a character target. H1 should name the primary product entity once and add only a different, verified attribute or use case.',
    'Close keyword variants belong to one semantic cluster. They do not all need exact-match placement, and two near-synonymous product queries must not be stacked in one sentence or bullet.',
    'The operator-selected event, style, persona and audience axes control use-case coverage. Ideal for must represent at least one selected value from every non-empty axis, while Product Truth vetoes incompatible or unsupported contexts.',
    'Do not mix different visual worlds simply to place more terms. Cyberpunk is not steampunk, and a high-volume but incompatible style is not a valid secondary angle.',
    'Every sentence must add a product fact, a supported buyer outcome or a distinct use case. Delete sentences that only describe an abstract mood, presence, focal point or intentional look.',
    'Main PDP copy must remain product-specific and concise. Required generated left-description order: About this piece, Why you’ll love it, Ideal for, Designed for self-expression.',
    'Why you’ll love it must contain 3-4 genuinely different purchase reasons. A design-authorship point and a handmade-not-mass-produced point count as the same idea and must not appear as separate duplicate bullets.',
    'Weak styling filler is not a benefit. Do not use works over minimal clothing, easy to build into a look, part of a complete look, creates a clear accent, works as a centerpiece or without additional design elements.',
    'Material and finish claims must come from product-specific Product Truth or verified image truth. Vegan leather and faux leather are synonyms in customer copy and must never be stacked as two materials. Reflective or retroreflective is not a synonym for glossy, mirror-like, metallic or light-catching.',
    'Never promise or discuss likes, followers, popularity, viral reach, organic attention, reactions, saves, comments, sales, press attention or other social-performance outcomes.',
    'The final Designed for self-expression block is a 45-75 word, 3-4 sentence product-relevant studio close. Identify our independent design team and fresh point of view, explain that our varied original ideas help people find a design that feels like them, and connect this product to a complete supported festival, stage or performance look.',
    'Use plain literal language. Ban visual noise, clarity of the look, point of view, presence, character, considered appearance, expressive accent and similar abstract design-review wording that a buyer cannot translate into a real benefit.',
    'Do not pad the close with the breadth of the store, a list of events, an invitation to discuss a new idea or claims about shareability. These are generic across the catalog and dilute product specificity.',
    'Do not place operational customization details such as changing color, size, length, fit or coverage inside Designed for self-expression. Those facts belong only in the fixed right panel.',
  ],
  length_rules: {
    seo_title: 'Aim for a concise snippet-safe title and keep the internal 68-character review cap. Never pad a short, complete title to hit a minimum.',
    h1: 'Concise human-readable product name with an 82-character review cap. Name the primary product entity once; add only a non-redundant verified differentiator and never pad to a minimum.',
    meta_description: 'Aim for concise product identity, differentiator and use case within the 158-character review cap. Completeness and natural language outrank a minimum character target.',
    intro: '2-4 concise sentences; product hook, buyer benefit, event/use case and supported facts.',
    main_description: 'Coverage-first product copy, usually 120-300 words across the four generated left-description blocks. The final Designed for self-expression block should contain 45-75 words in 3-4 useful sentences. Never add filler merely to reach a word count.',
  },
  pdp_block_plan: [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      intent: 'Opening product story under the gallery and buy box. Lead with the complete event or style look the buyer wants, then explain how the product supports it. Weave supported material and finish facts naturally; never report left/right coordinates, visibility or image geometry.',
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      intent: 'Write 3-4 purchase-decision bullets using the benefit generation policy. Include exactly one concrete studio-design differentiation point plus distinct supported practical values such as easy dressing or adjustment, comfort, shape retention, durability or verified finish behavior. Never use style/event lists, visual-audit observations or abstract phrases as benefits.',
    },
    {
      block_key: 'ideal_for',
      placement: 'left_description',
      intent: 'Write 3-5 use-case bullets based on approved DNA, validated keywords and visual truth. Represent at least one operator-selected value from every non-empty event, style, persona and audience axis. Cover more selected values only when compatible and useful; never turn the block into a keyword list. Each bullet must add a distinct use case; do not repeat photoshoot, stage or festival intent in alternate wording, and do not write tautologies such as buyers looking for this product.',
    },
    {
      block_key: 'main_description',
      placement: 'left_description',
      intent: 'Heading must be Designed for self-expression. Write 45-75 words in 3-4 sentences: our independent design team and fresh point of view, how varied original ideas help people find a design that feels like them, and how this product supports a complete look in one approved setting. Do not mention team size, anatomical geometry, abstract design-review language or social metrics.',
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
    'Material, finish, comfort, durability and care are product-specific claims. Generate them only from Product Truth or verified image truth; fixed right-panel wording is not evidence for generated copy.',
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
    'ALT text must lead with the visible sold Product DNA component(s), not aspirational claims or a full inventory of the photograph. If a product fact is uncertain, mark needs_image_review.',
    'Omit styled accessories, face coverings, capes, goggles, shoes, underwear, base clothing, props and scenery from ALT unless Product Truth confirms they are included in the sold configuration. A short setting or pose may follow the sold product only when it helps distinguish the image.',
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
    'Why you’ll love it benefit policy:',
    ...THEFEYA_BENEFIT_GENERATION_POLICY,
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
    'Why you’ll love it benefit policy:',
    ...THEFEYA_BENEFIT_GENERATION_POLICY,
    'Fixed right-panel copy already visible to the buyer. Treat it as a no-copy reference and do not repeat its sentences:',
    ...THEFEYA_CANONICAL_RIGHT_PDP_PANEL.map((block) => `${block.heading}: ${block.body.replaceAll('\n', ' ')}`),
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
    'Every Why you’ll love it bullet must state a supported feature or studio truth and a concrete buyer outcome; style lists and abstract visual commentary do not qualify.',
    'Designed for self-expression must use first-person studio voice and explain buyer self-expression, not third-person narration or repeated product specifications.',
    'Do not mention popularity, likes, followers, viral reach, organic attention, reactions, saves, comments, sales or audience outcomes, even as non-guaranteed possibilities.',
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
    benefit_policy_rule_count: THEFEYA_BENEFIT_GENERATION_POLICY.length,
    visual_truth_rule_count: THEFEYA_SEO_DOCTRINE.visual_truth_strategy.length,
    research_reload_checkpoint: THEFEYA_RESEARCH_RELOAD_CHECKPOINT,
    variation_editing_checkpoint: THEFEYA_VARIATION_EDITING_CHECKPOINT,
  };
}
