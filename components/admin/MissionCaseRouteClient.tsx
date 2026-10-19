'use client';

import Link from 'next/link';
import {
  ArrowRight,CheckCircle2,Clock3,AlertTriangle,CircleHelp,
  SearchCheck,GitBranch,ShieldCheck,Target,ChartNoAxesCombined,
  ChevronRight,CalendarClock,Info,UserRound,
} from 'lucide-react';
import {missionCaseRouteStages,missionCaseDeadline} from '@/lib/owner-ui/missionControlView';
import type {MissionCase,MissionEvent} from '@/lib/owner-ui/missionControlProjection';
import {missionRolePresentation} from '@/lib/owner-ui/missionRolePresentation';
import styles from './MissionControl.module.css';

const stageIcons=[SearchCheck,Target,GitBranch,UserRound,ShieldCheck,CheckCircle2,ChartNoAxesCombined];

function dueCopy(dueAt:string|null,asOf:string|null){
  const state=missionCaseDeadline(dueAt,asOf);
  if(state==='not_set')return 'Срок не установлен · просрочка не определяется';
  if(state==='unknown')return 'Срок невозможно проверить';
  const when=dueAt?new Date(dueAt):null;
  const date=when&&Number.isFinite(when.getTime())
    ?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium'}).format(when):'';
  return state==='overdue'?'Указанный срок прошёл: '+date:'Указанный срок: '+date;
}

export function MissionCaseRouteClient({
  work,events,asOf,onShowRole,
}:{
  work:MissionCase|null;events:readonly MissionEvent[];
  asOf:string|null;onShowRole:()=>void;
}){
  if(!work)return <section className={styles.routeEmpty} role="status">
    <CircleHelp size={24}/><h3>Сохранённых кейсов нет</h3>
    <p>Маршрут нельзя построить без реального Case. Демонстрационные события не добавляются.</p>
    <Link href="/admin/company/work">Открыть список задач <ArrowRight size={15}/></Link>
  </section>;
  const stages=missionCaseRouteStages(work,events);
  const history=[...events].filter(e=>e.caseId===work.id).sort((a,b)=>b.at.localeCompare(a.at));
  const blocked=work.status==='BLOCKED'||Boolean(work.blockedReason);
  const techDone=work.workflowStatus==='COMPLETED'&&work.status==='OPEN';
  return <section className={styles.routeExperience} aria-label={'Маршрут кейса '+work.code}>
    <header className={styles.routeHero}>
      <div>
        <div className={styles.routeEyebrow}>МАРШРУТ РЕАЛЬНОГО КЕЙСА · НЕ СИМУЛЯЦИЯ</div>
        <h2>{work.title}</h2>
        <div className={styles.routeBadges}>
          <span>Кейс: {work.status==='OPEN'?'ОТКРЫТ':work.status}</span>
          <span>Приоритет: {work.priority==='UNKNOWN'?'не установлен':work.priority}</span>
          <span>Ответственный: {missionRolePresentation[work.owner].name}</span>
        </div>
        <p>{dueCopy(work.dueAt,asOf)}</p>
      </div>
      <div className={styles.routeHeroActions}>
        <Link href={'/admin/company/work/'+work.id}>
          Полная карточка <ArrowRight size={15}/>
        </Link>
        <button type="button" onClick={onShowRole}>
          Комната ответственного <ChevronRight size={15}/>
        </button>
      </div>
    </header>

    <div className={styles.routeSectionHead}>
      <div><span>01 / 07</span><h3>Факты, переходы и ещё не подтверждённые этапы</h3></div>
      <small>Без выдуманных процентов прогресса</small>
    </div>
    <ol className={styles.routeStages}>
      {stages.map((stage,i)=>{
        const Icon=stageIcons[i];
        return <li key={stage.id} data-state={stage.status} className={styles.routeStage}>
          <span className={styles.routeStageIndex}>{String(i+1).padStart(2,'0')}</span>
          <div className={styles.routeStageGraphic}><Icon size={24} strokeWidth={1.7}/></div>
          <strong>{stage.label}</strong>
          <p>{stage.caption}</p>
          <small>{stage.status==='recorded'?'Запись есть':
            stage.status==='current'?'Текущее состояние':
            stage.status==='attention'?'Требует проверки':'Не подтверждено'}</small>
          {i<stages.length-1?<span className={styles.routeStageNext} aria-hidden="true"><ChevronRight size={16}/></span>:null}
        </li>;
      })}
    </ol>

    <div className={styles.routeUnderGrid}>
      <article className={styles.routeSituation}>
        <div className={styles.routeSectionHead}><span><Info size={18}/> Что важно сейчас</span></div>
        {blocked?<p className={styles.routeRisk}><AlertTriangle size={17}/>
          Есть сохранённый признак блокировки. Причину нужно проверить в полной карточке.
        </p>:techDone?<p className={styles.routeCaution}><Clock3 size={18}/>
          Техническая работа завершена, но кейс остаётся OPEN.
          Это не означает готовность к публикации или измеренный результат.
        </p>:<p>Подтверждённое состояние кейса: {work.status}. Запуск AI не следует из этого статуса.</p>}
        <p><CalendarClock size={15}/>{dueCopy(work.dueAt,asOf)}</p>
        <p>Текущий шаг: {work.currentStep
          ? 'сохранён технический код шага; подробности в карточке':'не подтверждён в этом обзоре'}</p>
        <Link href={'/admin/company/work/'+work.id}>
          Проверить ограничения и допустимый переход <ArrowRight size={15}/>
        </Link>
      </article>
      <article className={styles.routeProofs}>
        <div className={styles.routeSectionHead}><span><GitBranch size={18}/> Подтверждённые записи</span></div>
        {history.length?<div className={styles.routeEventList}>
          {history.slice(0,5).map(event=><div key={event.id} data-kind={event.kind}>
            <span className={styles.routeProofDot}/>
            <div><strong>{event.title}</strong>
              <small>{event.kind==='handoff'?'Передача':event.kind==='owner'?'Владелец':'Технический workflow'}
                {' · '+new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(new Date(event.at))}
              </small></div>
          </div>)}
        </div>:<p>Подтверждённых событий пока нет.</p>}
        {history.length>5?<small>Показано 5 из {history.length} записей. Полная история ниже.</small>:null}
      </article>
    </div>
    <footer className={styles.routeFooter}>
      <span><CheckCircle2 size={15}/> Только сохранённые факты</span>
      <span><CircleHelp size={15}/> Схематические будущие этапы не являются выполненными действиями</span>
    </footer>
  </section>;
}
