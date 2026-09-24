import assert from 'node:assert/strict';
import test from 'node:test';
import {legacySnapshotToDemandRow} from '../../lib/searchLegacyDemandAdapter.ts';
import {assessDemandCsvRow,DEFAULT_DEMAND_CONTEXT} from '../../lib/searchDemandBridge.ts';
import {verifyMetricReaderBoundary,metricImportWriteBlockers,METRIC_READER_CONTRACT} from '../../lib/searchMetricAtomicStorage.ts';
const context={...DEFAULT_DEMAND_CONTEXT,now:new Date('2026-09-23T23:00:00Z')};
function snapshot(){return {snapshot_id:'9007199254740993',keyword_id:'12',keyword_norm:'synthetic armor',source_api:'google_ads_csv',geo:'US',language:'en',avg_monthly_searches:null,competition:'LOW',competition_index:12,low_top_of_page_bid:1,high_top_of_page_bid:2,bid_currency_code:'UAH',fetched_at:'2026-09-20T00:00:00+00:00',data_freshness_status:'context_review_required',demand_observation_key:'f'.repeat(64),raw_payload_json:{contract_version:'atomic_keyword_metric_import_v1'},
 demand_evidence_json:{keyword_norm:'synthetic armor',keyword_bank_id:'stable-bank-id',evidence:{keyword:'synthetic armor',source:'google_ads_csv',source_ref:'fixture:source-file',market:'US',language:'en',network:'GOOGLE_SEARCH',fetched_at:'2026-09-20',period_start:'2025-09-01',period_end:'2026-08-31',avg_monthly_searches:null,search_volume_range:{low:0,high:1000},competition:'LOW',competition_index:12,low_bid:1,high_bid:2,bid_currency_code:'UAH'},metadata:{monthly_history_json:'[{"month":"2026-08","searches":0}]',raw_input_json:'{"source":"synthetic"}',returned_keyword:'synthetic armor',close_variants_json:'[]'}}};}
test('stored evidence preserves exact IDs, range, currency, original provenance and capture date',()=>{
 const r=legacySnapshotToDemandRow(snapshot());assert.equal(r.snapshot_id,'9007199254740993');assert.equal(r.source_ref,'fixture:source-file');assert.equal(r.bid_currency_code,'UAH');assert.equal(r.avg_monthly_searches,'');assert.equal(r.volume_range_low,'0');assert.equal(r.volume_range_high,'1000');assert.equal(r.last_checked,'2026-09-20');assert.equal(r.parse_issues,'source_context_review_required');
});
test('a stored observation cannot grant demand readiness without a recorded context review',()=>{
 const r=assessDemandCsvRow(legacySnapshotToDemandRow(snapshot()),context);assert.equal(r.usable_for_current_demand_decision,false);assert.ok(r.reason_codes.includes('source_context_review_required'));assert.ok(!r.reason_codes.includes('stored_capture_date_mismatch'));
});
test('denormalized columns and timestamps cannot silently override evidence',()=>{
 const source={...snapshot(),avg_monthly_searches:100,fetched_at:'2026-09-21T00:00:00Z'};
 const r=legacySnapshotToDemandRow(source);assert.match(r.parse_issues,/stored_evidence_column_mismatch/);assert.match(r.parse_issues,/stored_capture_date_mismatch/);assert.equal(r.avg_monthly_searches,'');
});
test('unknown contracts and fake fresh labels stay held instead of falling back to legacy approval',()=>{
 const source=snapshot();source.raw_payload_json.contract_version='unexpected';source.data_freshness_status='fresh_manual_import';const r=legacySnapshotToDemandRow(source);assert.match(r.parse_issues,/stored_evidence_contract_invalid/);assert.match(r.parse_issues,/unrecognized_atomic_review_status/);
});
test('a numeric ID that lost JavaScript precision is rejected, not converted to a rounded string',()=>{
 const source={...snapshot(),snapshot_id:9007199254740992};const r=legacySnapshotToDemandRow(source);assert.equal(r.snapshot_id,'');assert.match(r.parse_issues,/unsafe_integer_identifier/);
});
test('reader health rejects missing migration, drift, errors and transport failure',async()=>{
 for(const response of [{data:null,error:null},{data:'old',error:null},{data:METRIC_READER_CONTRACT,error:{message:'denied'}}])assert.equal(await verifyMetricReaderBoundary({rpc:async()=>response}),false);
 assert.equal(await verifyMetricReaderBoundary({rpc:async()=>{throw Error('network');}}),false);
 assert.equal(await verifyMetricReaderBoundary({rpc:async()=>({data:METRIC_READER_CONTRACT,error:null})}),false,'reader-only install is insufficient');
 assert.equal(await verifyMetricReaderBoundary({rpc:async(name)=>({data:name==='feya_commerce_metric_access_boundary_health_v1'?'metric_access_boundary_v1':METRIC_READER_CONTRACT,error:null})}),false,'old 50-object scope does not satisfy the extended boundary');
 assert.equal(await verifyMetricReaderBoundary({rpc:async(name)=>({data:name==='feya_commerce_metric_access_boundary_health_v1'?'metric_access_boundary_v2':METRIC_READER_CONTRACT,error:null})}),true);
 assert.deepEqual(metricImportWriteBlockers({FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true',FEYA_ADMIN_AUTH_REQUIRED:'true'}),[]);
 assert.deepEqual(metricImportWriteBlockers({}),['storage_disabled','admin_auth_required']);
 assert.deepEqual(metricImportWriteBlockers({FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true'}),['admin_auth_required']);
});
