import type { SeoAgentInputContract, SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';
import type { SeoPilotBrief } from '@/lib/seoPilotDraft';

export function buildMockSeoAgentOutput(input: SeoAgentInputContract, brief?: SeoPilotBrief | null): SeoAgentOutputContract {
  const primaryKeyword = firstKeyword(input.keyword_roles.primary) || firstKeyword(input.keyword_roles.secondary) || input.product.title;
  const secondaryKeywords = input.keyword_roles.secondary.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const supportKeywords = input.keyword_roles.support.map((item) => item.keyword).filter(Boolean).slice(0, 4);
  const imageAltKeywords = input.keyword_roles.image_alt.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const productName = input.product.title || primaryKeyword;
  const material = input.product.material || focusText(input.manual_focus.material) || 'vegan leather with a glossy mirror finish';
  const color = input.product.color || 'statement';
  const context = input.product.world || focusText(input.manual_focus.event) || 'festival and stage styling';
  const briefPreview = brief?.draftPreview || null;
  const altBase = imageAltKeywords[0] || input.product.primary_image_alt || `${color} ${productName}`;

  return {
    contract_version: 'seo_agent_output_v1',
    status: input.metrics_status.status === 'missing' ? 'needs_review' : 'draft',
    seo_title: briefPreview?.seoTitle || titleCase(primaryKeyword).slice(0, 68),
    h1: briefPreview?.h1 || titleCase(productName),
    meta_description: briefPreview?.metaDescription || buildMetaDescription(primaryKeyword, secondaryKeywords, color, context),
    intro: briefPreview?.intro || `A TheFEYA review draft for ${productName}, shaped around ${primaryKeyword} with product truth, image truth, and portfolio overlap checks still required before publish.`,
    bullet_highlights: briefPreview?.bullets?.length ? briefPreview.bullets : [
      `Main search focus: ${primaryKeyword}.`,
      `Product truth basis: ${[color, material, context].filter(Boolean).join(', ')}.`,
      secondaryKeywords.length ? `Secondary support: ${secondaryKeywords.join(', ')}.` : 'Secondary support still needs review.',
      supportKeywords.length ? `Supporting terms: ${supportKeywords.join(', ')}.` : 'Supporting terms still need review.',
    ],
    faq: [],
    image_alt_candidates: buildImageAltCandidates(briefPreview?.imageAltDirection, altBase, Boolean(input.product.primary_image_alt || imageAltKeywords.length)),
    internal_linking_hints: buildInternalLinks(input, briefPreview?.internalLinkingHints),
    visual_truth: buildVisualTruth(input, color, material, context),
    pdp_blocks: buildPdpBlocks(input, productName, material, context),
    qa_self_report: buildQaReport(input, brief),
    generation_notes: [
      'Mock output only. No OpenAI call was made.',
      briefPreview ? 'Content fields are seeded from SeoPilotBrief.draftPreview to preserve the human-readable SEO baseline.' : 'No SeoPilotBrief preview was available, so fallback mock copy was used.',
      'PDP blocks are seeded for left product-specific description mapping review, not final publish.',
      'Right PDP panel is intentionally not generated because it is canonical static storefront content.',
      'Product FAQ is intentionally empty because PDP FAQ is not rendered inside the product tile by default.',
      'Use this object to test validator, UI rendering, and future draft save gates.',
      'Human review, similarity check, and image ALT review are still required before publish readiness.',
    ],
  };
}

function buildQaReport(input: SeoAgentInputContract, brief?: SeoPilotBrief | null): SeoQaContract {
  const fallback = buildPassingQaReport(input);
  if (!brief?.seoQaChecks?.length) return fallback;
  const qa = { ...fallback };
  brief.seoQaChecks.forEach((check) => {
    if (check.id in qa && check.status) {
      qa[check.id as keyof Omit<SeoQaContract, 'notes'>] = check.status;
    }
  });
  qa.notes = [
    'Mock QA report generated without model call.',
    'QA statuses are seeded from SeoPilotBrief.seoQaChecks when available.',
    'Similarity/cannibalization remains a publish blocker until checked against the product set.',
    'Image truth must be reviewed against actual product photos before publish.',
  ];
  return qa;
}

function buildPassingQaReport(input: SeoAgentInputContract): SeoQaContract {
  return {
    cliche_phrase: 'pass',
    long_dash: 'pass',
    keyword_stuffing: 'pass',
    product_specificity: input.product.title ? 'pass' : 'warning',
    forbidden_mismatch: 'pass',
    similarity_cannibalization: 'not_checked',
    image_alt_truth: input.product.primary_image_alt ? 'pass' : 'warning',
    commercial_placement: 'pass',
    validated_metrics: input.metrics_status.status === 'missing' ? 'warning' : 'pass',
    notes: [
      'Mock QA report generated without model call.',
      'Similarity/cannibalization remains not_checked by design.',
      'Image truth must be reviewed against actual product photos before publish.',
    ],
  };
}

function buildImageAltCandidates(directions: string[] | undefined, fallbackAlt: string, hasVisibleTruth: boolean): SeoAgentOutputContract['image_alt_candidates'] {
  const source = directions?.length ? directions : [sentenceCase(fallbackAlt)];
  return source.slice(0, 5).map((item, index) => ({
    image_role: index === 0 ? 'primary' : 'detail',
    alt_text: cleanAltDirection(item),
    truth_basis: hasVisibleTruth ? 'visible_product_fact' : 'needs_image_review',
  }));
}

function buildInternalLinks(input: SeoAgentInputContract, hints?: string[]): SeoAgentOutputContract['internal_linking_hints'] {
  if (hints?.length) {
    return hints.slice(0, 6).map((hint) => ({
      anchor: extractAnchor(hint),
      target_type: 'collection',
      reason: hint,
    }));
  }
  return input.keyword_roles.collection.slice(0, 3).map((item) => ({
    anchor: item.keyword,
    target_type: 'collection',
    reason: 'Collection keyword from the selected role map. Needs final URL review.',
  }));
}

function buildVisualTruth(input: SeoAgentInputContract, color: string, material: string, context: string): SeoAgentOutputContract['visual_truth'] {
  return {
    observed_product_facts: [
      input.product.primary_image_url ? 'Primary image exists for visual truth review.' : 'No primary image available in this mock run.',
      color ? `Color signal: ${color}.` : 'Color signal needs review.',
      material ? `Material signal: ${material}.` : 'Material signal needs review.',
    ],
    dna_matches: [
      ...input.product.known_components.slice(0, 4),
      context,
    ].filter(Boolean),
    open_style_suggestions: ['Keep visual style suggestions separate from title until human review confirms them.'],
    uncertain_or_missing_facts: input.product.known_components.length ? [] : ['Included components are missing from the current contract and need source mapping before final apply.'],
    forbidden_visual_claims: ['Do not claim extra pieces, shoes, goggles, or props are included unless source data confirms them.'],
  };
}

function buildPdpBlocks(input: SeoAgentInputContract, productName: string, material: string, context: string): SeoAgentOutputContract['pdp_blocks'] {
  const componentList = input.product.known_components.length ? normalizeComponents(input.product.known_components).join(', ') : 'the selected product configuration from the product options';
  const useCase = cleanContext(context);
  return [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      heading: 'About this piece',
      body: `${productName} is a TheFEYA statement costume piece made for a powerful festival, stage or editorial look. It is built around a sculptural shoulder silhouette, a strong metallic finish and an authorial warrior-inspired mood, so the outfit feels bold in photos without turning into a generic costume accessory.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'whats_included',
      placement: 'left_description',
      heading: "What's included",
      body: `Included in this configuration: ${componentList}. If the original Etsy source contains exclusions or extra set options, they must be preserved here during final mapping.`,
      source_basis: input.product.known_components.length ? 'product_fact' : 'needs_human_review',
      needs_human_review: !input.product.known_components.length,
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      heading: "Why you'll love it",
      body: [
        'Handmade to order, so the piece keeps the feel of a designer studio item rather than mass production.',
        'Strong visual silhouette for photos, stage presence, festivals and content creation.',
        'Light enough for event wear while still giving a structured armor effect.',
        'Adjustable straps help create a secure and comfortable fit on the body.',
        'Glossy metallic finish adds a bright futuristic accent to the full look.',
      ].join('\n'),
      source_basis: 'brand_policy',
      needs_human_review: true,
    },
    {
      block_key: 'ideal_for',
      placement: 'left_description',
      heading: 'Ideal for',
      body: [
        useCase || 'Burning Man and desert festival outfits.',
        'Rave, EDM and performance looks where the upper-body silhouette matters.',
        'Photoshoots, stage performances, DJs, dancers and editorial styling.',
        'Warrior, futuristic, post-apocalyptic or desert-inspired styling when supported by the final image review.',
      ].join('\n'),
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'material',
      placement: 'left_description',
      heading: 'Material & finish',
      body: `Material basis: ${material}. Final copy should describe the exact supported material as vegan/faux leather with a glossy mirror or metallic coating when the source confirms it, including the reinforced structure, shape retention and soft body-facing side.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
  ];
}

function normalizeComponents(components: string[]) {
  const cleaned = components
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
  return cleaned.length ? cleaned : ['selected product configuration'];
}

function cleanContext(value: string) {
  const clean = String(value || '').trim();
  if (!clean || clean.toLowerCase() === 'festival and stage styling') return 'Burning Man, festival and stage looks.';
  return clean;
}

function cleanAltDirection(value: string) {
  return sentenceCase(value.replace(/^use only visible truth:\s*/i, '').replace(/\s+on the model\/product photo\.?$/i, '').trim());
}

function extractAnchor(value: string) {
  const aroundMatch = value.match(/around\s+(.+?)\.?$/i);
  if (aroundMatch?.[1]) return aroundMatch[1];
  return value.replace(/^link naturally to\s+/i, '').slice(0, 80);
}

function firstKeyword(items: Array<{ keyword?: string | null; keyword_norm?: string | null }>) {
  return items.find((item) => item.keyword || item.keyword_norm)?.keyword || items.find((item) => item.keyword || item.keyword_norm)?.keyword_norm || '';
}

function focusText(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value ? String(value) : '';
}

function buildMetaDescription(primaryKeyword: string, secondaryKeywords: string[], color: string, context: string) {
  const support = secondaryKeywords.length ? ` with ${secondaryKeywords.slice(0, 2).join(' and ')}` : '';
  return `Review draft for ${color} ${primaryKeyword}${support}, built for ${context}. Product facts, image truth, and similarity still require review.`.slice(0, 168);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function sentenceCase(value: string) {
  const clean = value.replace(/[_-]+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Product image needs ALT review';
}
