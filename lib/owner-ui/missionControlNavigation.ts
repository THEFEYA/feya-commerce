/** FEYA Owner Navigation: three views of the SAME canonical Growth Core.
 * This only creates/reads safe internal URLs. It cannot create a case, activate
 * an agent, grant permission, or mark a result completed.
 */
import {MISSION_ROLE_CODES,type MissionSnapshot,type MissionRoleCode}
  from './missionControlProjection';

export type MissionView='graph'|'case'|'office';
export type MissionParticipant=MissionRoleCode|'OWNER';
export type MissionEntry={
  view:MissionView;
  caseId:string|null;
  role:MissionParticipant;
};
type QueryValue=string|string[]|undefined;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const roles=new Set<string>([...MISSION_ROLE_CODES,'OWNER']);
const views=new Set<MissionView>(['graph','case','office']);

export function missionControlHref(options:{
  view?:MissionView;
  caseId?:string|null;
  role?:string|null;
}={}):string{
  const query=new URLSearchParams();
  if(options.view&&views.has(options.view)&&options.view!=='graph')
    query.set('view',options.view);
  if(options.caseId&&UUID.test(options.caseId))
    query.set('case',options.caseId);
  if(options.role&&roles.has(options.role))
    query.set('role',options.role);
  const qs=query.toString();
  return '/admin/company/mission-control'+(qs?'?'+qs:'');
}
/** Validate URL intent against the actual bounded owner-safe snapshot. */
export function resolveMissionEntry(
  params:{view?:QueryValue;case?:QueryValue;role?:QueryValue},
  snapshot:MissionSnapshot,
):MissionEntry{
  const get=(value:QueryValue)=>typeof value==='string'?value:'';
  const requestedCase=get(params.case);
  const work=UUID.test(requestedCase)
    ?snapshot.cases.find(c=>c.id===requestedCase):undefined;
  const candidate=get(params.role);
  const validatedRole=(candidate==='OWNER'||(
    roles.has(candidate)&&snapshot.roles.some(r=>r.code===candidate)))
    ?candidate as MissionParticipant:null;
  const viewCandidate=get(params.view);
  const requestedView=views.has(viewCandidate as MissionView)
    ?viewCandidate as MissionView:'graph';
  const view=requestedView==='case'&&!work?'graph':requestedView;
  const role=validatedRole||work?.owner||
    (snapshot.roles.some(r=>r.code==='TSEO')?'TSEO':
      snapshot.roles[0]?.code||'OWNER');
  return {view,caseId:work?.id||null,role};
}
