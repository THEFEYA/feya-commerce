'use client';

import Link from 'next/link';
import {useState} from 'react';
import {
  ArrowRight,Activity,AlertTriangle,BarChart3,BookOpenCheck,
  CircleCheck,Clock3,FileSearch,GitBranch,Info,KeyRound,
  ListChecks,LockKeyhole,Search,ShieldCheck,Sparkles,Workflow,
} from 'lucide-react';
import type {MissionSnapshot,MissionRoleCode,MissionCase,MissionEvent} from '@/lib/owner-ui/missionControlProjection';
import {missionOrganizationalLinks,missionRolePresentation,missionAutonomyLabel}
  from '@/lib/owner-ui/missionRolePresentation';
import {MissionRobotPortrait} from './MissionRobotPortrait';
import styles from './MissionControl.module.css';

type Participant=MissionRoleCode|'OWNER';
type InspectorTab='overview'|'links'|'cases'|'metrics';

const roleSignals:Record<MissionRoleCode,string[]>={
  GROWTH_DIRECTOR:['Приоритеты роста','Решения владельца','Риски и зависимости'],
  OSPM:['Структура спроса','Владение страницами','Поисковые намерения'],
  SCO:['SEO-задания','Проверяемость утверждений','Статус предложений'],
  CQA:['Достоверность фактов','SEO-качество','Независимая проверка'],
  TSEO:['Индексируемость','Скорость страниц','Canonical / sitemap','Технические ошибки'],
  GMEL:['Измеримость эффекта','Зафиксированный план','Качество выводов'],
  GDAE:['Источники данных','Свежесть','Сопоставимость'],
  CPIM:['Ассортимент','Товарные предложения','Подтверждённые заказы'],
};
const modeCopy:Record<string,string>={
  SHADOW:'Режим наблюдения',INACTIVE:'Не активирован',ACTIVE:'Активирован',
  PAUSED:'Приостановлен',UNKNOWN:'Статус не подтверждён',
};
function shortDate(at:string){
  const d=new Date(at);
  return Number.isFinite(d.getTime())
    ?new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(d)
    :'Время не подтверждено';
}
function displayParticipant(id:Participant){
  return id==='OWNER'?'Владелец FEYA':missionRolePresentation[id].name;
}
function openCaseStatus(work:MissionCase){
  return work.status==='OPEN'&&work.workflowStatus==='COMPLETED'
    ?'Кейс открыт · технический этап завершён'
    :work.status==='OPEN'?'Кейс открыт':'Статус кейса: '+work.status;
}

export function MissionRoleInspector({
  snapshot,selected,caseFocus,event,onSelectRole,onOpenCase,
}:{
  snapshot:MissionSnapshot;selected:Participant;
  caseFocus:MissionCase|null;event:MissionEvent|null;
  onSelectRole:(code:Participant)=>void;onOpenCase:(id:string)=>void;
}){
  const [tab,setTab]=useState<InspectorTab>('overview');
  const role=snapshot.roles.find(x=>x.code===selected);
  const meta=selected==='OWNER'?null:missionRolePresentation[selected];
  const allCases=snapshot.cases.filter(x=>x.owner===selected);
  const assigned=caseFocus?allCases.filter(c=>c.id===caseFocus.id):allCases;
  const handoffs=snapshot.events.filter(e=>e.kind==='handoff'
    &&(e.source===selected||e.target===selected)
    &&(!caseFocus||e.caseId===caseFocus.id));
  const policy=missionOrganizationalLinks.filter(edge=>
    edge.source===selected||edge.target===selected);
  const title=selected==='OWNER'?'Владелец FEYA':meta?.name||'Сотрудник';
  const mode=selected==='OWNER'?'Решения человека':modeCopy[role?.mode||'UNKNOWN']||'Статус не подтверждён';
  const firstCase=assigned[0]||null;
  return <aside className={styles.dossier} data-role={selected} aria-label="Комната сотрудника FEYA">
    <header className={styles.dossierHero}>
      <div className={styles.dossierRobot}><MissionRobotPortrait role={selected} large/></div>
      <div className={styles.dossierHeroText}>
        <div className={styles.kicker}>КОМНАТА СОТРУДНИКА / ПАСПОРТ РОЛИ</div>
        <h2>{title}</h2>
        <p>{selected==='OWNER'?'Человек · стратегия и согласования':meta?.section}</p>
        <span className={styles.pill}><ShieldCheck size={12}/>{mode}</span>
      </div>
    </header>

    <div className={styles.dossierQuickFacts}>
      <span><ListChecks size={13}/>{selected==='OWNER'
        ?(snapshot.ownerAttention?.total===undefined?'Вопросы: данные недоступны':'Вопросов: '+snapshot.ownerAttention.total)
        :'Кейсов: '+allCases.filter(c=>c.status==='OPEN').length}</span>
      <span><Workflow size={13}/>Сохранённых событий передачи: {handoffs.length}</span>
    </div>
    {caseFocus?<button type="button" className={styles.focusNotice}
      onClick={()=>onOpenCase(caseFocus.id)}>
      <span>Выбран кейс {caseFocus.code}</span><ArrowRight size={14}/>
    </button>:null}

    <div className={styles.dossierTabs} role="group" aria-label="Разделы комнаты">
      {([
        ['overview','Обзор'],['links','Связи'],['cases','Задачи'],['metrics','Метрики']
      ] as const).map(([id,label])=><button key={id} type="button"
        aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}
    </div>

    {tab==='overview'?<div className={styles.dossierContent}>
      <div className={styles.roleBlockGrid}>
        <section className={styles.roleBrief}>
          <h3><Sparkles size={16}/> Что делает</h3>
          <p>{meta?.mission||'Определяет приоритеты, утверждает решения и контролирует бизнес-границы FEYA.'}</p>
        </section>
        <section className={styles.roleBrief}>
          <h3><ShieldCheck size={16}/> Что разрешено</h3>
          <p>{role?(missionAutonomyLabel[role.autonomy]||'Полномочия требуют проверки')
            :'Решения владельца и отдельное подтверждение выпуска.'}</p>
        </section>
        <section className={styles.roleBrief}>
          <h3><LockKeyhole size={16}/> Ограничение</h3>
          <p>{meta?.scope||'Решение человека не означает завершённого выполнения или измерения.'}</p>
        </section>
        <section className={styles.roleBrief}>
          <h3><FileSearch size={16}/> Области контроля</h3>
          <div className={styles.signalTags}>
            {(selected==='OWNER'?['Решения','Приоритеты','Контроль рисков']:roleSignals[selected]).map(s=>
              <span key={s}>{s}</span>)}
          </div>
        </section>
      </div>
      <div className={styles.dossierStatusLine}>
        <span><Activity size={15}/> Факт состояния</span>
        <strong>{selected==='OWNER'?'Владелец управляет решениями':
          role?.mode==='SHADOW'?'Наблюдение, не фоновая работа AI':
          role?.mode==='INACTIVE'?'Роль зарегистрирована, но не активна':
          'Статус по записи Core'}</strong>
      </div>
      <div className={styles.nextAction}>
        <h3><ArrowRight size={15}/> Следующий полезный шаг</h3>
        {firstCase?<button type="button" onClick={()=>onOpenCase(firstCase.id)}>
          Разобрать кейс {firstCase.code} <ArrowRight size={15}/></button>
        :selected==='OWNER'?<Link href="/admin/company/owner-attention">Проверить очередь решений <ArrowRight size={15}/></Link>
        :<Link href="/admin/roles">Посмотреть права роли <ArrowRight size={15}/></Link>}
        <small>Открытие материалов не запускает AI или публикацию.</small>
      </div>
    </div>:null}

    {tab==='links'?<div className={styles.dossierContent}>
      <div className={styles.dossierSectionTitle}><GitBranch size={16}/>
        <div><strong>Регламент взаимодействий</strong><small>Возможные связи по паспортам, не работа в реальном времени</small></div>
      </div>
      <div className={styles.relationGrid}>
        {policy.map((edge,i)=>{
          const counterpart=edge.source===selected?edge.target:edge.source;
          return <button key={edge.source+'-'+edge.target+'-'+i} type="button"
            onClick={()=>{onSelectRole(counterpart);setTab('overview');}}>
            <span>{edge.source===selected?'Передаёт →':'← Получает'}</span>
            <strong>{displayParticipant(counterpart)}</strong>
            <ArrowRight size={13}/>
          </button>;
        })}
        {!policy.length?<p className={styles.note}>Регламентных связей не заявлено.</p>:null}
      </div>
      <div className={styles.dossierSectionTitle}><CircleCheck size={17}/>
        <div><strong>Реальные события передачи</strong><small>Только сохранённые handoff-записи</small></div>
      </div>
      {handoffs.length?handoffs.slice(-5).reverse().map(h=>
        <Link href={'/admin/company/work/'+h.caseId} key={h.id} className={styles.relationEvent}>
          <strong>{displayParticipant(h.source)} → {h.target?displayParticipant(h.target):'—'}</strong>
          <small>{h.caseCode} · {shortDate(h.at)}</small><span>{h.title}</span>
        </Link>):<p className={styles.note}>По выбранному фокусу подтверждённых передач нет.</p>}
    </div>:null}

    {tab==='cases'?<div className={styles.dossierContent}>
      <div className={styles.dossierSectionTitle}><ListChecks size={17}/>
        <div><strong>{selected==='OWNER'?'Решения владельца':'Закреплённые кейсы'}</strong>
          <small>Сохранённые записи, не предполагаемое расписание работы</small></div>
      </div>
      {selected==='OWNER'
        ?snapshot.ownerAttention?.items.length?snapshot.ownerAttention.items.map(a=>
          <Link className={styles.caseLink} key={a.id} href={'/admin/company/owner-attention/'+a.id}>
            <strong>{a.priority} · {a.status==='OPEN'?'Ожидает решения':'Принято к рассмотрению'}</strong>
            <span>{a.title}</span></Link>)
        :<p className={styles.note}>В этом снимке нет доступных вопросов. Откройте полную очередь.</p>
        :assigned.length?assigned.map(c=>
          <button type="button" key={c.id} className={styles.caseLink}
            onClick={()=>onOpenCase(c.id)}>
            <strong>{c.code} · {c.priority}</strong>
            <span>{c.title}</span><small>{openCaseStatus(c)}</small><ArrowRight size={14}/>
          </button>)
        :<p className={styles.note}>За этой ролью нет закреплённых кейсов в выбранном фокусе.</p>}
      <Link href={selected==='OWNER'?'/admin/company/owner-attention':'/admin/company/work'}
        className={styles.dossierActionLink}>Открыть полный рабочий список <ArrowRight size={15}/></Link>
    </div>:null}

    {tab==='metrics'?<div className={styles.dossierContent}>
      <div className={styles.metricsTruth}>
        <BarChart3 size={24}/><h3>Подтверждённые результаты</h3>
        <p>Метрики результата здесь не выводятся без проверенного источника,
          интервала и базового периода. Завершение workflow не является измерением роста.</p>
        <div className={styles.metricsRows}>
          <span><CircleCheck size={16}/>Кейсы в снимке</span>
          <strong>{selected==='OWNER'?snapshot.totalOpenCases:role?.openCases||0}</strong>
          <span><GitBranch size={16}/>Исторические записи передачи</span>
          <strong>{handoffs.length}</strong>
          <span><AlertTriangle size={16}/>Коммерческий эффект / ROI</span>
          <strong>Не подтверждён</strong>
        </div>
        <Link href="/admin/company/results">Открыть результаты <ArrowRight size={15}/></Link>
      </div>
    </div>:null}

    <div className={styles.currentEventBlock}>
      <div className={styles.kicker}><Clock3 size={13}/> ВЫБРАННОЕ СОБЫТИЕ · НЕ LIVE</div>
      {event?<div className={styles.currentEvent}>
        <small>{shortDate(event.at)} · {event.caseCode}</small>
        <strong>{event.title}</strong>
        <div className={styles.links}>
          <Link href={'/admin/company/work/'+event.caseId}>Открыть кейс</Link>
          {event.attentionId?<Link href={'/admin/company/owner-attention/'+event.attentionId}>Решение владельца</Link>:null}
        </div>
      </div>:<p className={styles.note}>Нет сохранённого события для выбранного фильтра.</p>}
    </div>
  </aside>;
}
