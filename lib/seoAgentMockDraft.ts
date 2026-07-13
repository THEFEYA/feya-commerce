import type { SeoAgentInputContract, SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';
import type { SeoPilotBrief } from '@/lib/seoPilotDraft';

export function buildMockSeoAgentOutput(input: SeoAgentInputContract, brief?: SeoPilotBrief | null): SeoAgentOutputContract {
  const primaryKeyword = firstKeyword(input.keyword_roles.primary) || firstKeyword(input.keyword_roles.secondary) || input.product.title;
  const secondaryKeywords = input.keyword_roles.secondary.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const productName = input.product.title || primaryKeyword;
  const material = input.product.material || focusText(input.manual_focus.material) || 'statement finish';
  const color = input.product.color || 'statement';
  const context = input.product.world || focusText(input.manual_focus.event) || 'festival and stage styling';
  const briefPreview = brief?.draftPreview || null;
  const altBase = input.product.primary_image_alt || `Product view of ${productName}`;

  return {
    contract_version: 'seo_agent_output_v1',
    status: input.metrics_status.status === 'missing' ? 'needs_review' : 'draft',
    seo_title: briefPreview?.seoTitle || fitTitle(titleCase(primaryKeyword)),
    h1: briefPreview?.h1 || fitH1(titleCase(productName)),
    meta_description: briefPreview?.metaDescription || buildMetaDescription(primaryKeyword, secondaryKeywords, color, context),
    intro: `A sculptural ${primaryKeyword} created for festival, stage and editorial styling. Its strong silhouette is designed to stay visually clear in motion, from a distance and on camera.`,
    bullet_highlights: [
      'Layered studio construction gives the silhouette a distinct profile.',
      'A strong silhouette designed to read clearly on stage and on camera.',
      'Adjustable straps support a secure, comfortable fit.',
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

function buildPdpBlocks(input: SeoAgentInputContract, productName: string, material: string, context: string): SeoAgentOutputContract['pdp_blocks'] {
  const useCase = cleanContext(context);
  const materialSentence = material && material !== 'statement finish'
    ? `The ${material} adds a distinctive surface and visual depth while the silhouette remains clear in motion and photographs.`
    : 'The finish adds visual depth while the silhouette remains clear in motion and photographs.';

  return [
    {
      block_key: 'about_this_piece',
      placement: 'left_description',
      heading: 'About this piece',
      body: `${productName} is a sculptural costume piece created for a bold festival, stage or editorial look. ${materialSentence} The form is designed to remain visually strong from a distance and on camera.`,
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'why_youll_love_it',
      placement: 'left_description',
      heading: "Why you'll love it",
      body: [
        'Designed in our studio as a distinctive alternative to a generic mass-produced costume look.',
        'Adjustable straps make the piece quick to put on and easier to fine-tune over different base layers.',
        'A soft body-facing material supports more comfortable wear.',
        'Structured construction helps the piece hold its shape between wears.',
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
        'Stage performances, DJ sets, dance shows and creator content where the silhouette must stay readable.',
        'Editorial photoshoots and futuristic or warrior-inspired styling supported by the product image.',
      ].join('\n'),
      source_basis: 'product_fact',
      needs_human_review: true,
    },
    {
      block_key: 'main_description',
      placement: 'left_description',
      heading: 'Designed for self-expression',
      body: `At TheFEYA, we use deliberate lines and sculptural forms to help you build a personal ${cleanContext(context).replace(/\.$/, '')} look with a recognizable profile. Each design decision is kept focused on the way the piece frames the body and supports your chosen visual direction.`,
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

function buildMetaDescription(primaryKeyword: string, secondaryKeywords: string[], color: string, context: string) {
  const secondary = secondaryKeywords[0] ? ` with ${secondaryKeywords[0]}` : '';
  const base = `${sentenceCase(color)} ${primaryKeyword}${secondary} for ${cleanContext(context).replace(/\.$/, '')}. Sculptural styling for stage, festival and editorial looks.`;
  return fitLength(base, 125, 158);
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

function fitLength(value: string, min: number, max: number) {
  let clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length > max) clean = clean.slice(0, max).replace(/\s+\S*$/, '').trim();
  if (clean.length < min) clean = `${clean} for Festival and Stage Looks`;
  if (clean.length > max) clean = clean.slice(0, max).replace(/\s+\S*$/, '').trim();
  return clean;
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
