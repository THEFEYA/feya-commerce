import test from 'node:test';
import assert from 'node:assert/strict';
import { googleFixture } from './googleAdsFixture.ts';
import { prepareGoogleAdsPlan,googleAdsEvidencePayload,googleRequestKey } from '../../lib/googleAdsDemandAdapter.ts';
const f=()=>googleFixture(new Date('2026-09-24T09:00:00Z'));
test('explicit US/en/Search request carries full period and stable normalized selection',()=>{
 const x=f();assert.deepEqual(x.plan.request.geoTargetConstants,['geoTargetConstants/2840']);assert.equal(x.plan.request.language,'languageConstants/1000');assert.equal(x.plan.period_start,'2025-09-01');assert.equal(x.plan.period_end,'2026-08-31');
 assert.deepEqual(prepareGoogleAdsPlan(x.batch,[...x.rows].reverse(),{...x.input,keyword_ids:[...x.input.keyword_ids].reverse()},x.env,x.now),x.plan);
});
test('no targeting or batch fallback, unsafe UUID/version/duplicate selection or partial period',()=>{
 const x=f();for(const [batch,rows,input,env] of [
  [{...x.batch,request_geo:null},x.rows,x.input,x.env], [{...x.batch,request_language:'fr'},x.rows,x.input,x.env],
  [x.batch,x.rows,x.input,{...x.env,GOOGLE_ADS_GEO_TARGET_CONSTANTS:'geoTargetConstants/2124'}],
  [x.batch,x.rows,x.input,{...x.env,GOOGLE_ADS_LANGUAGE_CONSTANT:'languageConstants/1002'}],
  [x.batch,x.rows,x.input,{...x.env,GOOGLE_ADS_KEYWORD_PLAN_NETWORK:'GOOGLE_SEARCH_AND_PARTNERS'}],
  [x.batch,x.rows,x.input,{...x.env,GOOGLE_ADS_API_VERSION:'v99'}],
  [x.batch,x.rows,{...x.input,keyword_ids:['a,b',x.input.keyword_ids[0]]},x.env],
  [x.batch,x.rows,{...x.input,keyword_ids:[x.input.keyword_ids[0],x.input.keyword_ids[0]]},x.env],
  [x.batch,x.rows,{...x.input,period_start:'2026-01'},x.env],
 ] as const)assert.throws(()=>prepareGoogleAdsPlan(batch,rows,input,env,x.now));
 assert.throws(()=>googleRequestKey(null));assert.equal(googleRequestKey('stable-api-key'),googleRequestKey('stable-api-key'));
});
test('combined variants preserve one group, zero/null, account currency and exact raw micros',()=>{
 const x=f(),p=x.payload();assert.equal(p.observations.length,2);const [a,b]=p.observations;
 assert.equal(a.evidence.avg_monthly_searches,0);assert.equal(a.evidence.low_bid,1.234567);assert.equal(a.evidence.bid_currency_code,'UAH');
 assert.equal(a.metadata.observation_group,b.metadata.observation_group);assert.notEqual(a.metadata.batch_keyword_id,b.metadata.batch_keyword_id);
 assert.equal(JSON.parse(a.metadata.monthly_history_json)[0].searches,null);assert.equal(JSON.parse(a.metadata.raw_input_json).result.keywordMetrics.lowTopOfPageBidMicros,'1234567');
 assert.equal(p.google_ads.source_request_id,'fixture-request');assert.equal(p.observations[0].evidence.source,'google_ads_api');
});
test('partial, absent, duplicated, unrequested, conflicting or unsafe provider data hold all rows',()=>{
 const x=f();const mutations=[
  (r:any)=>{r.results=[];},(r:any)=>{r.results[0].closeVariants=[];},
  (r:any)=>{r.results[0].keywordMetrics.monthlySearchVolumes.pop();},
  (r:any)=>{r.results[0].keywordMetrics.monthlySearchVolumes[1]=r.results[0].keywordMetrics.monthlySearchVolumes[0];},
  (r:any)=>{r.results.push(structuredClone(r.results[0]));},
  (r:any)=>{r.results[0].text='unrequested';r.results[0].closeVariants=[];},
  (r:any)=>{delete r.results[0].keywordMetrics.avgMonthlySearches;},
  (r:any)=>{r.results[0].keywordMetrics.avgMonthlySearches='2147483648';},
  (r:any)=>{r.results[0].keywordMetrics.lowTopOfPageBidMicros='9007199254740993';},
  (r:any)=>{r.results[0].keywordMetrics.competitionIndex='101';},
  (r:any)=>{r.results[0].keywordMetrics.avgMonthlySearches=false;},
 ];for(const mutate of mutations){const r=structuredClone(x.response);mutate(r);assert.throws(()=>googleAdsEvidencePayload(x.plan,r,x.context,'fixture',x.now));}
 assert.throws(()=>googleAdsEvidencePayload(x.plan,x.response,{currencyCode:null,timeZone:null},null,x.now));
});
