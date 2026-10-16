/**
 * GDAE official GSC -> private immutable operational receipt bridge.
 * This is NOT canonical source-health certification and cannot start GMEL.
 * Only consume an authenticated official GSC probe, never browser data.
 */
import type {GscSourceProbe,GscDailyRow} from './gscOfficialReadOnly';

export const OFFICIAL_GSC_RECEIPT_CHANNEL='GOOGLE_GSC_OFFICIAL_READONLY' as const;

export type OfficialGscStageArguments={
  p_property_url:'sc-domain:thefeya.com';
  p_source_channel:typeof OFFICIAL_GSC_RECEIPT_CHANNEL;
  p_query_start:string;
  p_query_end:string;
  p_finalized_through:string;
  p_daily_rows:Array<GscDailyRow>;
  p_expected_clicks:number;
  p_expected_impressions:number;
  p_expected_average_position:number|null;
  p_source_evidence_ref:string;
};

export type GscCapturePlan=
  | {ok:true;code:'GSC_CAPTURE_VALIDATED';args:OfficialGscStageArguments;source_health_promoted:false}
  | {ok:false;code:'GSC_CAPTURE_DISABLED'|'GSC_CAPTURE_NOT_VERIFIED'|'GSC_CAPTURE_NO_FINAL_ROWS'
       |'GSC_CAPTURE_INVALID_SOURCE'|'GSC_CAPTURE_INVALID_ROWS'|'GSC_CAPTURE_STALE_RESULT';
     source_health_promoted:false};

const ISO=/^\d{4}-\d{2}-\d{2}$/;
function properDate(input:string){
  if(!ISO.test(input))return false;
  const date=new Date(input+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===input;
}
function validCount(value:unknown):value is number{
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
}
function validPosition(value:unknown):value is number{
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=10000;
}

export function planOfficialGscCapture(
 env:Readonly<Record<string,string|undefined>>,
 report:GscSourceProbe,
 now:Date=new Date()
):GscCapturePlan{
  const block=(code:Extract<GscCapturePlan,{ok:false}>['code']):GscCapturePlan=>
    ({ok:false,code,source_health_promoted:false});

  if(env.FEYA_GSC_CAPTURE_ENABLED!=='true'||env.FEYA_GSC_READ_ENABLED!=='true')
    return block('GSC_CAPTURE_DISABLED');
  if(!report.ok||report.code!=='GSC_VERIFIED_WITH_FINAL_ROWS')
    return block(report.code==='GSC_VERIFIED_NO_FINAL_ROWS'
      ?'GSC_CAPTURE_NO_FINAL_ROWS':'GSC_CAPTURE_NOT_VERIFIED');
  if(report.property!=='sc-domain:thefeya.com'
    ||report.scope_required!=='https://www.googleapis.com/auth/webmasters.readonly'
    ||!['siteOwner','siteFullUser','siteRestrictedUser'].includes(report.property_permission||''))
    return block('GSC_CAPTURE_INVALID_SOURCE');
  const start=report.window?.start_date,end=report.window?.end_date;
  if(!start||!end||!properDate(start)||!properDate(end)||start>end)
    return block('GSC_CAPTURE_INVALID_SOURCE');
  const dayCount=Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;
  if(dayCount<1||dayCount>32)return block('GSC_CAPTURE_INVALID_SOURCE');

  const observed=Date.parse(report.checked_at||'');
  if(!Number.isFinite(observed)||!Number.isFinite(now.getTime())
    ||observed>now.getTime()+30000||observed<now.getTime()-5*60000)
    return block('GSC_CAPTURE_STALE_RESULT');

  const rows=report.daily_rows;
  if(!Array.isArray(rows)||!rows.length||rows.length>32||rows.length!==report.days_observed)
    return block('GSC_CAPTURE_INVALID_ROWS');
  const seen=new Set<string>();
  let clicks=0,impressions=0,weighted=0;
  for(const row of rows){
    if(!row||!properDate(row.date)||row.date<start||row.date>end||seen.has(row.date)
      ||!validCount(row.clicks)||!validCount(row.impressions)
      ||!validPosition(row.position)||row.clicks>row.impressions
      ||(row.impressions===0&&row.position!==0)
      ||(row.impressions>0&&row.position<=0))
      return block('GSC_CAPTURE_INVALID_ROWS');
    seen.add(row.date);
    clicks+=row.clicks;
    impressions+=row.impressions;
    weighted+=row.position*row.impressions;
  }
  if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions)
    ||!Number.isFinite(weighted)||report.clicks_in_observed_rows!==clicks
    ||report.impressions_in_observed_rows!==impressions
    ||report.last_observed_date!==[...seen].sort().at(-1))
    return block('GSC_CAPTURE_INVALID_ROWS');
  const average=impressions===0?null:weighted/impressions;
  if(average!==null&&!Number.isFinite(average))
    return block('GSC_CAPTURE_INVALID_ROWS');

  return {
    ok:true,code:'GSC_CAPTURE_VALIDATED',source_health_promoted:false,
    args:{
      p_property_url:'sc-domain:thefeya.com',
      p_source_channel:OFFICIAL_GSC_RECEIPT_CHANNEL,
      p_query_start:start,p_query_end:end,p_finalized_through:end,
      p_daily_rows:[...rows].sort((a,b)=>a.date.localeCompare(b.date)),
      p_expected_clicks:clicks,p_expected_impressions:impressions,
      p_expected_average_position:average,
      p_source_evidence_ref:'official-gsc:'+start+':'+end
    }
  };
}
