import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { getActiveSearchEvidence } from '@/lib/owner-ui/activeSearchReleaseEvidenceServer';
import { gmelShadowReviewForCase } from '@/lib/owner-ui/gmelShadowReview';
import {
  parseShadowL0OwnerInput,
  validateShadowL0OwnerEvidence,
  SHADOW_L0_DECISIONS,
} from '@/lib/owner-ui/shadowL0OwnerDecision';
import type { GrowthHandoffRow } from '@/lib/types';

// Only explicit, authenticated HUMAN decisions about an existing L0 attention.
// No general owner-actions switch, model provider, case transitions or commerce.
const headers={
  'Cache-Control':'private, no-store',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
};
function reply(body:Record<string,unknown>,status=200) {
  return NextResponse.json(body,{status,headers});
}
export async function POST(request:NextRequest) {
  const actor=await requireOwnerActionActor('growth_shadow_work');
  if(!actor.ok)return reply({ok:false,code:actor.code,error:actor.error},actor.status);

  let input;
  try {
    input=parseShadowL0OwnerInput(await request.json());
  }catch{
    return reply({ok:false,code:'invalid_shadow_l0_decision'},400);
  }

  const {data:attention,error:attentionError}=await actor.service
    .from('feya_growth_owner_attention_v1')
    .select('attention_id,attention_type,attention_status,case_id,context_json')
    .eq('attention_id',input.attention_id).maybeSingle();

  if(attentionError)return reply({ok:false,code:'attention_read_unavailable'},503);
  if(!attention||attention.attention_type!=='HUMAN_ACTION'||
     attention.context_json?.signal_code!=='TSEO_SHADOW_L0_QA_REQUEST'||
     !attention.case_id) {
    return reply({ok:false,code:'not_a_shadow_l0_attention'},404);
  }

  const context=attention.context_json as Record<string,unknown>;
  const [caseResult,workflowResult,handoffResult,active]=await Promise.all([
    actor.service.from('feya_growth_cases_v1')
      .select('case_id,case_code,case_type,case_status,current_accountable_domain,ownership_epoch')
      .eq('case_id',attention.case_id).maybeSingle(),
    actor.service.from('feya_growth_workflow_runs_v1')
      .select('workflow_run_id,workflow_status,ownership_epoch,state_json')
      .eq('workflow_run_id',String(context.workflow_run_id||''))
      .eq('case_id',attention.case_id).maybeSingle(),
    actor.service.from('feya_growth_handoffs_v1')
      .select('handoff_id,case_id,ownership_epoch,source_domain,target_domain,handoff_status,expected_output_schema_code,result_json,completed_at,created_at')
      .eq('handoff_id',String(context.handoff_id||''))
      .eq('case_id',attention.case_id).maybeSingle(),
    getActiveSearchEvidence(),
  ]);
  if(caseResult.error||workflowResult.error||handoffResult.error) {
    return reply({ok:false,code:'shadow_l0_evidence_unavailable'},503);
  }

  const c=caseResult.data;
  const h=handoffResult.data as GrowthHandoffRow|null;
  const review=c ? gmelShadowReviewForCase(c,h?[h]:[]) : null;
  const verdict=validateShadowL0OwnerEvidence(
    attention,input.expected_status,c,workflowResult.data,h,review,active.value,
  );
  if(!verdict.allowed || !c || !workflowResult.data) {
    return reply({ok:false,code:'shadow_l0_evidence_stale',reason:verdict.reason},409);
  }

  const choice=SHADOW_L0_DECISIONS[input.decision];
  // The canonical Core function checks expected attention status and records
  // an append-only audit event. No Growth Case status change occurs.
  const {data,error}=await actor.service.rpc('feya_fn_transition_owner_attention_v1',{
    p_attention_id:input.attention_id,
    p_expected_status:input.expected_status,
    p_new_status:choice.status,
    p_human_user_id:actor.userId,
    p_decision_code:choice.code,
    p_reason:input.reason,
    p_resolution_json:{
      source:'OWNER_L0_SHADOW_DECISION',
      decision_scope:'INTERNAL_SEARCH_RELEASE_INTENT_ONLY',
      evidence_level:'L0_OBSERVATION',
      independent_agent_qa:'NOT_RUN',
      business_outcome_state:'NOT_MEASURABLE',
      actual_google_indexing_observable:false,
      model_calls:0,
      changes_applied:0,
      case_id:c.case_id,
      ownership_epoch:c.ownership_epoch,
      workflow_run_id:workflowResult.data?.workflow_run_id,
      handoff_id:h?.handoff_id,
    },
    p_idempotency_key:input.request_id,
  });
  if(error){
    const conflict=/stale|status|idempotenc|conflict/i.test(error.message||'');
    return reply({ok:false,code:conflict?'stale_attention_state':'owner_l0_transition_unavailable'},conflict?409:503);
  }
  const result=Array.isArray(data)?data[0]:data;
  if(!result || typeof result!=='object')
    return reply({ok:false,code:'owner_l0_receipt_unverified'},503);

  return reply({
    ok:true,
    attention_id:input.attention_id,
    attention_status:choice.status,
    decision_code:choice.code,
    message:'Решение владельца записано. Это действие не закрывает TSEO-кейс и не меняет AI, SEO или оплату.',
  });
}
