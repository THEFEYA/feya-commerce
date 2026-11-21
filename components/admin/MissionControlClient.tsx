'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {
  Activity,ArrowLeft,ArrowRight,BarChart3,BriefcaseBusiness,CheckCircle2,
  ChevronRight,Clock3,Command,Eye,Filter,GitBranch,LayoutDashboard,Maximize2,
  Network,Pause,Play,RotateCcw,Search,Settings2,ShieldCheck,
  Sparkles,UserRound,Users,Waypoints,ZoomIn,ZoomOut,
} from 'lucide-react';
import {missionEventsForCase,type MissionSnapshot,type MissionRoleCode,type MissionEvent}
  from '@/lib/owner-ui/missionControlProjection';
import type {MissionEntry} from '@/lib/owner-ui/missionControlNavigation';
import {missionRolePresentation,missionOrganizationalLinks}
  from '@/lib/owner-ui/missionRolePresentation';
import {filterMissionHistory,type MissionWindow,type MissionEventKind,type MissionActor}
  from '@/lib/owner-ui/missionControlView';
import {signalCopy} from '@/lib/owner-ui/terminology';
import {MissionRobotPortrait} from './MissionRobotPortrait';
import {MissionCaseRouteClient,MissionCaseDecisionPanel} from './MissionCaseRouteClient';
import {MissionRoleInspector} from './MissionRoleInspector';
import styles from './MissionControl.module.css';

type Role=MissionRoleCode|'OWNER';
type Mode='graph'|'office'|'case';
type Point={x:number;y:number};
type RoleFilter='all'|'shadow'|'inactive'|'with_cases';
const coord:Record<Role,Point>={
  GROWTH_DIRECTOR:{x:139,y:134},OSPM:{x:381,y:134},
  SCO:{x:623,y:134},CQA:{x:865,y:134},
  TSEO:{x:139,y:402},GMEL:{x:381,y:402},
  GDAE:{x:623,y:402},CPIM:{x:865,y:402},
  OWNER:{x:865,y:599},
};
const roleState:Record<string,string>={
  SHADOW:'Наблюдение',INACTIVE:'Не активирован',ACTIVE:'Активирован',
  PAUSED:'Приостановлен',UNKNOWN:'Статус неизвестен',
};
const join=(...xs:Array<string|false|undefined>)=>xs.filter(Boolean).join(' ');
const roleName=(role:Role)=>role==='OWNER'?'Владелец FEYA':missionRolePresentation[role].name;
const relationLabels:Record<string,string>={
  'GROWTH_DIRECTOR>OSPM':'Цели поиска',
  'OSPM>SCO':'Темы и ТЗ',
  'SCO>CQA':'Проверка',
  'TSEO>GMEL':'Результат L0',
  'GDAE>GMEL':'Качество данных',
  'CPIM>GMEL':'Бизнес-эффект',
};
const roleLabelCoords:Record<string,{x:number;y:number}>={
  'GROWTH_DIRECTOR>OSPM':{x:260,y:134},
  'OSPM>SCO':{x:503,y:134},
  'SCO>CQA':{x:745,y:134},
  'TSEO>GMEL':{x:255,y:402},
  'GDAE>GMEL':{x:506,y:364},
  'CPIM>GMEL':{x:735,y:474},
};
function edgePath(a:Point,b:Point){
  const mid=(a.x+b.x)/2;
  return 'M '+a.x+' '+a.y+' C '+mid+' '+a.y+', '+mid+' '+b.y+', '+b.x+' '+b.y;
}
function timeLabel(at:string){
  const date=new Date(at);
  return Number.isFinite(date.getTime())
    ?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(date)
    :'Время неизвестно';
}
function historyName(event:MissionEvent){
  return event.kind==='owner'?'Владелец':
    event.kind==='handoff'?'Передача':'Техническая работа';
}

export function MissionControlClient({snapshot,entry}:{
  snapshot:MissionSnapshot;entry:MissionEntry;
}){
  const [mode,setMode]=useState<Mode>(entry.view);
  const [caseFocus,setCaseFocus]=useState<string|null>(entry.caseId);
  const [selected,setSelected]=useState<Role>(entry.role);
  const [roleFilter,setRoleFilter]=useState<RoleFilter>('all');
  const [showPolicyLinks,setShowPolicyLinks]=useState(true);
  const [mobileMap,setMobileMap]=useState(false);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState<Point>({x:0,y:0});
  const [inspectorExpanded,setInspectorExpanded]=useState(false);
  const [openAttention,setOpenAttention]=useState(false);
  const [motion,setMotion]=useState(true);
  const [playing,setPlaying]=useState(false);
  const [step,setStep]=useState(0);
  const [historyWindow,setHistoryWindow]=useState<MissionWindow>('all');
  const [historyKind,setHistoryKind]=useState<MissionEventKind>('all');
  const [historyActor,setHistoryActor]=useState<MissionActor|null>(null);
  const drag=useRef<{id:number;x:number;y:number;origin:Point}|null>(null);

  const focusedCase=snapshot.cases.find(x=>x.id===caseFocus)||null;
  const focusedEvents=useMemo(()=>missionEventsForCase(snapshot,caseFocus),[snapshot,caseFocus]);
  const historyEvents=useMemo(()=>filterMissionHistory(focusedEvents,{
    window:historyWindow,kind:historyKind,actor:historyActor,asOf:snapshot.capturedAt||null,
  }),[focusedEvents,historyWindow,historyKind,historyActor,snapshot.capturedAt]);
  const current=historyEvents[Math.min(step,historyEvents.length-1)]||null;
  const activeRoles=snapshot.roles.filter(r=>r.mode!=='INACTIVE');
  const historicalHandoffs=snapshot.historicalHandoffs;
  const currentCase=snapshot.cases.find(c=>c.owner===selected)||snapshot.cases[0]||null;
  const caseAttention=snapshot.ownerAttention?.total;
  const shadowCount=snapshot.roles.filter(x=>x.mode==='SHADOW').length;

  useEffect(()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setMotion(false);
  },[]);
  useEffect(()=>{
    if(!playing||historyEvents.length===0)return;
    const timer=window.setInterval(()=>setStep(n=>{
      if(n>=historyEvents.length-1){setPlaying(false);return n;}
      return n+1;
    }),motion?1600:2600);
    return ()=>window.clearInterval(timer);
  },[playing,historyEvents.length,motion]);

  const connections=useMemo(()=>{
    const index=new Map<string,{source:Role;target:Role;kind:'handoff'|'owner'}>();
    focusedEvents.forEach(e=>{
      if(e.target&&(e.kind==='handoff'||(e.kind==='owner'&&e.phase==='owner_requested'))){
        const key=e.source+'>'+e.target;
        index.set(key,{source:e.source,target:e.target,kind:e.kind==='owner'?'owner':'handoff'});
      }
    });
    return [...index.values()];
  },[focusedEvents]);
  const highlighted=current?.target?current.source+'>'+current.target:null;

  function selectRole(next:Role){setSelected(next);}
  function chooseCase(id:string){
    const found=snapshot.cases.find(c=>c.id===id)||null;
    setCaseFocus(found?.id||null);
    setPlaying(false);setStep(0);
    if(found)setSelected(found.owner);
    if(!found&&mode==='case')setMode('graph');
  }
  function openCaseRoute(id?:string){
    const found=snapshot.cases.find(c=>c.id===id)||(focusedCase||currentCase);
    if(!found){setMode('case');return;}
    setCaseFocus(found.id);setSelected(found.owner);
    setMode('case');setPlaying(false);setStep(0);
  }
  function selectHistory(index:number){
    const ev=historyEvents[index];if(!ev)return;
    setStep(index);setPlaying(false);setSelected(ev.source);
  }
  function setHistoryView(next:MissionWindow){
    setHistoryWindow(next);setStep(0);setPlaying(false);
  }
  function play(){
    if(!historyEvents.length)return;
    setStep(0);setSelected(historyEvents[0].source);setPlaying(true);
  }
  function pointerDown(e:ReactPointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest('button,a,input,select'))return;
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:pan};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e:ReactPointerEvent<HTMLDivElement>){
    const d=drag.current;if(!d||d.id!==e.pointerId)return;
    setPan({x:d.origin.x+e.clientX-d.x,y:d.origin.y+e.clientY-d.y});
  }
  function pointerEnd(e:ReactPointerEvent<HTMLDivElement>){
    if(drag.current?.id===e.pointerId)drag.current=null;
  }
  const roleAllowed=(r:typeof snapshot.roles[number])=>
    roleFilter==='all'||roleFilter==='shadow'&&r.mode==='SHADOW'
    ||roleFilter==='inactive'&&r.mode==='INACTIVE'
    ||roleFilter==='with_cases'&&r.openCases>0;
  const activeSelection=(r:Role)=>selected===r;
  const focusParticipants=new Set<Role>();
  if(focusedCase)focusParticipants.add(focusedCase.owner);
  focusedEvents.forEach(e=>{focusParticipants.add(e.source);if(e.target)focusParticipants.add(e.target);});

  return <div className={styles.wrapper}>
    <header className={styles.commandHead}>
      <div className={styles.commandIdentity}>
        <span className={styles.commandEyebrow}><Sparkles size={13}/> FEYA · GROWTH OS / ЦЕНТР УПРАВЛЕНИЯ</span>
        <div><h1>Командный центр</h1><span className={styles.previewTag}>ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ</span></div>
      </div>
      <div className={styles.commandHeadRight}>
        <span className={styles.sourceStatus}><Eye size={14}/> Сохранённые данные · не прямой эфир</span>
        <Link href="/admin/company/owner-attention"><ShieldCheck size={15}/> Решения: {caseAttention===undefined?'—':caseAttention}</Link>
        {focusedCase?<Link href={'/admin/company/work/'+focusedCase.id}>
          <BriefcaseBusiness size={15}/> Открыть {focusedCase.code}
        </Link>:null}
        <Link href="/admin/company/work"><BriefcaseBusiness size={15}/> Все кейсы</Link>
        <Link href="/admin/roles"><Settings2 size={15}/> Права</Link>
      </div>
    </header>

    <div className={styles.topModes} role="group" aria-label="Разделы командного центра">
      <button type="button" aria-pressed={mode==='graph'} onClick={()=>{setMode('graph');setPlaying(false)}}>
        <Network size={18}/> Схема взаимодействий</button>
      <button type="button" aria-pressed={mode==='case'} onClick={()=>openCaseRoute()}>
        <Waypoints size={18}/> Маршрут кейса</button>
      <button type="button" aria-pressed={mode==='office'} onClick={()=>{setMode('office');setPlaying(false)}}>
        <LayoutDashboard size={18}/> Офис команды</button>
      <button type="button" className={styles.openHistoryButton}
        onClick={()=>document.getElementById('feya-mission-history')?.scrollIntoView({behavior:'smooth',block:'start'})}>
        <Clock3 size={17}/> История и фильтры</button>
    </div>

    <div className={join(styles.workspace,inspectorExpanded&&styles.inspectorExpanded,mode==='case'&&styles.caseWorkspace)}>
      <section className={join(styles.stageArea,mode==='office'&&styles.officeMode,mode==='case'&&styles.caseMode,
        mobileMap&&styles.mobileMapOpen)} aria-label="Интерактивное рабочее поле FEYA">
        <div className={styles.toolbar}>
          <div className={styles.toolbarPrimary}>
            <label className={styles.casePicker}>Фокус кейса
              <select value={caseFocus||''} onChange={e=>chooseCase(e.currentTarget.value)}>
                <option value="">Все кейсы</option>
                {snapshot.cases.map(c=><option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
              </select>
            </label>
            {mode==='graph'||mode==='office'?<div className={styles.roleModeChips}
              role="group" aria-label="Фильтр статуса роли">
              <button type="button" aria-pressed={roleFilter==='all'} onClick={()=>setRoleFilter('all')}>Все роли</button>
              <button type="button" aria-pressed={roleFilter==='shadow'} onClick={()=>setRoleFilter('shadow')}>Наблюдение</button>
              <button type="button" aria-pressed={roleFilter==='with_cases'} onClick={()=>setRoleFilter('with_cases')}>С кейсами</button>
            </div>:null}
          </div>
          <div className={styles.controls}>
            {mode==='graph'?<>
              <button type="button" aria-label="Уменьшить" onClick={()=>setZoom(x=>Math.max(.75,Math.round((x-.12)*100)/100))}><ZoomOut size={16}/></button>
              <span>{Math.round(zoom*100)}%</span>
              <button type="button" aria-label="Увеличить" onClick={()=>setZoom(x=>Math.min(1.45,Math.round((x+.12)*100)/100))}><ZoomIn size={16}/></button>
              <button type="button" aria-label="Сбросить положение" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw size={16}/></button>
            </>:null}
            {mode==='office'||mode==='graph'?<button type="button" aria-label="Развернуть комнату сотрудника"
              aria-pressed={inspectorExpanded} onClick={()=>setInspectorExpanded(v=>!v)}><Maximize2 size={16}/></button>:null}
          </div>
        </div>
        <div className={styles.mobileMapToggle} role="group" aria-label="Мобильный вид команды">
          <button type="button" aria-pressed={!mobileMap} onClick={()=>setMobileMap(false)}>Список</button>
          <button type="button" aria-pressed={mobileMap} onClick={()=>setMobileMap(true)}>Схема</button>
        </div>
        <div className={styles.mobileRoster} role="group" aria-label="Список сотрудников FEYA">
          {snapshot.roles.map(r=><button type="button" key={r.code} data-role={r.code}
            aria-pressed={selected===r.code} onClick={()=>selectRole(r.code)}>
            <MissionRobotPortrait role={r.code}/>
            <strong>{missionRolePresentation[r.code].name}</strong>
            <span>{roleState[r.mode]||'Не подтверждено'}</span>
            <small>Открытых кейсов: {r.openCases}</small>
          </button>)}
          <button type="button" data-role="OWNER" aria-pressed={selected==='OWNER'}
            onClick={()=>selectRole('OWNER')}>
            <MissionRobotPortrait role="OWNER"/><strong>Владелец FEYA</strong><span>Реальные решения</span>
          </button>
        </div>

        {mode==='graph'?<>
          <div className={styles.graphStatusRow}>
            <span><Network size={14}/> СВЯЗИ КОМАНДЫ</span>
            <strong>{focusedCase?'Только контекст выбранного кейса':'Восемь ролей · общий контур'}</strong>
            <button type="button" aria-pressed={showPolicyLinks}
              onClick={()=>setShowPolicyLinks(v=>!v)}>
              <Eye size={14}/> {showPolicyLinks?'Скрыть регламент':'Все связи'}</button>
          </div>
          <div className={styles.stage} onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
            <div className={styles.scene} style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
              <svg className={styles.lines} viewBox="0 0 1000 710" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="feya-owner-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0 0 L8 4.5 L0 9" fill="none" stroke="#67dafa" strokeWidth="1.6"/>
                  </marker>
                  <marker id="feya-dash-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M0 0 L7 4 L0 8" fill="none" stroke="#8094b8" strokeWidth="1.2"/>
                  </marker>
                </defs>
                {showPolicyLinks&&!caseFocus?missionOrganizationalLinks.map((link,i)=>
                  <path key={i} d={edgePath(coord[link.source],coord[link.target])}
                    className={join(styles.policyConnection,
                      (link.source===selected||link.target===selected)&&styles.policyFocused)}
                    markerEnd="url(#feya-dash-arrow)"/>):null}
                {connections.map(e=>{
                  const key=e.source+'>'+e.target;
                  const focused=highlighted===key;
                  return <path key={key} d={edgePath(coord[e.source],coord[e.target])}
                    className={join(styles.connection,e.kind==='owner'&&styles.ownerConnection,
                      focused&&styles.focusedLine,focused&&playing&&motion&&styles.movingLine)}
                    markerEnd="url(#feya-owner-arrow)">
                    <title>Сохранённая передача: {roleName(e.source)} → {roleName(e.target)}</title>
                  </path>;
                })}
              </svg>
              {showPolicyLinks&&!caseFocus?Object.entries(relationLabels).map(([key,label])=>{
                const loc=roleLabelCoords[key];
                if(!loc)return null;
                const [from,to]=key.split('>') as [Role,Role];
                return <span key={key}
                  className={join(styles.edgeLabel,(from===selected||to===selected)&&styles.edgeLabelSelected)}
                  style={{left:loc.x/10+'%',top:loc.y/7.1+'%'}}>
                    {label}
                </span>;
              }):null}
              {snapshot.roles.map(r=>{
                const pt=coord[r.code];
                const chosen=activeSelection(r.code);
                const inFocus=!caseFocus||focusParticipants.has(r.code);
                return <button key={r.code} type="button" data-role={r.code}
                  aria-pressed={chosen} onClick={()=>selectRole(r.code)}
                  aria-label={missionRolePresentation[r.code].name+'. '+(roleState[r.mode]||'Неизвестно')+'. Кейсов: '+r.openCases}
                  style={{left:pt.x/10+'%',top:pt.y/7.1+'%'}}
                  className={join(styles.agent,chosen&&styles.focused,
                    r.mode==='INACTIVE'&&styles.inactive,
                    (!roleAllowed(r)||!inFocus)&&styles.outsideFocus,
                    playing&&motion&&(current?.source===r.code||current?.target===r.code)&&styles.replayAgent)}>
                  <MissionRobotPortrait role={r.code}/>
                  <strong className={styles.agentTitle}>{missionRolePresentation[r.code].name}</strong>
                  <span className={styles.agentCode}>{missionRolePresentation[r.code].section}</span>
                  <span className={styles.agentStatus}>{roleState[r.mode]||'Не подтверждён'}</span>
                  {r.openCases>0?<span className={styles.caseCount}>Кейсов: {r.openCases}</span>:null}
                  <span className={styles.agentInfo}><InfoIcon/></span>
                </button>;
              })}
              <button type="button" data-role="OWNER" aria-pressed={selected==='OWNER'}
                onClick={()=>selectRole('OWNER')}
                style={{left:coord.OWNER.x/10+'%',top:coord.OWNER.y/7.1+'%'}}
                className={join(styles.agent,styles.owner,selected==='OWNER'&&styles.focused)}>
                <MissionRobotPortrait role="OWNER"/>
                <strong className={styles.agentTitle}>Владелец FEYA</strong>
                <span className={styles.agentCode}>Решения человека</span>
                <span className={styles.agentStatus}>Утверждает и контролирует</span>
              </button>
            </div>
            {focusedEvents.length===0?<span className={styles.noHistory}>
              Нет сохранённых передач для выбранного фокуса.</span>:null}
          </div>
          <div className={styles.stageFooter}>
            <div className={styles.connectionLegend}>
              <span className={styles.legendRecorded}><i/> Сохранённые передачи</span>
              <span className={styles.legendPotential}><i/> Регламент, не событие</span>
              <span className={styles.legendOwner}><i/> Владелец и контроль</span>
            </div>
            <label><input type="checkbox" checked={motion}
              onChange={e=>setMotion(e.target.checked)}/> Анимация истории</label>
          </div>
        </>:mode==='office'?<div className={styles.officeBoard}>
          <div className={styles.officeIntro}>
            <div><span className={styles.kicker}>ОРГАНИЗАЦИЯ / КОМАНДА FEYA</span>
              <h2>Восемь ролей — единый процесс</h2>
              <p>Зоны ответственности, реальные режимы и закреплённые кейсы. Ни одна карточка не означает текущий AI-вызов.</p></div>
            <span className={styles.officePill}><Users size={14}/>{activeRoles.length} ролей не в статусе INACTIVE</span>
          </div>
          <div className={styles.officeGrid}>
            {snapshot.roles.map(r=><button type="button" key={r.code} data-role={r.code}
              aria-pressed={selected===r.code} onClick={()=>selectRole(r.code)}
              className={join(styles.officeDesk,
                r.mode==='INACTIVE'&&styles.inactive,
                !roleAllowed(r)&&styles.outsideFocus)}>
              <MissionRobotPortrait role={r.code}/>
              <strong>{missionRolePresentation[r.code].name}</strong>
              <small>{missionRolePresentation[r.code].section}</small>
              <span>{roleState[r.mode]||'Статус неизвестен'}</span>
              <em>{r.openCases>0?'Открытых кейсов: '+r.openCases:'Нет закреплённых открытых кейсов'}</em>
            </button>)}
          </div>
          <button type="button" className={styles.officeOwner} data-role="OWNER"
            aria-pressed={selected==='OWNER'} onClick={()=>selectRole('OWNER')}>
            <MissionRobotPortrait role="OWNER"/>
            <span><strong>Владелец FEYA</strong>
              <small>Человек · стратегия, согласования, подтверждение следующего шага</small></span>
            <ChevronRight size={17}/>
          </button>
        </div>:<MissionCaseRouteClient
          key={focusedCase?.id||'no-case'}
          work={focusedCase} events={focusedEvents} asOf={snapshot.capturedAt||null}
          onShowRole={()=>{if(focusedCase)selectRole(focusedCase.owner);setMode('graph')}}
        />}
      </section>

      {mode==='case'
        ?<MissionCaseDecisionPanel work={focusedCase} snapshot={snapshot} events={focusedEvents}/>
        :<MissionRoleInspector key={selected} selected={selected} snapshot={snapshot}
          caseFocus={focusedCase} event={current} onSelectRole={selectRole}
          onOpenCase={openCaseRoute}/>}
    </div>

    <section className={styles.timeline} id="feya-mission-history"
      aria-label="Воспроизведение реальных событий">
      <div className={styles.timelineTop}>
        <div><div className={styles.kicker}><Clock3 size={14}/> ИСТОРИЯ СОХРАНЁННЫХ СОБЫТИЙ</div>
          <h2>Воспроизведение реальных событий</h2>
          <p>Маршруты и подсветка показывают зафиксированную историю, а не живые AI-сессии.</p>
        </div>
        <div className={styles.playControls}>
          <button type="button" aria-label="Предыдущее событие" disabled={!historyEvents.length}
            onClick={()=>selectHistory(Math.max(0,step-1))}><ArrowLeft size={16}/></button>
          <button type="button" disabled={!historyEvents.length}
            onClick={()=>playing?setPlaying(false):play()}>
            {playing?<><Pause size={15}/> Пауза</>:<><Play size={15}/> С начала</>}
          </button>
          <button type="button" aria-label="Следующее событие" disabled={!historyEvents.length}
            onClick={()=>selectHistory(Math.min(historyEvents.length-1,step+1))}><ArrowRight size={16}/></button>
        </div>
      </div>
      <div className={styles.historyFilters} aria-label="Фильтры истории">
        <div className={styles.historyWindowSwitch} role="group" aria-label="Период истории">
          {([
            ['all','Вся история'],['24h','24 часа'],['7d','7 дней'],
            ['10d','10 дней'],['30d','30 дней']
          ] as const).map(([value,label])=><button key={value} type="button"
            aria-pressed={historyWindow===value} onClick={()=>setHistoryView(value)}>{label}</button>)}
        </div>
        <label><Filter size={14}/> Вид
          <select value={historyKind} onChange={e=>{setHistoryKind(e.currentTarget.value as MissionEventKind);setStep(0);setPlaying(false)}}>
            <option value="all">Все события</option><option value="workflow">Технические этапы</option>
            <option value="handoff">Передачи</option><option value="owner">Решения владельца</option>
          </select>
        </label>
        <label><Search size={14}/> Участник
          <select value={historyActor||''} onChange={e=>{setHistoryActor(e.currentTarget.value as MissionActor||null);setStep(0);setPlaying(false)}}>
            <option value="">Все</option><option value="OWNER">Владелец FEYA</option>
            {snapshot.roles.map(r=><option key={r.code} value={r.code}>{missionRolePresentation[r.code].name}</option>)}
          </select>
        </label>
        <span className={styles.historyCount}>{historyEvents.length} записей</span>
      </div>
      <div className={styles.rail}>
        {historyEvents.map((e,i)=><button key={e.id} type="button"
          data-kind={e.kind} className={join(styles.eventButton,step===i&&styles.eventCurrent)}
          aria-current={step===i?'step':undefined} onClick={()=>selectHistory(i)}>
          <span className={styles.eventNumber}>0{Math.min(i+1,9)} · {historyName(e)}</span>
          <strong>{e.title}</strong><small>{timeLabel(e.at)} · {e.caseCode}</small>
        </button>)}
        {!historyEvents.length?<p className={styles.noTimeline}>
          В этом периоде нет подтверждённых записей. Отсутствие событий не означает закрытие кейсов.
        </p>:null}
      </div>
      <div className={styles.timelineFooter}>
        <span><ShieldCheck size={14}/> Источник: owner-safe Supabase · снимок, не прямой эфир.
          RUNNING по записи без lease не является текущим запуском AI.</span>
        <button type="button" onClick={()=>window.location.reload()}><RotateCcw size={14}/> Обновить</button>
      </div>
    </section>
    <section className={styles.commandStats} aria-label="Подтверждённое состояние">
      <button type="button" onClick={()=>{setMode('office');setRoleFilter('all')}}>
        <Users size={21}/><strong>{snapshot.roles.length}</strong><span>Ролей FEYA</span>
      </button>
      <button type="button" onClick={()=>{setMode('office');setRoleFilter('shadow')}}>
        <Activity size={20}/><strong>{shadowCount}</strong><span>В наблюдении</span>
      </button>
      <button type="button" onClick={()=>openCaseRoute()}>
        <BriefcaseBusiness size={20}/><strong>{snapshot.totalOpenCases}</strong><span>Открытых кейсов</span>
      </button>
      <button type="button" onClick={()=>setOpenAttention(v=>!v)}>
        <ShieldCheck size={21}/><strong>{caseAttention===undefined?'—':caseAttention}</strong>
        <span>Вопросы владельцу</span>
      </button>
      <button type="button" onClick={()=>{setMode('graph');setShowPolicyLinks(false)}}>
        <GitBranch size={21}/><strong>{historicalHandoffs}</strong><span>Передачи между ролями</span>
      </button>
    </section>
    <div className={styles.attentionCompact}>
      <div><span className={styles.attentionDot}/>
        <strong>Мои решения</strong>
        <span>{snapshot.ownerAttention
          ?'Открытых вопросов: '+snapshot.ownerAttention.total
          :'Состояние Owner Attention не подтверждено'}</span>
      </div>
      <div className={styles.attentionCompactActions}>
        {snapshot.ownerAttention?.items.slice(0,2).map(item=>
          <Link key={item.id} href={'/admin/company/owner-attention/'+item.id}>
            <b>{item.priority}</b> {signalCopy(item.sourceCode,{title:item.title}).title} <ArrowRight size={13}/>
          </Link>)}
        <button type="button" aria-expanded={openAttention} onClick={()=>setOpenAttention(v=>!v)}>
          {openAttention?'Свернуть':'Подробнее'} <ChevronRight size={13}/>
        </button>
      </div>
    </div>
    {openAttention?<section className={styles.attentionBrief} aria-label="Вопросы, ожидающие владельца">
      <div className={styles.attentionBriefHead}><strong>Ваше внимание</strong>
        <Link href="/admin/company/owner-attention">Открыть общую очередь →</Link></div>
      {snapshot.ownerAttention?.items.length
        ?<div className={styles.attentionBriefItems}>
          {snapshot.ownerAttention.items.map(item=><Link key={item.id}
            href={'/admin/company/owner-attention/'+item.id} className={styles.attentionBriefItem}>
            <span>{item.priority} · {item.status==='OPEN'?'Ждёт решения':'На рассмотрении'}</span>
            <strong>{signalCopy(item.sourceCode,{title:item.title}).title}</strong>
            <small>Открыть вопрос <ArrowRight size={12}/></small>
          </Link>)}
        </div>
        :<p className={styles.attentionBriefEmpty}>
          {snapshot.ownerAttention===null||snapshot.ownerAttention===undefined
            ?'Данные очереди недоступны. Откройте «Мои решения» напрямую.'
            :'Сейчас подтверждённых открытых записей в этой очереди нет.'}</p>}
    </section>:null}

  </div>;
}
function InfoIcon(){return <span aria-hidden="true">i</span>;}
