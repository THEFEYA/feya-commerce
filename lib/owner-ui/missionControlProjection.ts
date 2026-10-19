/**
 * FEYA Mission Control — read-only event projection from existing owner-safe views.
 * One technical workflow completion never means a whole Growth Case was closed,
 * nor does SHADOW role status mean a model is currently running.
 * No client/server-side mutation, subscriptions, synthetic demo events or timers.
 */
export const MISSION_ROLE_CODES = [
  'GROWTH_DIRECTOR','OSPM','SCO','CQA','TSEO','GMEL','GDAE','CPIM',
] as const;
export type MissionRoleCode = typeof MISSION_ROLE_CODES[number];
const roleLabels: Record<MissionRoleCode,string> = {
  GROWTH_DIRECTOR:'Growth Director',OSPM:'Organic Search Portfolio',SCO:'SEO Content',
  CQA:'Content Quality',TSEO:'Technical SEO',GMEL:'Measurement & Learning',
  GDAE:'Data & Analytics',CPIM:'Commerce Intelligence',
};

type UnknownRow = Record<string,unknown>;
export type MissionRole = {
  code:MissionRoleCode;label:string;mode:string;autonomy:string;
  openCases:number;runningWorkflows:number;reviewPending:number;
};
export type MissionCase = {
  id:string;code:string;title:string;owner:MissionRoleCode;status:string;
  workflowStatus:string;attentionId:string|null;
};
export type MissionEvent = {
  id:string;caseId:string;caseCode:string;at:string;
  kind:'workflow'|'handoff'|'owner';phase:string;title:string;
  source:MissionRoleCode|'OWNER';target:MissionRoleCode|'OWNER'|null;
  attentionId:string|null;
};
export type MissionSnapshot = {
  roles:MissionRole[];cases:MissionCase[];events:MissionEvent[];
  totalOpenCases:number;currentlyRunning:number;historicalHandoffs:number;
  historyOnly:true;liveAgentExecutionProven:false;
};

export type MissionRaw = {
  roles:readonly UnknownRow[];cases:readonly UnknownRow[];
  workflowEvents:readonly UnknownRow[];handoffs:readonly UnknownRow[];
  attention:readonly UnknownRow[];attentionEvents:readonly UnknownRow[];
};
const roleSet=new Set<string>(MISSION_ROLE_CODES);
const finished=new Set(['CLOSED','CANCELLED','MERGED']);
function string(value:unknown,max=180):string {
  return typeof value==='string'?value.slice(0,max).trim():'';
}
function role(value:unknown):MissionRoleCode|null {
  const code=string(value,50);
  return roleSet.has(code)?code as MissionRoleCode:null;
}
function safeTime(value:unknown):string|null{
  const raw=string(value,64);
  if(!raw||!Number.isFinite(Date.parse(raw)))return null;
  return new Date(raw).toISOString();
}
function isOpenCase(status:string){return Boolean(status&&!finished.has(status));}
function knownRow(row:UnknownRow|undefined|null):row is UnknownRow{
  return Boolean(row&&typeof row==='object'&&!Array.isArray(row));
}

export function buildMissionSnapshot(raw:MissionRaw):MissionSnapshot{
  const caseMap=new Map<string,MissionCase>();
  const roleRows=new Map(raw.roles.map(row=>[string(row.role_code,50),row]));
  const attentionByCase=new Map<string,string>();
  const allowedAttention=raw.attention.filter(row=>
    string(row.source_code)==='TSEO_SHADOW_L0_QA_REQUEST' && string(row.case_id));
  for(const item of allowedAttention) {
    const id=string(item.case_id,48);
    const attentionId=string(item.attention_id,48);
    if(id&&attentionId)attentionByCase.set(id,attentionId);
  }

  for(const row of raw.cases) {
    const id=string(row.case_id,48);
    const owner=role(row.current_accountable_domain);
    const status=string(row.case_status,48).toUpperCase();
    if(!id||!owner||!status||caseMap.has(id))continue;
    caseMap.set(id,{
      id,owner,status,
      code:string(row.case_code,80)||'Кейс',
      title:string(row.title,140)||'Работа FEYA',
      workflowStatus:string(row.workflow_status,48).toUpperCase(),
      attentionId:attentionByCase.get(id)||null,
    });
  }

  const roles:MissionRole[]=MISSION_ROLE_CODES.map(code=>{
    const row=roleRows.get(code);
    const cases=[...caseMap.values()].filter(c=>c.owner===code&&isOpenCase(c.status));
    return {
      code,label:roleLabels[code],mode:row?string(row.runtime_status,35)||'UNKNOWN':'UNKNOWN',
      autonomy:row?string(row.autonomy_ceiling,50)||'UNKNOWN':'UNKNOWN',
      openCases:cases.length,
      runningWorkflows:cases.filter(c=>c.workflowStatus==='RUNNING').length,
      reviewPending:cases.filter(c=>c.workflowStatus==='COMPLETED').length,
    };
  });

  const events:MissionEvent[]=[];
  const add=(event:MissionEvent)=>{
    if(!safeTime(event.at)||!caseMap.has(event.caseId))return;
    events.push({...event,at:safeTime(event.at)!});
  };

  const steps:Record<string,{phase:string;title:string}>={
    WORKFLOW_CREATED:{phase:'queued',title:'Техническая задача зарегистрирована'},
    WORKFLOW_CLAIMED:{phase:'running',title:'Технический workflow был запущен'},
    WORKFLOW_COMPLETED:{phase:'step_complete',title:'Технический этап завершён'},
    WORKFLOW_FAILED:{phase:'error',title:'Ошибка технического этапа'},
    WORKFLOW_RETRY_SCHEDULED:{phase:'waiting',title:'Запланирован повтор шага'},
  };
  for(const row of raw.workflowEvents) {
    const c=caseMap.get(string(row.case_id,48));
    const code=string(row.event_type,70);
    const label=steps[code];
    const at=safeTime(row.created_at);
    const id=string(row.workflow_event_id,48);
    if(!c||!id||!at||!label)continue;
    add({id:'wf:'+id,caseId:c.id,caseCode:c.code,at,kind:'workflow',
      phase:label.phase,title:label.title,source:c.owner,target:null,attentionId:null});
  }

  let handoffCount=0;
  for(const row of raw.handoffs) {
    const c=caseMap.get(string(row.case_id,48));
    const from=role(row.source_domain),to=role(row.target_domain);
    const id=string(row.handoff_id,48),created=safeTime(row.created_at),
      completed=safeTime(row.completed_at);
    const state=string(row.handoff_status,40).toUpperCase();
    if(!c||!from||!to||!id||!created)continue;
    handoffCount++;
    // Only a persisted handoff draws a graph connection. No model-run claim.
    if(!completed||created!==completed){
      add({id:'handoff-open:'+id,caseId:c.id,caseCode:c.code,at:created,
        kind:'handoff',phase:'handoff_created',title:'Передача между ролями зафиксирована',
        source:from,target:to,attentionId:null});
    }
    if(state==='COMPLETED'&&completed){
      add({id:'handoff-done:'+id,caseId:c.id,caseCode:c.code,at:completed,
        kind:'handoff',phase:'handoff_complete',
        title:'Записано завершение передачи (не доказательство AI-анализа)',
        source:from,target:to,attentionId:null});
    }
    if(state==='STALE'){
      add({id:'handoff-stale:'+id,caseId:c.id,caseCode:c.code,at:completed||created,
        kind:'handoff',phase:'stale',title:'Передача признана устаревшей',
        source:from,target:to,attentionId:null});
    }
  }

  for(const row of allowedAttention) {
    const c=caseMap.get(string(row.case_id,48));
    const attentionId=string(row.attention_id,48);
    const created=safeTime(row.created_at);
    if(!c||!attentionId||!created)continue;
    add({id:'owner-request:'+attentionId,caseId:c.id,caseCode:c.code,at:created,
      kind:'owner',phase:'owner_requested',
      title:'Владелец запросил проверку L0',source:c.owner,target:'OWNER',attentionId});
  }
  const attentionIDs=new Set(allowedAttention.map(x=>string(x.attention_id,48)));
  for(const row of raw.attentionEvents){
    const attentionId=string(row.attention_id,48);
    const a=allowedAttention.find(x=>string(x.attention_id,48)===attentionId);
    const c=a?caseMap.get(string(a.case_id,48)):null;
    const at=safeTime(row.created_at),id=string(row.attention_event_id,48);
    if(!attentionIDs.has(attentionId)||!c||!at||!id)continue;
    const state=string(row.to_status,40).toUpperCase();
    const decision=string(row.decision_code,65);
    if(state!=='RESOLVED'&&state!=='ACKNOWLEDGED'&&state!=='CANCELLED')continue;
    add({id:'owner-decision:'+id,caseId:c.id,caseCode:c.code,at,
      kind:'owner',phase:state==='RESOLVED'?'owner_resolved':'owner_waiting',
      title:decision==='CONFIRM_INTERNAL_L0_ONLY'
        ? 'Владелец подтвердил только внутреннюю L0-сверку'
        : state==='ACKNOWLEDGED'?'Владелец принял вопрос к рассмотрению'
          : 'Решение владельца записано (без закрытия кейса)',
      source:'OWNER',target:null,attentionId});
  }
  events.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
  const allCases=[...caseMap.values()];
  return {
    roles,cases:allCases,events:events.slice(-80),
    totalOpenCases:allCases.filter(c=>isOpenCase(c.status)).length,
    currentlyRunning:roles.reduce((n,r)=>n+r.runningWorkflows,0),
    historicalHandoffs:handoffCount,
    historyOnly:true,liveAgentExecutionProven:false,
  };
}

/**
 * UI-only case focus: never changes Case state, owner, or event history.
 * Unknown case IDs fail closed instead of showing another Case's records.
 */
export function missionEventsForCase(
  snapshot:Pick<MissionSnapshot,'cases'|'events'>,
  caseId:string|null,
):MissionEvent[]{
  if(caseId===null)return snapshot.events;
  if(!snapshot.cases.some(c=>c.id===caseId))return [];
  return snapshot.events.filter(e=>e.caseId===caseId);
}
