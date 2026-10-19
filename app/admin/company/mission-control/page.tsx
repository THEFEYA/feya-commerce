export const instant = false;

import { connection } from 'next/server';
import Link from 'next/link';
import { getAdminReadClient } from '@/lib/adminData';
import { buildMissionSnapshot, projectMissionOwnerAttention, type MissionRaw } from '@/lib/owner-ui/missionControlProjection';
import { MissionControlClient } from '@/components/admin/MissionControlClient';

/**
 * Owner-authenticated, capped, read-only projection. Zero new RPCs, migrations,
 * provider calls or model requests. Never forward raw json evidence or secrets.
 */
async function getSnapshot(){
  const db=getAdminReadClient();
  if(!db)return null;

  const [roles,cases,workflowEvents,handoffs,attention,attentionEvents,ownerAttention]=await Promise.all([
    db.from('feya_commerce_v_role_activation_safe_v1')
      .select('role_code,runtime_status,autonomy_ceiling')
      .order('role_code',{ascending:true}).limit(8),
    db.from('feya_commerce_v_owner_work_safe_v1')
      .select('case_id,case_code,title,case_status,current_accountable_domain,workflow_status,priority,due_at,updated_at,current_step_code,wait_reason,blocked_reason')
      .order('updated_at',{ascending:false}).limit(32),
    db.from('feya_commerce_v_growth_workflow_events_safe_v1')
      .select('workflow_event_id,case_id,event_type,created_at')
      .order('created_at',{ascending:false}).limit(100),
    db.from('feya_commerce_v_growth_handoffs_safe_v1')
      .select('handoff_id,case_id,source_domain,target_domain,handoff_status,created_at,completed_at')
      .order('created_at',{ascending:false}).limit(60),
    db.from('feya_commerce_v_owner_attention_safe_v3')
      .select('attention_id,case_id,attention_status,source_code,created_at')
      .eq('source_code','TSEO_SHADOW_L0_QA_REQUEST')
      .order('created_at',{ascending:false}).limit(40),
    db.from('feya_commerce_v_owner_attention_events_safe_v1')
      .select('attention_event_id,attention_id,to_status,decision_code,created_at')
      .order('created_at',{ascending:false}).limit(80),
    // Existing owner-safe source: capped preview; TSEO-only graph provenance above stays scoped.
    // Optional read error must NOT erase the graph or manufacture a zero.
    db.from('feya_commerce_v_owner_attention_safe_v2')
      .select('attention_id,attention_status,priority,title,source_code',{count:'exact'})
      .in('attention_status',['OPEN','ACKNOWLEDGED'])
      .order('priority',{ascending:true})
      .order('created_at',{ascending:true}).limit(3),
  ]);
  const outcomes=[roles,cases,workflowEvents,handoffs,attention,attentionEvents];
  if(outcomes.some(x=>x.error))return null;

  const data:MissionRaw={
    roles:(roles.data||[]) as Record<string,unknown>[],
    cases:(cases.data||[]) as Record<string,unknown>[],
    workflowEvents:(workflowEvents.data||[]) as Record<string,unknown>[],
    handoffs:(handoffs.data||[]) as Record<string,unknown>[],
    attention:(attention.data||[]) as Record<string,unknown>[],
    attentionEvents:(attentionEvents.data||[]) as Record<string,unknown>[],
  };
  return {
    ...buildMissionSnapshot(data),
    // Read time only; never present this as a source freshness watermark.
    capturedAt:new Date().toISOString(),
    ownerAttention:ownerAttention.error
      ?null
      :projectMissionOwnerAttention(
        (ownerAttention.data||[]) as Record<string,unknown>[],
        ownerAttention.count,
      ),
  };
}

export default async function MissionControlPage(){
  await connection();
  const snapshot=await getSnapshot();
  return <main className="owner-page"><div className="owner-page-inner">
    {snapshot?<MissionControlClient snapshot={snapshot}/>:(
      <section className="owner-card is-warning" role="status">
        <h1 className="owner-card-title">Командный центр недоступен</h1>
        <p className="owner-card-copy">Нет подтверждённого чтения owner-safe источников.
          Мы не показываем предполагаемую работу, выдуманные задачи и метрики.</p>
        <Link href="/admin/company/work">Вернуться к задачам</Link>
      </section>
    )}
  </div></main>;
}
