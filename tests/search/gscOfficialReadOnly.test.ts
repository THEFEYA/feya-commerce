import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEYA_GSC_DOMAIN_PROPERTY,probeOfficialGscReadOnly} from '../../lib/gscOfficialReadOnly.ts';

const now=new Date('2026-10-16T17:00:00Z');
const env={
  FEYA_GSC_READ_ENABLED:'true', FEYA_GSC_PROPERTY:FEYA_GSC_DOMAIN_PROPERTY,
  FEYA_GSC_OAUTH_CLIENT_ID:'id.private',FEYA_GSC_OAUTH_CLIENT_SECRET:'secret.private',
  FEYA_GSC_OAUTH_REFRESH_TOKEN:'refresh.private',
};
const ok=(value:unknown)=>new Response(JSON.stringify(value),{status:200});
function fixture(rows:unknown=[],permission='siteOwner'){
  const calls:{url:string;init?:RequestInit}[]=[];
  async function fetcher(url:string,init?:RequestInit){
    calls.push({url,init});
    if(url==='https://oauth2.googleapis.com/token')return ok({access_token:'access.private'});
    if(url==='https://www.googleapis.com/webmasters/v3/sites')
      return ok({siteEntry:[{siteUrl:'https://thefeya.com/',permissionLevel:'siteOwner'},
        {siteUrl:FEYA_GSC_DOMAIN_PROPERTY,permissionLevel:permission}]});
    if(url.endsWith('/searchAnalytics/query'))return ok({rows});
    throw Error('Unexpected outbound request');
  }
  return {calls,fetcher};
}

test('default off and missing credentials make no Google calls',async()=>{
  let calls=0;
  const fetcher=async()=>{calls++;throw Error('no network allowed');};
  assert.equal((await probeOfficialGscReadOnly({},fetcher,now)).code,'GSC_READ_DISABLED');
  assert.equal((await probeOfficialGscReadOnly({FEYA_GSC_READ_ENABLED:'true'},fetcher,now)).code,'GSC_OAUTH_NOT_CONFIGURED');
  assert.equal((await probeOfficialGscReadOnly({...env,FEYA_GSC_PROPERTY:'https://thefeya.com/'},fetcher,now)).code,'GSC_PROPERTY_MISMATCH');
  assert.equal(calls,0);
});

test('exact domain property and real rights are required, URL-prefix is insufficient',async()=>{
  const p=fixture();
  const wrong=async(url:string,init?:RequestInit)=>url.endsWith('/sites')
    ?ok({siteEntry:[{siteUrl:'https://thefeya.com/',permissionLevel:'siteOwner'}]})
    :p.fetcher(url,init);
  assert.equal((await probeOfficialGscReadOnly(env,wrong,now)).code,'GSC_DOMAIN_PROPERTY_NOT_VISIBLE');
  const unverified=fixture([], 'siteUnverifiedUser');
  assert.equal((await probeOfficialGscReadOnly(env,unverified.fetcher,now)).code,'GSC_ACCESS_DENIED');
});

test('bounded verified reads use read-only site and final date-grouped query',async()=>{
  const p=fixture([{keys:['2026-10-04'],clicks:2,impressions:51,position:5},
    {keys:['2026-10-13'],clicks:1,impressions:9,position:7}]);
  const result=await probeOfficialGscReadOnly(env,p.fetcher,now);
  assert.equal(result.ok,true);
  assert.equal(result.code,'GSC_VERIFIED_WITH_FINAL_ROWS');
  assert.deepEqual(result.window,{start_date:'2026-09-30',end_date:'2026-10-13'});
  assert.equal(result.clicks_in_observed_rows,3);
  assert.equal(result.impressions_in_observed_rows,60);
  assert.equal(result.last_observed_date,'2026-10-13');
  assert.equal(result.days_observed,2);
  assert.deepEqual(result.daily_rows,[
    {date:'2026-10-04',clicks:2,impressions:51,position:5},
    {date:'2026-10-13',clicks:1,impressions:9,position:7}
  ]);
  assert.equal(result.persisted,false);
  assert.equal(result.growth_os_source_healthy,false);
  assert.equal(result.indexed_urls_observed,false);
  assert.equal(p.calls.length,3);
  assert.equal(p.calls[1].url,'https://www.googleapis.com/webmasters/v3/sites');
  assert.equal(p.calls[2].url,'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Athefeya.com/searchAnalytics/query');
  assert.equal(p.calls[2].init?.method,'POST');
  assert.deepEqual(JSON.parse(String(p.calls[2].init?.body)),{
    startDate:'2026-09-30',endDate:'2026-10-13',
    dimensions:['date'],type:'web',dataState:'final',rowLimit:32
  });
  assert.ok(String(p.calls[0].init?.body).includes('refresh_token=refresh.private'));
  assert.equal(JSON.stringify(result).includes('.private'),false);
});

test('no final date rows is unknown activity, not measured zero',async()=>{
  const p=fixture();
  const result=await probeOfficialGscReadOnly(env,p.fetcher,now);
  assert.equal(result.code,'GSC_VERIFIED_NO_FINAL_ROWS');
  assert.equal(result.days_observed,0);
  assert.deepEqual(result.daily_rows,[]);
  assert.equal(result.clicks_in_observed_rows,null);
  assert.equal(result.impressions_in_observed_rows,null);
});

test('untrusted provider errors are generic without token or upstream body',async()=>{
  const p=fixture();
  const f=async(url:string,init?:RequestInit)=>url.endsWith('/sites')
    ?new Response(JSON.stringify({error:{message:'secret.private'}}),{status:403})
    :p.fetcher(url,init);
  const result=await probeOfficialGscReadOnly(env,f,now);
  assert.equal(result.code,'GSC_ACCESS_DENIED');
  assert.equal(JSON.stringify(result).includes('.private'),false);
});

test('invalid dates, duplicates, impossible counts and contaminated groups are blocked',async()=>{
  const invalid=[
    [{keys:['2026-10-15'],clicks:2,impressions:9,position:5}],
    [{keys:['2026-10-04'],clicks:2,impressions:9,position:5},{keys:['2026-10-04'],clicks:2,impressions:9,position:5}],
    [{keys:['2026-10-04'],clicks:4,impressions:2,position:5}],
    [{keys:['2026-10-04','US'],clicks:1,impressions:3,position:5}],
    [{keys:['2026-02-30'],clicks:1,impressions:3,position:5}],
    [{keys:['2026-10-04'],clicks:-1,impressions:3,position:5}],
  ];
  for(const rows of invalid){
    const p=fixture(rows);
    const result=await probeOfficialGscReadOnly(env,p.fetcher,now);
    assert.equal(result.code,'GSC_INVALID_GOOGLE_RESPONSE',JSON.stringify(rows));
    assert.equal(result.persisted,false);
  }
});


test('Google Search Console uses Pacific calendar day across UTC midnight',async()=>{
  const p=fixture();
  const result=await probeOfficialGscReadOnly(env,p.fetcher,new Date('2026-10-16T02:00:00Z'));
  assert.deepEqual(result.window,{start_date:'2026-09-29',end_date:'2026-10-12'});
});

test('provider position, zero traffic and date-shape validation are fail closed',async()=>{
  for(const badRow of [
    {keys:['2026-10-04'],clicks:2,impressions:9,position:NaN},
    {keys:['2026-10-04'],clicks:2,impressions:9,position:-1},
    {keys:['2026-10-04'],clicks:2,impressions:9,position:Infinity},
    {keys:['2026-10-04'],clicks:0,impressions:0,position:4},
    {keys:['2026-10-04'],clicks:1,impressions:9,position:0},
    {keys:['2026-10-04'],clicks:2,impressions:9},
  ]){
    const result=await probeOfficialGscReadOnly(env,fixture([badRow]).fetcher,now);
    assert.equal(result.code,'GSC_INVALID_GOOGLE_RESPONSE');
    assert.equal(result.daily_rows,null);
  }
  const quiet=await probeOfficialGscReadOnly(env,fixture([
    {keys:['2026-10-03'],clicks:0,impressions:0,position:0}
  ]).fetcher,now);
  assert.equal(quiet.code,'GSC_VERIFIED_WITH_FINAL_ROWS');
  assert.deepEqual(quiet.daily_rows,[{date:'2026-10-03',clicks:0,impressions:0,position:0}]);
});

test('internal API route is protected and remains read-only; env example stays off',()=>{
  const route=readFileSync('app/api/internal/gsc-source-readiness/route.ts','utf8');
  assert.match(route,/withInternalApi\(handleGet\)/);
  assert.match(route,/probeOfficialGscReadOnly\(process\.env\)/);
  for(const forbidden of ['getSupabaseServiceRoleClient(', '.insert(', '.upsert(', 'cron.schedule(', 'trackEcommerceEvent('])
    assert.equal(route.includes(forbidden),false,forbidden);
  const envExample=readFileSync('.env.example','utf8');
  assert.match(envExample,/FEYA_GSC_READ_ENABLED=false/);
  assert.match(envExample,/FEYA_GSC_OAUTH_REFRESH_TOKEN=/);
});
