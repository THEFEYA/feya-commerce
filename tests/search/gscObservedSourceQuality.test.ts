import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOfficialGscReceipts,type GscQualityRow} from '../../lib/gscObservedSourceQuality.ts';

const now=new Date('2026-10-17T11:00:00Z');
const rows=[
 {date:'2026-10-11',clicks:0,impressions:1,position:8},
 {date:'2026-10-12',clicks:1,impressions:4,position:10},
 {date:'2026-10-13',clicks:0,impressions:0,position:0},
 {date:'2026-10-14',clicks:2,impressions:5,position:4}
];
function input(change:Partial<GscQualityRow>={}):GscQualityRow{
 return{
  receipt_id:'64fc359d-9068-417e-922a-905b9f71ce93',
  source_channel:'GOOGLE_GSC_OFFICIAL_READONLY',
  property_url:'sc-domain:thefeya.com',search_type:'web',data_state:'final',
  query_start:'2026-10-11',query_end:'2026-10-14',finalized_through:'2026-10-14',
  observed_days:4,daily_rows_json:rows,clicks_total:3,impressions_total:10,
  average_position:6.8,payload_sha256:'a'.repeat(64),
  recorded_at:'2026-10-17T07:54:28Z',source_health_promoted:false,
  ...change
 };
}

test('real first-party receipt is only observational, never a healthy source or GMEL admission',()=>{
 const result=inspectOfficialGscReceipts([input()],now);
 assert.equal(result.state,'OBSERVED_L0');
 assert.equal(result.receiptId,input().receipt_id);
 assert.equal(result.observedDays,4);
 assert.equal(result.missingDays,0);
 assert.equal(result.clicks,3);
 assert.equal(result.impressions,10);
 assert.equal(result.averagePosition,6.8);
 assert.equal(result.uncoveredFinalDays,0);
 assert.equal(result.evidenceSha256,'a'.repeat(64));
 assert.equal(result.canonicalSourceHealthy,false);
 assert.equal(result.gmElModelEligible,false);
});

test('a manual HYPD receipt cannot become official, missing metrics remain null',()=>{
 const manual=input({source_channel:'HYPD_MCP_READONLY_MANUAL'});
 const result=inspectOfficialGscReceipts([manual],now);
 assert.equal(result.state,'NO_OFFICIAL_OBSERVATION');
 assert.equal(result.clicks,null);
 assert.equal(result.impressions,null);
 assert.equal(result.observedDays,null);
 assert.equal(result.canonicalSourceHealthy,false);
});

test('missing Google dates are missing, not synthesized as zeros',()=>{
 const partial=inspectOfficialGscReceipts([input({
  daily_rows_json:[rows[0],rows[1],rows[3]],observed_days:3
 })],now);
 assert.equal(partial.state,'PARTIAL_PROVIDER_COVERAGE');
 assert.equal(partial.observedDays,3);
 assert.equal(partial.missingDays,1);
 assert.equal(partial.clicks,3);
 assert.equal(partial.impressions,10);
 assert.equal(partial.canonicalSourceHealthy,false);
});

test('zero returned rows means unknown/absent provider evidence, not zero search volume',()=>{
 const noData=inspectOfficialGscReceipts([input({
  observed_days:0,daily_rows_json:[],clicks_total:null,impressions_total:null,average_position:null
 })],now);
 assert.equal(noData.state,'NO_FINAL_DATE_ROWS');
 assert.equal(noData.observedDays,0);
 assert.equal(noData.clicks,null);
 assert.equal(noData.impressions,null);
 assert.equal(noData.missingDays,4);
});

test('latest final period is selected without inventing trend from old separate source',()=>{
 const older=input({
   receipt_id:'802f0534-b197-4d39-9694-4c0f5204f4a4',
   query_end:'2026-10-13',finalized_through:'2026-10-13',query_start:'2026-10-11',
   daily_rows_json:rows.slice(0,3),observed_days:3,clicks_total:1,impressions_total:5,
   average_position:9.6,recorded_at:'2026-10-16T17:47:41Z'
 });
 const r=inspectOfficialGscReceipts([older,input()],now);
 assert.equal(r.finalDate,'2026-10-14');
 assert.equal(r.impressions,10);
 assert.equal(r.clicks,3);
});

test('stale final watermarks are disclosed without changing canonical health',()=>{
 const old=input({query_start:'2026-10-03',query_end:'2026-10-06',finalized_through:'2026-10-06',
   daily_rows_json:rows.map((r,i)=>({...r,date:'2026-10-0'+(i+3)}))});
 const r=inspectOfficialGscReceipts([old],now);
 assert.equal(r.state,'OUTDATED_OFFICIAL_OBSERVATION');
 assert.equal(r.uncoveredFinalDays,8);
 assert.equal(r.canonicalSourceHealthy,false);
});

test('bad authoritative receipts fail closed instead of showing fabricated zero activity',()=>{
 const bad:Partial<GscQualityRow>[]=[
  {property_url:'sc-domain:other.com'},
  {source_health_promoted:true},
  {data_state:'all'},
  {payload_sha256:'bad'},
  {query_end:'2026-10-15',finalized_through:'2026-10-15'},
  {observed_days:8},
  {impressions_total:11},
  {clicks_total:null},
  {average_position:7},
  {daily_rows_json:[rows[0],rows[0],rows[2],rows[3]]},
  {daily_rows_json:[{...rows[0],impressions:1,position:0},rows[1],rows[2],rows[3]]},
  {daily_rows_json:[{...rows[0],extra:'leak'},rows[1],rows[2],rows[3]]},
  {daily_rows_json:[{...rows[0],clicks:-1},rows[1],rows[2],rows[3]]},
  {recorded_at:'invalid'},
 ];
 for(const change of bad){
  const r=inspectOfficialGscReceipts([input(change)],now);
  assert.equal(r.state,'INVALID_OFFICIAL_OBSERVATION',JSON.stringify(change));
  assert.equal(r.clicks,null);
  assert.equal(r.impressions,null);
  assert.equal(r.canonicalSourceHealthy,false);
 }
});
