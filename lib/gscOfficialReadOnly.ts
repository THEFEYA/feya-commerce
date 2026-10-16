/**
 * TheFEYA GDAE: official GSC read-only preflight. Never writes data, marks
 * sources healthy, starts a schedule, or uses the Google Ads OAuth grant.
 * Called only from the internal-token protected server route.
 */
export const FEYA_GSC_DOMAIN_PROPERTY = 'sc-domain:thefeya.com' as const;

type Env = Readonly<Record<string,string|undefined>>;
type Fetcher = (url:string,init?:RequestInit)=>Promise<Response>;
type Permission = 'siteOwner'|'siteFullUser'|'siteRestrictedUser';
type Code = 'GSC_READ_DISABLED'|'GSC_OAUTH_NOT_CONFIGURED'|'GSC_PROPERTY_MISMATCH'
  |'GSC_INVALID_CLOCK'|'GSC_OAUTH_REJECTED'|'GSC_ACCESS_DENIED'
  |'GSC_DOMAIN_PROPERTY_NOT_VISIBLE'|'GSC_GOOGLE_UNAVAILABLE'
  |'GSC_INVALID_GOOGLE_RESPONSE'|'GSC_VERIFIED_NO_FINAL_ROWS'
  |'GSC_VERIFIED_WITH_FINAL_ROWS';

export type GscSourceProbe = {
  ok:boolean;
  code:Code;
  property:typeof FEYA_GSC_DOMAIN_PROPERTY;
  checked_at:string|null;
  scope_required:'https://www.googleapis.com/auth/webmasters.readonly';
  window:{start_date:string;end_date:string}|null;
  property_permission:Permission|null;
  days_observed:number|null;
  last_observed_date:string|null;
  clicks_in_observed_rows:number|null;
  impressions_in_observed_rows:number|null;
  persisted:false;
  growth_os_source_healthy:false;
  indexed_urls_observed:false;
};

const ROOT='https://www.googleapis.com/webmasters/v3';
const SCOPE='https://www.googleapis.com/auth/webmasters.readonly' as const;
function asRecord(x:unknown):Record<string,unknown>|null {
  return x!==null && typeof x==='object' && !Array.isArray(x) ? x as Record<string,unknown> : null;
}
function utcWindow(date:Date):{start_date:string;end_date:string}|null {
  if(!Number.isFinite(date.getTime()))return null;
  const midnight=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
  const day=(delta:number)=>new Date(midnight+delta*86400000).toISOString().slice(0,10);
  return {start_date:day(-16),end_date:day(-3)};
}
function validCount(x:unknown):x is number{
  return typeof x==='number' && Number.isSafeInteger(x) && x>=0;
}
export async function probeOfficialGscReadOnly(
  env:Env, fetcher:Fetcher=fetch, date:Date=new Date()
):Promise<GscSourceProbe> {
  const window=utcWindow(date);
  const base:GscSourceProbe={
    ok:false,code:'GSC_READ_DISABLED',property:FEYA_GSC_DOMAIN_PROPERTY,
    checked_at:window?date.toISOString():null,scope_required:SCOPE,window,
    property_permission:null,days_observed:null,last_observed_date:null,
    clicks_in_observed_rows:null,impressions_in_observed_rows:null,
    persisted:false,growth_os_source_healthy:false,indexed_urls_observed:false
  };
  const fail=(code:Code):GscSourceProbe=>({...base,code});
  if(!window)return fail('GSC_INVALID_CLOCK');
  if(env.FEYA_GSC_READ_ENABLED!=='true')return fail('GSC_READ_DISABLED');
  if((env.FEYA_GSC_PROPERTY||FEYA_GSC_DOMAIN_PROPERTY)!==FEYA_GSC_DOMAIN_PROPERTY)
    return fail('GSC_PROPERTY_MISMATCH');
  const client=env.FEYA_GSC_OAUTH_CLIENT_ID?.trim();
  const secret=env.FEYA_GSC_OAUTH_CLIENT_SECRET?.trim();
  const refresh=env.FEYA_GSC_OAUTH_REFRESH_TOKEN?.trim();
  if(!client||!secret||!refresh)return fail('GSC_OAUTH_NOT_CONFIGURED');

  let token:string;
  try {
    const response=await fetcher('https://oauth2.googleapis.com/token',{
      method:'POST',cache:'no-store',signal:AbortSignal.timeout(12000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:client,client_secret:secret,
        refresh_token:refresh,grant_type:'refresh_token'})
    });
    if(!response.ok)return fail('GSC_OAUTH_REJECTED');
    const payload=asRecord(await response.json());
    if(typeof payload?.access_token!=='string'||!payload.access_token.trim())
      return fail('GSC_INVALID_GOOGLE_RESPONSE');
    token=payload.access_token;
  } catch { return fail('GSC_GOOGLE_UNAVAILABLE'); }
  // Raw Google errors are never returned or logged: they may contain sensitive data.
  const headers={Authorization:'Bearer '+token,Accept:'application/json'};
  let permission:Permission;
  try {
    const response=await fetcher(ROOT+'/sites',{
      method:'GET',cache:'no-store',signal:AbortSignal.timeout(12000),headers
    });
    if(response.status===401||response.status===403)return fail('GSC_ACCESS_DENIED');
    if(!response.ok)return fail('GSC_GOOGLE_UNAVAILABLE');
    const payload=asRecord(await response.json());
    if(!payload)return fail('GSC_INVALID_GOOGLE_RESPONSE');
    const entries=payload.siteEntry===undefined?[]:payload.siteEntry;
    if(!Array.isArray(entries))return fail('GSC_INVALID_GOOGLE_RESPONSE');
    const exact=entries.filter(item=>asRecord(item)?.siteUrl===FEYA_GSC_DOMAIN_PROPERTY);
    if(!exact.length)return fail('GSC_DOMAIN_PROPERTY_NOT_VISIBLE');
    if(exact.length!==1)return fail('GSC_INVALID_GOOGLE_RESPONSE');
    const role=asRecord(exact[0])?.permissionLevel;
    if(role!=='siteOwner'&&role!=='siteFullUser'&&role!=='siteRestrictedUser')
      return fail('GSC_ACCESS_DENIED');
    permission=role;
  } catch {return fail('GSC_GOOGLE_UNAVAILABLE');}

  try {
    // One bounded read of finalized dates only. Empty days are NOT zero claims.
    const url=ROOT+'/sites/'+encodeURIComponent(FEYA_GSC_DOMAIN_PROPERTY)+'/searchAnalytics/query';
    const response=await fetcher(url,{
      method:'POST',cache:'no-store',signal:AbortSignal.timeout(12000),
      headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({startDate:window.start_date,endDate:window.end_date,
        dimensions:['date'],type:'web',dataState:'final',rowLimit:32})
    });
    if(response.status===401||response.status===403)return fail('GSC_ACCESS_DENIED');
    if(!response.ok)return fail('GSC_GOOGLE_UNAVAILABLE');
    const payload=asRecord(await response.json());
    if(!payload)return fail('GSC_INVALID_GOOGLE_RESPONSE');
    const rows=payload.rows===undefined?[]:payload.rows;
    if(!Array.isArray(rows)||rows.length>32)return fail('GSC_INVALID_GOOGLE_RESPONSE');
    const seen=new Set<string>();
    let clicks=0,impressions=0,lastDate:string|null=null;
    for(const item of rows){
      const row=asRecord(item),keys=row?.keys;
      const key=Array.isArray(keys)&&keys.length===1?keys[0]:null;
      if(typeof key!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(key)
        ||!Number.isFinite(Date.parse(key+'T00:00:00Z'))
        ||new Date(key+'T00:00:00Z').toISOString().slice(0,10)!==key
        ||key<window.start_date||key>window.end_date||seen.has(key)
        ||!validCount(row?.clicks)||!validCount(row?.impressions)
        ||row.clicks>row.impressions)return fail('GSC_INVALID_GOOGLE_RESPONSE');
      seen.add(key);
      clicks+=row.clicks;
      impressions+=row.impressions;
      if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions))
        return fail('GSC_INVALID_GOOGLE_RESPONSE');
      if(!lastDate||key>lastDate)lastDate=key;
    }
    return {...base,ok:true,
      code:rows.length?'GSC_VERIFIED_WITH_FINAL_ROWS':'GSC_VERIFIED_NO_FINAL_ROWS',
      property_permission:permission,days_observed:rows.length,last_observed_date:lastDate,
      clicks_in_observed_rows:rows.length?clicks:null,
      impressions_in_observed_rows:rows.length?impressions:null};
  } catch { return fail('GSC_GOOGLE_UNAVAILABLE'); }
}
