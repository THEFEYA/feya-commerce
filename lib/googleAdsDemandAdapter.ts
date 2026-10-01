import { createHash } from 'node:crypto';
import { normalizeResearchKeyword } from './searchDemandEvidence.ts';
import { previewDemandImport } from './searchDemandImportPreview.ts';
import { prepareMetricImport } from './searchMetricAtomicStorage.ts';
import type { MetricCsvRow } from './searchMetricCsv.ts';

export const GOOGLE_ADS_IMPORT_CONTRACT = 'google_ads_atomic_evidence_v1';
export const GOOGLE_ADS_HEALTH_RPC = 'feya_commerce_google_ads_import_contract_v1';
export const GOOGLE_ADS_BATCH_STATUSES = ['pending','queued','ready','ready_for_fetch','partial'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
type Row = Record<string, unknown>;
export function canonicalGoogleJson(v:unknown):string {
  if(Array.isArray(v)) return '['+v.map(canonicalGoogleJson).join(',')+']';
  if(v!==null&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalGoogleJson((v as Row)[k])).join(',')+'}';
  return JSON.stringify(v);
}
const hash=(v:unknown)=>createHash('sha256').update(canonicalGoogleJson(v)).digest('hex');
function object(v:unknown):Row {if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected a provider object.');return v as Row;}
function text(v:unknown):string {if(typeof v!=='string'||!v.trim())throw Error('A nonempty string is required.');return v.trim();}
export function googleBatchId(v:unknown):string {const s=text(v);if(!UUID.test(s))throw Error('Invalid batch UUID.');return s.toLowerCase();}
function month(v:unknown):string {const s=text(v);if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(s))throw Error('Use YYYY-MM for the metric period.');return s;}
function monthIndex(v:string){return Number(v.slice(0,4))*12+Number(v.slice(5))-1;}
function yearMonth(v:string){return {year:Number(v.slice(0,4)),month:MONTHS[Number(v.slice(5))-1]};}
function monthEnd(v:string){return new Date(Date.UTC(Number(v.slice(0,4)),Number(v.slice(5)),0)).toISOString().slice(0,10);}
export function googleRequestKey(key:string|null) {
  if(!key||!/^[-A-Za-z0-9._:]{8,200}$/.test(key))throw Error('An explicit Idempotency-Key (8–200 characters) is required.');
  return createHash('sha256').update('google-ads-request-v1:'+key).digest('hex');
}
/** This first reviewed profile is US/en/Search. Expanding markets is a separate contract. */
export function prepareGoogleAdsPlan(batch:Row, rows:Row[], input:Row, env:Record<string,string|undefined>, now:Date) {
  const batchId=googleBatchId(batch.metric_batch_id);
  if(batch.provider_code!=='google_ads_api'||batch.request_geo!=='US'||batch.request_language!=='en')throw Error('Unsupported batch targeting/provider; no fallback is allowed.');
  if(!Array.isArray(input.keyword_ids)||input.keyword_ids.length<1||input.keyword_ids.length>20)throw Error('Select 1–20 explicit keyword IDs.');
  const ids=input.keyword_ids.map(googleBatchId).sort();
  if(new Set(ids).size!==ids.length||rows.length!==ids.length)throw Error('Duplicate or missing batch keyword.');
  const selected=rows.map(r=>({id:googleBatchId(r.metric_batch_keyword_id),keyword:normalizeResearchKeyword(text(r.keyword)),norm:text(r.keyword_norm),batch_id:googleBatchId(r.metric_batch_id)})).sort((a,b)=>a.id.localeCompare(b.id));
  if(selected.some((r,i)=>r.id!==ids[i]||r.batch_id!==batchId||r.keyword!==r.norm||r.keyword.includes('_'))||new Set(selected.map(r=>r.keyword)).size!==selected.length)throw Error('Batch keyword identity or normalization mismatch.');
  const start=month(input.period_start),end=month(input.period_end);
  if(monthIndex(end)-monthIndex(start)!==11||monthEnd(end)>=now.toISOString().slice(0,10)||(now.getTime()-Date.parse(monthEnd(end)))/86400000>91)throw Error('A recent, complete twelve-month period is required.');
  const customerId=(env.GOOGLE_ADS_CUSTOMER_ID||'').replaceAll('-','').trim();
  if(!/^\d{10}$/.test(customerId))throw Error('A valid Google Ads customer ID is required.');
  const apiVersion=env.GOOGLE_ADS_API_VERSION||'v25';
  if(apiVersion!=='v25')throw Error('Google Ads API version has not been reviewed by this adapter.');
  const geos=env.GOOGLE_ADS_GEO_TARGET_CONSTANTS?.split(',').map(s=>s.trim()).filter(Boolean);
  if(geos&&(geos.length!==1||geos[0]!=='geoTargetConstants/2840'))throw Error('Environment geo targeting conflicts with the US batch.');
  if(env.GOOGLE_ADS_LANGUAGE_CONSTANT&&env.GOOGLE_ADS_LANGUAGE_CONSTANT!=='languageConstants/1000')throw Error('Environment language conflicts with the English batch.');
  if(env.GOOGLE_ADS_KEYWORD_PLAN_NETWORK&&env.GOOGLE_ADS_KEYWORD_PLAN_NETWORK!=='GOOGLE_SEARCH')throw Error('Environment network conflicts with the reviewed profile.');
  const payload={keywords:selected.map(r=>r.keyword),geoTargetConstants:['geoTargetConstants/2840'],language:'languageConstants/1000',keywordPlanNetwork:'GOOGLE_SEARCH',includeAdultKeywords:false,historicalMetricsOptions:{yearMonthRange:{start:yearMonth(start),end:yearMonth(end)}}};
  const identity={contract:GOOGLE_ADS_IMPORT_CONTRACT,batch_id:batchId,keyword_ids:ids,customer_id:customerId,api_version:apiVersion,period_start:start+'-01',period_end:monthEnd(end),request:payload};
  return {...identity,fingerprint:hash(identity),endpoint:`https://googleads.googleapis.com/${apiVersion}/customers/${customerId}:generateKeywordHistoricalMetrics`,selected};
}
export type GoogleAdsPlan=ReturnType<typeof prepareGoogleAdsPlan>;
function integer(v:unknown,max=2147483647):number|null {
  if(v===undefined||v===null)return null;
  if((typeof v!=='string'&&typeof v!=='number')||!/^\d+$/.test(String(v)))throw Error('Malformed provider integer.');
  const n=Number(v);if(!Number.isSafeInteger(n)||n>max)throw Error('Provider integer exceeds supported precision/storage.');return n;
}
function bid(v:unknown):string {const n=integer(v,Number.MAX_SAFE_INTEGER);if(n===null)return '';const micros=BigInt(String(v));return `${micros/BigInt(1000000)}.${String(micros%BigInt(1000000)).padStart(6,'0')}`;}

/** Preserve provider grouping and raw values. Missing/partial/ambiguous results hold the whole request. */
export function googleAdsEvidencePayload(plan:GoogleAdsPlan, response:unknown, context:{currencyCode:string|null;timeZone:string|null}, requestId:string|null, capturedAt:Date) {
  const raw=object(response);if(!Array.isArray(raw.results)||!raw.results.length||raw.results.length>20)throw Error('Google returned no usable result array.');
  if(!/^[A-Z]{3}$/.test(context.currencyCode||'')||!context.timeZone)throw Error('Verified account currency and time zone are required.');
  const sourceRef='google-ads:'+hash({plan:plan.fingerprint,response,captured_at:capturedAt.toISOString()});
  const matches=new Map<string,MetricCsvRow>();
  for(const value of raw.results){
    const result=object(value),returned=text(result.text),metric=object(result.keywordMetrics);
    const variants=result.closeVariants??[];if(!Array.isArray(variants)||variants.some(v=>typeof v!=='string'||!v.trim()))throw Error('Invalid close variants.');
    const groupQueries=[...new Set([returned,...variants].map(normalizeResearchKeyword))];
    const selected=plan.selected.filter(r=>groupQueries.includes(r.keyword));if(!selected.length)throw Error('Unmatched provider result.');
    if(!Array.isArray(metric.monthlySearchVolumes))throw Error('Monthly coverage is missing.');
    const history=metric.monthlySearchVolumes.map(v=>{const m=object(v);const mi=MONTHS.indexOf(String(m.month));const y=integer(m.year,2099);if(mi<0||y===null||y<2000)throw Error('Invalid provider month.');return {month:`${y}-${String(mi+1).padStart(2,'0')}`,searches:integer(m.monthlySearches)};}).sort((a,b)=>a.month.localeCompare(b.month));
    if(history.length!==12||history.some((h,i)=>monthIndex(h.month)!==monthIndex(plan.period_start.slice(0,7))+i))throw Error('Partial/duplicate/out-of-period monthly coverage requires review.');
    const competition=metric.competition==null||['UNKNOWN','UNSPECIFIED'].includes(String(metric.competition))?'':text(metric.competition);
    const avg=integer(metric.avgMonthlySearches),competitionIndex=integer(metric.competitionIndex,100);
    const common:MetricCsvRow={metric_source:'google_ads_api',source_ref:sourceRef,region:'US',language:'en',network:'GOOGLE_SEARCH',period_start:plan.period_start,period_end:plan.period_end,last_checked:capturedAt.toISOString(),avg_monthly_searches:avg===null?'':String(avg),competition,competition_index:competitionIndex===null?'':String(competitionIndex),low_bid:bid(metric.lowTopOfPageBidMicros),high_bid:bid(metric.highTopOfPageBidMicros),bid_currency_code:context.currencyCode!,monthly_history_json:JSON.stringify(history),returned_keyword:returned,close_variants_json:JSON.stringify(variants),observation_group:hash({sourceRef,queries:groupQueries.sort()}),raw_input_json:JSON.stringify({result,request:plan.request,customer_id:plan.customer_id,api_version:plan.api_version,request_id:requestId,account_currency:context.currencyCode,account_time_zone:context.timeZone})};
    for(const r of selected){if(matches.has(r.keyword))throw Error('A keyword maps to multiple provider groups.');matches.set(r.keyword,{...common,keyword:r.keyword});}
  }
  if(matches.size!==plan.selected.length)throw Error('Missing requested keyword results; no partial import.');
  const preview=previewDemandImport({rows:plan.selected.map(r=>matches.get(r.keyword)!)},capturedAt);
  const payload=prepareMetricImport(preview,'google-ads-request:'+plan.fingerprint);
  return {...payload,google_ads:{contract:GOOGLE_ADS_IMPORT_CONTRACT,request_fingerprint:plan.fingerprint,batch_id:plan.batch_id,keyword_ids:plan.keyword_ids,customer_id:plan.customer_id,api_version:plan.api_version,request:plan.request,period_start:plan.period_start,period_end:plan.period_end,source_ref:sourceRef,source_request_id:requestId,account_currency:context.currencyCode,account_time_zone:context.timeZone},observations:payload.observations.map(o=>({...o,metadata:{...o.metadata,batch_keyword_id:plan.selected.find(r=>r.keyword===o.keyword_norm)!.id}}))};
}
