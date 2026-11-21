/** FEYA Mission Control read-only UI selectors; never mutate canonical Case status. */
import type {MissionCase,MissionEvent,MissionRoleCode} from './missionControlProjection';

export type MissionWindow='all'|'24h'|'7d'|'10d'|'30d';
export type MissionEventKind='all'|'workflow'|'handoff'|'owner';
export type MissionActor=MissionRoleCode|'OWNER';
export type MissionStageStatus='recorded'|'current'|'unknown'|'attention';
export type MissionRouteStage={
  id:string;label:string;status:MissionStageStatus;caption:string;basis:string;
};

const WINDOWS:Record<Exclude<MissionWindow,'all'>,number>={
  '24h':1,'7d':7,'10d':10,'30d':30,
};
const KINDS=new Set<MissionEventKind>(['all','workflow','handoff','owner']);
const ACTORS=new Set<string>([
  'GROWTH_DIRECTOR','OSPM','SCO','CQA','TSEO','GMEL','GDAE','CPIM','OWNER',
]);

export function filterMissionHistory(
  events:readonly MissionEvent[],
  options:{window:MissionWindow;kind:MissionEventKind;actor:MissionActor|null;asOf:string|null},
):MissionEvent[]{
  if(!KINDS.has(options.kind))return [];
  if(options.actor!==null&&!ACTORS.has(options.actor))return [];
  if(options.window!=='all' && !(options.window in WINDOWS))return [];
  const now=options.asOf?Date.parse(options.asOf):NaN;
  if(options.window!=='all'&&!Number.isFinite(now))return [];
  const earliest=options.window==='all'?Number.NEGATIVE_INFINITY:
    now-WINDOWS[options.window]*86400000;
  return events.filter(event=>{
    const when=Date.parse(event.at);
    if(!Number.isFinite(when))return false;
    if(options.window!=='all'&&(when<earliest||when>now))return false;
    if(options.kind!=='all'&&event.kind!==options.kind)return false;
    if(options.actor!==null&&event.source!==options.actor&&event.target!==options.actor)return false;
    return true;
  });
}

/**
 * Case overview is intentionally LESS authoritative than the full existing
 * projectGrowthCaseRoute used by /admin/company/work/[id].
 * It does not claim independent QA, execution or outcomes from handoff/Workflow.
 */
export function missionCaseRouteStages(
  work:MissionCase,
  eventHistory:readonly MissionEvent[],
):MissionRouteStage[]{
  const events=eventHistory.filter(e=>e.caseId===work.id);
  const recordedHandoff=events.some(e=>e.kind==='handoff');
  const ownerDecision=events.some(e=>e.kind==='owner'&&e.phase==='owner_resolved');
  const ownerRequest=events.some(e=>e.kind==='owner'&&e.phase==='owner_requested');
  const status=work.status.toUpperCase();
  const ended=['CLOSED','CANCELLED','MERGED'].includes(status);
  const tech=work.workflowStatus.toUpperCase();
  return [
    {id:'case',label:'Бизнес-кейс',status:ended?'recorded':'current',
      caption:status==='OPEN'?'Кейс открыт':'Статус '+status,
      basis:'Сохранённое состояние Case (не workflow)'},
    {id:'technical',label:'Техническая работа',
      status:tech==='COMPLETED'?'recorded':tech==='FAILED'?'attention':
        tech==='RUNNING'?'current':'unknown',
      caption:tech==='COMPLETED'?'Технический шаг завершён':
        tech==='RUNNING'?'RUNNING по записи (не live)':
        tech==='FAILED'?'Записана ошибка этапа':'Состояние этапа не подтверждено',
      basis:'Статус технического workflow отдельно от Case'},
    {id:'handoff',label:'Передача работы',
      status:recordedHandoff?'recorded':'unknown',
      caption:recordedHandoff?'Есть сохранённая передача':'Передача не подтверждена этим снимком',
      basis:'Только зарегистрированный handoff между ролями'},
    {id:'owner',label:'Решение владельца',
      status:ownerDecision?'recorded':ownerRequest?'current':'unknown',
      caption:ownerDecision?'Решение записано (не утверждение выпуска)':
        ownerRequest?'Запрос зарегистрирован':'Решение здесь не подтверждено',
      basis:'Owner Attention / события решения; не замена approval'},
    {id:'qa',label:'Независимая проверка',status:'unknown',
      caption:'Требуется проверка в полной карточке',
      basis:'Передача не доказывает независимую QA'},
    {id:'execution',label:'Контролируемое исполнение',status:'unknown',
      caption:'Execution Receipt здесь не проверен',
      basis:'Публикация требует Core / Execution Gateway'},
    {id:'measurement',label:'Измерение и вывод',status:'unknown',
      caption:'Результат не установлен этим обзором',
      basis:'GMEL Spec/Outcome проверяются в полной карточке'},
  ];
}

export function missionCaseDeadline(dueAt:string|null,asOf:string|null):
  'not_set'|'unknown'|'due'|'overdue'{
  if(dueAt===null)return 'not_set';
  const due=Date.parse(dueAt);
  const now=asOf?Date.parse(asOf):NaN;
  if(!Number.isFinite(due)||!Number.isFinite(now))return 'unknown';
  return due<now?'overdue':'due';
}
