import type { SeoAgentInputContract, SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';
import type { SeoPilotBrief } from '@/lib/seoPilotDraft';

export function buildMockSeoAgentOutput(input: SeoAgentInputContract, brief?: SeoPilotBrief | null): SeoAgentOutputContract {
  const primaryKeyword = firstKeyword(input.keyword_roles.primary) || firstKeyword(input.keyword_roles.secondary) || input.product.title;
  const secondaryKeywords = input.keyword_roles.secondary.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const supportKeywords = input.keyword_roles.support.map((item) => item.keyword).filter(Boolean).slice(0, 4);
  const imageAltKeywords = input.keyword_roles.image_alt.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const productName = input.product.title || primaryKeyword;
  const material = input.product.material || focusText(input.manual_focus.material) || 'handmade statement material';
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
    faq: buildFaq(briefPreview?.faqCandidates, primaryKeyword, context),
    image_alt_candidates: buildImageAltCandidates(briefPreview?.imageAltDirection, altBase, Boolean(input.product.primary_image_alt || imageAltKeywords.length)),
    internal_linking_hints: buildInternalLinks(input, briefPreview?.internalLinkingHints),
    visual_truth: buildVisualTruth(input, color, material, context),
    pdp_blocks: buildPdpBlocks(input, productName, material, context),
    qa_self_report: buildQaReport(input, brief),
    generation_notes: [
      'Mock output only. No OpenAI call was made.',
      briefPreview ? 'Content fields are seeded from SeoPilotBrief.draftPreview to preserve the human-readable SEO baseline.' : 'No SeoPilotBrief preview was available, so fallback mock copy was used.',
      'PDP blocks are seeded for storefront mapping review, not final publish.',
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

function buildFaq(candidates: string[] | undefined, primaryKeyword: string, context: string): SeoAgentOutputContract['faq'] {
  const safeCandidates = (candidates || []).filter((question) => !/main focus|shown|image/i.test(question));
  if (safeCandidates.length) {
    return safeCandidates.slice(0, 4).map((question) => ({
      question,
      answer: 'Needs human answer before publish. Keep the answer specific to product facts, production, sizing, shipping, or styling context.',
      intent: inferFaqIntent(question),
    }));
  }
  return [
    {
      question: 'How long does production and shipping take?',
      answer: 'Made-to-order production is usually 3-5 business days. Standard shipping is about 10-14 business days, and express shipping is about 6-9 business days when available.',
      intent: 'shipping',
    },
    {
      question: 'Can the size be adjusted?',
      answer: 'Most pieces use adjustable straps and flexible sizing. Use the size chart first; if you are unsure, send your measurements to the manager before ordering.',
      intent: 'fit',
    },
    {
      question: 'What materials are used?',
      answer: `The draft material basis is ${primaryKeyword ? 'the selected product facts and visible product evidence' : 'the selected product facts'}. Final material wording must be checked before publish.`,
      intent: 'materials',
    },
    {
      question: `Is this suitable for ${context}?`,
      answer: 'This draft keeps the styling answer tied to the selected product facts and review strategy before publish.',
      intent: 'styling',
    },
  ];
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
    uncertain_or_missing_facts: ['Exact full set contents must be confirmed from source configuration before publish.'],
    forbidden_visual_claims: ['Do not claim extra pieces, shoes, goggles, or props are included unless source data confirms them.'],
  };
}

function buildPdpBlocks(input: SeoAgentInputContract, productName: string, material: string, context: string): SeoAgentOutputContract['pdp_blocks'] {
  const components = input.product.known_components.length ? input.product.known_components.join(', ') : 'included pieces need review';
  return [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      heading: 'About this piece',
      body: `${productName} is a TheFEYA review draft for a statement festival and stage look. The final copy should lead with the design value, visual impact, and buyer use case before listing technical details.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'whats_included',
      placement: 'right_info_panel',
      heading: "What's included",
      body: `Included components from current product data: ${components}. Confirm configuration details before publish.`,
      source_basis: 'needs_human_review',
      needs_human_review: true,
    },
    {
      block_key: 'sizing_fit',
      placement: 'right_info_panel',
      heading: 'Sizing & fit',
      body: 'Use the size chart first. Most TheFEYA pieces include adjustable straps; if the buyer is unsure or needs a custom fit, they can send measurements to the manager.',
      source_basis: 'brand_policy',
    },
    {
      block_key: 'shipping_delivery',
      placement: 'right_info_panel',
      heading: 'Shipping & delivery',
      body: 'Made-to-order production usually takes 3-5 business days. Standard shipping is about 10-14 business days, and express shipping is about 6-9 business days when available.',
      source_basis: 'brand_policy',
    },
    {
      block_key: 'materials_care',
      placement: 'right_info_panel',
      heading: 'Materials & care',
      body: `Material basis: ${material}. Wipe clean by hand, avoid machine washing, and store carefully without long-term heavy pressure.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'customization',
      placement: 'right_info_panel',
      heading: 'Customization',
      body: 'Sizing, color/detail adjustments, length or coverage changes, and combinations of existing TheFEYA designs can be discussed when the design supports it. Custom design work stays within TheFEYA style.',
      source_basis: 'brand_policy',
    },
    {
      block_key: 'returns_exchanges',
      placement: 'right_info_panel',
      heading: 'Returns & exchanges',
      body: 'For cancellation, return, and exchange details, use the store policy link instead of overloading the product description.',
      source_basis: 'brand_policy',
    },
    {
      block_key: 'handmade_variation',
      placement: 'right_info_panel',
      heading: 'Handmade variation',
      body: 'Each made-to-order piece can have small handmade variations in finish or fit. Final wording should stay calm and trust-building.',
      source_basis: 'brand_policy',
    },
  ];
}

function inferFaqIntent(question: string): SeoAgentOutputContract['faq'][number]['intent'] {
  const q = question.toLowerCase();
  if (/shipping|production|delivery|long/.test(q)) return 'shipping';
  if (/size|sizing|adjust/.test(q)) return 'fit';
  if (/material|included|piece/.test(q)) return 'materials';
  if (/style|festival|burning man|rave/.test(q)) return 'styling';
  if (/care|clean|wash/.test(q)) return 'care';
  return 'other';
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
