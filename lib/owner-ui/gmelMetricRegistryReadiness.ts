/** FEYA GMEL read-only metric-governance stage; NOT a Measurement Engine.
 * A metric definition does NOT imply locked Spec, independent QA, or Outcome.
 */
export const G2D_HTTP_METRIC_CODE='TSEO_HTTP_INTENT_MISMATCH_COUNT' as const;
export type MetricRow={
  metric_code?:unknown;metric_state?:unknown;owner_role?:unknown;
  authority_source?:unknown;version_no?:unknown;
};
export type MetricGate={
  state:'SOURCE_UNKNOWN'|'METRIC_NOT_REGISTERED'|'METRIC_NOT_APPROVED'|'METRIC_REGISTERED';
  title:string;next:string;version:number|null;
  canLockSpec:false;canClaimOutcome:false;independentQaPassed:false;
};
function gate(state:MetricGate['state'],title:string,next:string,version:number|null=null):MetricGate{
  return {state,title,next,version,canLockSpec:false,canClaimOutcome:false,independentQaPassed:false};
}
export function projectGmelMetricGate(args:{
  rows:readonly MetricRow[]|null;readError:boolean;
}):MetricGate{
  if(args.readError||!Array.isArray(args.rows))
    return gate('SOURCE_UNKNOWN','Состояние метрик не подтверждено',
      'Проверить доступ к реестру; недоступный источник не равен отсутствующей метрике.');
  if(args.rows.length===0)
    return gate('METRIC_NOT_REGISTERED','Метрика технического SEO ещё не зарегистрирована',
      'Согласовать с GMEL точный показатель, URL-кохорту и правила сравнения до фиксации плана.');
  if(args.rows.length!==1)
    return gate('METRIC_NOT_APPROVED','Определение метрики неоднозначно',
      'Проверить дубли и ответственность, не выбирать произвольное определение.');
  const item=args.rows[0];
  const approved=item.metric_code===G2D_HTTP_METRIC_CODE&&item.owner_role==='GMEL'&&
    item.authority_source==='FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1'&&
    (item.metric_state==='AVAILABLE'||item.metric_state==='AVAILABLE_WITH_LIMITATIONS')&&
    typeof item.version_no==='number'&&Number.isSafeInteger(item.version_no)&&item.version_no>0;
  if(!approved)return gate('METRIC_NOT_APPROVED','Метрика ещё не пригодна для измерения',
    'Подтвердить владельца GMEL, источник, допустимый статус и номер версии.');
  return gate('METRIC_REGISTERED','Определение метрики зарегистрировано',
    'До Measurement Spec необходимы независимая QA и заранее утверждённые правила сравнения.',
    item.version_no as number);
}

