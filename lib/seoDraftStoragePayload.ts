// @ts-nocheck
import type { SeoAgentInputContract, SeoAgentOutputContract } from '@/lib/seoPackContract';
import type { SeoAgentOutputValidationResult } from '@/lib/seoAgentOutputValidator';

export type SeoDraftStoragePayload = {
  canonical_product_id: string;
  matched_etsy_listing_id: string | null;
  product_slug: string | null;
  pack_version: string;
  source_brief_version: string;
  output_contract_version: string;
  status: 'draft_generated' | 'needs_human_review';
  review_status: 'not_reviewed';
  source_mode: 'brief_baseline' | 'mock_contract' | 'openai_draft' | 'human_edit';
  seo_title: string | null;
  h1: string | null;
  meta_description: string | null;
  intro: string | null;
  bullet_highlights: unknown[];
  faq: unknown[];
  image_alt_candidates: unknown[];
  internal_linking_hints: unknown[];
  product_truth_snapshot: Record<string, unknown>;
  manual_focus_snapshot: Record<string, unknown>;
  keyword_roles_snapshot: Record<string, unknown>;
  metrics_status_snapshot: Record<string, unknown>;
  qa_self_report: Record<string, unknown>;
  similarity_check_snapshot: Record<string, unknown> | null;
  agent_input_snapshot: SeoAgentInputContract;
  agent_output_snapshot: SeoAgentOutputContract;
  validation_result_snapshot: SeoAgentOutputValidationResult;
  created_by: string;
};

export function buildSeoDraftStoragePayload({
  seoPackDraft,
  agentInput,
  agentOutput,
  validationResult,
  sourceMode = 'brief_baseline',
  createdBy = 'seo-engine',
}: {
  seoPackDraft: any;
  agentInput: SeoAgentInputContract;
  agentOutput: SeoAgentOutputContract;
  validationResult: SeoAgentOutputValidationResult;
  sourceMode?: SeoDraftStoragePayload['source_mode'];
  createdBy?: string;
}): SeoDraftStoragePayload {
  return {
    canonical_product_id: seoPackDraft.canonical_product_id,
    matched_etsy_listing_id: seoPackDraft.matched_etsy_listing_id || null,
    product_slug: seoPackDraft.product_truth?.product_slug || agentInput.product?.slug || null,
    pack_version: seoPackDraft.pack_version || 'seo_pack_v1',
    source_brief_version: seoPackDraft.source_brief_version || 'seo_brief_v2_1',
    output_contract_version: agentOutput.contract_version || 'seo_agent_output_v1',
    status: validationResult.ok ? 'draft_generated' : 'needs_human_review',
    review_status: 'not_reviewed',
    source_mode: sourceMode,
    seo_title: agentOutput.seo_title || null,
    h1: agentOutput.h1 || null,
    meta_description: agentOutput.meta_description || null,
    intro: agentOutput.intro || null,
    bullet_highlights: Array.isArray(agentOutput.bullet_highlights) ? agentOutput.bullet_highlights : [],
    faq: Array.isArray(agentOutput.faq) ? agentOutput.faq : [],
    image_alt_candidates: Array.isArray(agentOutput.image_alt_candidates) ? agentOutput.image_alt_candidates : [],
    internal_linking_hints: Array.isArray(agentOutput.internal_linking_hints) ? agentOutput.internal_linking_hints : [],
    product_truth_snapshot: seoPackDraft.product_truth || {},
    manual_focus_snapshot: agentInput.manual_focus || {},
    keyword_roles_snapshot: seoPackDraft.keyword_roles || {},
    metrics_status_snapshot: agentInput.metrics_status || {},
    qa_self_report: agentOutput.qa_self_report || {},
    similarity_check_snapshot: seoPackDraft.similarity_check || null,
    agent_input_snapshot: agentInput,
    agent_output_snapshot: agentOutput,
    validation_result_snapshot: validationResult,
    created_by: createdBy,
  };
}

export function summarizeSeoDraftStoragePayload(payload: SeoDraftStoragePayload | null) {
  if (!payload) return null;
  return {
    canonical_product_id: payload.canonical_product_id,
    matched_etsy_listing_id: payload.matched_etsy_listing_id,
    product_slug: payload.product_slug,
    status: payload.status,
    review_status: payload.review_status,
    source_mode: payload.source_mode,
    output_contract_version: payload.output_contract_version,
    has_seo_title: Boolean(payload.seo_title),
    has_h1: Boolean(payload.h1),
    has_meta_description: Boolean(payload.meta_description),
    bullet_count: payload.bullet_highlights.length,
    faq_count: payload.faq.length,
    image_alt_count: payload.image_alt_candidates.length,
    internal_link_count: payload.internal_linking_hints.length,
    validation_status: payload.validation_result_snapshot?.status || 'not_checked',
  };
}

export function seoDraftStoragePayloadGuardrails() {
  return [
    'Payload is a review artifact, not storefront truth.',
    'Payload must be built server-side only.',
    'Payload must include product truth, keyword roles, QA, model/human output, and validation snapshots.',
    'Payload must not mark ready_for_publish.',
    'Payload must not publish or mutate storefront product tables.',
  ];
}
