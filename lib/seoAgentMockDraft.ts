import type { SeoAgentInputContract, SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';

export function buildMockSeoAgentOutput(input: SeoAgentInputContract): SeoAgentOutputContract {
  const primaryKeyword = firstKeyword(input.keyword_roles.primary) || firstKeyword(input.keyword_roles.secondary) || input.product.title;
  const secondaryKeywords = input.keyword_roles.secondary.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const supportKeywords = input.keyword_roles.support.map((item) => item.keyword).filter(Boolean).slice(0, 4);
  const imageAltKeywords = input.keyword_roles.image_alt.map((item) => item.keyword).filter(Boolean).slice(0, 3);
  const productName = input.product.title || primaryKeyword;
  const material = input.product.material || focusText(input.manual_focus.material) || 'handmade statement material';
  const color = input.product.color || 'statement';
  const context = input.product.world || focusText(input.manual_focus.event) || 'festival and stage styling';
  const safeTitle = titleCase(primaryKeyword).slice(0, 68);
  const altBase = imageAltKeywords[0] || input.product.primary_image_alt || `${color} ${productName}`;

  return {
    contract_version: 'seo_agent_output_v1',
    status: input.metrics_status.status === 'missing' ? 'needs_review' : 'draft',
    seo_title: safeTitle,
    h1: titleCase(productName),
    meta_description: buildMetaDescription(primaryKeyword, secondaryKeywords, color, context),
    intro: `A review draft for ${productName}, built around ${primaryKeyword} and checked against the selected product focus before any publish step.`,
    bullet_highlights: [
      `Main search focus: ${primaryKeyword}.`,
      `Product truth basis: ${[color, material, context].filter(Boolean).join(', ')}.`,
      secondaryKeywords.length ? `Secondary support: ${secondaryKeywords.join(', ')}.` : 'Secondary support still needs review.',
      supportKeywords.length ? `Supporting terms: ${supportKeywords.join(', ')}.` : 'Supporting terms still need review.',
    ],
    faq: [
      {
        question: `Is this ${primaryKeyword} ready for festival styling?`,
        answer: `This draft positions the piece for ${context}. Final wording still needs human review before publishing.`,
        intent: 'styling',
      },
      {
        question: 'What should be checked before publishing this SEO pack?',
        answer: 'Check product facts, image truth, keyword placement, similarity risk, and human review status before using this copy on a live page.',
        intent: 'other',
      },
    ],
    image_alt_candidates: [
      {
        image_role: 'primary',
        alt_text: sentenceCase(altBase),
        truth_basis: input.product.primary_image_alt || imageAltKeywords.length ? 'visible_product_fact' : 'needs_image_review',
      },
    ],
    internal_linking_hints: input.keyword_roles.collection.slice(0, 3).map((item) => ({
      anchor: item.keyword,
      target_type: 'collection',
      reason: 'Collection keyword from the selected role map. Needs final URL review.',
    })),
    qa_self_report: buildPassingQaReport(input),
    generation_notes: [
      'Mock output only. No OpenAI call was made.',
      'Use this object to test validator, UI rendering, and future draft save gates.',
      'Human review, similarity check, and image ALT review are still required before publish readiness.',
    ],
  };
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
