import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseMetricNumber, parseSearchVolume, parseKeywordMetricCsv, metricRowsToCsv, type MetricCsvRow } from '../../lib/searchMetricCsv.ts';
import { buildDemandReview, assessDemandCsvRow, csvReviewScore, DEFAULT_DEMAND_CONTEXT, buildDemandDecisionBrief } from '../../lib/searchDemandBridge.ts';
import { previewDemandImport } from '../../lib/searchDemandImportPreview.ts';
import { legacySnapshotToDemandRow, legacyBankToDemandRow } from '../../lib/searchLegacyDemandAdapter.ts';

const now=new Date('2026-09-23T23:00:00Z');
const context={...DEFAULT_DEMAND_CONTEXT,now};
const row=(patch:Partial<MetricCsvRow>={}):MetricCsvRow=>({keyword:'festival outfit',region:'US',language:'en',network:'GOOGLE_SEARCH',metric_source:'google_ads_csv',source_ref:'fixture:synthetic-only',period_start:'2025-09-01',period_end:'2026-08-31',last_checked:'2026-09-20',avg_monthly_searches:'0',competition:'LOW',competition_index:'10',low_bid:'',high_bid:'',bid_currency_code:'',...patch} as MetricCsvRow);

for(const [value,expected] of [['0',0],['1,000',1000],['12 345',12345],['12\u202f345',12345],['',null],['—',null],['N/A',null]] as const) {
  test(`volume parser preserves ${JSON.stringify(value)}`,()=>assert.equal(parseSearchVolume(value).value,expected));
}
test('invalid/ambiguous numeric input is not repaired into a measurement',()=>{
  for(const v of ['1,5','-1','12.5','£20','1e3','Infinity','NaN','1,00'])assert.ok(parseMetricNumber(v,'integer').error,v);
  assert.ok(parseMetricNumber('1,234','decimal').error);
  assert.equal(parseMetricNumber('1,25','decimal',',').value,1.25);
  assert.equal(parseMetricNumber('1,234.50','decimal').value,1234.5);
});
test('ranges remain ranges; missing or zero observations retain distinct meaning',()=>{
  assert.deepEqual(parseSearchVolume('1K – 10K'),{value:null,low:1000,high:10000,error:null});
  assert.ok(parseSearchVolume('1000-100').error);
  assert.equal(assessDemandCsvRow(row(),context).usable_for_current_demand_decision,true);
  assert.equal(assessDemandCsvRow(row({avg_monthly_searches:''}),context).usable_for_current_demand_decision,false);
  const ranged=assessDemandCsvRow(row({avg_monthly_searches:'',volume_range_low:'0',volume_range_high:'100'}),context);
  assert.equal(ranged.usable_for_current_demand_decision,true);
  assert.equal(ranged.avg_monthly_searches,null);
  assert.deepEqual(ranged.search_volume_range,{low:0,high:100});
});
test('Google TSV preserves currency and dynamic months without inventing targeting or capture time',()=>{
  const csv='Keyword Stats\nExport context not provided\nKeyword\tCurrency\tAvg. monthly searches\tCompetition\tSearches: Jul 2026\tSearches: Aug 2026\n"festival\noutfit"\tUAH\t1,000\tВысокий\t0\t--\n';
  const parsed=parseKeywordMetricCsv(csv);
  assert.equal(parsed.rows.length,1);
  const r=parsed.rows[0];assert.equal(r.avg_monthly_searches,'1000');assert.equal(r.bid_currency_code,'UAH');
  assert.equal(r.last_checked,'');assert.equal(r.region,'');assert.equal(r.language,'');assert.equal(r.network,'');
  assert.deepEqual(JSON.parse(r.monthly_history_json),[{month:'2026-07',searches:0},{month:'2026-08',searches:null}]);
  assert.equal(r.keyword,'festival\noutfit');
  assert.equal(assessDemandCsvRow(r,context).usable_for_current_demand_decision,false);
});
test('Google comma/semicolon exports and BOM are parsed; malformed quoting/headers are held',()=>{
  for(const delimiter of [',',';','\t'])assert.equal(parseKeywordMetricCsv('\uFEFF'+['Keyword','Avg. monthly searches'].join(delimiter)+'\n'+['armor','100'].join(delimiter)).rows[0].avg_monthly_searches,'100');
  assert.ok(parseKeywordMetricCsv('keyword,keyword\narmor,mask').errors.includes('duplicate_csv_header'));
  assert.ok(parseKeywordMetricCsv('keyword,region\n"armor,US').errors.includes('unterminated_csv_quote'));
  assert.equal(parseKeywordMetricCsv('keyword,region\narmor,US,extra').rows[0].parse_issues,'csv_column_count_mismatch');
});
test('CSV roundtrip preserves provenance, ranges, raw values, IDs and multiline evidence',()=>{
  const parsed=parseKeywordMetricCsv('Keyword,Avg. monthly searches,Competition\narmor,1K-10K,Low');
  const r:MetricCsvRow={...parsed.rows[0],source_ref:'fixture:raw-export',keyword_bank_id:'fixed-uuid',notes:'line one\nline "two"'};
  const again=parseKeywordMetricCsv(metricRowsToCsv([r])).rows[0];
  for(const key of Object.keys(r))assert.equal(again[key],r[key],key);
});
test('future/invalid dates, stale metric periods, missing currency and wrong networks cannot pass',()=>{
  for(const patch of [{last_checked:'2026-02-30'},{last_checked:'tomorrow'},{last_checked:'2026-12-01'},
    {last_checked:'2026-09-20',period_end:'2025-12-31'},{network:'GOOGLE_SEARCH_AND_PARTNERS'},{low_bid:'10',bid_currency_code:''},
    {metric_source:'google_trends'},{avg_monthly_searches:'2.5'}])assert.equal(assessDemandCsvRow(row(patch),context).usable_for_current_demand_decision,false,JSON.stringify(patch));
});
test('repeating the same observation deduplicates, but contradictory rows hold BOTH observations',()=>{
  const duplicate=buildDemandReview([row(),row()],context);
  assert.equal(duplicate.unique_observation_count,1);assert.equal(duplicate.usable_observation_count,1);
  const conflict=buildDemandReview([row(),row({avg_monthly_searches:'10'})],context);
  assert.equal(conflict.usable_observation_count,0);assert.equal(conflict.conflict_count,1);
  assert.ok(conflict.rows.every(r=>r.reason_codes.includes('conflicting_same_source_observation')));
});
test('review does not add close-variant volumes, turn ads competition into KD, or assign Primary',()=>{
  const rows=[row({keyword:'festival outfit',observation_group:'same-result'}),row({keyword:'festival outfits',observation_group:'same-result'})];
  assert.equal(buildDemandReview(rows,context).total_volume,null);
  for(const r of [row({competition:'LOW',notes:'rising festival aug'}),row({competition:'HIGH',notes:'falling',high_bid:'100',bid_currency_code:'UAH'})]){
    const result=csvReviewScore(r,context);assert.equal(result.score,null);assert.equal(result.role,'hold');assert.equal(result.pageType,'intent_review');
  }
});
test('repeat import preview has stable IDs and emits no persistence or publication permission',()=>{
  const csv=metricRowsToCsv([row()]);
  const a=previewDemandImport({csv_text:csv},now),b=previewDemandImport({csv_text:csv},new Date('2026-09-24T01:00:00Z'));
  assert.equal(a.replay_identity,b.replay_identity);assert.equal(a.observations.length,1);
  assert.equal(a.observations[0].evidence_key,b.observations[0].evidence_key);
  assert.equal(a.writes_performed,0);assert.equal(a.can_publish,false);assert.equal(a.can_assign_primary,false);
  assert.equal(a.target_table,'feya_commerce_seo_keyword_metric_import_staging_v1');
});
test('missing/malformed import evidence cannot enter the staging proposal',()=>{
  const report=previewDemandImport({rows:[row({network:''}),row({avg_monthly_searches:'NaN'})]},now);
  assert.equal(report.observations.length,0);
  assert.equal(previewDemandImport({csv_text:'nonsense'},now).ok,false);
  assert.throws(()=>previewDemandImport({csv_text:metricRowsToCsv([row()]),rows:[row()]},now),/not both/);
});
test('legacy adapter recovers recorded period/currency while holding missing context and preserving original records',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/legacy-demand-20260923.json',import.meta.url),'utf8'));
  const original=JSON.stringify(fixture);
  for(const source of fixture.snapshots){
    const adapted=legacySnapshotToDemandRow(source);assert.equal(adapted.snapshot_id,source.snapshot_id);
    assert.equal(assessDemandCsvRow(adapted,context).usable_for_current_demand_decision,false);
    if(source.source_api==='google_ads_csv'){
      assert.equal(adapted.bid_currency_code,'UAH');
      const recorded=JSON.parse(source.monthly_search_volumes_json.raw);
      assert.equal(adapted.period_start,recorded.date_range?'2025-06-01':'');
      assert.equal(adapted.period_end,recorded.date_range?'2026-05-31':'');
    }else assert.match(adapted.parse_issues,/api_placeholder_not_observation/);
  }
  assert.equal(legacyBankToDemandRow(fixture.bank_samples[0]).keyword_bank_id,fixture.bank_samples[0].id);
  assert.equal(JSON.stringify(fixture),original);
});
test('demand evidence cannot bypass query ownership and never grants indexing',()=>{
  const input={query_cluster_id:'cluster-1',seo_page_id:'page-1',locale:'en-US',keywords:['festival outfit'],rows:[row()],ownership:[],context};
  assert.equal(buildDemandDecisionBrief(input).decision,'hold');
  const owner={seo_page_id:'page-1',query_cluster_id:'cluster-1',market_code:'US',locale:'en-US',ownership_role:'primary',ownership_status:'intended',effective_from:'2026-09-01',effective_to:null};
  const ready=buildDemandDecisionBrief({...input,ownership:[owner]});
  assert.equal(ready.decision,'ready_for_intent_inventory_review');assert.equal(ready.can_index,false);
  assert.equal(buildDemandDecisionBrief({...input,ownership:[owner,{...owner,seo_page_id:'other'}]}).decision,'hold');
});
