import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {googleFixture,googleBatch} from '../search/googleAdsFixture.ts';
export async function startGoogleProviderFixture(){
 const fixture=googleFixture(),state={mode:'complete',calls:[],errors:[]};
 const server=createServer(async(req,res)=>{
  try{
   let raw='';for await(const chunk of req)raw+=chunk;
   state.calls.push(req.url);res.setHeader('Content-Type','application/json');
   if(req.url==='/token'){
    const form=new URLSearchParams(raw);assert.equal(form.get('client_secret'),'synthetic-client-secret');
    res.end(JSON.stringify({access_token:'synthetic-access-token'}));return;
   }
   assert.equal(req.headers.authorization,'Bearer synthetic-access-token');assert.equal(req.headers['developer-token'],undefined);
   if(req.url.endsWith('/googleAds:search')){
    if(state.mode==='currency_failure'){res.statusCode=503;res.end('{}');return;}
    res.end(JSON.stringify({results:[{customer:{currencyCode:'UAH',timeZone:'Europe/Kyiv'}}]}));return;
   }
   assert.ok(req.url.endsWith(':generateKeywordHistoricalMetrics'));assert.deepEqual(JSON.parse(raw),fixture.plan.request);
   if(state.mode==='provider_error'){res.statusCode=429;res.end(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED',message:'Synthetic rate limit'}}));return;}
   const payload=structuredClone(fixture.response);if(state.mode==='partial')payload.results[0].keywordMetrics.monthlySearchVolumes.pop();
   res.setHeader('request-id','synthetic-google-request');res.end(JSON.stringify(payload));
  }catch(e){state.errors.push(e.message);res.statusCode=500;res.end(JSON.stringify({error:{message:'Provider fixture assertion failed'}}));}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {fixture,state,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
export async function seedGoogleBatch(db,fixture){
 await db.query("insert into public.feya_metric_provider_config_v1(provider_code,provider_name,provider_type,preferred_mode,connection_status) values('google_ads_api','Synthetic provider','api','api','not_connected') on conflict do nothing");
 await db.query("insert into public.feya_metric_request_batch_v1(metric_batch_id,provider_code,batch_code,batch_status,keyword_count,result_summary_json) values($1,'google_ads_api','runtime-google-fixture','ready',2,'{\"historical_note\":\"preserve\"}')",[googleBatch]);
 for(const row of fixture.rows)await db.query('insert into public.feya_metric_request_batch_keywords_v1(metric_batch_keyword_id,metric_batch_id,keyword,keyword_norm) values($1,$2,$3,$3)',[row.metric_batch_keyword_id,googleBatch,row.keyword]);
}
