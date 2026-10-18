/**
 * One narrowly-scoped, owner-controlled Growth OS L0 decision.
 * Do NOT turn a stored SQL preflight into independent AI QA, Google indexing or case closure.
 */
import {
  evaluateOwnerL0ReviewRequest,
  type ShadowCase, type ShadowWorkflow, type ExistingShadowReview,
  type CurrentSearchRelease,
} from './shadowL0ReviewRequest.ts';

export const SHADOW_L0_SIGNAL='TSEO_SHADOW_L0_QA_REQUEST';
export const SHADOW_L0_DECISIONS={
  CONFIRM_INTERNAL_L0:{
    status:'RESOLVED',
    code:'CONFIRM_INTERNAL_L0_ONLY',
  },
  REQUEST_INDEPENDENT_QA:{
    status:'RESOLVED',
    code:'REQUEST_SEPARATE_INDEPENDENT_QA',
  },
  ACKNOWLEDGE_FOR_LATER:{
    status:'ACKNOWLEDGED',
    code:null,
  },
} as const;
export type ShadowL0Choice=keyof typeof SHADOW_L0_DECISIONS;
export type ShadowL0OwnerInput={
  attention_id:string;
  expected_status:'OPEN'|'ACKNOWLEDGED';
  decision:ShadowL0Choice;
  reason:string|null;
  request_id:string;
};
type L0Attention={
  attention_id:string;
  attention_type:string;
  attention_status:string;
  case_id:string|null;
  context_json:unknown;
};
type Workflow=ShadowWorkflow&{workflow_run_id:string};
type Handoff={
  handoff_id:string;case_id:string;ownership_epoch:number;source_domain:string;
  target_domain:string;handoff_status:string;expected_output_schema_code:string;
};
export type L0DecisionEvidence={
  allowed:boolean;
  reason:'READY'|'NOT_L0_ATTENTION'|'WRONG_STATE'|'STALE_IDENTITY'|
    'INVALID_CASE_OR_WORKFLOW'|'INVALID_HANDOFF'|'UNVERIFIED_RELEASE_EVIDENCE';
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=(v:unknown):v is Record<string,unknown> =>
  Boolean(v&&typeof v==='object'&&!Array.isArray(v));

export function parseShadowL0OwnerInput(raw:unknown):ShadowL0OwnerInput {
  if(!record(raw)||Object.keys(raw).sort().join(',')!==
    'attention_id,decision,expected_status,reason,request_id'||
    typeof raw.attention_id!=='string'||!UUID.test(raw.attention_id)||
    typeof raw.request_id!=='string'||!UUID.test(raw.request_id)||
    !['OPEN','ACKNOWLEDGED'].includes(String(raw.expected_status))||
    typeof raw.decision!=='string'||
    !Object.prototype.hasOwnProperty.call(SHADOW_L0_DECISIONS,raw.decision)||
    (raw.reason!==null&&typeof raw.reason!=='string'))throw new Error('invalid_shadow_l0_decision');

  const decision=raw.decision as ShadowL0Choice;
  const reason=typeof raw.reason==='string'?raw.reason.trim():null;
  if((reason!==null&&reason.length>500)||
     (decision!=='ACKNOWLEDGE_FOR_LATER'&&(!reason||reason.length<3))||
     (decision==='ACKNOWLEDGE_FOR_LATER'&&raw.expected_status!=='OPEN'))
    throw new Error('invalid_shadow_l0_reason');
  return {
    attention_id:raw.attention_id,request_id:raw.request_id,
    expected_status:raw.expected_status as ShadowL0OwnerInput['expected_status'],
    decision,reason,
  };
}

/**
 * Validate BOTH the persisted attention's source and the currently active
 * case+epoch+workflow+handoff+Search Release before calling the existing
 * status-CAS RPC. If any evidence has changed, fail closed; never auto-approve.
 */
export function validateShadowL0OwnerEvidence(
  attention:L0Attention|null,
  expectedStatus:ShadowL0OwnerInput['expected_status'],
  c:(ShadowCase&{case_code?:string})|null,
  workflow:Workflow|null,
  handoff:Handoff|null,
  review:ExistingShadowReview,
  release:CurrentSearchRelease|null,
):L0DecisionEvidence {
  const reject=(reason:L0DecisionEvidence['reason']):L0DecisionEvidence=>({allowed:false,reason});
  if(!attention||attention.attention_type!=='HUMAN_ACTION'||
     !record(attention.context_json)||
     attention.context_json.signal_code!==SHADOW_L0_SIGNAL||
     attention.context_json.signal_scope!=='INTERNAL_SEARCH_RELEASE_INTENT_ONLY')
    return reject('NOT_L0_ATTENTION');
  if(attention.attention_status!==expectedStatus)
    return reject('WRONG_STATE');
  if(!c||attention.case_id!==c.case_id||attention.context_json.case_id!==c.case_id||
     attention.context_json.case_code!==c.case_code||
     attention.context_json.ownership_epoch!==c.ownership_epoch)
    return reject('STALE_IDENTITY');
  if(!workflow||attention.context_json.workflow_run_id!==workflow.workflow_run_id)
    return reject('INVALID_CASE_OR_WORKFLOW');
  if(!handoff||attention.context_json.handoff_id!==handoff.handoff_id||
    handoff.case_id!==c.case_id||handoff.ownership_epoch!==c.ownership_epoch||
    handoff.source_domain!=='TSEO'||handoff.target_domain!=='GMEL'||
    handoff.handoff_status!=='COMPLETED'||
    handoff.expected_output_schema_code!=='GMEL_RELEASE_EVIDENCE_SCOPE_V1'||
    attention.context_json.review_method!==review?.reviewMethod)
    return reject('INVALID_HANDOFF');
  if(attention.context_json.evidence_level!=='L0_OBSERVATION'||
     attention.context_json.actual_google_indexing_observable!==false||
     attention.context_json.model_calls!==0||
     attention.context_json.changes_applied!==0||
     !evaluateOwnerL0ReviewRequest(c,workflow,review,release).allowed)
    return reject('UNVERIFIED_RELEASE_EVIDENCE');
  return {allowed:true,reason:'READY'};
}
