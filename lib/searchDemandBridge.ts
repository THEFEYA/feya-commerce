import { normalizeResearchKeyword, validateDemandEvidence, type DemandEvidence } from './searchDemandEvidence.ts';
import { metricObservationIdentity, parseMetricNumber, type MetricCsvRow } from './searchMetricCsv.ts';
import { auditOwnership, type QueryOwnership } from './searchPortfolioPolicy.ts';

export const DEMAND_BRIDGE_POLICY = 'demand_evidence_review_v1';
export const DEFAULT_DEMAND_CONTEXT = {market:'US',language:'en',network:'GOOGLE_SEARCH',max_age_days:60};
export type DemandContext = typeof DEFAULT_DEMAND_CONTEXT & {now:Date};
const ALIASES:Record<string,string>={google_keyword_planner:'google_ads_csv',keyword_planner_csv:'google_ads_csv',google_ads_csv:'google_ads_csv',google_ads_api:'google_ads_api',google_ads_keyword_planner:'google_ads_api'};

export function csvRowDemandEvidence(row:MetricCsvRow): DemandEvidence {
  const number=(key:string,kind:'integer'|'decimal'='decimal')=>parseMetricNumber(row[key],kind).value;
  const low=number('volume_range_low','integer'),high=number('volume_range_high','integer');
  return {
    keyword:row.keyword||'',source:ALIASES[row.metric_source]||row.metric_source||'',source_ref:row.source_ref||null,
    market:row.region||'',language:row.language||'',network:row.network||'',
    fetched_at:row.last_checked||null,period_start:row.period_start||null,period_end:row.period_end||null,
    avg_monthly_searches:number('avg_monthly_searches','integer'),
    search_volume_range:low!==null&&high!==null?{low,high}:null,
    competition:(row.competition==='UNKNOWN'||!row.competition?null:row.competition) as DemandEvidence['competition'],
    competition_index:number('competition_index'),low_bid:number('low_bid'),high_bid:number('high_bid'),bid_currency_code:row.bid_currency_code||null,
  };
}

export function assessDemandCsvRow(row:MetricCsvRow, context:DemandContext) {
  const evidence=csvRowDemandEvidence(row);
  const result=validateDemandEvidence(evidence,context);
  const errors=[...result.errors,...(row.parse_issues||'').split('|').filter(Boolean)];
  for(const key of ['avg_monthly_searches','competition_index','volume_range_low','volume_range_high','low_bid','high_bid']) {
    const parsed=parseMetricNumber(row[key],['avg_monthly_searches','competition_index','volume_range_low','volume_range_high'].includes(key)?'integer':'decimal');
    if(parsed.error)errors.push(`${key}_${parsed.error}`);
  }
  if(Boolean(row.volume_range_low)!==Boolean(row.volume_range_high))errors.push('incomplete_volume_range');
  const reasons=[...new Set([...errors,...result.warnings])];
  return {...result,evidence,errors:[...new Set(errors)],reason_codes:reasons,usable_for_current_demand_decision:reasons.length===0,
    status:errors.length?'blocked' as const:result.warnings.length?'warning' as const:'valid' as const};
}

/** No volume sum, no fabricated rank score and no automatic Primary/page type. */
export function buildDemandReview(rows:MetricCsvRow[],context:DemandContext) {
  const seen=new Map<string,{signature:string;index:number}>();
  const results=rows.map((row,index)=>{
    const review=assessDemandCsvRow(row,context);
    const identity=metricObservationIdentity(row);
    const signature=JSON.stringify([review.evidence,row.monthly_history_json||'',row.returned_keyword||'',row.close_variants_json||'',row.observation_group||'']);
    const previous=seen.get(identity);
    const duplicate=previous?.signature===signature;
    const conflict=Boolean(previous&&!duplicate);
    if(!previous)seen.set(identity,{signature,index});
    return {row_number:index+2,keyword:row.keyword||'',identity,...review,duplicate_of:duplicate?previous!.index+2:null,conflict};
  });
  const conflicted=new Set(results.filter(r=>r.conflict).map(r=>r.identity));
  for(const row of results)if(conflicted.has(row.identity)){row.reason_codes.push('conflicting_same_source_observation');row.usable_for_current_demand_decision=false;row.status='blocked';}
  return {policy_version:DEMAND_BRIDGE_POLICY,context,rows:results,unique_observation_count:seen.size,
    duplicate_count:results.filter(r=>r.duplicate_of!==null).length,conflict_count:conflicted.size,
    usable_observation_count:results.filter(r=>r.usable_for_current_demand_decision&&r.duplicate_of===null).length,
    total_volume:null,can_assign_primary:false,can_publish:false,can_index:false,writes_performed:0};
}

export function buildDemandDecisionBrief(input:{query_cluster_id:string;seo_page_id:string;locale:string;keywords:string[];rows:MetricCsvRow[];ownership:QueryOwnership[];context:DemandContext}) {
  const queries=new Set(input.keywords.map(normalizeResearchKeyword));
  const report=buildDemandReview(input.rows.filter(r=>queries.has(normalizeResearchKeyword(r.keyword))),input.context);
  const audit=auditOwnership(input.ownership,input.context.now);
  const scoped=audit.current.filter(o=>o.query_cluster_id===input.query_cluster_id&&o.market_code===input.context.market&&o.locale===input.locale);
  const reasons:string[]=[];
  if(!input.query_cluster_id||!input.seo_page_id)reasons.push('stable_page_or_cluster_id_missing');
  if(scoped.length!==1||scoped[0].seo_page_id!==input.seo_page_id)reasons.push('primary_owner_missing_or_conflicting');
  if(audit.invalid.some(o=>o.query_cluster_id===input.query_cluster_id&&o.market_code===input.context.market&&o.locale===input.locale))reasons.push('invalid_ownership_interval');
  if(!report.usable_observation_count)reasons.push('no_usable_current_demand_evidence');
  if(report.conflict_count)reasons.push('source_observation_conflict');
  return {query_cluster_id:input.query_cluster_id,seo_page_id:input.seo_page_id,evidence:report,
    decision:reasons.length?'hold':'ready_for_intent_inventory_review',reason_codes:reasons,
    keyword_ids_unchanged:true,can_publish:false,can_index:false,total_volume:null};
}

export function csvReviewScore(row:MetricCsvRow,context:DemandContext) {
  const review=assessDemandCsvRow(row,context);
  return {keyword:row.keyword||'—',score:null as number|null,role:'hold' as const,pageType:'intent_review',blockers:review.reason_codes,
    notes:['Данные для проверки спроса; Primary требует владельца запросов, интента и ассортимента.','Рекламная конкуренция не оценивается как сложность SEO.'],review};
}

export function demandReasonLabel(code:string) {
  const labels:Record<string,string>={
    targeting_context_mismatch:'Подтвердите регион, язык и сеть поиска',
    capture_date_invalid:'Нужна корректная дата получения исходных метрик',
    metric_period_invalid:'Нужен подтверждённый период статистики',
    metric_period_stale:'Период статистики требует обновления',
    provenance_missing:'Нужна ссылка на исходную выгрузку',
    snapshot_stale:'Метрики требуют обновления по текущей политике',
    volume_unavailable:'Спрос не указан; это не нулевой спрос',
    not_google_demand_source:'Источник не подтверждает спрос Google',
    bid_currency_missing_or_invalid:'Для ставок нужна исходная валюта',
    conflicting_same_source_observation:'В одном источнике есть противоречащие значения',
    incomplete_volume_range:'Укажите обе границы диапазона',
    invalid_volume_range:'Некорректный диапазон спроса',
    invalid_search_volume:'Некорректное значение спроса',
    ambiguous_volume_representation:'Одновременно указаны число и диапазон спроса',
    invalid_ads_competition:'Некорректное значение рекламной конкуренции',
    source_capture_time_unverified:'Дата получения исходного экспорта не подтверждена',
    source_context_review_required:'Контекст источника ещё требует проверки',
    stored_evidence_contract_invalid:'Сохранённое доказательство не соответствует контракту',
    stored_evidence_column_mismatch:'Поля снимка расходятся с исходным доказательством',
    stored_capture_date_mismatch:'Дата снимка расходится с датой источника',
    unsafe_integer_identifier:'Идентификатор потерял точность при чтении',
    unrecognized_atomic_review_status:'Статус проверки источника не подтверждён',
    api_placeholder_not_observation:'Это заготовка API; метрики ещё не получены',
  };
  return labels[code]||(/^.*(numeric|decimal)/.test(code)?'Число неоднозначно: проверьте разделители и исходное значение':code);
}
