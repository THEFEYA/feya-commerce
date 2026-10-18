/**
 * Phase13 Growth OS: owner-controlled request for a HUMAN review of a real TSEO L0 receipt.
 * It is NOT independent GMEL AI, case completion, SEO change, or purchase measurement.
 */
export type ShadowCase = {
  case_id: string;
  case_type: string;
  case_status: string;
  current_accountable_domain: string;
  ownership_epoch: number;
};
export type ShadowWorkflow = {
  workflow_status: string;
  ownership_epoch: number;
  state_json: unknown;
};
export type CurrentSearchRelease = {
  releaseCode: string;
  releaseVersion: number;
  intendedIndex: number;
  intendedNoindex: number;
  approvedProducts: number;
};
export type ExistingShadowReview = {
  state: string;
  reviewMethod?: string | null;
} | null;

export type ReviewRequestVerdict = {
  allowed: boolean;
  reason: 'READY_FOR_HUMAN_QA_REQUEST' | 'CASE_SCOPE_REJECTED' |
    'WORKFLOW_NOT_VERIFIED' | 'L0_EVIDENCE_NOT_VERIFIED' |
    'INDEPENDENT_QA_NOT_YET_REQUESTABLE';
};

function object(x:unknown):Record<string,unknown>|null {
  return x!==null&&typeof x==='object'&&!Array.isArray(x) ? x as Record<string,unknown> : null;
}

/** Exactly scoped: even a valid stored receipt never authorizes an agent to publish or close cases. */
export function evaluateOwnerL0ReviewRequest(
  c: ShadowCase | null,
  workflow: ShadowWorkflow | null,
  review: ExistingShadowReview,
  release: CurrentSearchRelease | null,
): ReviewRequestVerdict {
  const blocked=(reason:ReviewRequestVerdict['reason']):ReviewRequestVerdict=>({allowed:false,reason});

  if(!c || !c.case_id || c.case_type!=='TSEO_INDEXABILITY_SHADOW'
    ||c.case_status!=='OPEN'||c.current_accountable_domain!=='TSEO'
    ||!Number.isSafeInteger(c.ownership_epoch)||c.ownership_epoch<1)
    return blocked('CASE_SCOPE_REJECTED');

  if(!workflow || workflow.workflow_status!=='COMPLETED'
    || workflow.ownership_epoch!==c.ownership_epoch)
    return blocked('WORKFLOW_NOT_VERIFIED');

  if(!['DETERMINISTIC_RECONCILED','OPERATOR_REVIEWED'].includes(review?.state||'')
    ||!['AUTOMATED_SQL_RECONCILIATION_NO_LLM','OPERATOR_ASSISTED_CHATGPT']
      .includes(review?.reviewMethod||''))
    return blocked('INDEPENDENT_QA_NOT_YET_REQUESTABLE');

  const state=object(workflow.state_json);
  const evidence=object(state?.indexability_receipt);
  if(!release || !evidence || evidence.template!=='TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1'
    ||evidence.source!=='feya_search_releases_v1:ACTIVE'
    ||evidence.source_kind!=='canonical_release_intent_not_google_actual_indexing'
    ||evidence.coverage!=='COMPLETE'
    ||evidence.independent_agent_qa!=='NOT_RUN'
    ||evidence.model_calls!==0 || evidence.changes_applied!==0
    ||evidence.release_code!==release.releaseCode
    ||evidence.release_version!==release.releaseVersion
    ||evidence.intended_index!==release.intendedIndex
    ||evidence.intended_noindex!==release.intendedNoindex
    ||evidence.approved_product_bindings!==release.approvedProducts
    ||!Number.isSafeInteger(release.releaseVersion)||release.releaseVersion<1
    ||!Number.isSafeInteger(release.approvedProducts)||release.approvedProducts<1)
    return blocked('L0_EVIDENCE_NOT_VERIFIED');
  return {allowed:true,reason:'READY_FOR_HUMAN_QA_REQUEST'};
}
