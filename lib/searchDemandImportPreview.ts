import { createHash } from 'node:crypto';
import { parseKeywordMetricCsv, type MetricCsvContext, type MetricCsvRow } from './searchMetricCsv.ts';
import { buildDemandReview, DEFAULT_DEMAND_CONTEXT } from './searchDemandBridge.ts';

function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(value);
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');

/** Dry-run adapter for the EXISTING staging store; no writes and no third keyword core. */
export function previewDemandImport(input:{csv_text?:string;rows?:MetricCsvRow[];context?:MetricCsvContext},now:Date) {
  if(input.csv_text!==undefined&&input.rows!==undefined)throw Error('Provide csv_text or rows, not both.');
  const sourceHash=input.csv_text===undefined?null:hash(input.csv_text);
  const parsed=input.csv_text===undefined?null:parseKeywordMetricCsv(input.csv_text,{...input.context,source_ref:sourceHash?'sha256:'+sourceHash:input.context?.source_ref});
  const rows=parsed?.rows||input.rows||[];
  if(rows.length>5000)throw Error('At most 5000 rows per review batch.');
  const report=buildDemandReview(rows,{...DEFAULT_DEMAND_CONTEXT,now});
  const accepted=report.rows.filter(row=>row.usable_for_current_demand_decision&&row.duplicate_of===null);
  const observations=accepted.map(row=>{
    const source=rows[row.row_number-2];
    const evidenceKey=hash(canonical({evidence:row.evidence,monthly_history_json:source.monthly_history_json||'',returned_keyword:source.returned_keyword||'',close_variants_json:source.close_variants_json||''}));
    return {evidence_key:evidenceKey,existing_snapshot_id:source.snapshot_id||null,keyword_bank_id:source.keyword_bank_id||null,
      storage_observation:{keyword_norm:row.keyword_norm,evidence:row.evidence,
        keyword_bank_id:source.keyword_bank_id||null,existing_snapshot_id:source.snapshot_id||null,
        metadata:{monthly_history_json:source.monthly_history_json||'',returned_keyword:source.returned_keyword||'',
          close_variants_json:source.close_variants_json||'',observation_group:source.observation_group||'',raw_input_json:source.raw_input_json||''}},
      staging_payload:{keyword:source.keyword,keyword_norm:row.keyword_norm,geo:source.region,language:source.language,
        avg_monthly_searches:row.avg_monthly_searches,competition:row.evidence.competition,competition_index:row.evidence.competition_index,
        low_top_of_page_bid:row.evidence.low_bid,high_top_of_page_bid:row.evidence.high_bid,
        monthly_search_volumes_raw:canonical({bridge_version:report.policy_version,evidence_key:evidenceKey,evidence:row.evidence,
          monthly_history_json:source.monthly_history_json||'',source_capture_at:source.last_checked,source_ref:source.source_ref}),
        import_status:'needs_review'}};
  });
  return {ok:!parsed?.errors.length&&rows.length>0,mode:'demand_import_preview',policy_version:report.policy_version,
    source_content_sha256:sourceHash,errors:parsed?.errors||[],report,observations,
    replay_identity:hash(canonical(observations.map(o=>o.evidence_key).sort())),
    target_table:'feya_commerce_seo_keyword_metric_import_staging_v1',
    persistence_status:'preview_only_no_write',writes_performed:0,
    can_assign_primary:false,can_publish:false,can_index:false};
}
