'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ZoomIn,ZoomOut,Crown,Search,FileText,ShieldCheck,Code2,BarChart3,Database,ShoppingBag,UserRound} from 'lucide-react';
import {missionRolePresentation,missionOrganizationalLinks,missionAutonomyLabel} from '@/lib/owner-ui/missionRolePresentation';
import {signalCopy} from '@/lib/owner-ui/terminology';
import {missionEventsForCase,type MissionSnapshot,type MissionRoleCode} from '@/lib/owner-ui/missionControlProjection';
import styles from './MissionControl.module.css';

type Point={x:number;y:number};
const coords:Record<MissionRoleCode|'OWNER',Point>={
  GROWTH_DIRECTOR:{x:142,y:115},OSPM:{x:374,y:115},SCO:{x:610,y:115},CQA:{x:847,y:115},
  TSEO:{x:142,y:353},GMEL:{x:374,y:353},GDAE:{x:610,y:353},CPIM:{x:847,y:353},
  OWNER:{x:847,y:555},
};
const modeLabel:Record<string,string>={
  SHADOW:'Безопасный режим',INACTIVE:'Не активирован',ACTIVE:'Разрешён к работе',
  PAUSED:'Приостановлен',UNKNOWN:'Не подтверждён',
};
function eventTime(at:string){
  const date=new Date(at);
  if(!Number.isFinite(date.getTime()))return 'Время неизвестно';
  return new Intl.DateTimeFormat('ru-RU',{
    day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid',
  }).format(date);
}
function edgePath(from:Point,to:Point){
  const middle=(from.x+to.x)/2;
  return 'M '+from.x+' '+from.y+' C '+middle+' '+from.y+', '+middle+' '+to.y+', '+to.x+' '+to.y;
}
const joinClasses=(...s:Array<string|false|undefined>)=>s.filter(Boolean).join(' ');
const personLabel=(code:MissionRoleCode|'OWNER'|null)=>code==='OWNER'?'Владелец':code?missionRolePresentation[code].name:'—';
function openCaseCount(count:number){
  const word=count%10===1&&count%100!==11?'открытый кейс':
    count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'открытых кейса':'открытых кейсов';
  return count+' '+word;
}

const specialtyIcons={
  GROWTH_DIRECTOR:Crown,OSPM:Search,SCO:FileText,CQA:ShieldCheck,
  TSEO:Code2,GMEL:BarChart3,GDAE:Database,CPIM:ShoppingBag,OWNER:UserRound,
};

/** Lightweight locally rendered avatar: presentation, not a model/run status. */
function RolePortrait({code}:{code:MissionRoleCode|'OWNER'}){
  const Specialty=specialtyIcons[code];
  return <span className={joinClasses(styles.portrait,code==='OWNER'&&styles.humanPortrait)}
    aria-hidden="true" data-role={code}>
    {code==='OWNER'
      ? <span className={styles.humanFace}><Specialty size={27} strokeWidth={1.7}/></span>
      : <>
          <span className={styles.botAntenna}/>
          <span className={styles.botHead}>
            <span className={styles.botVisor}><i/><i/></span>
          </span>
          <span className={styles.botBody}><Specialty size={14} strokeWidth={2}/></span>
        </>}
  </span>;
}


export function MissionControlClient({snapshot}:{snapshot:MissionSnapshot}){
  const [mode,setMode]=useState<'graph'|'office'>('graph');
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState<Point>({x:0,y:0});
  const [selected,setSelected]=useState<MissionRoleCode|'OWNER'>('TSEO');
  const [step,setStep]=useState(Math.max(snapshot.events.length-1,0));
  const [playing,setPlaying]=useState(false);
  const [motion,setMotion]=useState(true);
  const [caseFocus,setCaseFocus]=useState<string|null>(null);
  const [mobileMap,setMobileMap]=useState(false);
  const [showPolicyLinks,setShowPolicyLinks]=useState(true);
  const [dossierTab,setDossierTab]=useState<'overview'|'cases'|'links'>('overview');
  const drag=useRef<{id:number;x:number;y:number;start:Point}|null>(null);
  const focusedCase=snapshot.cases.find(c=>c.id===caseFocus)||null;
  const focusedEvents=useMemo(()=>missionEventsForCase(snapshot,caseFocus),[snapshot,caseFocus]);

  useEffect(()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setMotion(false);
  },[]);
  useEffect(()=>{
    if(!playing||!focusedEvents.length)return;
    const timer=window.setInterval(()=>{
      setStep(current=>{
        if(current>=focusedEvents.length-1){setPlaying(false);return current;}
        return current+1;
      });
    },motion?1850:2600);
    return ()=>window.clearInterval(timer);
  },[playing,motion,focusedEvents.length]);

  const event=focusedEvents[step]||null;
  const selectedRole=snapshot.roles.find(r=>r.code===selected);
  const relatedCases=snapshot.cases.filter(c=>c.owner===selected&&(!caseFocus||c.id===caseFocus));
  const selectedMeta=selected==='OWNER'?null:missionRolePresentation[selected];
  const relevantHandoffs=focusedEvents.filter(e=>e.kind==='handoff'
    &&(e.source===selected||e.target===selected));
  const focusParticipants=new Set<MissionRoleCode|'OWNER'>();
  if(focusedCase)focusParticipants.add(focusedCase.owner);
  focusedEvents.forEach(e=>{focusParticipants.add(e.source);if(e.target)focusParticipants.add(e.target);});
  const edges=useMemo(()=>{
    const seen=new Map<string,{source:MissionRoleCode|'OWNER';target:MissionRoleCode|'OWNER'}>();
    focusedEvents.forEach(e=>{
      if(e.target&&(e.kind==='handoff'||(e.kind==='owner'&&e.phase==='owner_requested'))){
        seen.set(e.source+'>'+e.target,{source:e.source,target:e.target});
      }
    });
    return [...seen.values()];
  },[focusedEvents]);
  const highlighted=event&&event.target?event.source+'>'+event.target:null;

  function chooseCase(value:string){
    const c=snapshot.cases.find(item=>item.id===value)||null;
    const nextId=c?.id||null;
    setCaseFocus(nextId);
    setPlaying(false);
    setStep(Math.max(missionEventsForCase(snapshot,nextId).length-1,0));
    if(c)setSelected(c.owner);
    setDossierTab('overview');
  }
  function choose(index:number){
    const e=focusedEvents[index];
    if(!e)return;
    setPlaying(false);setStep(index);
    setSelected(e.source);
  }
  function play(){
    if(!focusedEvents.length)return;
    setStep(0);
    const source=focusedEvents[0].source;
    setSelected(source);
    setPlaying(true);
  }
  function startDrag(e:ReactPointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest('button,a'))return;
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:pan};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e:ReactPointerEvent<HTMLDivElement>){
    const item=drag.current;
    if(item?.id!==e.pointerId)return;
    setPan({x:item.start.x+e.clientX-item.x,y:item.start.y+e.clientY-item.y});
  }
  function endDrag(e:ReactPointerEvent<HTMLDivElement>){
    if(drag.current?.id===e.pointerId)drag.current=null;
  }
  const stepBack=()=>choose(Math.max(0,step-1));
  const stepAhead=()=>choose(Math.min(focusedEvents.length-1,step+1));
  function selectRole(code:MissionRoleCode|'OWNER'){
    setSelected(code);
    setDossierTab('overview');
  }

  return <div className={styles.wrapper}>
    <nav className={styles.ownerShortcuts} aria-label="Переходы к реальным задачам">
      <Link href="/admin/company/owner-attention">Мои решения →</Link>
      <Link href="/admin/company/work">Все кейсы →</Link>
      {focusedCase?<Link href={'/admin/company/work/'+focusedCase.id}>Маршрут выбранного кейса →</Link>:null}
      <span>История и сохранённые статусы · не прямой эфир</span>
    </nav>
    <section className={styles.attentionBrief} aria-label="Открытые вопросы владельца">
      <div className={styles.attentionBriefHead}>
        <div>
          <strong>Ваше внимание</strong>
          <span>{snapshot.ownerAttention
            ? 'Открытых вопросов в Owner Attention: '+snapshot.ownerAttention.total
            : 'Состояние Owner Attention не подтверждено'}</span>
        </div>
        <Link href="/admin/company/owner-attention">Открыть общую очередь →</Link>
      </div>
      {snapshot.ownerAttention?.items.length
        ? <div className={styles.attentionBriefItems}>
            {snapshot.ownerAttention.items.map(item=><Link
              key={item.id} href={'/admin/company/owner-attention/'+item.id}
              className={styles.attentionBriefItem}>
              <span>{item.priority==='UNKNOWN'?'Приоритет не указан':item.priority}</span>
              <strong>{signalCopy(item.sourceCode,{title:item.title}).title}</strong>
              <small>{item.status==='ACKNOWLEDGED'?'Принято к рассмотрению':'Ожидает решения'} →</small>
            </Link>)}
            {snapshot.ownerAttention.total>snapshot.ownerAttention.items.length
              ? <small>Показаны первые {snapshot.ownerAttention.items.length} из {snapshot.ownerAttention.total} записей</small>
              : null}
          </div>
        : <p className={styles.attentionBriefEmpty}>
            {snapshot.ownerAttention===null||snapshot.ownerAttention===undefined
              ? 'Данные очереди недоступны. Откройте «Мои решения», чтобы проверить вопросы напрямую.'
              : 'В Owner Attention открытых записей нет. Другие согласования смотрите в общей очереди.'}
          </p>}
    </section>
    <section className={styles.summary} aria-label="Проверенный статус FEYA">
      <div><strong>{snapshot.roles.length}</strong><span>Логических ролей</span></div>
      <div><strong>{snapshot.totalOpenCases}</strong><span>Открытых кейсов</span></div>
      <div><strong>{snapshot.currentlyRunning}</strong><span>RUNNING по записи, не live</span></div>
      <div><strong>{snapshot.historicalHandoffs}</strong><span>Реальных передач</span></div>
      <p>Снимок, а не прямой эфир. Статус RUNNING без проверки актуального lease не доказывает выполнение сейчас. Анимация отражает только историю.</p>
    </section>

    <section className={styles.workspace} aria-label="Интерактивная карта Growth OS">
      <div className={joinClasses(styles.stageArea,mobileMap&&styles.mobileMapOpen,mode==='office'&&styles.officeMode)}>
        <div className={styles.toolbar}>
          <div className={styles.switcher} role="group" aria-label="Режим просмотра команды">
            <button type="button" aria-pressed={mode==='graph'} onClick={()=>setMode('graph')}>Схема связей</button>
            <button type="button" aria-pressed={mode==='office'} onClick={()=>{setMode('office');setPlaying(false)}}>Офис · задачи</button>
          </div>
          <label className={styles.casePicker}>
            Фокус кейса
            <select value={caseFocus||''} onChange={e=>chooseCase(e.currentTarget.value)}>
              <option value="">Все кейсы</option>
              {snapshot.cases.map(c=><option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
            </select>
          </label>
          <div className={styles.mobileMapToggle} role="group" aria-label="Мобильный режим карты">
            <button type="button" aria-pressed={!mobileMap} onClick={()=>setMobileMap(false)}>Список</button>
            <button type="button" aria-pressed={mobileMap} onClick={()=>setMobileMap(true)}>Карта</button>
          </div>
          <div className={styles.controls}>
            <button type="button" aria-label="Уменьшить" onClick={()=>setZoom(z=>Math.max(.7,Math.round((z-.15)*100)/100))}><ZoomOut size={15}/></button>
            <span>{Math.round(zoom*100)}%</span>
            <button type="button" aria-label="Увеличить" onClick={()=>setZoom(z=>Math.min(1.6,Math.round((z+.15)*100)/100))}><ZoomIn size={15}/></button>
            <button type="button" aria-label="Сбросить положение" onClick={()=>{setPan({x:0,y:0});setZoom(1)}}><RotateCcw size={15}/></button>
          </div>
        </div>
        <div className={styles.mobileRoster} role="group" aria-label="Список сотрудников FEYA">
          {snapshot.roles.map(r=><button type="button" key={r.code} data-role={r.code}
            aria-pressed={selected===r.code} onClick={()=>selectRole(r.code)}>
            <RolePortrait code={r.code}/>
            <strong>{missionRolePresentation[r.code].name}</strong>
            <span>{modeLabel[r.mode]||'Не подтверждён'}</span>
            <small>Открытых кейсов: {r.openCases}</small>
          </button>)}
          <button type="button" data-role="OWNER" aria-pressed={selected==='OWNER'} onClick={()=>selectRole('OWNER')}>
            <RolePortrait code="OWNER"/><strong>Владелец FEYA</strong><span>Решения человека</span>
          </button>
        </div>
        {mode==='graph'?<>
        <div className={styles.stage} onPointerDown={startDrag} onPointerMove={moveDrag}
          onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className={styles.scene}
            style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
            <svg className={styles.lines} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker id="mission-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
                  <path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#78c9ff" strokeWidth="1.5"/>
                </marker>
                <marker id="mission-policy-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
                  <path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#62738f" strokeWidth="1"/>
                </marker>
              </defs>
              {showPolicyLinks&&!caseFocus?missionOrganizationalLinks.map((link,i)=>
                <path key={'policy-'+i} d={edgePath(coords[link.source],coords[link.target])}
                  className={styles.policyConnection} markerEnd="url(#mission-policy-arrow)"/>):null}
              {edges.map(e=>{
                const key=e.source+'>'+e.target;
                const focused=highlighted===key;
                return <path key={key} d={edgePath(coords[e.source],coords[e.target])}
                  className={joinClasses(styles.connection,focused&&styles.focusedLine,
                    focused&&playing&&motion&&styles.movingLine)}
                  markerEnd="url(#mission-arrow)">
                  <title>Сохранённая передача: {e.source} → {e.target}</title>
                </path>;
              })}
            </svg>
            {snapshot.roles.map(r=>{
              const pt=coords[r.code];
              const focus=r.code===selected;
              const replay=(event?.source===r.code||event?.target===r.code)&&playing&&motion;
              return <button key={r.code} type="button" aria-pressed={focus} data-role={r.code}
                aria-label={missionRolePresentation[r.code].name+'. '+(modeLabel[r.mode]||'Режим неизвестен')+'. Открытых кейсов: '+r.openCases}
                onClick={()=>selectRole(r.code)}
                style={{left:(pt.x/10)+'%',top:(pt.y/6.5)+'%'}}
                className={joinClasses(styles.agent,r.mode==='INACTIVE'&&styles.inactive,
                  focus&&styles.focused,replay&&styles.replayAgent,
                  caseFocus!==null&&!focusParticipants.has(r.code)&&styles.outsideFocus)}>
                <RolePortrait code={r.code}/>
                <span className={styles.agentTitle}>{missionRolePresentation[r.code].name}</span>
                <span className={styles.agentCode}>{missionRolePresentation[r.code].section}</span>
                <span className={styles.agentStatus}>{modeLabel[r.mode]||'Режим неизвестен'}</span>
                {r.openCases>0?<span className={styles.caseCount}>{openCaseCount(r.openCases)}</span>:null}
              </button>;
            })}
            <button type="button" aria-pressed={selected==='OWNER'}
              onClick={()=>selectRole('OWNER')} data-role="OWNER"
              className={joinClasses(styles.agent,styles.owner,selected==='OWNER'&&styles.focused,
                caseFocus!==null&&!focusParticipants.has('OWNER')&&styles.outsideFocus)}
              style={{left:(coords.OWNER.x/10)+'%',top:(coords.OWNER.y/6.5)+'%'}}>
              <RolePortrait code="OWNER"/><span className={styles.agentTitle}>Владелец FEYA</span>
              <span className={styles.agentCode}>Руководитель</span><span className={styles.agentStatus}>Реальные решения</span>
            </button>
          </div>
          {!focusedEvents.length?<div className={styles.noHistory}>Нет подтверждённых событий для выбранного фокуса.</div>:null}
        </div>
        <div className={styles.stageFooter}>
          <div className={styles.connectionLegend}>
            <span className={styles.legendRecorded}>Сохранённые передачи</span>
            <span className={styles.legendPotential}>Регламент, не событие</span>
          </div>
          <label><input type="checkbox" checked={showPolicyLinks} onChange={e=>setShowPolicyLinks(e.target.checked)}/>
            Связи по паспортам</label>
          <label><input type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/> Анимация истории</label>
        </div>
        </>:<div className={styles.officeBoard}>
          <div className={styles.officeIntro}>
            <div><div className={styles.kicker}>ОФИС КОМАНДЫ</div>
              <strong>Кто за что отвечает и какие кейсы закреплены</strong>
              <p>Карточки показывают регистрацию ролей и сохранённые задачи. Это не карта живых AI-вызовов.</p></div>
            <span>Режим: обзор команды</span>
          </div>
          <div className={styles.officeGrid}>
            {snapshot.roles.map(r=><button key={r.code} type="button" data-role={r.code}
              aria-pressed={selected===r.code} onClick={()=>selectRole(r.code)}
              className={joinClasses(styles.officeDesk,r.mode==='INACTIVE'&&styles.inactive)}>
              <RolePortrait code={r.code}/>
              <strong>{missionRolePresentation[r.code].name}</strong>
              <small>{missionRolePresentation[r.code].section}</small>
              <span>{modeLabel[r.mode]||'Не подтверждено'}</span>
              <em>{r.openCases? openCaseCount(r.openCases):'Нет закреплённых открытых кейсов'}</em>
            </button>)}
          </div>
          <button type="button" data-role="OWNER" aria-pressed={selected==='OWNER'}
            className={styles.officeOwner} onClick={()=>selectRole('OWNER')}>
            <RolePortrait code="OWNER"/>
            <span><strong>Владелец FEYA</strong><small>Принимает решения, утверждает границы и приоритеты</small></span>
          </button>
        </div>}
      </div>

      <aside className={styles.dossier} aria-label="Досье выбранного участника" data-role={selected}>
        <header className={styles.dossierHero}>
          <RolePortrait code={selected}/>
          <div className={styles.dossierHeroText}>
            <div className={styles.kicker}>{selected==='OWNER'?'РУКОВОДИТЕЛЬ':'КОМНАТА СОТРУДНИКА'}</div>
            <h2>{selected==='OWNER'?'Владелец FEYA':selectedMeta?.name||'Роль FEYA'}</h2>
            <p>{selectedMeta?.section||'Стратегические решения'}</p>
            <span className={styles.pill}>{selected==='OWNER'?'Человек · решения':modeLabel[selectedRole?.mode||'UNKNOWN']||'Неизвестно'}</span>
          </div>
        </header>
        {focusedCase?<p className={styles.focusNotice}>
          Фокус: {focusedCase.code}. <Link href={'/admin/company/work/'+focusedCase.id}>Полный маршрут кейса →</Link>
        </p>:null}
        <div className={styles.dossierTabs} role="group" aria-label="Разделы досье">
          <button type="button" aria-pressed={dossierTab==='overview'}
            onClick={()=>setDossierTab('overview')}>Обзор</button>
          <button type="button" aria-pressed={dossierTab==='cases'}
            onClick={()=>setDossierTab('cases')}>Задачи</button>
          <button type="button" aria-pressed={dossierTab==='links'}
            onClick={()=>setDossierTab('links')}>Связи</button>
        </div>
        {dossierTab==='overview'?<div className={styles.dossierContent}>
          <section className={styles.roleBrief}>
            <h3>Что делает</h3>
            <p>{selectedMeta?.mission||'Определяет бизнес-стратегию, утверждает ключевые изменения и контролирует решения команды.'}</p>
          </section>
          <section className={styles.roleBrief}>
            <h3>Границы ответственности</h3>
            <p>{selectedMeta?.scope||'Решения владельца записываются отдельно от исполнения, измерения и проверки результата.'}</p>
          </section>
          {selectedRole?<dl className={styles.facts}>
            <div><dt>Режим роли</dt><dd>{modeLabel[selectedRole.mode]||'Не подтверждён'}</dd></div>
            <div><dt>Полномочия</dt><dd>{missionAutonomyLabel[selectedRole.autonomy]||'Требуют уточнения'}</dd></div>
            <div><dt>Открытых кейсов</dt><dd>{selectedRole.openCases}</dd></div>
            <div><dt>RUNNING по записи</dt><dd>{selectedRole.runningWorkflows} · не live</dd></div>
          </dl>:null}
          <div className={styles.nextAction}>
            <strong>Следующий доступный шаг</strong>
            {selectedRole&&relatedCases.length
              ? <Link href={'/admin/company/work/'+relatedCases[0].id}>Открыть закреплённый кейс →</Link>
              : selected==='OWNER'
                ? <Link href="/admin/company/owner-attention">Посмотреть ожидающие решения →</Link>
                : <Link href="/admin/roles">Проверить права и ограничения роли →</Link>}
            <small>Нажатие открывает сохранённые данные и не запускает AI.</small>
          </div>
        </div>:null}
        {dossierTab==='cases'?<div className={styles.dossierContent}>
          <h3>{selected==='OWNER'?'Вопросы владельца':'Закреплённые кейсы'}</h3>
          {selected==='OWNER'
            ? <div className={styles.ownerCaseList}>
                {snapshot.ownerAttention?.items.length
                  ? snapshot.ownerAttention.items.map(a=><Link key={a.id}
                      href={'/admin/company/owner-attention/'+a.id} className={styles.caseLink}>
                      <strong>{a.priority} · {a.status==='ACKNOWLEDGED'?'На рассмотрении':'Ожидает решения'}</strong>
                      <span>{signalCopy(a.sourceCode,{title:a.title}).title}</span></Link>)
                  : <p className={styles.note}>Здесь нет подтверждённого перечня. Полная очередь доступна в «Мои решения».</p>}
                <Link href="/admin/company/owner-attention" className={styles.dossierActionLink}>Все решения →</Link>
              </div>
            : relatedCases.length?relatedCases.map(c=><Link key={c.id}
                href={'/admin/company/work/'+c.id} className={styles.caseLink}>
                <strong>{c.code}</strong><span>{c.title}</span>
                <small>Кейс: {c.status==='OPEN'?'открыт':c.status} · workflow: {c.workflowStatus==='COMPLETED'?'этап завершён':c.workflowStatus||'не подтверждён'}</small>
              </Link>):<p className={styles.note}>Закреплённых открытых кейсов сейчас нет. Это не означает, что агент работает в фоне.</p>}
        </div>:null}
        {dossierTab==='links'?<div className={styles.dossierContent}>
          <h3>Сохранённые передачи</h3>
          <p className={styles.note}>Показываются только реальные записи из Core. Организационные связи на схеме — другой тип информации.</p>
          {relevantHandoffs.length?relevantHandoffs.map(e=><Link key={e.id}
            href={'/admin/company/work/'+e.caseId} className={styles.handoffItem}>
            <strong>{personLabel(e.source)} → {personLabel(e.target)}</strong>
            <small>{e.title} · {eventTime(e.at)}</small>
            <span>{e.caseCode} →</span>
          </Link>):<p className={styles.note}>Подтверждённых передач по выбранному фокусу нет.</p>}
        </div>:null}
        <div className={styles.separator}/>
        <div className={styles.kicker}>ВЫБРАННОЕ СОБЫТИЕ · ИСТОРИЯ</div>
        {event?<div className={styles.currentEvent} aria-live="polite">
          <small>{eventTime(event.at)} · {event.caseCode}</small>
          <strong>{event.title}</strong>
          <p>{event.kind==='handoff'?'Зарегистрированная передача, не доказательство AI-анализа':
            event.kind==='owner'?'Сохранённое действие владельца':'Событие технического workflow'}</p>
          <div className={styles.links}>
            <Link href={'/admin/company/work/'+event.caseId}>Открыть кейс</Link>
            {event.attentionId?<Link href={'/admin/company/owner-attention/'+event.attentionId}>Решение владельца</Link>:null}
          </div>
        </div>:<p className={styles.note}>Подтверждённых событий в этом фокусе нет.</p>}
      </aside>
    </section>

    <section className={styles.timeline} aria-label="Шкала сохранённых событий">
      <div className={styles.timelineTop}>
        <div><div className={styles.kicker}>ИСТОРИЯ · НЕ LIVE</div>
          <h2>Воспроизведение реальных событий</h2>
          <p>Подсветка отражает сохранённые передачи и решения, а не непрерывную работу агентов.</p>
        </div>
        <div className={styles.playControls}>
          <button type="button" aria-label="Предыдущее" disabled={!focusedEvents.length} onClick={stepBack}><ArrowLeft size={15}/></button>
          <button type="button" disabled={!focusedEvents.length} onClick={()=>playing?setPlaying(false):play()}>
            {playing?<><Pause size={14}/> Пауза</>:<><Play size={14}/> С начала</>}
          </button>
          <button type="button" aria-label="Следующее" disabled={!focusedEvents.length} onClick={stepAhead}><ArrowRight size={15}/></button>
        </div>
      </div>
      <div className={styles.rail}>
        {focusedEvents.map((e,i)=><button key={e.id} type="button"
          className={joinClasses(styles.eventButton,step===i&&styles.eventCurrent)}
          data-kind={e.kind} aria-current={step===i?'step':undefined} onClick={()=>choose(i)}>
          <span className={styles.eventNumber}>{String(i+1).padStart(2,'0')}</span>
          <strong>{e.title}</strong><small>{eventTime(e.at)}</small>
        </button>)}
        {!focusedEvents.length?<p className={styles.note}>Нет записанных событий в этом представлении. Демонстрационных событий нет.</p>:null}
      </div>
      <footer className={styles.timelineFooter}>Источник: owner-safe Supabase views. Снимок обновляется при открытии страницы.
        <button type="button" onClick={()=>window.location.reload()}>Обновить</button>
      </footer>
    </section>
  </div>;
}