import type { SeoAgentOutputContract, SeoPackDraftContract } from '@/lib/seoPackContract';
import type { SeoKeywordPlacementValidationResult } from '@/lib/seoKeywordPlacementValidator';

type ValidationSummary = {
  ok: boolean;
  status?: string;
  issues?: Array<{ code?: string; severity?: string; message?: string }>;
};

export type SeoAssembledProductPack = {
  contract_version: 'seo_product_full_pack_v1';
  canonical_product_id: string;
  url: {
    current_slug: string;
    current_path: string;
    proposed_slug: string;
    proposed_path: string;
    uniqueness_status: 'needs_portfolio_check';
  };
  seo_title: string | null;
  h1: string | null;
  meta_description: string | null;
  intro: string | null;
  main_description: string | null;
  block_structure: SeoAgentOutputContract['pdp_blocks'];
  faq: SeoAgentOutputContract['faq'];
  image_seo: Array<{
    image_role: string;
    source_image_url: string | null;
    alt_text: string;
    truth_basis: string;
    proposed_filename: string;
    needs_exact_image_review: boolean;
  }>;
  structured_data: {
    product: Record<string, unknown>;
    faq_page: Record<string, unknown> | null;
  };
  internal_linking_hints: SeoAgentOutputContract['internal_linking_hints'];
  canonical_product_truth: SeoPackDraftContract['product_truth'];
  keyword_roles: SeoPackDraftContract['keyword_roles'];
  keyword_placement: SeoKeywordPlacementValidationResult;
  quality_gate: {
    structural: ValidationSummary;
    commercial: ValidationSummary;
    keyword_placement: SeoKeywordPlacementValidationResult;
    product_truth_blockers: string[];
    ready_for_human_review: boolean;
    ready_for_storage: boolean;
    ready_for_publish: false;
  };
  human_review: { status: 'not_reviewed' };
  approval: { status: 'blocked_until_human_review' };
  apply: { status: 'blocked_until_approval' };
};

export function assembleSeoProductPack({
  draft,
  output,
  structuralValidation,
  commercialValidation,
  keywordPlacementValidation,
  productTruthBlockers = [],
}: {
  draft: SeoPackDraftContract;
  output: SeoAgentOutputContract;
  structuralValidation: ValidationSummary;
  commercialValidation: ValidationSummary;
  keywordPlacementValidation: SeoKeywordPlacementValidationResult;
  productTruthBlockers?: string[];
}): SeoAssembledProductPack {
  const currentSlug = slugify(draft.product_truth?.slug) || draft.canonical_product_id;
  const primaryKeyword = draft.keyword_roles?.primary?.[0]?.keyword
    || draft.keyword_roles?.primary?.[0]?.keyword_norm
    || output.h1
    || draft.product_truth?.title;
  const proposedSlug = slugify(primaryKeyword).slice(0, 72).replace(/-+$/g, '') || currentSlug;
  const mainDescription = output.pdp_blocks?.find((block) => block.block_key === 'main_description')?.body || null;
  const primaryImageUrl = draft.product_truth?.primary_image_url || null;
  const imageSeo = (output.image_alt_candidates || []).map((candidate, index) => ({
    image_role: candidate.image_role,
    source_image_url: index === 0 && candidate.image_role === 'primary' ? primaryImageUrl : null,
    alt_text: candidate.alt_text,
    truth_basis: candidate.truth_basis,
    proposed_filename: `${proposedSlug}-${slugify(candidate.image_role) || 'image'}-${String(index + 1).padStart(2, '0')}.webp`,
    needs_exact_image_review: !(index === 0 && candidate.image_role === 'primary' && candidate.truth_basis === 'visible_product_fact' && primaryImageUrl),
  }));
  const faq = output.faq || [];
  const validationReady = structuralValidation.ok && commercialValidation.ok && keywordPlacementValidation.ok;
  const storageReady = validationReady && productTruthBlockers.length === 0;

  return {
    contract_version: 'seo_product_full_pack_v1',
    canonical_product_id: draft.canonical_product_id,
    url: {
      current_slug: currentSlug,
      current_path: `/shop/${currentSlug}`,
      proposed_slug: proposedSlug,
      proposed_path: `/shop/${proposedSlug}`,
      uniqueness_status: 'needs_portfolio_check',
    },
    seo_title: output.seo_title,
    h1: output.h1,
    meta_description: output.meta_description,
    intro: output.intro,
    main_description: mainDescription,
    block_structure: output.pdp_blocks || [],
    faq,
    image_seo: imageSeo,
    structured_data: {
      product: compactRecord({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: output.h1 || draft.product_truth?.title,
        description: output.intro || output.meta_description,
        image: primaryImageUrl ? [primaryImageUrl] : undefined,
        sku: draft.canonical_product_id,
        material: draft.product_truth?.material || undefined,
        color: draft.product_truth?.color || undefined,
      }),
      faq_page: faq.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      } : null,
    },
    internal_linking_hints: output.internal_linking_hints || [],
    canonical_product_truth: draft.product_truth,
    keyword_roles: draft.keyword_roles,
    keyword_placement: keywordPlacementValidation,
    quality_gate: {
      structural: structuralValidation,
      commercial: commercialValidation,
      keyword_placement: keywordPlacementValidation,
      product_truth_blockers: productTruthBlockers,
      ready_for_human_review: validationReady,
      ready_for_storage: storageReady,
      ready_for_publish: false,
    },
    human_review: { status: 'not_reviewed' },
    approval: { status: 'blocked_until_human_review' },
    apply: { status: 'blocked_until_approval' },
  };
}

function slugify(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function compactRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}
