'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ZoomIn,ZoomOut} from 'lucide-react';
import type {MissionSnapshot,MissionRoleCode} from '@/lib/owner-ui/missionControlProjection';
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

export function MissionControlClient({snapshot}:{snapshot:MissionSnapshot}){
  const [mode,setMode]=useState<'graph'|'office'>('graph');
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState<Point>({x:0,y:0});
  const [selected,setSelected]=useState<MissionRoleCode|'OWNER'>('TSEO');
  const [step,setStep]=useState(Math.max(snapshot.events.length-1,0));
  const [playing,setPlaying]=useState(false);
  const [motion,setMotion]=useState(true);
  const drag=useRef<{id:number;x:number;y:number;start:Point}|null>(null);

  useEffect(()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setMotion(false);
  },[]);
  useEffect(()=>{
    if(!playing||!snapshot.events.length)return;
    const timer=window.setInterval(()=>{
      setStep(current=>{
        if(current>=snapshot.events.length-1){setPlaying(false);return current;}
        return current+1;
      });
    },motion?1850:2600);
    return ()=>window.clearInterval(timer);
  },[playing,motion,snapshot.events.length]);

  const event=snapshot.events[step]||null;
  const selectedRole=snapshot.roles.find(r=>r.code===selected);
  const relatedCases=snapshot.cases.filter(c=>c.owner===selected);
  const edges=useMemo(()=>{
    const seen=new Map<string,{source:MissionRoleCode|'OWNER';target:MissionRoleCode|'OWNER'}>();
    snapshot.events.forEach(e=>{
      if(e.target&&(e.kind==='handoff'||(e.kind==='owner'&&e.phase==='owner_requested'))){
        seen.set(e.source+'>'+e.target,{source:e.source,target:e.target});
      }
    });
    return [...seen.values()];
  },[snapshot.events]);
  const highlighted=event&&event.target?event.source+'>'+event.target:null;

  function choose(index:number){
    const e=snapshot.events[index];
    if(!e)return;
    setPlaying(false);setStep(index);
    setSelected(e.source==='OWNER'?'TSEO':e.source);
  }
  function play(){
    if(!snapshot.events.length)return;
    setStep(0);
    const source=snapshot.events[0].source;
    setSelected(source==='OWNER'?'TSEO':source);
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
  const stepAhead=()=>choose(Math.min(snapshot.events.length-1,step+1));

  return <div className={styles.wrapper}>
    <section className={styles.summary} aria-label="Проверенный статус FEYA">
      <div><strong>{snapshot.roles.length}</strong><span>Логических ролей</span></div>
      <div><strong>{snapshot.totalOpenCases}</strong><span>Открытых кейсов</span></div>
      <div><strong>{snapshot.currentlyRunning}</strong><span>RUNNING workflow</span></div>
      <div><strong>{snapshot.historicalHandoffs}</strong><span>Реальных передач</span></div>
      <p>Снимок, а не прямой эфир. События настоящие; анимация истории не означает работу AI в данный момент.</p>
    </section>

    <section className={styles.workspace} aria-label="Интерактивная карта Growth OS">
      <div className={styles.stageArea}>
        <div className={styles.toolbar}>
          <div className={styles.switcher}>
            <button type="button" aria-pressed={mode==='graph'} onClick={()=>setMode('graph')}>Схема</button>
            <button type="button" aria-pressed={mode==='office'} onClick={()=>setMode('office')}>Офис</button>
          </div>
          <div className={styles.controls}>
            <button type="button" aria-label="Уменьшить" onClick={()=>setZoom(z=>Math.max(.7,Math.round((z-.15)*100)/100))}><ZoomOut size={15}/></button>
            <span>{Math.round(zoom*100)}%</span>
            <button type="button" aria-label="Увеличить" onClick={()=>setZoom(z=>Math.min(1.6,Math.round((z+.15)*100)/100))}><ZoomIn size={15}/></button>
            <button type="button" aria-label="Сбросить положение" onClick={()=>{setPan({x:0,y:0});setZoom(1)}}><RotateCcw size={15}/></button>
          </div>
        </div>
        <div className={styles.stage} onPointerDown={startDrag} onPointerMove={moveDrag}
          onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className={joinClasses(styles.scene,mode==='office'&&styles.office)}
            style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
            {mode==='office'?<div className={styles.rooms} aria-hidden="true">
              <div>Стратегия / SEO</div><div>Контент / качество</div>
              <div>Инженерия / данные</div><div>Коммерция / владелец</div>
            </div>:null}
            <svg className={styles.lines} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
              <defs><marker id="mission-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
                <path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#b1a084" strokeWidth="1.4"/>
              </marker></defs>
              {edges.map(e=>{
                const key=e.source+'>'+e.target;
                const focused=highlighted===key;
                return <path key={key} d={edgePath(coords[e.source],coords[e.target])}
                  className={joinClasses(styles.connection,focused&&styles.focusedLine,
                    focused&&playing&&motion&&styles.movingLine)}
                  markerEnd="url(#mission-arrow)"/>;
              })}
            </svg>
            {snapshot.roles.map(r=>{
              const pt=coords[r.code];
              const focus=r.code===selected;
              const replay=(event?.source===r.code||event?.target===r.code)&&playing&&motion;
              return <button key={r.code} type="button" aria-pressed={focus}
                onClick={()=>setSelected(r.code)}
                style={{left:(pt.x/10)+'%',top:(pt.y/6.5)+'%'}}
                className={joinClasses(styles.agent,r.mode==='INACTIVE'&&styles.inactive,
                  focus&&styles.focused,replay&&styles.replayAgent)}>
                <span className={styles.symbol}>{r.code==='GROWTH_DIRECTOR'?'◆':r.code==='TSEO'?'⌘':'✦'}</span>
                <span className={styles.agentTitle}>{r.label}</span>
                <span className={styles.agentCode}>{r.code}</span>
                <span className={styles.agentStatus}>{modeLabel[r.mode]||'Режим неизвестен'}</span>
                {r.runningWorkflows>0?<span className={styles.running}>RUNNING {r.runningWorkflows}</span>:null}
              </button>;
            })}
            <button type="button" aria-pressed={selected==='OWNER'}
              onClick={()=>setSelected('OWNER')}
              className={joinClasses(styles.agent,styles.owner,selected==='OWNER'&&styles.focused)}
              style={{left:(coords.OWNER.x/10)+'%',top:(coords.OWNER.y/6.5)+'%'}}>
              <span className={styles.symbol}>◎</span><span className={styles.agentTitle}>Владелец FEYA</span>
              <span className={styles.agentCode}>HUMAN OWNER</span><span className={styles.agentStatus}>Реальные решения</span>
            </button>
          </div>
          {!snapshot.events.length?<div className={styles.noHistory}>Подтверждённых событий нет: воспроизведение недоступно.</div>:null}
        </div>
        <div className={styles.stageFooter}>
          <span>Перетащите свободное место карты · масштабирование кнопками</span>
          <label><input type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/> Анимация истории</label>
        </div>
      </div>

      <aside className={styles.dossier} aria-label="Досье выбранного участника">
        <div className={styles.kicker}>Паспорт роли</div>
        <h2>{selected==='OWNER'?'Владелец FEYA':selectedRole?.label||'Участник'}</h2>
        <span className={styles.pill}>{selected==='OWNER'?'Человек · решения':modeLabel[selectedRole?.mode||'UNKNOWN']||'Неизвестно'}</span>
        {selectedRole?<div>
          <dl className={styles.facts}>
            <div><dt>Роль</dt><dd>{selectedRole.code}</dd></div>
            <div><dt>Самостоятельность</dt><dd>{selectedRole.autonomy}</dd></div>
            <div><dt>Открытые кейсы</dt><dd>{selectedRole.openCases}</dd></div>
            <div><dt>Выполняется сейчас</dt><dd>{selectedRole.runningWorkflows}</dd></div>
          </dl>
          <p className={styles.note}>SHADOW — разрешённый режим наблюдения, а не доказательство фоновых AI-вызовов.</p>
          <h3>Задачи роли</h3>
          {relatedCases.length?relatedCases.map(c=><Link key={c.id}
            href={'/admin/company/work/'+c.id} className={styles.caseLink}>
            <strong>{c.code}</strong><span>{c.title}</span>
            <small>Кейс {c.status} · технический шаг {c.workflowStatus||'неизвестен'}</small>
          </Link>):<p className={styles.note}>Подтверждённых кейсов нет.</p>}
        </div>:<p className={styles.note}>Человек подтверждает решения отдельно от результата AI. Записанное решение не закрывает Growth Case.</p>}
        <div className={styles.separator}/>
        <div className={styles.kicker}>Текущая точка истории</div>
        {event?<div className={styles.currentEvent} aria-live="polite">
          <small>{eventTime(event.at)} · {event.caseCode}</small>
          <strong>{event.title}</strong>
          <p>{event.kind==='handoff'?'Подтверждённая передача ролей':
            event.kind==='owner'?'Сохранённое событие владельца':'Событие технического процесса'}</p>
          <div className={styles.links}>
            <Link href={'/admin/company/work/'+event.caseId}>Открыть кейс</Link>
            {event.attentionId?<Link href={'/admin/company/owner-attention/'+event.attentionId}>Решение владельца</Link>:null}
          </div>
        </div>:<p className={styles.note}>История ещё не записана.</p>}
      </aside>
    </section>

    <section className={styles.timeline} aria-label="Шкала сохранённых событий">
      <div className={styles.timelineTop}>
        <div><div className={styles.kicker}>ИСТОРИЯ · НЕ LIVE</div>
          <h2>Воспроизведение реальных событий</h2>
          <p>Подсветка отражает сохранённые передачи и решения, а не непрерывную работу агентов.</p>
        </div>
        <div className={styles.playControls}>
          <button type="button" aria-label="Предыдущее" disabled={!snapshot.events.length} onClick={stepBack}><ArrowLeft size={15}/></button>
          <button type="button" disabled={!snapshot.events.length} onClick={()=>playing?setPlaying(false):play()}>
            {playing?<><Pause size={14}/> Пауза</>:<><Play size={14}/> С начала</>}
          </button>
          <button type="button" aria-label="Следующее" disabled={!snapshot.events.length} onClick={stepAhead}><ArrowRight size={15}/></button>
        </div>
      </div>
      <div className={styles.rail}>
        {snapshot.events.map((e,i)=><button key={e.id} type="button"
          className={joinClasses(styles.eventButton,step===i&&styles.eventCurrent)}
          aria-current={step===i?'step':undefined} onClick={()=>choose(i)}>
          <span className={styles.eventNumber}>{String(i+1).padStart(2,'0')}</span>
          <strong>{e.title}</strong><small>{eventTime(e.at)}</small>
        </button>)}
        {!snapshot.events.length?<p className={styles.note}>Нет событий для воспроизведения. Демонстрационных событий нет.</p>:null}
      </div>
      <footer className={styles.timelineFooter}>Источник: owner-safe Supabase views. Снимок обновляется при открытии страницы.
        <button type="button" onClick={()=>window.location.reload()}>Обновить</button>
      </footer>
    </section>
  </div>;
}
