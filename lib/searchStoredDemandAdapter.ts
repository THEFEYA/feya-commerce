import type {MetricCsvRow} from './searchMetricCsv.ts';
type Row=Record<string,unknown>;
const object=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const text=(v:unknown)=>v===null||v===undefined?'':String(v);
export function isAtomicMetricSnapshot(row:Row) {
 return row.demand_observation_key!=null||row.demand_evidence_json!=null||object(row.raw_payload_json).contract_version==='atomic_keyword_metric_import_v1';
}

/** Atomic storage is evidence intake, not approval. No unrecorded context approval is inferred. */
export function storedSnapshotToDemandRow(row:Row):MetricCsvRow {
 const document=object(row.demand_evidence_json),e=object(document.evidence),metadata=object(document.metadata),raw=object(row.raw_payload_json);
 const issues=['source_context_review_required'];
 if(!/^[a-f0-9]{64}$/.test(text(row.demand_observation_key))||raw.contract_version!=='atomic_keyword_metric_import_v1'||!Object.keys(e).length)issues.push('stored_evidence_contract_invalid');
 const id=(value:unknown)=>{
   if(typeof value==='number'&&!Number.isSafeInteger(value)){issues.push('unsafe_integer_identifier');return '';}
   return text(value);
 };
 const snapshotId=id(row.snapshot_id),keywordId=id(row.keyword_id);
 for(const [column,field] of [['keyword_norm','keyword_norm'],['source_api','source'],['geo','market'],['language','language'],['avg_monthly_searches','avg_monthly_searches'],['competition','competition'],['competition_index','competition_index'],['low_top_of_page_bid','low_bid'],['high_top_of_page_bid','high_bid'],['bid_currency_code','bid_currency_code']]){
   const expected=field==='keyword_norm'?document.keyword_norm:e[field];
   if(text(row[column])!==text(expected))issues.push('stored_evidence_column_mismatch');
 }
 const captured=Date.parse(text(e.fetched_at)),stored=Date.parse(text(row.fetched_at));
 if(!Number.isFinite(captured)||captured!==stored)issues.push('stored_capture_date_mismatch');
 if(!['context_review_required'].includes(text(row.data_freshness_status)))issues.push('unrecognized_atomic_review_status');
 const range=object(e.search_volume_range);
 return {snapshot_id:snapshotId,keyword_id:keywordId,keyword_bank_id:text(document.keyword_bank_id),keyword:text(e.keyword),
  metric_source:text(e.source),source_ref:text(e.source_ref),region:text(e.market),language:text(e.language),network:text(e.network),
  period_start:text(e.period_start),period_end:text(e.period_end),last_checked:text(e.fetched_at),
  avg_monthly_searches:text(e.avg_monthly_searches),volume_range_low:text(range.low),volume_range_high:text(range.high),
  competition:text(e.competition),competition_index:text(e.competition_index),low_bid:text(e.low_bid),high_bid:text(e.high_bid),bid_currency_code:text(e.bid_currency_code),
  monthly_history_json:text(metadata.monthly_history_json),returned_keyword:text(metadata.returned_keyword),close_variants_json:text(metadata.close_variants_json),observation_group:text(metadata.observation_group),
  raw_input_json:text(metadata.raw_input_json),parse_issues:[...new Set(issues)].join('|'),
  notes:'Atomic observation retained; context review has not granted keyword or page authority.'};
}
