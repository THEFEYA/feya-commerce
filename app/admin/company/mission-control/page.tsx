import { connection } from 'next/server';
import Link from 'next/link';
import { getAdminReadClient } from '@/lib/adminData';
import { buildMissionSnapshot, type MissionRaw } from '@/lib/owner-ui/missionControlProjection';
import { MissionControlClient } from '@/components/admin/MissionControlClient';

/**
 * Owner-authenticated, capped, read-only projection. Zero new RPCs, migrations,
 * provider calls or model requests. Never forward raw json evidence or secrets.
 */
async function getSnapshot(){
  const db=getAdminReadClient();
  if(!db)return null;

  const [roles,cases,workflowEvents,handoffs,attention,attentionEvents]=await Promise.all([
    db.from('feya_commerce_v_role_activation_safe_v1')
      .select('role_code,runtime_status,autonomy_ceiling')
      .order('role_code',{ascending:true}).limit(8),
    db.from('feya_commerce_v_owner_work_safe_v1')
      .select('case_id,case_code,title,case_status,current_accountable_domain,workflow_status')
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
  return buildMissionSnapshot(data);
}

export default async function MissionControlPage(){
  await connection();
  const snapshot=await getSnapshot();
  return <main className="owner-page"><div className="owner-page-inner">
    <header className="owner-page-head">
      <div>
        <div className="owner-eyebrow">FEYA · Growth OS / визуальный командный центр</div>
        <h1>Mission Control</h1>
        <p>Восемь ролей, реальные передачи и история решений. Это визуализация существующих данных, а не новый исполнитель AI.</p>
      </div>
      <div className="owner-actions" style={{marginTop:0}}>
        <Link href="/admin/company/work" className="owner-button">К списку задач</Link>
        <Link href="/admin/roles" className="owner-button">Роли и права</Link>
      </div>
    </header>
    {snapshot?<MissionControlClient snapshot={snapshot}/>:(
      <section className="owner-card is-warning" role="status">
        <h2 className="owner-card-title">Данные команды временно недоступны</h2>
        <p className="owner-card-copy">Нет подтверждённого чтения owner-safe источников. Не показываем выдуманную работу, граф и цифры.</p>
      </section>
    )}
  </div></main>;
}
