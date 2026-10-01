import test from 'node:test';
import assert from 'node:assert/strict';
import {loadMetricStatus} from '../../lib/searchMetricStatus.ts';
test('status reads beyond API row limit and counts unique keywords across source groups',async()=>{
 const data=Array.from({length:1001},(_,i)=>({snapshot_id:String(i+1),keyword_norm:i===1000?'keyword 0':'keyword '+i,source_api:i===1000?'google_ads_api':'google_ads_csv',geo:'US',language:'en',fetched_at:'2026-09-01',avg_monthly_searches:0,competition_index:null}));
 const requested:number[]=[];const q:any={select:()=>q,order:()=>q,range:async(start:number,end:number)=>{requested.push(start);return {data:data.slice(start,end+1),error:null};}};
 const r=await loadMetricStatus({from:(name:string)=>{assert.equal(name,'feya_commerce_seo_keyword_metric_snapshots_v1');return q;}});
 assert.deepEqual(requested,[0,1000]);assert.equal(r.totalRows,1001);assert.equal(r.totalKeywords,1000);assert.equal(r.rows.length,2);
});
test('later-page failure never returns a plausible partial status',async()=>{
 const q:any={select:()=>q,order:()=>q,range:async(start:number)=>start?{data:null,error:{message:'Interrupted read'}}:{data:Array(1000).fill({}),error:null}};
 await assert.rejects(loadMetricStatus({from:()=>q}),/Interrupted read/);
});
