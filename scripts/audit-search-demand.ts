import { readFileSync, writeFileSync } from 'node:fs';
import { buildDemandReview, DEFAULT_DEMAND_CONTEXT } from '../lib/searchDemandBridge.ts';
import { legacySnapshotToDemandRow, legacyBankToDemandRow } from '../lib/searchLegacyDemandAdapter.ts';
import { normalizeResearchKeyword } from '../lib/searchDemandEvidence.ts';

const source=JSON.parse(readFileSync('docs/search/demand-audit-input-20260923.json','utf8'));
const queue=JSON.parse(readFileSync('docs/search/FEYA_Keyword_Research_Queue_v1.json','utf8'));
const context={...DEFAULT_DEMAND_CONTEXT,now:new Date(source.now)};
const snapshots=source.snapshots.map(legacySnapshotToDemandRow);
const bank=source.keyword_bank.map(legacyBankToDemandRow);
const rows=[...snapshots,...bank];
const report=buildDemandReview(rows,context);
const reasons:Record<string,number>={};
for(const r of report.rows)for(const code of r.reason_codes)reasons[code]=(reasons[code]||0)+1;
const coverage=queue.batches.map((batch:{id:string;priority:string;decision_to_change:string;seeds:string[]})=>({
  id:batch.id,priority:batch.priority,decision_to_change:batch.decision_to_change,
  seeds:batch.seeds.map(keyword=>{
    const matches=report.rows.filter(r=>r.keyword_norm===normalizeResearchKeyword(keyword));
    return {keyword,source_refs:matches.map(r=>r.evidence.source_ref),keyword_bank_ids:rows.filter(r=>r.keyword_bank_id&&normalizeResearchKeyword(r.keyword)===normalizeResearchKeyword(keyword)).map(r=>r.keyword_bank_id),
      current_usable_observations:matches.filter(r=>r.usable_for_current_demand_decision).length,
      next_action:matches.length?'verify_original_targeting_period_capture_or_refresh':'request_targeted_historical_metrics',
      reason_codes:[...new Set(matches.flatMap(r=>r.reason_codes))]};
  }),
}));
const output={policy_version:report.policy_version,observed_at:source.observed_at,scope:{snapshots:snapshots.length,keyword_bank_total:source.audit.bank.reduce((sum:number,group:{rows:number})=>sum+group.rows,0),keyword_bank_exact_seed_matches:bank.length,seed_count:queue.batches.flatMap((b:{seeds:string[]})=>b.seeds).length},
  counts:source.audit,usable_current_observations:report.usable_observation_count,reason_counts:reasons,
  recovered_currency_rows:snapshots.filter((r:{bid_currency_code:string})=>r.bid_currency_code==='UAH').length,
  recovered_period_rows:snapshots.filter((r:{period_start:string})=>r.period_start).length,
  total_demand_volume:null,legacy_approvals_unchanged:true,can_publish:false,can_index:false,writes_performed:0,
  observations:report.rows.map(r=>({source_ref:r.evidence.source_ref,keyword:r.keyword,volume:r.avg_monthly_searches,currency:r.evidence.bid_currency_code,period_start:r.evidence.period_start,period_end:r.evidence.period_end,reason_codes:r.reason_codes})),coverage};
writeFileSync('docs/search/demand-audit-report-20260923.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({scope:output.scope,usable:output.usable_current_observations,recovered_currency_rows:output.recovered_currency_rows,recovered_period_rows:output.recovered_period_rows,reason_counts:reasons}));
