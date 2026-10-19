'use client';

import Link from 'next/link';
import {useState} from 'react';
import {
  ArrowRight,CheckCircle2,Clock3,AlertTriangle,CircleHelp,ShieldAlert,
  SearchCheck,GitBranch,ShieldCheck,Target,ChartNoAxesCombined,
  ChevronRight,CalendarClock,Info,UserRound,FileCheck2,
  Workflow,LockKeyhole,BookOpenCheck,Flag,Activity,
} from 'lucide-react';
import {missionCaseRouteStages,missionCaseDeadline} from '@/lib/owner-ui/missionControlView';
import type {MissionCase,MissionEvent,MissionSnapshot} from '@/lib/owner-ui/missionControlProjection';
import {missionRolePresentation} from '@/lib/owner-ui/missionRolePresentation';
import {MissionRobotPortrait} from './MissionRobotPortrait';
import styles from './MissionControl.module.css';

const stageIcons=[Target,SearchCheck,GitBranch,UserRound,ShieldCheck,FileCheck2,ChartNoAxesCombined];

export function caseDueCopy(dueAt:string|null,asOf:string|null){
  const state=missionCaseDeadline(dueAt,asOf);
  if(state==='not_set')return 'Срок не установлен · просрочка не определяется';
  if(state==='unknown')return 'Срок невозможно проверить';
  const d=dueAt?new Date(dueAt):null;
  const date=d&&Number.isFinite(d.getTime())
    ?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium'}).format(d):'';
  return state==='overdue'?'Срок по записи прошёл: '+date:'Указанный срок: '+date;
}
const stageStateText={
  recorded:'Есть запись',current:'Текущий факт',
  unknown:'Не подтверждено',attention:'Проверить',
} as const;
function readableTime(at:string){
  const d=new Date(at);
  return Number.isFinite(d.getTime())
    ?new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(d)
    :'Время неизвестно';
}

export function MissionCaseRouteClient({
  work,events,asOf,onShowRole,
}:{
  work:MissionCase|null;events:readonly MissionEvent[];
  asOf:string|null;onShowRole:()=>void;
}){
  const [selectedStage,setSelectedStage]=useState(1);
  const [showAlternativePaths,setShowAlternativePaths]=useState(false);
  if(!work)return <section className={styles.routeEmpty} role="status">
    <CircleHelp size={29}/><h3>Нет подтверждённого кейса</h3>
    <p>Сначала выберите реальный кейс. Мы не создаём демонстрационный процесс.</p>
    <Link href="/admin/company/work">К списку задач <ArrowRight size={15}/></Link>
  </section>;

  const stages=missionCaseRouteStages(work,events);
  const currentStage=stages[Math.min(selectedStage,stages.length-1)];
  const recorded=stages.filter(s=>s.status==='recorded').length;
  const history=[...events].filter(e=>e.caseId===work.id)
    .sort((a,b)=>b.at.localeCompare(a.at));
  const blocked=work.status==='BLOCKED'||Boolean(work.blockedReason);
  const techDone=work.workflowStatus==='COMPLETED'&&work.status==='OPEN';
  return <section className={styles.routeExperience} aria-label={'Маршрут кейса '+work.code}>
    <header className={styles.routeHero}>
      <div className={styles.routeHeroMain}>
        <div className={styles.routeEyebrow}><Flag size={13}/> КЕЙС {work.code}</div>
        <h2>{work.title}</h2>
        <div className={styles.routeBadges}>
          <span data-state="current"><Activity size={12}/>{work.status==='OPEN'?'Кейс открыт':'Статус '+work.status}</span>
          <span><ShieldCheck size={12}/>Приоритет {work.priority==='UNKNOWN'?'не указан':work.priority}</span>
          <span><CalendarClock size={12}/>{caseDueCopy(work.dueAt,asOf)}</span>
        </div>
      </div>
      <div className={styles.routeHeroActions}>
        <button type="button" onClick={onShowRole}><UserRound size={15}/>Комната ответственного</button>
        <Link href={'/admin/company/work/'+work.id}>Полная карточка <ArrowRight size={15}/></Link>
      </div>
    </header>

    <div className={styles.routeOperatorBand}>
      <div><MissionRobotPortrait role={work.owner}/>
        <span><small>Ответственная роль</small><strong>{missionRolePresentation[work.owner].name}</strong></span>
      </div>
      <div><CheckCircle2 size={20}/><span><small>Подтверждено отдельными записями</small>
        <strong>{recorded} из {stages.length} этапов</strong></span></div>
      <div><ShieldAlert size={20}/><span><small>Продвижение кейса</small>
        <strong>{techDone?'Технический шаг готов · кейс не закрыт':
          blocked?'Зафиксирована блокировка':'Нужна проверка следующих условий'}</strong></span></div>
    </div>

    <div className={styles.routeSectionHead}>
      <div><span>МАРШРУТ · СЕМЬ НЕЗАВИСИМЫХ ШАГОВ</span>
        <h3>Нажмите на этап, чтобы увидеть его доказательство</h3></div>
      <small>Схема выполнения, не автоматический исполнитель</small>
    </div>
    <ol className={styles.routeStages}>
      {stages.map((stage,i)=>{
        const Icon=stageIcons[i];
        return <li key={stage.id} className={styles.routeStage}
          data-state={stage.status} data-selected={selectedStage===i?'true':undefined}>
          <button type="button" aria-pressed={selectedStage===i}
            aria-label={'Этап '+(i+1)+': '+stage.label+'. '+stage.caption}
            onClick={()=>setSelectedStage(i)}>
            <span className={styles.routeStageIndex}>{String(i+1).padStart(2,'0')}</span>
            <span className={styles.routeStageGraphic}><Icon size={28} strokeWidth={1.7}/></span>
            <strong>{stage.label}</strong>
            <small>{stageStateText[stage.status]}</small>
            <span className={styles.routeStepCaption}>{stage.caption}</span>
          </button>
          {i<stages.length-1?<span className={styles.routeStageNext} aria-hidden="true">
            <ChevronRight size={15}/></span>:null}
        </li>;
      })}
    </ol>
    <section className={styles.routeExplanation} aria-label="Подробности выбранного этапа">
      <div className={styles.routeExplanationIcon}>
        {currentStage.status==='recorded'?<CheckCircle2 size={23}/>:
          currentStage.status==='current'?<Clock3 size={23}/>:<CircleHelp size={23}/>}
      </div>
      <div><div className={styles.routeEyebrow}>ЭТАП {selectedStage+1} / {stages.length}</div>
        <h4>{currentStage.label} · {currentStage.caption}</h4>
        <p>{currentStage.basis}</p></div>
      <Link href={'/admin/company/work/'+work.id}>Все доказательства <ArrowRight size={14}/></Link>
    </section>

    <section className={styles.routeDetailMap} aria-label="Карта переходов кейса">
      <div className={styles.routeDetailHead}>
        <div><span className={styles.routeEyebrow}><GitBranch size={14}/> КАРТА СВЯЗАННОГО ПРОЦЕССА</span>
          <h3>Переходы по этапам и условиям</h3>
          <p>Подсветка означает сохранённый факт, пунктир — ещё не подтверждённый этап.</p></div>
        <button type="button" aria-expanded={showAlternativePaths}
          onClick={()=>setShowAlternativePaths(v=>!v)}>
          {showAlternativePaths?'Скрыть альтернативы':'Показать альтернативные пути'}
          <ChevronRight size={14}/>
        </button>
      </div>
      <div className={styles.routeMapTrack}>
        {stages.slice(0,6).map((stage,i)=>{
          const Icon=stageIcons[i];
          return <div key={stage.id} className={styles.routeMapNode} data-state={stage.status}>
            <span className={styles.routeMapNumber}>{i+1}</span>
            <span className={styles.routeMapIcon}><Icon size={21}/></span>
            <strong>{stage.label}</strong>
            <small>{stageStateText[stage.status]}</small>
            {i<5?<ChevronRight className={styles.routeMapArrow} size={17} aria-hidden="true"/>:null}
          </div>;
        })}
      </div>
      {showAlternativePaths?<div className={styles.routeAlternatives}>
        <div><AlertTriangle size={17}/><span>
          <strong>Условная ветка: нужна доработка</strong>
          <small>Если независимая проверка не подтвердит результат, изменения возвращаются на пересмотр.
            Это правило процесса, не зарегистрированный возврат данного кейса.</small></span></div>
        <div><ShieldCheck size={17}/><span>
          <strong>Условная ветка: разрешённое исполнение</strong>
          <small>Только после требуемых разрешений и отдельного Execution Receipt. Переход ещё не подтверждён.</small></span></div>
      </div>:null}
    </section>

    <div className={styles.routeUnderGrid}>
      <article className={styles.routeSituation}>
        <div className={styles.routeSectionHead}><span><Info size={17}/> Что важно владельцу</span></div>
        {blocked?<p className={styles.routeRisk}><AlertTriangle size={18}/>
          Есть сохранённый признак блокировки. Причину нужно проверить в полной карточке.
        </p>:techDone?<p className={styles.routeCaution}><Clock3 size={18}/>
          Техническая работа завершена, но кейс остаётся OPEN. Независимая QA и измерение не доказаны.
        </p>:<p>Кейс имеет сохранённый статус {work.status}. Действие не считается исполненным без отдельной записи.</p>}
        <p><CalendarClock size={16}/>{caseDueCopy(work.dueAt,asOf)}</p>
        <p><LockKeyhole size={16}/>Следующий этап не запускается автоматически из этой схемы.</p>
        <Link href={'/admin/company/work/'+work.id}>
          Проверить допустимый переход и ограничения <ArrowRight size={15}/>
        </Link>
      </article>
      <article className={styles.routeProofs}>
        <div className={styles.routeSectionHead}><span><GitBranch size={18}/> Последние реальные события</span></div>
        <div className={styles.routeEventList}>
          {history.length?history.slice(0,4).map(ev=><Link href={'/admin/company/work/'+ev.caseId}
            key={ev.id} data-kind={ev.kind}>
            <span className={styles.routeProofDot}/>
            <span><strong>{ev.title}</strong>
              <small>{ev.kind==='handoff'?'Передача':ev.kind==='owner'?'Владелец':'Техническая работа'}
                {' · '+readableTime(ev.at)}</small></span>
            <ChevronRight size={15}/>
          </Link>):<p>Нет сохранённых событий для этого кейса.</p>}
        </div>
        {history.length>4?<small>Показано 4 из {history.length}. Все события — в полной карточке.</small>:null}
      </article>
    </div>
    <footer className={styles.routeFooter}>
      <span><CheckCircle2 size={15}/> Реальные данные, а не демонстрационная анимация</span>
      <span><ShieldCheck size={15}/> Неподтверждённые будущие этапы не помечаются выполненными</span>
    </footer>
  </section>;
}

/** Owner-facing decision panel; has NO synthetic approval button or backend mutation. */
export function MissionCaseDecisionPanel({work,snapshot,events}:{
  work:MissionCase|null;snapshot:MissionSnapshot;events:readonly MissionEvent[];
}){
  if(!work)return <aside className={styles.caseDecisionPanel}>
    <h2>Решение владельца</h2><p>Выберите кейс, чтобы увидеть его сохранённую историю и ограничения.</p>
  </aside>;
  const relevant=events.filter(e=>e.caseId===work.id);
  const decision=relevant.find(e=>e.kind==='owner'&&e.phase==='owner_resolved');
  const requested=relevant.some(e=>e.kind==='owner'&&e.phase==='owner_requested');
  return <aside className={styles.caseDecisionPanel} aria-label="Решение владельца по кейсу">
    <div className={styles.caseDecisionHeader}>
      <div className={styles.kicker}>ЦЕНТР РЕШЕНИЙ · ИМЕННО ЭТОТ КЕЙС</div>
      <h2>Решение владельца</h2>
      <p>Граница человеческого согласования отдельно от фактического исполнения.</p>
    </div>
    <section className={styles.caseDecisionCard}>
      <h3><UserRound size={17}/> Текущие подтверждения</h3>
      <div className={styles.caseDecisionStatus}
        data-status={decision?'recorded':requested?'requested':'unknown'}>
        {decision?<CheckCircle2 size={21}/>:<CircleHelp size={21}/>}
        <div><strong>{decision?'Внутреннее L0-решение записано':
          requested?'Запрос решения зарегистрирован':'Подтверждённого решения в этом обзоре нет'}</strong>
          <small>{decision?readableTime(decision.at):
            'Нужно проверить настоящую очередь, без догадок о согласовании'}</small></div>
      </div>
      <p>Решение по L0, даже если оно записано, не означает разрешение менять Production
        или завершение независимой QA.</p>
      {work.attentionId
        ?<Link href={'/admin/company/owner-attention/'+work.attentionId}>Открыть запись решения <ArrowRight size={14}/></Link>
        :<Link href="/admin/company/owner-attention">Открыть все решения <ArrowRight size={14}/></Link>}
    </section>
    <section className={styles.caseDecisionCard}>
      <h3><ShieldAlert size={17}/> Без автоматического разрешения</h3>
      <div className={styles.forbiddenList}>
        <p><LockKeyhole size={15}/> Публиковать изменения в код и SEO</p>
        <p><LockKeyhole size={15}/> Закрывать Case по факту завершения workflow</p>
        <p><LockKeyhole size={15}/> Приписывать измеренный рост без GMEL Outcome</p>
      </div>
    </section>
    <section className={styles.caseDecisionCard}>
      <h3><BookOpenCheck size={18}/> Что делать дальше</h3>
      <p>{work.status==='OPEN'&&work.workflowStatus==='COMPLETED'
        ?'Технический этап завершён, но кейс открыт. В полной карточке проверяются условия следующего перехода.'
        :'Откройте подтверждённый маршрут, статус и условия перехода.'}</p>
      <Link className={styles.caseDecisionPrimary} href={'/admin/company/work/'+work.id}>
        Проверить маршрут и доказательства <ArrowRight size={15}/>
      </Link>
    </section>
    <div className={styles.caseDecisionFoot}>
      <Info size={15}/> Этот экран ничего не утверждает и не запускает. Источник: owner-safe Core.
    </div>
  </aside>;
}
