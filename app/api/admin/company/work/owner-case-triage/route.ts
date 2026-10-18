import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { getActiveSearchEvidence } from '@/lib/owner-ui/activeSearchReleaseEvidenceServer';
import { gmelShadowReviewForCase } from '@/lib/owner-ui/gmelShadowReview';
import type { GrowthHandoffRow } from '@/lib/types';
import {
  parseOwnerCaseTriageInput, checkOwnerCaseTriageEvidence,
  ownerCaseTriageIdempotencyKey, attestOwnerCaseTriageWrite,
  type CaseTriageInput,
} from '@/lib/owner-ui/growthCaseTriage';

const headers={
  'Cache-Control':'private, no-store',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
};
const reply=(body:Record<string,unknown>,status=200)=>
  NextResponse.json(body,{status,headers});

/**
 * G2b: Owner-authorized ONLY, one OPEN→TRIAGED TSEO case state transition.
 * Reuses canonical service-role Core FSM; no new case table, model, payment,
 * deployment or SEO mutation. The separate triage capability is DEFAULT OFF.
 */
export async function POST(request:NextRequest) {
  // Cookie-based actions require a real same-origin browser request, not a
  // cross-origin form POST. Admin auth and owner allowlist remain mandatory.
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return reply({ok:false,code:'case_triage_origin_denied'},403);
  const actor=await requireOwnerActionActor('growth_case_triage');
  if (!actor.ok) return reply({ok:false,code:actor.code,error:actor.error},actor.status);

  let input:CaseTriageInput;
  try {
    input=parseOwnerCaseTriageInput(await request.json());
  } catch {
    return reply({ok:false,code:'invalid_case_triage_request'},400);
  }
  // A human identity is bound into the immutable idempotency fingerprint.
  let key:string;
  try {
    key=ownerCaseTriageIdempotencyKey(input,actor.userId);
  } catch {
    return reply({ok:false,code:'invalid_owner_identity'},403);
  }

  const caseResponse=await actor.service.from('feya_growth_cases_v1')
    .select('case_id,case_code,case_type,case_status,current_accountable_domain,ownership_epoch')
    .eq('case_id',input.case_id).maybeSingle();
  if (caseResponse.error) return reply({ok:false,code:'case_triage_case_unavailable'},503);
  const c=caseResponse.data;
  if (!c) return reply({ok:false,code:'case_triage_case_missing'},404);

  /**
   * Immutable event readback is authoritative even if an earlier POST timed
   * out after DB commit. No second mutation and no blind retry are needed.
   */
  async function verifyPersisted(receipt:unknown) {
    const [caseState, eventResult] = await Promise.all([
      actor.service.from('feya_growth_cases_v1')
        .select('case_id,case_status,current_accountable_domain,ownership_epoch')
        .eq('case_id',input.case_id).maybeSingle(),
      actor.service.from('feya_growth_case_events_v1')
        .select('case_id,event_type,from_status,to_status,ownership_epoch,actor_type,actor_user_id,reason,idempotency_key')
        .eq('case_id',input.case_id).eq('idempotency_key',key)
        .eq('event_type','STATUS_TRANSITIONED').limit(2),
    ]);
    if (caseState.error||eventResult.error) return 'UNKNOWN' as const;
    const result=attestOwnerCaseTriageWrite(input,actor.userId,
      (receipt && typeof receipt==='object' && !Array.isArray(receipt))
        ? receipt as Record<string,unknown> : null,
      caseState.data, eventResult.data||[]);
    return result?'VERIFIED' as const:'NOT_VERIFIED' as const;
  }

  if (c.case_status==='TRIAGED') {
    const replay=await verifyPersisted(null);
    if(replay==='VERIFIED')return reply({
      ok:true,case_id:input.case_id,case_status:'TRIAGED',
      replayed:true,message:'Ранее принятое решение подтверждено журналом. Новых изменений нет.',
    });
    return reply({ok:false,code:replay==='UNKNOWN'?'case_triage_readback_unavailable':'case_triage_stale_or_different_intent'},
      replay==='UNKNOWN'?503:409);
  }
  if(c.case_status!=='OPEN')return reply({ok:false,code:'case_triage_not_open'},409);

  const [caseEvents, workflows, handoffs, attentions, active] = await Promise.all([
    actor.service.from('feya_growth_case_events_v1')
      .select('case_event_id,case_id,event_type,to_status,ownership_epoch,created_at')
      .eq('case_id',input.case_id).order('created_at',{ascending:false}).limit(1),
    actor.service.from('feya_growth_workflow_runs_v1')
      .select('workflow_run_id,workflow_type,workflow_status,ownership_epoch,state_json')
      .eq('case_id',input.case_id).eq('workflow_type','RECORD_INDEXABILITY_PROPOSAL')
      .order('created_at',{ascending:false}).limit(1).maybeSingle(),
    actor.service.from('feya_growth_handoffs_v1')
      .select('handoff_id,case_id,ownership_epoch,source_domain,target_domain,handoff_status,expected_output_schema_code,result_json,created_at,completed_at')
      .eq('case_id',input.case_id).order('created_at',{ascending:false}).limit(8),
    actor.service.from('feya_growth_owner_attention_v1')
      .select('attention_id,case_id,attention_type,attention_status,context_json,resolution_json,created_at')
      .eq('case_id',input.case_id).order('created_at',{ascending:false}).limit(8),
    getActiveSearchEvidence(),
  ]);
  if(caseEvents.error||workflows.error||handoffs.error||attentions.error||active.error)
    return reply({ok:false,code:'case_triage_source_unavailable'},503);

  const cEvent=caseEvents.data?.[0]??null;
  const w=workflows.data??null;
  const hs=(handoffs.data||[]) as GrowthHandoffRow[];
  const review=gmelShadowReviewForCase(c,hs);
  const currentAttentions=(attentions.data||[]).filter(x=>
    x.attention_type==='HUMAN_ACTION' &&
    x.context_json && typeof x.context_json==='object' &&
    !Array.isArray(x.context_json) &&
    (x.context_json as Record<string,unknown>).signal_code==='TSEO_SHADOW_L0_QA_REQUEST');
  if (currentAttentions.length!==1)
    return reply({ok:false,code:'case_triage_ambiguous_owner_decision'},409);
  const a=currentAttentions[0];
  const ctx=(a.context_json||{}) as Record<string,unknown>;
  const h=hs.find(x=>x.handoff_id===ctx.handoff_id)??null;

  const decisionEvents=await actor.service.from('feya_growth_owner_attention_events_v1')
    .select('attention_id,event_type,to_status,decision_code,actor_user_id,created_at')
    .eq('attention_id',a.attention_id).order('created_at',{ascending:false}).limit(2);
  if (decisionEvents.error)
    return reply({ok:false,code:'case_triage_owner_evidence_unavailable'},503);

  const verdict=checkOwnerCaseTriageEvidence(input,{
    caseRow:c,latestCaseEvent:cEvent,workflow:w,handoff:h,
    review,activeSearch:active.value,
    attention:a,latestAttentionEvent:decisionEvents.data?.[0]??null,
  });
  if(!verdict.allowed)
    return reply({ok:false,code:'case_triage_preflight_denied',reason:verdict.reason},409);

  // All non-DB guards passed. Existing Core checks status+ownership epoch
  // atomically, stores immutable human event, and rejects OPEN→CLOSED.
  const {data,error}=await actor.service.rpc('feya_fn_transition_growth_case_v1',{
    p_case_id:input.case_id,
    p_expected_status:'OPEN',
    p_expected_ownership_epoch:input.expected_ownership_epoch,
    p_new_status:'TRIAGED',
    p_reason:input.reason,
    p_actor_type:'human',
    p_actor_user_id:actor.userId,
    p_idempotency_key:key,
  });
  const receipt=Array.isArray(data)?data[0]:data;
  // The Core replay path can return an older receipt before validating the
  // new intent. Never trust an RPC row without exact event/current readback.
  const attested=await verifyPersisted(error?null:receipt);
  if(attested==='VERIFIED')return reply({
    ok:true,case_id:input.case_id,case_status:'TRIAGED',
    message:'Кейс принят на этап TRIAGED. Независимая QA и коммерческий результат ещё не подтверждены.',
  });
  if (attested==='UNKNOWN')
    return reply({ok:false,code:'case_triage_write_not_yet_verifiable',
      message:'Состояние записи неизвестно. Повторите проверку с тем же идентификатором, не создавая новый запрос.'},503);
  return reply({ok:false,code:error?'case_triage_core_rejected':'case_triage_receipt_mismatch',
    message:'Переход не подтверждён журналом. Система не считает кейс изменённым до проверки.'},
    error?409:503);
}
