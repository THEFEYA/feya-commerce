import type { SeoAgentInputContract, SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';
import type { SeoPilotBrief } from '@/lib/seoPilotDraft';

export function buildMockSeoAgentOutput(input: SeoAgentInputContract, brief?: SeoPilotBrief | null): SeoAgentOutputContract {
  const primaryKeyword = firstKeyword(input.keyword_roles.primary) || firstKeyword(input.keyword_roles.secondary) || input.product.title;
  const secondaryKeywords = input.keyword_roles.secondary.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const productName = input.product.title || primaryKeyword;
  const material = input.product.material || focusText(input.manual_focus.material) || 'statement finish';
  const color = input.product.color || 'statement';
  const context = input.product.world || focusText(input.manual_focus.event) || 'festival and stage styling';
  const eventFocus = firstFocus(input.manual_focus.event);
  const briefPreview = brief?.draftPreview || null;
  const altBase = input.product.primary_image_alt || `Product view of ${productName}`;

  return {
    contract_version: 'seo_agent_output_v1',
    status: input.metrics_status.status === 'missing' ? 'needs_review' : 'draft',
    seo_title: briefPreview?.seoTitle || fitTitle(titleCase(primaryKeyword)),
    h1: fitH1(buildEventFirstH1(primaryKeyword || productName, eventFocus) || briefPreview?.h1 || titleCase(productName)),
    meta_description: briefPreview?.metaDescription || buildMetaDescription(primaryKeyword, secondaryKeywords, color, context),
    intro: `This ${primaryKeyword} is made for ${cleanContext(context).replace(/\.$/, '')}. The bold product shape is paired with an adjustable fit for festival and stage wear.`,
    bullet_highlights: [
      'Original studio design gives the outfit a bold, recognizable detail.',
      'Adjustable straps make the fit easier to adapt to different body shapes.',
      'Soft body-facing material supports more comfortable wear.',
    ],
    faq: [],
    image_alt_candidates: buildImageAltCandidates(undefined, altBase, Boolean(input.product.primary_image_alt)),
    internal_linking_hints: buildInternalLinks(input, briefPreview?.internalLinkingHints),
    visual_truth: buildVisualTruth(input, color, material, context),
    pdp_blocks: buildPdpBlocks(input, productName, material, context),
    qa_self_report: buildQaReport(input, brief),
    generation_notes: [
      'Mock output only. No OpenAI call was made.',
      briefPreview ? 'SEO title, H1 or meta may be seeded from SeoPilotBrief for compatibility.' : 'No SeoPilotBrief preview was available, so fallback mock copy was used.',
      'Generated PDP blocks map only to the left product description.',
      'The complete right information panel and What’s included remain storefront-controlled.',
      'Product FAQ remains empty because PDP FAQ is not rendered by default.',
      'Human review, similarity check, component mapping and image ALT review are still required before publish readiness.',
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
    'Similarity remains a publish gate until checked against the product set.',
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
      'Similarity remains not_checked by design.',
      'Image truth must be reviewed against actual product photos before publish.',
    ],
  };
}

function buildImageAltCandidates(directions: string[] | undefined, fallbackAlt: string, hasVisibleTruth: boolean): SeoAgentOutputContract['image_alt_candidates'] {
  const source = directions?.length ? directions : [sentenceCase(fallbackAlt)];
  return source.slice(0, 1).map((item) => ({
    image_role: 'primary',
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
    forbidden_visual_claims: ['Do not claim extra pieces, shoes, face coverings, capes or props are included unless source data confirms them.'],
  };
}

function buildPdpBlocks(input: SeoAgentInputContract, productName: string, _material: string, context: string): SeoAgentOutputContract['pdp_blocks'] {
  const useCase = cleanContext(context);
  const useCaseLabel = useCase.replace(/\.$/, '').replace(/\s+looks?$/i, '');

  return [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      heading: 'About this piece',
      body: `Build a bold ${useCaseLabel} look around this ${productName}. Its original design gives the outfit a distinctive armored detail. Adjustable straps make the fit easier to adapt to different body shapes.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      heading: "Why you'll love it",
      body: [
        'Our original studio design gives you a distinctive piece for building a festival or stage look that feels personal.',
        'Adjustable straps make the piece quick to put on and easier to adapt to different body shapes.',
        'A soft body-facing material supports more comfortable wear.',
        'Dense material helps the piece keep its shape between wears so it can be reused for future events.',
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
        'Stage performances, DJ sets and dance shows.',
        'Editorial photoshoots and futuristic or warrior-inspired styling supported by the product image.',
      ].join('\n'),
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'main_description',
      placement: 'left_description',
      heading: 'Designed for self-expression',
      body: `At TheFEYA, we are an independent team of designers with a fresh point of view on festival and stage fashion. Our original ideas span different styles, helping people choose a design that feels like them. This piece gives you a distinctive starting point for ${cleanContext(context).replace(/\.$/, '')}. You can build the rest of the outfit around your own style.`,
      source_basis: 'brand_policy',
      needs_human_review: true,
    },
  ];
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

function firstFocus(value: unknown) {
  if (Array.isArray(value)) return String(value.find(Boolean) || '').trim();
  return String(value || '').trim();
}

function buildEventFirstH1(productEntity: string, eventFocus: string) {
  const entity = titleCase(productEntity);
  if (!eventFocus) return entity;
  if (entity.toLowerCase().includes(eventFocus.toLowerCase())) return entity;
  return `${entity} for ${titleCase(eventFocus)}`;
}

function buildMetaDescription(primaryKeyword: string, secondaryKeywords: string[], color: string, context: string) {
  const secondary = secondaryKeywords[0] ? ` with ${secondaryKeywords[0]}` : '';
  const base = `${sentenceCase(color)} ${primaryKeyword}${secondary} for ${cleanContext(context).replace(/\.$/, '')}. Sculptural styling for stage, festival and editorial looks.`;
  return fitMaxLength(base, 158);
}

function fitTitle(value: string) {
  return fitMaxLength(value, 68);
}

function fitH1(value: string) {
  return fitMaxLength(value, 82);
}

function fitMaxLength(value: string, max: number) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '').trim();
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
