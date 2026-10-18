import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { getActiveSearchEvidence } from '@/lib/owner-ui/activeSearchReleaseEvidenceServer';
import { gmelShadowReviewForCase } from '@/lib/owner-ui/gmelShadowReview';
import { evaluateOwnerL0ReviewRequest } from '@/lib/owner-ui/shadowL0ReviewRequest';
import type { GrowthHandoffRow } from '@/lib/types';

// Requests one HUMAN QA decision for existing, completed L0 evidence. It does
// not run an LLM, close a Growth Case, publish SEO, or change source-health.
const headers = { 'Cache-Control': 'private, no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: Record<string, unknown>, status=200) =>
  NextResponse.json(body, { status, headers });

export async function POST(request: NextRequest) {
  const actor = await requireOwnerActionActor('growth_shadow_work');
  if (!actor.ok) return reply({ok:false, code:actor.code, error:actor.error},actor.status);

  let raw: unknown;
  try { raw = await request.json(); } catch {
    return reply({ok:false,code:'invalid_json'},400);
  }
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) {
    return reply({ok:false,code:'invalid_request'},400);
  }
  const fields = raw as Record<string,unknown>;
  if (Object.keys(fields).sort().join(',')!=='case_id,request_id'
    ||typeof fields.case_id!=='string' ||!UUID.test(fields.case_id)
    ||typeof fields.request_id!=='string' ||!UUID.test(fields.request_id)) {
    return reply({ok:false,code:'invalid_review_request'},400);
  }
  const caseId=fields.case_id;
  const requestId=fields.request_id;

  // Verify current canonical case, latest completed workflow and handoff
  // before even considering writing an Owner Attention record.
  const [caseResult, workflowResult, handoffResult] = await Promise.all([
    actor.service.from('feya_growth_cases_v1')
      .select('case_id,case_code,case_type,case_status,current_accountable_domain,ownership_epoch')
      .eq('case_id',caseId).maybeSingle(),
    actor.service.from('feya_growth_workflow_runs_v1')
      .select('workflow_run_id,workflow_status,ownership_epoch,state_json')
      .eq('case_id',caseId).eq('workflow_type','RECORD_INDEXABILITY_PROPOSAL')
      .order('created_at',{ascending:false}).limit(1).maybeSingle(),
    actor.service.from('feya_growth_handoffs_v1')
      .select('handoff_id,case_id,ownership_epoch,source_domain,target_domain,handoff_status,expected_output_schema_code,result_json,completed_at,created_at')
      .eq('case_id',caseId).order('created_at',{ascending:false}).limit(8),
  ]);
  if (caseResult.error||workflowResult.error||handoffResult.error) {
    return reply({ok:false,code:'shadow_review_evidence_unavailable'},503);
  }
  const c=caseResult.data, w=workflowResult.data;
  const handoffs=(handoffResult.data||[]) as GrowthHandoffRow[];
  const review=c ? gmelShadowReviewForCase(c,handoffs) : null;
  const active=await getActiveSearchEvidence();
  const evidence=evaluateOwnerL0ReviewRequest(c,w,review,active.value);
  if (!evidence.allowed||!c||!w||!review) {
    return reply({ok:false,code:'shadow_review_not_ready',reason:evidence.reason},409);
  }

  const handoff=handoffs.find(h =>
    h.case_id===caseId && h.ownership_epoch===c.ownership_epoch
    && h.source_domain==='TSEO' && h.target_domain==='GMEL'
    && h.expected_output_schema_code==='GMEL_RELEASE_EVIDENCE_SCOPE_V1'
    && h.handoff_status==='COMPLETED');
  if (!handoff || !UUID.test(handoff.handoff_id) || !UUID.test(w.workflow_run_id)) {
    return reply({ok:false,code:'shadow_review_handoff_missing'},409);
  }

  // Fixed server-generated key; a repeated click or network retry cannot
  // create competing OPEN attention items for the same case/epoch/receipt.
  const dedupKey='TSEO_L0_QA:'+caseId+':'+c.ownership_epoch+':'+w.workflow_run_id+':'+handoff.handoff_id;
  const {data,error}=await actor.service.rpc('feya_fn_enqueue_owner_attention_v1',{
    p_attention_type:'HUMAN_ACTION',
    p_title:'Проверить результат TSEO: внутренняя сверка Search Release',
    p_summary:'TSEO завершил внутреннюю L0-проверку; GMEL содержит только SQL/операторскую сверку, автономного AI-аудита нет.',
    p_required_action:'Проверьте факты по кейсу и решите, достаточно ли внутренней L0-сверки или нужен отдельный независимый QA. Это не доказательство индексации Google или роста продаж.',
    p_priority:'P3',
    p_case_id:caseId,
    p_decision_options_json:[],
    p_context_json:{
      signal_code:'TSEO_SHADOW_L0_QA_REQUEST',
      signal_type:'GROWTH_SHADOW',
      signal_scope:'INTERNAL_SEARCH_RELEASE_INTENT_ONLY',
      case_id:caseId,
      case_code:c.case_code,
      ownership_epoch:c.ownership_epoch,
      workflow_run_id:w.workflow_run_id,
      handoff_id:handoff.handoff_id,
      review_method:review.reviewMethod,
      evidence_level:'L0_OBSERVATION',
      actual_google_indexing_observable:false,
      model_calls:0,
      changes_applied:0,
      request_id:requestId,
    },
    p_dedup_key:dedupKey,
    p_created_by_type:'human',
    p_created_by_user_id:actor.userId,
  });
  const result=Array.isArray(data)?data[0]:data;
  if (error || !result || typeof result.attention_id!=='string'
    ||!UUID.test(result.attention_id)) {
    return reply({ok:false,code:'shadow_review_attention_unavailable'},503);
  }
  return reply({
    ok:true, status:'WAITING_HUMAN_QA', attention_id:result.attention_id,
    created_new:result.created_new===true,
    case_id:caseId,
    message:'Запрос на ручную проверку записан в Owner Attention. Кейс не закрыт, AI не запускался.',
  });
}
