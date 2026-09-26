import type { SeoPackDraftContract, SeoAgentOutputContract } from './seoPackContract.ts';
import { validateSeoAgentOutput } from './seoAgentOutputValidator.ts';
import { validateSeoCommercialCopy } from './seoCommercialCopyValidator.ts';
import { validateSeoKeywordPlacement } from './seoKeywordPlacementValidator.ts';
import { getSeoPackApprovalBlockers, getSeoPackReviewDraftStorageBlockers } from './seoPackContract.ts';
import { assembleSeoProductPack } from './seoFullPackAssembler.ts';

/** Shared by explicit resave preview and storage. Historical read-only loads never enter this pipeline. */
export function validateSeoReviewDraft(agentOutput: SeoAgentOutputContract, seoPackDraft: SeoPackDraftContract) {
  const structuralValidation = validateSeoAgentOutput(agentOutput);
  // A new save must satisfy today's policy, regardless of client-supplied metadata.
  const commercialValidation = validateSeoCommercialCopy(agentOutput, {
    editorial_policy_version: 'brand_mission_v2',
    product_truth: seoPackDraft.product_truth,
    manual_focus: seoPackDraft.manual_focus,
    keyword_roles: seoPackDraft.keyword_roles,
  });
  const keywordPlacementValidation = validateSeoKeywordPlacement(agentOutput, seoPackDraft);
  const approvalBlockers = getSeoPackApprovalBlockers(seoPackDraft);
  const reviewDraftStorageBlockers = getSeoPackReviewDraftStorageBlockers(seoPackDraft);
  const assembledSeoPack = assembleSeoProductPack({
    draft: seoPackDraft,
    output: agentOutput,
    structuralValidation,
    commercialValidation,
    keywordPlacementValidation,
    productTruthBlockers: approvalBlockers,
  });
  const validationIssues = [
    ...(structuralValidation.issues || []),
    ...(commercialValidation.issues || []),
    ...(keywordPlacementValidation.issues || []),
    ...reviewDraftStorageBlockers.map((code) => ({
      code: `review_draft_storage_${code}`,
      severity: 'blocker',
      message: `SEO review draft storage gate failed: ${code}.`,
    })),
    ...approvalBlockers.map((code) => ({
      code: `approval_gate_${code}`,
      severity: 'warning',
      message: `SEO Pack remains blocked from Approval/Apply: ${code}.`,
    })),
  ];
  const validationResult = {
    ok: structuralValidation.ok && commercialValidation.ok && keywordPlacementValidation.ok && reviewDraftStorageBlockers.length === 0,
    status: validationIssues.some((issue) => issue.severity === 'blocker')
      ? 'blocked'
      : validationIssues.length ? 'warning' : 'valid',
    issues: validationIssues,
    structural_validation: structuralValidation,
    commercial_validation: commercialValidation,
    keyword_placement_validation: keywordPlacementValidation,
    review_draft_storage_blockers: reviewDraftStorageBlockers,
    approval_blockers: approvalBlockers,
    product_truth_blockers: approvalBlockers,
    assembled_seo_pack: assembledSeoPack,
  };
  assembledSeoPack.quality_gate.ready_for_storage = validationResult.ok;
  return validationResult;
}
