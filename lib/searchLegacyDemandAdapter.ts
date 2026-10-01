import type { MetricCsvRow } from './searchMetricCsv.ts';
import {isAtomicMetricSnapshot,storedSnapshotToDemandRow} from './searchStoredDemandAdapter.ts';

type Row=Record<string,unknown>;
const object=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const text=(v:unknown)=>v===null||v===undefined?'':String(v);
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function recordedPeriod(value:unknown) {
  const m=text(value).match(/^([A-Za-z]+) (\d{4}) - ([A-Za-z]+) (\d{4})$/);
  if(!m)return {start:'',end:''};
  const a=MONTHS.indexOf(m[1].slice(0,3).toLowerCase()),b=MONTHS.indexOf(m[3].slice(0,3).toLowerCase());
  if(a<0||b<0)return {start:'',end:''};
  return {start:`${m[2]}-${String(a+1).padStart(2,'0')}-01`,end:new Date(Date.UTC(Number(m[4]),b+1,0)).toISOString().slice(0,10)};
}

/** Read-only adaptation. No legacy rows, metric labels, IDs or approvals are rewritten. */
export function legacySnapshotToDemandRow(row:Row):MetricCsvRow {
  if(isAtomicMetricSnapshot(row))return storedSnapshotToDemandRow(row);
  const raw=object(row.raw_payload_json), history=object(row.monthly_search_volumes_json);
  let extra:Row={};
  try{extra=object(JSON.parse(text(history.raw)));}catch{/* Missing evidence remains missing. */}
  const context=object(raw.targeting_context),period=recordedPeriod(extra.date_range);
  const captured=text(row.fetched_at); const date=Date.parse(captured);
  const issues:string[]=[];
  if(row.data_freshness_status==='api_not_connected')issues.push('api_placeholder_not_observation');
  if(row.source_api==='google_ads_csv')issues.push('source_capture_time_unverified');
  if(extra.country_code&&extra.country_code!==row.geo)issues.push('legacy_market_conflict');
  if(extra.language_code&&extra.language_code!==row.language)issues.push('legacy_language_conflict');
  if(row.bid_currency_code&&extra.currency&&row.bid_currency_code!==extra.currency)issues.push('legacy_currency_conflict');
  return {
    snapshot_id:text(row.snapshot_id),keyword_id:text(row.keyword_id),keyword:text(row.keyword_norm),metric_source:text(row.source_api),
    source_ref:row.snapshot_id?`supabase:feya_commerce_seo_keyword_metric_snapshots_v1:${row.snapshot_id}`:'',
    region:text(row.geo),language:text(row.language),network:text(context.network),
    period_start:text(raw.period_start)||period.start,period_end:text(raw.period_end)||period.end,
    last_checked:Number.isFinite(date)?new Date(date).toISOString():'',
    avg_monthly_searches:text(row.avg_monthly_searches),competition:text(row.competition),competition_index:text(row.competition_index),
    low_bid:text(row.low_top_of_page_bid),high_bid:text(row.high_top_of_page_bid),bid_currency_code:text(row.bid_currency_code)||text(extra.currency),
    monthly_history_json:Array.isArray(row.monthly_search_volumes_json)?JSON.stringify(row.monthly_search_volumes_json):'',
    returned_keyword:text(object(raw.result).text),close_variants_json:JSON.stringify(object(raw.result).closeVariants||[]),
    parse_issues:issues.join('|'),raw_input_json:JSON.stringify(row),
    notes:'Legacy evidence adaptation only. fetched_at may be import time; a freshness label is not capture-date verification.',
  };
}

export function legacyBankToDemandRow(row:Row):MetricCsvRow {
  return {
    keyword_bank_id:text(row.id),keyword:text(row.keyword),region:text(row.region),language:text(row.language),network:'',
    metric_source:text(row.metric_source),source_ref:row.id?`supabase:seo_keyword_bank_v1:${row.id}`:'',
    last_checked:text(row.last_checked),period_start:'',period_end:'',avg_monthly_searches:text(row.avg_monthly_searches),
    competition:text(row.competition),competition_index:text(row.competition_index),low_bid:text(row.low_bid),high_bid:text(row.high_bid),
    bid_currency_code:'',parse_issues:'source_capture_time_unverified',raw_input_json:JSON.stringify(row),
    notes:'Historical keyword approval retained. Source file is not proof of Google targeting or capture time.',
  };
}
