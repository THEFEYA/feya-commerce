/**
 * G2 / Owner First / Toyota — read-only Jidoka+Andon interpreter.
 *
 * This code consumes an already verified CaseRouteTruth projection. It cannot
 * change an existing Case, assert a QA, invent a delivery SLA, or execute a
 * transition. It always stops rather than guessing when evidence disagrees.
 */
import type {CaseRouteTruth} from './growthCaseRouteTruth';

export type GrowthCaseAndon={
  state:'STOP'|'REVIEW'|'WAIT'|'NEXT'|'RECORDED';
  title:string;
  explanation:string;
  nextAction:string;
  actor:'Владелец'|'Техническое SEO'|'Независимая проверка'|'Измерения'|'Команда и владелец';
  missing:string[];
  canExecute:false;
  evidenceCeiling:'CASE_JOURNAL_ONLY';
};

/** Facts (not an instruction to run a workflow). Priority is owner-facing. */
export function explainGrowthCaseAndon(route:CaseRouteTruth):GrowthCaseAndon{
  const missing:string[]=[];
  if(route.ownerL0!=='CONFIRMED_INTERNAL_ONLY')
    missing.push('Подтверждённое решение владельца по внутреннему L0');
  if(route.independentQa==='NOT_ATTESTED')
    missing.push('Независимый акт проверки');
  if(route.measurement==='NO_PLAN'||route.measurement==='DRAFT_ONLY')
    missing.push('Предварительно утверждённый план измерения');
  else if(route.measurement==='LOCKED_NO_OUTCOME')
    missing.push('Наблюдаемый результат по утверждённому плану');

  const base={missing,canExecute:false as const,evidenceCeiling:'CASE_JOURNAL_ONLY' as const};

  if(route.eventContinuity!=='VERIFIED_LATEST'||route.ownershipEpoch===null){
    return {...base,state:'STOP',title:'Работу нельзя безопасно продолжить',
      explanation:'Статус или ответственный не согласован с журналом событий.',
      nextAction:'Сверить историю и версию ответственного до любого действия.',
      actor:'Команда и владелец'};
  }
  if(route.caseStatus==='BLOCKED'||route.caseStatus==='NOT_OBSERVABLE'){
    return {...base,state:'STOP',title:'Работа остановлена по сохранённому статусу',
      explanation:'Core записал остановку либо недостаточность наблюдений. Причина должна подтверждаться исходными событиями.',
      nextAction:'Проверить причину и источник, затем согласовать дальнейший маршрут.',
      actor:'Команда и владелец'};
  }
  if(route.caseStatus==='CANCELLED'||route.caseStatus==='DEFERRED'){
    return {...base,state:'RECORDED',title:'Работа не находится в активном исполнении',
      explanation:'Core сохранил прекращение либо перенос. Это не доказательство бизнес-результата.',
      nextAction:'Новый запуск возможен только как отдельное согласованное действие.',
      actor:'Владелец'};
  }
  if(route.caseStatus==='OPEN'&&route.workflowStatus!=='COMPLETED'){
    return {...base,state:'REVIEW',title:'Проверить техническое состояние',
      explanation:'Состояние технической работы ещё не подтверждает завершённый этап.',
      nextAction:'Открыть журнал workflow и проверить исходный результат.',
      actor:'Техническое SEO'};
  }
  if(route.caseStatus==='OPEN'&&route.ownerL0==='REQUEST_PENDING'){
    return {...base,state:'WAIT',title:'Ожидается решение владельца',
      explanation:'Вопрос создан, но подтверждённого решения этого типа пока нет.',
      nextAction:'Открыть существующую очередь Owner Attention и проверить доказательства.',
      actor:'Владелец'};
  }
  if(route.caseStatus==='OPEN'&&route.ownerL0!=='CONFIRMED_INTERNAL_ONLY'){
    return {...base,state:'REVIEW',title:'Нужна проверка доказательств L0',
      explanation:'Техническая операция выполнена, но требуемое человеческое подтверждение не установлено.',
      nextAction:'Проверить источник и зарегистрированное решение владельца.',
      actor:'Владелец'};
  }
  if(route.caseStatus==='OPEN'&&route.permissibleNextStep==='TRIAGED'){
    return {...base,state:'NEXT',title:'Следующий допустимый этап: TRIAGED',
      explanation:'Core допускает подготовку перехода, но защищённое действие этим экраном не разрешено и не выполнено.',
      nextAction:'Проверить условия существующего владельческого шлюза переходов.',
      actor:'Владелец'};
  }
  if(route.caseStatus==='CLOSED'){
    return {...base,state:'RECORDED',title:'Кейс завершён по записи Core',
      explanation:'Закрытие кейса не подтверждает эффект или независимую QA, если их нет в источниках.',
      nextAction:'Проверить результат и допуск к повторению в цикле Kaizen.',
      actor:'Независимая проверка'};
  }
  if((route.caseStatus==='ACTIONING'||route.caseStatus==='MEASURING')
    &&(route.measurement==='NO_PLAN'||route.measurement==='DRAFT_ONLY')){
    return {...base,state:'STOP',title:'Нельзя объявлять измеряемый эффект',
      explanation:'Работа продвинулась, но нет предварительно зафиксированного Measurement Spec.',
      nextAction:'Согласовать дизайн измерения до интерпретации результата.',
      actor:'Измерения'};
  }
  if(route.caseStatus==='MEASURING'||route.measurement==='LOCKED_NO_OUTCOME'){
    return {...base,state:'WAIT',title:'План измерения зафиксирован, результат ожидается',
      explanation:'Outcome ещё не зарегистрирован; срок не выводится из отсутствующих данных.',
      nextAction:'Получить наблюдения из проверенного источника и независимую QA.',
      actor:'Измерения'};
  }
  return {...base,state:'REVIEW',title:'Нужен следующий проверенный шаг',
    explanation:'Есть сохранённое состояние кейса, но оно недостаточно для безусловного продолжения.',
    nextAction:'Открыть полную историю и проверить разрешения Core.',
    actor:'Команда и владелец'};
}
